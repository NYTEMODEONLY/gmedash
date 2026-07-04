import { NextResponse } from 'next/server';
import axios from 'axios';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';

export const revalidate = 600;
export const dynamic = 'force-dynamic';

interface InvestorSiteLink {
  label: string;
  url: string;
  path: string;
  isInternal: boolean;
}

interface InvestorSiteChange {
  id: string;
  type: 'added' | 'removed' | 'notable';
  label: string;
  description: string;
  url: string;
  sourceUrl: string;
  detectedAt: string;
}

interface InvestorSiteChangesResponse {
  source: string;
  sourceUrl: string;
  scannedAt: string;
  nextScanSeconds: number;
  pageHash: string;
  links: InvestorSiteLink[];
  changes: InvestorSiteChange[];
  message?: string;
  cacheAge?: number | null;
}

interface InvestorSiteSnapshot {
  scannedAt: string;
  pageHash: string;
  links: InvestorSiteLink[];
}

const IR_BASE_URL = 'https://investor.gamestop.com';
const IR_SCAN_URL = `${IR_BASE_URL}/`;
const IR_HOME_URL = `${IR_BASE_URL}/overview/default.aspx`;
const SCAN_SECONDS = 10 * 60;

const CORE_INTERNAL_PATHS = new Set([
  '/overview/default.aspx',
  '/news-releases/default.aspx',
  '/corporate-governance/default.aspx',
  '/annual-meeting/default.aspx',
  '/contact-us',
  '/contact-us/default.aspx',
  '/privacy-legal',
  '/privacy/default.aspx',
  '/resources/default.aspx',
  '/financial-information/default.aspx',
  '/stock-information/default.aspx',
  '/sec-filings/default.aspx',
]);

let previousSnapshot: InvestorSiteSnapshot | null = null;

const decodeHtml = (value: string): string => value
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&nbsp;/g, ' ')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>');

const stripTags = (value: string): string => decodeHtml(value.replace(/<[^>]*>/g, ' '))
  .replace(/\s+/g, ' ')
  .trim();

const hashString = (value: string): string => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

const normalizePath = (url: URL): string => {
  const path = url.pathname || '/';
  return path.endsWith('/') ? path.slice(0, -1) || '/' : path;
};

const extractLinks = (html: string): InvestorSiteLink[] => {
  const linkMap = new Map<string, InvestorSiteLink>();
  const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorRegex.exec(html)) !== null) {
    const rawHref = decodeHtml(match[1]).trim();
    const label = stripTags(match[2]);

    if (!rawHref || !label || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
      continue;
    }

    try {
      const absolute = new URL(rawHref, IR_HOME_URL);
      absolute.hash = '';
      const isInternal = absolute.hostname === 'investor.gamestop.com';
      const isRelevantExternal =
        absolute.hostname.endsWith('sec.gov') ||
        absolute.hostname.endsWith('nyse.com');

      if (!isInternal && !isRelevantExternal) {
        continue;
      }

      const url = absolute.toString();
      const path = normalizePath(absolute);

      if (!linkMap.has(url)) {
        linkMap.set(url, {
          label,
          url,
          path,
          isInternal,
        });
      }
    } catch {
      // Ignore malformed href values from the source page.
    }
  }

  return Array.from(linkMap.values()).sort((a, b) => a.label.localeCompare(b.label));
};

const isNotableInternalLink = (link: InvestorSiteLink): boolean => (
  link.isInternal &&
  !CORE_INTERNAL_PATHS.has(link.path) &&
  !link.path.startsWith('/news-releases/') &&
  !link.path.startsWith('/static-files/') &&
  link.path !== '/'
);

const buildChangeId = (type: InvestorSiteChange['type'], url: string): string => (
  `${type}-${hashString(url)}`
);

