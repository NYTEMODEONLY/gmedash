import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type FeedbackType = 'data-request' | 'data-accuracy' | 'bug' | 'general';

interface FeedbackPayload {
  type?: FeedbackType;
  area?: string;
  pageUrl?: string;
  message?: string;
  website?: string;
}

interface GitHubIssueResponse {
  html_url?: string;
  number?: number;
  message?: string;
  error?: string;
  configured?: boolean;
}

interface GitHubIssueResult {
  ok: boolean;
  status: number;
  body: GitHubIssueResponse;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const FEEDBACK_REPO = process.env.GITHUB_FEEDBACK_REPO || 'NYTEMODEONLY/gmedash';
const GITHUB_TOKEN = process.env.GITHUB_FEEDBACK_TOKEN;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 3;
const MAX_BODY_BYTES = 8 * 1024;
const rateLimitStore = new Map<string, RateLimitEntry>();
const noStoreHeaders = {
  'Cache-Control': 'no-store',
};

const feedbackTypeLabels: Record<FeedbackType, string> = {
  'data-request': 'Data Request',
  'data-accuracy': 'Data Accuracy Report',
  bug: 'Bug Report',
  general: 'General Feedback',
};

const feedbackTypeLabelsForIssue: Record<FeedbackType, string> = {
  'data-request': 'data-request',
  'data-accuracy': 'data-accuracy',
  bug: 'bug',
  general: 'feedback',
};

const allowedTypes = new Set<FeedbackType>([
  'data-request',
  'data-accuracy',
  'bug',
  'general',
]);

const sanitizeText = (value: unknown, maxLength: number): string => {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\0/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, maxLength);
};

const isValidUrl = (value: string): boolean => {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const getClientKey = (request: Request): string => {
  const forwardedFor = request.headers.get('x-forwarded-for') || '';
  const ip = forwardedFor.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  return ip;
};

const checkRateLimit = (clientKey: string): boolean => {
  const now = Date.now();
  const current = rateLimitStore.get(clientKey);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(clientKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (current.count >= RATE_LIMIT_MAX) {
    return false;
  }

  current.count += 1;
  rateLimitStore.set(clientKey, current);
  return true;
};

const json = (body: unknown, status = 200) => (
  NextResponse.json(body, { status, headers: noStoreHeaders })
);

const summarize = (message: string): string => (
  message
    .replace(/\s+/g, ' ')
    .slice(0, 80)
    .replace(/[.?!,;:\s]+$/g, '') || 'Anonymous feedback'
);

const buildIssueBody = ({
  type,
  area,
  pageUrl,
  message,
  submittedAt,
}: {
  type: FeedbackType;
  area: string;
  pageUrl: string;
  message: string;
  submittedAt: string;
}): string => (
  [
    '<!-- gmedash-feedback:v1 -->',
    '',
    '## Anonymous GME Dashboard Feedback',
    '',
    `- Submitted: ${submittedAt}`,
    `- Type: ${feedbackTypeLabels[type]}`,
    `- Dashboard area: ${area || 'Not specified'}`,
    `- Related URL: ${pageUrl || 'Not provided'}`,
    '- Submitter: Anonymous public dashboard visitor',
    '',
    '## Message',
    '',
    message,
    '',
    '## Triage Checklist',
    '',
    '- [ ] Confirm whether this is a valid request or accuracy issue',
    '- [ ] Identify the authoritative free public source',
    '- [ ] Prioritize against existing dashboard work',
    '- [ ] Implement or close with rationale',
  ].join('\n')
);

const createGitHubIssue = async ({
  type,
  area,
  pageUrl,
  message,
  submittedAt,
}: {
  type: FeedbackType;
  area: string;
  pageUrl: string;
  message: string;
  submittedAt: string;
}): Promise<GitHubIssueResult> => {
  if (!GITHUB_TOKEN) {
    return {
      ok: false,
      status: 503,
      body: {
        error: 'Feedback storage is not configured yet.',
        configured: false,
      },
    };
  }

  const title = `[Feedback] ${feedbackTypeLabels[type]}: ${summarize(message)}`;
  const body = buildIssueBody({ type, area, pageUrl, message, submittedAt });
  const labels = ['feedback', 'anonymous-submission', feedbackTypeLabelsForIssue[type]];
  const endpoint = `https://api.github.com/repos/${FEEDBACK_REPO}/issues`;
  const issuePayload = { title, body, labels };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'gmedash-feedback-loop',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify(issuePayload),
  });

  if (!response.ok && response.status === 422) {
    const retryResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'gmedash-feedback-loop',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ title, body }),
    });

    const retryData = await retryResponse.json().catch(() => ({}));
    return {
      ok: retryResponse.ok,
      status: retryResponse.status,
      body: retryData as GitHubIssueResponse,
    };
  }

  const data = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    status: response.status,
    body: data as GitHubIssueResponse,
  };
};

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return json({ error: 'Feedback submission is too large.' }, 413);
    }

    const payload = await request.json() as FeedbackPayload;

    if (payload.website) {
      return json({ ok: true }, 202);
    }

    const type = allowedTypes.has(payload.type as FeedbackType)
      ? payload.type as FeedbackType
      : 'general';
    const area = sanitizeText(payload.area, 120);
    const pageUrl = sanitizeText(payload.pageUrl, 240);
    const message = sanitizeText(payload.message, 4000);

    if (message.length < 20) {
      return json(
        { error: 'Please include at least 20 characters so the feedback is actionable.' },
        400
      );
    }

    if (!isValidUrl(pageUrl)) {
      return json(
        { error: 'Related URL must be a valid http or https URL.' },
        400
      );
    }

    if (!checkRateLimit(getClientKey(request))) {
      return json(
        { error: 'Too many submissions. Please wait a few minutes and try again.' },
        429
      );
    }

    const submittedAt = new Date().toISOString();
    const result = await createGitHubIssue({
      type,
      area,
      pageUrl,
      message,
      submittedAt,
    });

    if (!result.ok) {
      if (result.body.configured === false) {
        return json(
          {
            error: 'Feedback storage is not configured yet.',
            configured: false,
          },
          503
        );
      }

      console.error('GitHub feedback issue creation failed:', {
        status: result.status,
        message: result.body.message,
      });

      return json(
        {
          error: 'Unable to store feedback right now.',
          configured: true,
        },
        result.status || 502
      );
    }

    return json(
      {
        ok: true,
        submittedAt,
        issueUrl: result.body.html_url,
        issueNumber: result.body.number,
      },
      201
    );
  } catch (error) {
    console.error('Feedback API error:', error);
    return json(
      { error: 'Unable to submit feedback right now.' },
      500
    );
  }
}
