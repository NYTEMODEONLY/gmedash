'use client';

import { FormEvent, useState } from 'react';
import { FeedbackSubmitResponse, FeedbackType, submitFeedback } from '@/lib/api';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

const feedbackTypes: Array<{ value: FeedbackType; label: string }> = [
  { value: 'data-request', label: 'Data request' },
  { value: 'data-accuracy', label: 'Data accuracy issue' },
  { value: 'bug', label: 'Bug report' },
  { value: 'general', label: 'General feedback' },
];

const inputClass = 'w-full rounded-md border border-gray-200 dark:border-gme-dark-300 bg-white dark:bg-gme-dark-200 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors';

export default function FeedbackForm() {
  const [type, setType] = useState<FeedbackType>('data-request');
  const [area, setArea] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [response, setResponse] = useState<FeedbackSubmitResponse | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitState('submitting');
    setResponse(null);

    try {
      const data = await submitFeedback({
        type,
        area,
        pageUrl,
        message,
        website,
      });

      if (data.error) {
        setSubmitState('error');
        setResponse(data);
        return;
      }

      setSubmitState('success');
      setResponse(data);
      setArea('');
      setPageUrl('');
      setMessage('');
      setWebsite('');
    } catch {
      setSubmitState('error');
      setResponse({ error: 'Unable to submit feedback right now.' });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <section className="lg:col-span-2 bg-white dark:bg-gme-dark-100 rounded-lg shadow-md border border-gray-200 dark:border-gme-dark-300 p-6 transition-colors">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Feedback and Data Requests</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Submit anonymous requests for new dashboard data points or report data that looks inaccurate.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="hidden" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Feedback type
            </label>
            <select
              id="type"
              value={type}
              onChange={(event) => setType(event.target.value as FeedbackType)}
              className={inputClass}
            >
              {feedbackTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="area" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Dashboard area
            </label>
            <input
              id="area"
              type="text"
              value={area}
              maxLength={120}
              onChange={(event) => setArea(event.target.value)}
              className={inputClass}
              placeholder="Company Overview, SEC Filings, Short Interest, etc."
            />
          </div>

          <div>
            <label htmlFor="pageUrl" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Related URL
            </label>
            <input
              id="pageUrl"
              type="url"
              value={pageUrl}
              maxLength={240}
              onChange={(event) => setPageUrl(event.target.value)}
              className={inputClass}
              placeholder="Optional source, dashboard, filing, or article URL"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <label htmlFor="message" className="block text-sm font-medium text-gray-900 dark:text-white">
                Request or issue
              </label>
              <span className="text-xs text-gray-500 dark:text-gray-400">{message.length}/4000</span>
            </div>
            <textarea
              id="message"
              value={message}
              minLength={20}
              maxLength={4000}
              rows={8}
              required
              onChange={(event) => setMessage(event.target.value)}
              className={inputClass}
              placeholder="Tell us what data point you want added, what looks inaccurate, and which public source should be used if you know it."
            />
          </div>

          {submitState === 'success' && (
            <div className="rounded-md border border-stock-green/30 bg-stock-green/10 p-4 text-sm text-stock-green">
              Feedback submitted anonymously.
              {response?.issueUrl && (
                <>
                  {' '}
                  <a
                    href={response.issueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline"
                  >
                    View GitHub issue #{response.issueNumber}
                  </a>
                </>
              )}
            </div>
          )}

          {submitState === 'error' && (
            <div className="rounded-md border border-stock-red/30 bg-stock-red/10 p-4 text-sm text-stock-red">
              {response?.configured === false
                ? 'Feedback storage is not configured yet. The form is ready, but the server needs a GitHub feedback token before submissions can be saved.'
                : response?.error || 'Unable to submit feedback right now.'}
            </div>
          )}

          <div className="flex">
            <button
              type="submit"
              disabled={submitState === 'submitting'}
              className="inline-flex items-center justify-center rounded-lg bg-gme-red px-4 py-2 text-sm font-medium text-white hover:bg-gme-red-dark disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
            >
              {submitState === 'submitting' ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </section>

      <aside className="bg-white dark:bg-gme-dark-100 rounded-lg shadow-md border border-gray-200 dark:border-gme-dark-300 p-6 transition-colors">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">How This Works</h2>
        <div className="mt-4 space-y-4 text-sm text-gray-600 dark:text-gray-400">
          <p>
            Submissions are anonymous and timestamped. We do not ask for names, emails, wallet addresses, or social handles.
          </p>
          <p>
            Valid submissions become GitHub Issues in the project repo so maintainers and future agents can triage source quality, priority, and implementation.
          </p>
          <p>
            Submitted feedback text is public once it is stored as a GitHub Issue.
          </p>
          <p>
            For data accuracy reports, include the affected card and a public source link when possible.
          </p>
        </div>
      </aside>
    </div>
  );
}
