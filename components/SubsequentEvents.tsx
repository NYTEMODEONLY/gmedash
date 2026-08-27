'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import ExportShareControls from '@/components/ExportShareControls';

interface SubsequentEvent {
  id: string;
  form: string;
  tag: string;
  title: string;
  detail: string;
  items?: string | null;
  filingDate: string;
  reportDate?: string | null;
  url: string;
}

interface SubsequentEventsResponse {
  source?: string;
  sourceUrl?: string;
  lastUpdated?: string;
  note?: string;
  events: SubsequentEvent[];
  error?: string;
}

interface SubsequentEventsProps {
  autoRefresh?: boolean;
}

const tagClass = (tag: string): string => {
  switch (tag) {
    case 'eBay':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300';
    case 'Notes':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300';
    case '8-K':
      return 'bg-gray-100 text-gray-700 dark:bg-gme-dark-300 dark:text-gray-300';
    default:
      return 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300';
  }
};

export default function SubsequentEvents({ autoRefresh = true }: SubsequentEventsProps) {
  const sectionId = 'subsequent-events';
  const [data, setData] = useState<SubsequentEventsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await axios.get<SubsequentEventsResponse>('/api/subsequent-events', {
        timeout: 20000,
      });
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch subsequent events:', error);
      setData({ events: [], error: 'Unable to load subsequent SEC events.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = setInterval(fetchEvents, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchEvents]);

  return (
    <section
      id={sectionId}
      className="scroll-mt-24 bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Subsequent Events</h2>
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gme-red/10 text-gme-red">
              8-K / 13D / 425
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-3xl">
            Material filings after the 10-K: notes exchange, eBay 425/13D, earnings 8-Ks. Filing text only.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportShareControls id={sectionId} title="Subsequent Events" data={data || { events: [] }} />
          <a
            href={data?.sourceUrl || 'https://www.sec.gov/edgar/browse/?CIK=0001326380'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-gme-dark-300 bg-white dark:bg-gme-dark-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-gme-red/40 hover:text-gme-red dark:hover:text-gme-red transition-colors"
          >
            Open EDGAR
          </a>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="h-14 bg-gray-200 dark:bg-gme-dark-300 rounded" />
          ))}
        </div>
      ) : data?.events?.length ? (
        <div className="space-y-3">
          {data.events.map((event) => (
            <a
              key={event.id}
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-gray-100 dark:border-gme-dark-300 bg-gray-50 dark:bg-gme-dark-200 p-4 hover:border-gme-red/40 transition-colors"
            >
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full ${tagClass(event.tag)}`}>
                  {event.tag}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{event.filingDate}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{event.form}</span>
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">{event.title}</div>
              <div className="mt-1 text-xs leading-snug text-gray-500 dark:text-gray-400">{event.detail}</div>
            </a>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">No Subsequent Events</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{data?.error || 'No recent 8-K, 13D, or 425 filings.'}</p>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        {data?.note || 'DRS is the annual HQ count on the 10-K. Notes close changes share count and the DRS percentage, not the 66.2M figure.'}
      </div>
    </section>
  );
}
