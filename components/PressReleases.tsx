'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import axios from 'axios';

interface PressRelease {
  title: string;
  date: string;
  url: string;
  description: string;
  source: string;
}

interface PressReleasesProps {
  autoRefresh?: boolean;
}

export default function PressReleases({ autoRefresh = true }: PressReleasesProps) {
  const [releases, setReleases] = useState<PressRelease[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReleases = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get<PressRelease[]>('/api/press-releases', {
        timeout: 15000,
      });

      if (Array.isArray(response.data)) {
        setReleases(response.data);
      } else {
        setError('No press releases available');
        setReleases([]);
      }
    } catch (err) {
      console.error('Error fetching press releases:', err);
      setError('Unable to fetch press releases');
      setReleases([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  // Auto-refresh every 15 minutes
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchReleases();
    }, 900000); // 15 minutes

    return () => clearInterval(interval);
  }, [autoRefresh, fetchReleases]);

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'GameStop IR':
        return 'bg-gme-red/10 text-gme-red dark:bg-gme-red/20';
      case 'SEC EDGAR':
        return 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400';
      default:
        return 'bg-gray-100 dark:bg-gme-dark-300 text-gray-800 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gme-dark-300 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="border border-gray-200 dark:border-gme-dark-300 rounded-lg p-4">
                <div className="h-4 bg-gray-200 dark:bg-gme-dark-300 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gme-dark-300 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gme-dark-300 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && releases.length === 0) {
    return (
      <div className="bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Press Releases</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <div className="mt-4">
            <a
              href="https://news.gamestop.com/news-releases-0"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-gme-red text-white hover:bg-gme-red-dark transition-colors"
            >
              Visit GameStop IR
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-gme-red to-gme-red-dark rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Press Releases</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{releases.length} releases</p>
          </div>
        </div>
        <a
          href="https://news.gamestop.com/news-releases-0"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-gme-red/10 text-gme-red hover:bg-gme-red/20 transition-colors"
        >
          View All
          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Press Releases List */}
      <div className="space-y-4">
        {releases.slice(0, 6).map((release, index) => (
          <a
            key={index}
            href={release.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block border border-gray-200 dark:border-gme-dark-300 rounded-lg p-4 hover:shadow-md hover:border-gme-red/30 dark:hover:border-gme-red/50 transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 flex-1 mr-2">
                {release.title}
              </h3>
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${getSourceColor(release.source)}`}>
                {release.source}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
              {release.description}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{format(parseISO(release.date), 'MMM dd, yyyy')}</span>
              <span className="text-gme-red font-medium">Read more</span>
            </div>
          </a>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gme-dark-300">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Source: GameStop IR & SEC EDGAR</span>
          <span>Auto-updates every 15 min</span>
        </div>
      </div>
    </div>
  );
}
