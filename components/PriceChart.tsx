'use client';

import { useState, useMemo } from 'react';
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
import { HistoricalData } from '@/lib/api';
import { useTheme } from '@/lib/ThemeContext';

interface PriceChartProps {
  data: HistoricalData[];
  isLoading: boolean;
  onPeriodChange: (period: string) => void;
  selectedPeriod: string;
}

const periods = [
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: '1Y', value: '1Y' },
];

export default function PriceChart({ data, isLoading, onPeriodChange, selectedPeriod }: PriceChartProps) {
  const [hoveredData, setHoveredData] = useState<any>(null);
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
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Unable to fetch historical price data</p>
        </div>
      </div>
    );
  }

  // Theme-aware colors
  const gridColor = isDark ? '#222222' : '#f0f0f0';
  const axisColor = isDark ? '#888888' : '#6b7280';
  const lineColor = isDark ? '#E31837' : '#3b82f6';

  return (
    <div className="bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Historical Price Chart</h2>
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
            onMouseMove={(data) => setHoveredData(data)}
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
              tickFormatter={(value) => `$${value}`}
              domain={['dataMin - 1', 'dataMax + 1']}
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

      {hoveredData && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gme-dark-200 rounded-lg transition-colors">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-medium">Current Period:</span> {selectedPeriod}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-medium">Data Points:</span> {chartData.length}
          </div>
        </div>
      )}
    </div>
  );
}
