'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

interface SnapshotMetric {
  label: string;
  value: string;
  detail?: string;
}

interface SnapshotSection {
  title: string;
  source: string;
  metrics: SnapshotMetric[];
}

interface InvestorSnapshotResponse {
  asOf?: string;
  filingDate?: string;
  filingUrl?: string;
  lastUpdated?: string;
  sections: SnapshotSection[];
  error?: string;
}

export default function InvestorSnapshot() {
  const [snapshot, setSnapshot] = useState<InvestorSnapshotResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSnapshot = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get<InvestorSnapshotResponse>('/api/investor-snapshot', {
        timeout: 15000,
      });
      setSnapshot(response.data);
    } catch (error) {
      console.error('Error fetching investor snapshot:', error);
      setSnapshot({ sections: [], error: 'Unable to load investor snapshot.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  return (
    <div className="bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Investor Snapshot</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Balance sheet, business mix, shareholder base, and capital allocation
          </p>
        </div>
        {snapshot?.filingUrl && (
          <a
            href={snapshot.filingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-full bg-gme-red/10 text-gme-red hover:bg-gme-red/20 transition-colors"
          >
            Source Filing
            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-pulse">
          {[...Array(4)].map((_, sectionIndex) => (
            <div key={sectionIndex} className="rounded-lg border border-gray-100 dark:border-gme-dark-300 p-4">
              <div className="h-4 bg-gray-200 dark:bg-gme-dark-300 rounded w-1/2 mb-4" />
              <div className="space-y-3">
                {[...Array(3)].map((_, metricIndex) => (
                  <div key={metricIndex}>
                    <div className="h-3 bg-gray-200 dark:bg-gme-dark-300 rounded w-2/3 mb-2" />
                    <div className="h-5 bg-gray-200 dark:bg-gme-dark-300 rounded w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : snapshot?.sections?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {snapshot.sections.map((section) => (
            <div key={section.title} className="rounded-lg border border-gray-100 dark:border-gme-dark-300 bg-gray-50 dark:bg-gme-dark-200 p-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{section.title}</h3>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">{section.source}</span>
              </div>
              <div className="space-y-4">
                {section.metrics.map((metric) => (
                  <div key={`${section.title}-${metric.label}`}>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{metric.label}</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-white break-words">{metric.value}</div>
                    {metric.detail && (
                      <div className="mt-1 text-xs leading-snug text-gray-500 dark:text-gray-400">{metric.detail}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4V7m2 14H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Investor Snapshot Unavailable</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{snapshot?.error || 'Unable to load public-source investor facts.'}</p>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gme-dark-300">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>All company facts are sourced from the latest GameStop SEC 10-K unless noted.</span>
          <span>{snapshot?.asOf ? `As of ${snapshot.asOf}` : 'SEC sourced'}</span>
        </div>
      </div>
    </div>
  );
}
