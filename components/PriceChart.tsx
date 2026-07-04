'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { HistoricalData, HistoricalDataResponse } from '@/lib/api';
import { useTheme } from '@/lib/ThemeContext';
import ExportShareControls from '@/components/ExportShareControls';

interface PriceChartProps {
  data: HistoricalData[];
  isLoading: boolean;
  onPeriodChange: (period: string) => void;
  selectedPeriod: string;
  metadata?: HistoricalDataResponse | null;
}

const periods = [
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: '1Y', value: '1Y' },
];

export default function PriceChart({ data, isLoading, onPeriodChange, selectedPeriod, metadata }: PriceChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const chartData = useMemo(() => {
    if (!data.length) return [];

    return data.map(item => ({
      ...item,
      date: format(parseISO(item.date), 'MMM dd'),
      fullDate: item.date,
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gme-dark-200 p-3 border border-gray-200 dark:border-gme-dark-400 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{format(parseISO(data.fullDate), 'MMM dd, yyyy')}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Close: <span className="font-medium">${data.close.toFixed(2)}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Volume: <span className="font-medium">{data.volume.toLocaleString()}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            High: <span className="font-medium text-stock-green">${data.high.toFixed(2)}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Low: <span className="font-medium text-stock-red">${data.low.toFixed(2)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gme-dark-300 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gme-dark-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No Chart Data</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {metadata?.message || metadata?.error || 'Unable to fetch historical price data'}
          </p>
          <a
            href="https://finance.yahoo.com/quote/GME/history"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
          >
            Open Yahoo Finance history
          </a>
        </div>
      </div>
    );
  }

  // Theme-aware colors
  const gridColor = isDark ? '#222222' : '#f0f0f0';
  const axisColor = isDark ? '#888888' : '#6b7280';
  const lineColor = isDark ? '#E31837' : '#3b82f6';
  const sourceName = metadata?.source === 'cache'
    ? `Cached from ${metadata.originalSource === 'yahoo' ? 'Yahoo Finance' : metadata?.originalSource || 'source'}`
    : metadata?.source === 'yahoo'
      ? 'Yahoo Finance'
      : 'Yahoo Finance';
  const freshnessLabel = metadata?.stale
    ? 'Stale cached historical data'
    : metadata?.source === 'cache'
      ? `Cached ${metadata.cacheAge ?? 0}s ago`
      : 'Historical data (end of day)';
  const sectionId = 'historical-price-chart';

  return (
    <div id={sectionId} className="scroll-mt-24 bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Historical Price Chart</h2>
        <div className="flex flex-wrap items-center gap-2">
          <ExportShareControls
            id={sectionId}
            title={`Historical Price Chart ${selectedPeriod}`}
            data={{ selectedPeriod, metadata, data }}
          />
          <div className="flex space-x-1">
            {periods.map((period) => (
              <button
                key={period.value}
                onClick={() => onPeriodChange(period.value)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  selectedPeriod === period.value
                    ? 'bg-gme-red text-white'
                    : 'bg-gray-100 dark:bg-gme-dark-300 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gme-dark-400'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="date"
              stroke={axisColor}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={axisColor}
              fontSize={12}
              width={64}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${Number(value).toFixed(2)}`}
              domain={[
                (dataMin: number) => Math.max(0, Math.floor((dataMin - 1) * 100) / 100),
                (dataMax: number) => Math.ceil((dataMax + 1) * 100) / 100,
              ]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                color: isDark ? '#ffffff' : '#111111',
              }}
            />
            <Line
              type="monotone"
              dataKey="close"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, stroke: lineColor, strokeWidth: 2, fill: isDark ? '#111111' : '#ffffff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 p-3 bg-gray-50 dark:bg-gme-dark-200 rounded-lg transition-colors">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-medium">Period:</span> {selectedPeriod}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {chartData.length} data points
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gme-dark-300">
          <span>
            <span className="font-medium">Source:</span>{' '}
            <a
              href="https://finance.yahoo.com/quote/GME/history"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium transition-colors"
            >
              {sourceName}
            </a>
          </span>
          <span>{freshnessLabel}</span>
        </div>
      </div>
    </div>
  );
}
