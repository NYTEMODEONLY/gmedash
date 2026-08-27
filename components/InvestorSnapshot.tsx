'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import ExportShareControls from '@/components/ExportShareControls';

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
  drsAsOf?: string;
  drsSource?: string;
  drsNote?: string;
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

  const secSourceUrl = snapshot?.filingUrl || 'https://www.sec.gov/edgar/browse/?CIK=0001326380';
  const coinbaseBtcUrl = 'https://www.coinbase.com/price/bitcoin';
  const sectionId = 'investor-snapshot';

  const renderSectionSource = (section: SnapshotSection) => {
    if (section.title === 'Capital Allocation') {
      return (
        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
          <a
            href={secSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gme-red dark:hover:text-gme-red transition-colors"
          >
            SEC 10-K
          </a>
          {' / '}
          <a
            href={coinbaseBtcUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gme-red dark:hover:text-gme-red transition-colors"
          >
            Coinbase BTC
          </a>
        </span>
      );
    }

    return (
      <a
        href={secSourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[11px] text-gray-500 dark:text-gray-400 hover:text-gme-red dark:hover:text-gme-red font-medium transition-colors"
      >
        {section.source}
      </a>
    );
  };

  return (
    <div id={sectionId} className="scroll-mt-24 bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Investor Snapshot</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Balance sheet, business mix, shareholder base, and capital allocation
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportShareControls id={sectionId} title="Investor Snapshot" data={snapshot || { sections: [] }} />
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
      </div>

      {snapshot?.drsNote && (
        <div className="mb-4 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
            DRS as of 10-K{snapshot.drsAsOf ? ` · ${snapshot.drsAsOf}` : ''}
          </div>
          <p className="mt-1 text-sm text-amber-900 dark:text-amber-200/90">
            {snapshot.drsNote}
          </p>
        </div>
      )}

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
                {renderSectionSource(section)}
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
          <span>
            Cash, mix, and earnings come from the latest 10-Q when it is newer than the 10-K. DRS and store count stay on the 10-K until a later filing updates them. Subsequent events such as the notes exchange come from 8-Ks. BTC spot context:{' '}
            <a
              href={coinbaseBtcUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
            >
              Coinbase
            </a>
          </span>
          <span>{snapshot?.asOf ? `As of ${snapshot.asOf}` : 'SEC sourced'}</span>
        </div>
      </div>
    </div>
  );
}
