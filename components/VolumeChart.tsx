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
import { HistoricalData } from '@/lib/api';

interface VolumeChartProps {
  data: HistoricalData[];
  isLoading: boolean;
}

export default function VolumeChart({ data, isLoading }: VolumeChartProps) {
  const chartData = useMemo(() => {
    if (!data.length) return [];
    
    return data.map(item => ({
      ...item,
      date: format(parseISO(item.date), 'MMM dd'),
      fullDate: item.date,
      volumeFormatted: (item.volume / 1000000).toFixed(1), // Convert to millions
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{format(parseISO(data.fullDate), 'MMM dd, yyyy')}</p>
          <p className="text-sm text-gray-600">
            Volume: <span className="font-medium">{data.volume.toLocaleString()}</span>
          </p>
          <p className="text-sm text-gray-600">
            Volume (M): <span className="font-medium">{data.volumeFormatted}M</span>
          </p>
          <p className="text-sm text-gray-600">
            Close: <span className="font-medium">${data.close.toFixed(2)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Volume Data</h3>
          <p className="mt-1 text-sm text-gray-500">Unable to fetch volume data</p>
        </div>
      </div>
    );
  }

  const latestVolume = data[data.length - 1].volume;
  const avgVolume = data.reduce((sum, item) => sum + item.volume, 0) / data.length;
  const maxVolume = Math.max(...data.map(item => item.volume));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Trading Volume</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-blue-600 font-medium">Latest Volume</div>
            <div className="text-xl font-bold text-blue-700">
              {(latestVolume / 1000000).toFixed(1)}M
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-green-600 font-medium">Average Volume</div>
            <div className="text-xl font-bold text-green-700">
              {(avgVolume / 1000000).toFixed(1)}M
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-purple-600 font-medium">Max Volume</div>
            <div className="text-xl font-bold text-purple-700">
              {(maxVolume / 1000000).toFixed(1)}M
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
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="volume"
              fill="#8b5cf6"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Volume Trend:</span> {latestVolume > avgVolume ? 'Above Average' : 'Below Average'}
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-medium">Data Points:</span> {chartData.length}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Volume represents the number of shares traded during the specified time period.
        </div>
      </div>
    </div>
  );
} 