'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ShortInterest } from '@/lib/api';
import { useTheme } from '@/lib/ThemeContext';

interface ShortingChartProps {
  data: ShortInterest[];
  isLoading: boolean;
}

export default function ShortingChart({ data, isLoading }: ShortingChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const chartData = useMemo(() => {
    if (!data.length) return [];

    return data.map(item => ({
      ...item,
      date: format(parseISO(item.date), 'MMM dd'),
      fullDate: item.date,
      shortInterestPercent: item.shortInterest,
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gme-dark-200 p-3 border border-gray-200 dark:border-gme-dark-400 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{format(parseISO(data.fullDate), 'MMM dd, yyyy')}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Short Interest: <span className="font-medium">{data.shortInterestPercent.toFixed(2)}%</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Days to Cover: <span className="font-medium">{data.daysToCover.toFixed(1)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Theme-aware colors
  const gridColor = isDark ? '#222222' : '#f0f0f0';
  const axisColor = isDark ? '#888888' : '#6b7280';
  const barColor = '#ef4444';

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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Short Interest Data</h2>
        </div>
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">Premium Feature</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Real-time short interest data requires premium API access which involves ongoing costs.
          </p>
          <div className="mt-4 space-y-3">
            <a
              href="https://www.finra.org/finra-data/browse-catalog/short-sale-data/daily-short-sale-volume-data"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gme-dark-300 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gme-dark-400 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View on FINRA
            </a>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Consider{' '}
              <a
                href="https://github.com/NYTEMODEONLY/gmedash"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gme-red hover:underline"
              >
                sponsoring the developer
              </a>
              {' '}to help cover premium data costs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const latestData = data[data.length - 1];
  const avgShortInterest = data.reduce((sum, item) => sum + item.shortInterest, 0) / data.length;

  return (
    <div className="bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Short Interest Data</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-red-50 dark:bg-stock-red/10 p-3 rounded-lg transition-colors">
            <div className="text-red-600 dark:text-stock-red font-medium">Current Short Interest</div>
            <div className="text-2xl font-bold text-red-700 dark:text-stock-red">
              {latestData.shortInterest.toFixed(2)}%
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-lg transition-colors">
            <div className="text-blue-600 dark:text-blue-400 font-medium">Days to Cover</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {latestData.daysToCover.toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
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
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                color: isDark ? '#ffffff' : '#111111',
              }}
            />
            <Bar
              dataKey="shortInterestPercent"
              fill={barColor}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 p-3 bg-gray-50 dark:bg-gme-dark-200 rounded-lg transition-colors">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-medium">Average Short Interest:</span> {avgShortInterest.toFixed(2)}%
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-medium">Data Points:</span> {chartData.length}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Short interest represents the percentage of shares sold short relative to total shares outstanding.
        </div>
      </div>
    </div>
  );
} 