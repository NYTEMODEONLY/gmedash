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
import ExportShareControls from '@/components/ExportShareControls';
import { createAnchorId } from '@/lib/export-share';

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
      sharesShortMillions: item.shortInterest / 1_000_000,
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gme-dark-200 p-3 border border-gray-200 dark:border-gme-dark-400 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{format(parseISO(data.fullDate), 'MMM dd, yyyy')}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Shares Short: <span className="font-medium">{data.sharesShortMillions.toFixed(2)}M</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Days to Cover: <span className="font-medium">{data.daysToCover.toFixed(1)}</span>
          </p>
          {typeof data.changePercent === 'number' && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Change vs Prior: <span className="font-medium">{data.changePercent.toFixed(2)}%</span>
            </p>
          )}
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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">FINRA Short Interest</h2>
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M4 8h16M6 12h12M8 16h8M10 20h4" />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">No FINRA Data Returned</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            FINRA publishes consolidated short interest on a reporting schedule. The dashboard does not show paid or estimated replacements.
          </p>
          <div className="mt-4">
            <a
              href="https://www.finra.org/finra-data/browse-catalog/equity-short-interest/data"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gme-dark-300 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gme-dark-400 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open FINRA Source
            </a>
          </div>
        </div>
      </div>
    );
  }

  const latestData = data[data.length - 1];
  const avgSharesShort = data.reduce((sum, item) => sum + item.shortInterest, 0) / data.length;
  const sectionId = 'finra-short-interest';
  const summaryCards = [
    {
      label: 'Shares Short',
      value: `${(latestData.shortInterest / 1_000_000).toFixed(2)}M`,
      rawValue: latestData.shortInterest,
      className: 'text-red-700 dark:text-stock-red',
      wrapperClassName: 'bg-red-50 dark:bg-stock-red/10',
      labelClassName: 'text-red-600 dark:text-stock-red',
    },
    {
      label: 'Days to Cover',
      value: latestData.daysToCover.toFixed(1),
      rawValue: latestData.daysToCover,
      className: 'text-blue-700 dark:text-blue-300',
      wrapperClassName: 'bg-blue-50 dark:bg-blue-500/10',
      labelClassName: 'text-blue-600 dark:text-blue-400',
    },
  ];

  return (
    <div id={sectionId} className="scroll-mt-24 bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">FINRA Short Interest</h2>
          <ExportShareControls id={sectionId} title="FINRA Short Interest" data={data} />
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {summaryCards.map((card) => {
            const cardId = createAnchorId(sectionId, card.label);
            return (
              <div key={card.label} id={cardId} className={`scroll-mt-24 p-3 rounded-lg transition-colors ${card.wrapperClassName}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className={`${card.labelClassName} font-medium`}>{card.label}</div>
                    <div className={`text-2xl font-bold ${card.className}`}>{card.value}</div>
                  </div>
                  <ExportShareControls
                    id={cardId}
                    title={`FINRA Short Interest: ${card.label}`}
                    data={{ date: latestData.date, label: card.label, value: card.value, rawValue: card.rawValue, source: latestData.source || 'FINRA' }}
                    compact
                  />
                </div>
              </div>
            );
          })}
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
              tickFormatter={(value) => `${value}M`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                color: isDark ? '#ffffff' : '#111111',
              }}
            />
            <Bar
              name="Shares Short (M)"
              dataKey="sharesShortMillions"
              fill={barColor}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 p-3 bg-gray-50 dark:bg-gme-dark-200 rounded-lg transition-colors">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-medium">Average Shares Short:</span> {(avgSharesShort / 1_000_000).toFixed(2)}M
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-medium">Data Points:</span> {chartData.length}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Source:{' '}
          <a
            href="https://www.finra.org/finra-data/browse-catalog/equity-short-interest/data"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
          >
            FINRA Consolidated Short Interest
          </a>
          . This is reported short position data, not daily short-sale volume and not a float percentage.
        </div>
      </div>
    </div>
  );
} 
