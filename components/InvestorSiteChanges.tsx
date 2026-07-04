'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import ExportShareControls from '@/components/ExportShareControls';

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

interface InvestorSiteChangesProps {
  autoRefresh?: boolean;
}

const typeClass = (type: InvestorSiteChange['type']): string => {
  switch (type) {
    case 'added':
      return 'bg-stock-green/10 text-stock-green dark:bg-stock-green/20';
    case 'removed':
      return 'bg-stock-red/10 text-stock-red dark:bg-stock-red/20';
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300';
  }
};

const typeLabel = (type: InvestorSiteChange['type']): string => {
  switch (type) {
    case 'added':
      return 'Added';
    case 'removed':
      return 'Removed';
    default:
      return 'Notable';
  }
};

const formatScanTime = (value?: string): string => {
  if (!value) return 'Pending';

  try {
    return format(parseISO(value), 'MMM dd, yyyy h:mm a');
  } catch {
    return 'Pending';
  }
};

export default function InvestorSiteChanges({ autoRefresh = true }: InvestorSiteChangesProps) {
  const sectionId = 'investor-site-changes';
  const [data, setData] = useState<InvestorSiteChangesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChanges = useCallback(async () => {
    try {
      setError(null);
      const response = await axios.get<InvestorSiteChangesResponse>('/api/investor-site-changes', {
        timeout: 20000,
      });
      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch investor site changes:', err);
      setError('Unable to scan GameStop Investor Relations right now.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChanges();
  }, [fetchChanges]);

  useEffect(() => {
    if (!autoRefresh) return undefined;

    const interval = setInterval(fetchChanges, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchChanges]);

  const exportData = data || {
    source: 'GameStop Investor Relations',
    sourceUrl: 'https://investor.gamestop.com/',
    scannedAt: null,
    changes: [],
    links: [],
  };

  return (
    <section
      id={sectionId}
      className="scroll-mt-24 bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              GameStop IR Site Watch
            </h2>
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-stock-green/10 text-stock-green dark:bg-stock-green/20">
              10 min scan
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-3xl">
            Monitors the official GameStop Investor Relations homepage for new, removed, or notable linked pages.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportShareControls id={sectionId} title="GameStop IR Site Watch" data={exportData} />
          <a
            href={data?.sourceUrl || 'https://investor.gamestop.com/'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-gme-dark-300 bg-white dark:bg-gme-dark-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-gme-red/40 hover:text-gme-red dark:hover:text-gme-red transition-colors"
          >
            Open IR Site
          </a>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="grid grid-cols-12 gap-4">
              <div className="col-span-2 h-4 bg-gray-200 dark:bg-gme-dark-300 rounded" />
              <div className="col-span-2 h-4 bg-gray-200 dark:bg-gme-dark-300 rounded" />
              <div className="col-span-4 h-4 bg-gray-200 dark:bg-gme-dark-300 rounded" />
              <div className="col-span-4 h-4 bg-gray-200 dark:bg-gme-dark-300 rounded" />
            </div>
          ))}
        </div>
      ) : error && !data ? (
        <div className="text-center py-10">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">IR Site Scan Unavailable</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gme-dark-300">
              <thead className="bg-gray-50 dark:bg-gme-dark-200">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Detected
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Page
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Detail
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gme-dark-100 divide-y divide-gray-200 dark:divide-gme-dark-300">
                {(data?.changes || []).map((change) => (
                  <tr key={change.id} className="hover:bg-gray-50 dark:hover:bg-gme-dark-200 transition-colors">
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatScanTime(change.detectedAt)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${typeClass(change.type)}`}>
                        {typeLabel(change.type)}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {change.label}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-600 dark:text-gray-300">
                      <div className="max-w-lg">
                        {change.description}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <a
                        href={change.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gme-red hover:text-gme-red-dark font-medium transition-colors"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data?.changes.length === 0 && (
            <div className="text-center py-10 border-t border-gray-200 dark:border-gme-dark-300">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">No IR Site Changes Detected</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {data.message || 'The latest scan found no new or notable Investor Relations homepage links.'}
              </p>
            </div>
          )}

          <div className="mt-4 p-3 bg-gray-50 dark:bg-gme-dark-200 rounded-lg transition-colors">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">Source:</span>{' '}
                <a
                  href={data?.sourceUrl || 'https://investor.gamestop.com/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
                >
                  {data?.source || 'GameStop Investor Relations'}
                </a>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Last scanned: {formatScanTime(data?.scannedAt)} · Links tracked: {data?.links.length || 0}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
