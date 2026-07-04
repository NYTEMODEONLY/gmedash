'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ExportShareControls from '@/components/ExportShareControls';

interface TurnaroundYear {
  fiscalYearEnd: string;
  fiscalYear: string;
  filed: string;
  filingUrl: string;
  revenue: number | null;
  grossProfit: number | null;
  grossMargin: number | null;
  netIncome: number | null;
  liquidity: number | null;
  totalDebt: number | null;
  stores: number | null;
  registeredShares: number | null;
  recordHolders: number | null;
  sharesOutstanding: number | null;
}

interface Highlight {
  label: string;
  value: string;
  detail: string;
}

interface TurnaroundResponse {
  years: TurnaroundYear[];
  highlights: Highlight[];
  sourceUrl?: string;
  lastUpdated?: string;
  error?: string;
}

const money = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  return `${sign}$${abs.toLocaleString()}`;
};

const compactNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  return value.toLocaleString();
};

export default function TurnaroundProgress() {
  const [data, setData] = useState<TurnaroundResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTurnaround = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get<TurnaroundResponse>('/api/turnaround', {
        timeout: 20000,
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching turnaround progress:', error);
      setData({ years: [], highlights: [], error: 'Unable to load SEC turnaround data.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTurnaround();
  }, [fetchTurnaround]);

  const chartData = (data?.years || []).map((year) => ({
    year: year.fiscalYearEnd.slice(0, 4),
    revenue: year.revenue ? year.revenue / 1_000_000_000 : null,
    grossMargin: year.grossMargin ? year.grossMargin * 100 : null,
    netIncome: year.netIncome ? year.netIncome / 1_000_000 : null,
    liquidity: year.liquidity ? year.liquidity / 1_000_000_000 : null,
    debt: year.totalDebt ? year.totalDebt / 1_000_000_000 : 0,
    stores: year.stores,
  }));

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 dark:bg-gme-dark-300 rounded w-1/4 mb-6" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="h-20 bg-gray-100 dark:bg-gme-dark-200 rounded-lg" />
            ))}
          </div>
          <div className="h-72 bg-gray-100 dark:bg-gme-dark-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!data?.years?.length) {
    return (
      <div className="bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Turnaround Progress</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{data?.error || 'Unable to load SEC annual trend data.'}</p>
      </div>
    );
  }

  const latest = data.years[data.years.length - 1];
  const sectionId = 'turnaround-progress';

  return (
    <div id={sectionId} className="scroll-mt-24 bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Turnaround Progress</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Year-over-year SEC filing trend for operations, liquidity, ownership, and store footprint
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportShareControls id={sectionId} title="Turnaround Progress" data={data} />
          <a
            href={latest.filingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-full bg-gme-red/10 text-gme-red hover:bg-gme-red/20 transition-colors"
          >
            Latest 10-K
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {data.highlights.map((highlight) => (
          <div key={highlight.label} className="bg-gray-50 dark:bg-gme-dark-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400">{highlight.label}</div>
            <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{highlight.value}</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-snug">{highlight.detail}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="h-72 rounded-lg border border-gray-100 dark:border-gme-dark-300 p-4">
          <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">Profitability</div>
          <ResponsiveContainer width="100%" height="88%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.18} />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value}M`} />
              <Tooltip formatter={(value: number, name) => [name === 'grossMargin' ? `${value.toFixed(1)}%` : money(value * 1_000_000), name]} />
              <Line type="monotone" dataKey="netIncome" name="Net Income" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="grossMargin" name="Gross Margin" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="h-72 rounded-lg border border-gray-100 dark:border-gme-dark-300 p-4">
          <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">Liquidity vs. Debt</div>
          <ResponsiveContainer width="100%" height="88%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.18} />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value}B`} />
              <Tooltip formatter={(value: number) => money(value * 1_000_000_000)} />
              <Area type="monotone" dataKey="liquidity" name="Cash + Securities" stroke="#2563eb" fill="#2563eb" fillOpacity={0.16} />
              <Area type="monotone" dataKey="debt" name="Debt" stroke="#f97316" fill="#f97316" fillOpacity={0.14} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gme-dark-300">
          <thead className="bg-gray-50 dark:bg-gme-dark-200">
            <tr>
              {['FY End', 'Revenue', 'Gross Margin', 'Net Income', 'Liquidity', 'Debt', 'Stores', 'Registered'].map((label) => (
                <th key={label} className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gme-dark-300">
            {data.years.map((year) => (
              <tr key={year.fiscalYearEnd} className="hover:bg-gray-50 dark:hover:bg-gme-dark-200 transition-colors">
                <td className="px-3 py-3 text-sm">
                  <a href={year.filingUrl} target="_blank" rel="noopener noreferrer" className="text-gme-red hover:text-gme-red-dark font-medium">
                    {year.fiscalYearEnd}
                  </a>
                </td>
                <td className="px-3 py-3 text-sm text-gray-900 dark:text-white">{money(year.revenue)}</td>
                <td className="px-3 py-3 text-sm text-gray-900 dark:text-white">{year.grossMargin ? `${(year.grossMargin * 100).toFixed(1)}%` : 'N/A'}</td>
                <td className="px-3 py-3 text-sm text-gray-900 dark:text-white">{money(year.netIncome)}</td>
                <td className="px-3 py-3 text-sm text-gray-900 dark:text-white">{money(year.liquidity)}</td>
                <td className="px-3 py-3 text-sm text-gray-900 dark:text-white">{money(year.totalDebt)}</td>
                <td className="px-3 py-3 text-sm text-gray-900 dark:text-white">{compactNumber(year.stores)}</td>
                <td className="px-3 py-3 text-sm text-gray-900 dark:text-white">{compactNumber(year.registeredShares)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-gray-50 dark:bg-gme-dark-200 rounded-lg transition-colors">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            Source:{' '}
            <a
              href={data.sourceUrl || 'https://data.sec.gov/submissions/CIK0001326380.json'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
            >
              SEC companyfacts and 10-K filings
            </a>
          </span>
          <span>{data.lastUpdated ? `Updated ${new Date(data.lastUpdated).toLocaleString()}` : 'SEC sourced'}</span>
        </div>
      </div>
    </div>
  );
}