const buildChanges = (
  links: InvestorSiteLink[],
  previous: InvestorSiteSnapshot | null,
  scannedAt: string
): InvestorSiteChange[] => {
  const changes: InvestorSiteChange[] = [];
  const previousUrls = new Set(previous?.links.map((link) => link.url) || []);
  const currentUrls = new Set(links.map((link) => link.url));

  for (const link of links) {
    if (previous && !previousUrls.has(link.url)) {
      changes.push({
        id: buildChangeId('added', link.url),
        type: 'added',
        label: link.label,
        description: 'New link detected on the GameStop Investor Relations homepage navigation.',
        url: link.url,
        sourceUrl: IR_SCAN_URL,
        detectedAt: scannedAt,
      });
      continue;
    }

    if (isNotableInternalLink(link)) {
      changes.push({
        id: buildChangeId('notable', link.url),
        type: 'notable',
        label: link.label,
        description: 'Special investor-relations page currently linked from GameStop IR.',
        url: link.url,
        sourceUrl: IR_SCAN_URL,
        detectedAt: scannedAt,
      });
    }
  }

  if (previous) {
    for (const link of previous.links) {
      if (!currentUrls.has(link.url)) {
        changes.push({
          id: buildChangeId('removed', link.url),
          type: 'removed',
          label: link.label,
          description: 'Previously observed link is no longer present on the GameStop Investor Relations homepage.',
          url: link.url,
          sourceUrl: IR_SCAN_URL,
          detectedAt: scannedAt,
        });
      }
    }
  }

  const unique = new Map<string, InvestorSiteChange>();
  for (const change of changes) {
    unique.set(change.id, change);
  }

  return Array.from(unique.values()).sort((a, b) => {
    const typeOrder = { added: 0, notable: 1, removed: 2 };
    return typeOrder[a.type] - typeOrder[b.type] || a.label.localeCompare(b.label);
  });
};

const fetchInvestorSiteChanges = async (): Promise<InvestorSiteChangesResponse> => {
  const response = await axios.get<string>(IR_SCAN_URL, {
    timeout: 15000,
    responseType: 'text',
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'GME Dashboard investor-site-monitor/1.0',
    },
  });

  const scannedAt = new Date().toISOString();
  const links = extractLinks(response.data);
  const pageHash = hashString(links.map((link) => `${link.label}|${link.url}`).join('\n'));
  const changes = buildChanges(links, previousSnapshot, scannedAt);

  previousSnapshot = {
    scannedAt,
    pageHash,
    links,
  };

  return {
    source: 'GameStop Investor Relations',
    sourceUrl: IR_SCAN_URL,
    scannedAt,
    nextScanSeconds: SCAN_SECONDS,
    pageHash,
    links,
    changes,
    message: changes.length
      ? undefined
      : 'No notable investor-site navigation changes detected on the latest scan.',
  };
};

export async function GET() {
  const headers = {
    'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60',
  };

  try {
    const cached = cache.get<InvestorSiteChangesResponse>(CACHE_KEYS.INVESTOR_SITE_CHANGES);
    if (cached && !cached.isStale) {
      return NextResponse.json(
        {
          ...cached.data,
          cacheAge: cache.getAge(CACHE_KEYS.INVESTOR_SITE_CHANGES),
        },
        { headers }
      );
    }

    const data = await fetchInvestorSiteChanges();
    cache.set(CACHE_KEYS.INVESTOR_SITE_CHANGES, data, CACHE_TTL.INVESTOR_SITE_CHANGES);

    return NextResponse.json(data, { headers });
  } catch (error) {
    console.error('Investor Site Changes API error:', error);

    const staleData = cache.getStale<InvestorSiteChangesResponse>(CACHE_KEYS.INVESTOR_SITE_CHANGES);
    if (staleData) {
      return NextResponse.json(
        {
          ...staleData,
          cacheAge: cache.getAge(CACHE_KEYS.INVESTOR_SITE_CHANGES),
          message: 'Live scan failed; showing the most recent cached investor-site scan.',
        },
        { headers }
      );
    }

    return NextResponse.json(
      {
        source: 'GameStop Investor Relations',
        sourceUrl: IR_SCAN_URL,
        scannedAt: new Date().toISOString(),
        nextScanSeconds: SCAN_SECONDS,
        pageHash: '',
        links: [],
        changes: [],
        message: 'Unable to scan the GameStop Investor Relations homepage right now.',
      },
      { status: 200, headers }
    );
  }
}
