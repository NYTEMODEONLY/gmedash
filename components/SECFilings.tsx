'use client';

import { format, parseISO } from 'date-fns';
import { SECFiling } from '@/lib/api';

interface SECFilingsProps {
  filings: SECFiling[];
  isLoading: boolean;
}

export default function SECFilings({ filings, isLoading }: SECFilingsProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gme-dark-300 rounded w-1/4 mb-6"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex space-x-4">
                <div className="h-4 bg-gray-200 dark:bg-gme-dark-300 rounded w-16"></div>
                <div className="h-4 bg-gray-200 dark:bg-gme-dark-300 rounded w-24"></div>
                <div className="h-4 bg-gray-200 dark:bg-gme-dark-300 rounded flex-1"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!filings.length) {
    return (
      <div className="bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No SEC Filings</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Unable to fetch SEC filings</p>
        </div>
      </div>
    );
  }

  const getFormTypeColor = (formType: string) => {
    switch (formType) {
      case '10-K':
        return 'bg-gme-red/10 text-gme-red dark:bg-gme-red/20';
      case '10-Q':
        return 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400';
      case '8-K':
        return 'bg-stock-green/10 text-stock-green dark:bg-stock-green/20';
      default:
        return 'bg-gray-100 dark:bg-gme-dark-300 text-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">SEC Filings</h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {filings.length} filings
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gme-dark-300">
          <thead className="bg-gray-50 dark:bg-gme-dark-200">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Description
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gme-dark-100 divide-y divide-gray-200 dark:divide-gme-dark-300">
            {filings.slice(0, 10).map((filing, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gme-dark-200 transition-colors">
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {format(parseISO(filing.filingDate), 'MMM dd, yyyy')}
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getFormTypeColor(filing.formType)}`}>
                    {filing.formType}
                  </span>
                </td>
                <td className="px-3 py-4 text-sm text-gray-900 dark:text-gray-300">
                  <div className="max-w-xs truncate">
                    {filing.description}
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                  {filing.url !== '#' ? (
                    <a
                      href={filing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gme-red hover:text-gme-red-dark font-medium transition-colors"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filings.length > 10 && (
        <div className="mt-4 text-center">
          <button className="text-sm text-gme-red hover:text-gme-red-dark font-medium transition-colors">
            View all {filings.length} filings
          </button>
        </div>
      )}

      <div className="mt-4 p-3 bg-gray-50 dark:bg-gme-dark-200 rounded-lg transition-colors">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">Form Types:</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gme-red/10 text-gme-red dark:bg-gme-red/20">
            10-K (Annual Report)
          </span>
          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400">
            10-Q (Quarterly Report)
          </span>
          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-stock-green/10 text-stock-green dark:bg-stock-green/20">
            8-K (Current Report)
          </span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          SEC filings are official documents submitted to the Securities and Exchange Commission.
        </div>
      </div>
    </div>
  );
}
