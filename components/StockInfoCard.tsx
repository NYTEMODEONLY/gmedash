'use client';

import { useEffect, useState, useRef } from 'react';
import { StockQuote } from '@/lib/api';
import ExportShareControls from '@/components/ExportShareControls';

interface ExtendedStockQuote extends StockQuote {
  source?: string;
  originalSource?: string;
  stale?: boolean;
  cacheAge?: number;
}

interface StockInfoCardProps {
  stockData: ExtendedStockQuote | null;
  isLoading: boolean;
  isLiveMode?: boolean;
}

const sourceConfig: Record<string, { label: string; url: string; className: string }> = {
  yahoo: {
    label: 'Yahoo Finance',
    url: 'https://finance.yahoo.com/quote/GME',
    className: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
  },
};

const isRegularMarketOpen = (): boolean => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const partMap = parts.reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = dayMap[partMap.weekday || 'Sun'];
  if (day === 0 || day === 6) return false;
  const totalMinutes = Number(partMap.hour || 0) * 60 + Number(partMap.minute || 0);
  return totalMinutes >= 9 * 60 + 30 && totalMinutes < 16 * 60;
};

export default function StockInfoCard({ stockData, isLoading, isLiveMode = true }: StockInfoCardProps) {
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef<number | null>(null);

  // Flash effect when price changes
  useEffect(() => {
    if (stockData?.price && prevPriceRef.current !== null) {
      if (stockData.price > prevPriceRef.current) {
        setPriceFlash('up');
      } else if (stockData.price < prevPriceRef.current) {
        setPriceFlash('down');
      }
      setTimeout(() => setPriceFlash(null), 1000);
    }
    prevPriceRef.current = stockData?.price || null;
  }, [stockData?.price]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 h-full border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gme-dark-300 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gme-dark-300 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gme-dark-300 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gme-dark-300 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gme-dark-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stockData) {
    return (
      <div className="bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 h-full border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
        <div className="text-center text-gray-500 py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No Data Available</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Unable to fetch stock data</p>
          <a
            href="https://finance.yahoo.com/quote/GME"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
          >
            Open Yahoo Finance source
          </a>
        </div>
      </div>
    );
  }

  const isPositive = stockData.change >= 0;
  const changeColor = isPositive ? 'text-stock-green' : 'text-stock-red';
  const changeBgColor = isPositive ? 'bg-stock-green/10 border-stock-green/30' : 'bg-stock-red/10 border-stock-red/30';
  const effectiveSource = stockData.source === 'cache'
    ? stockData.originalSource || 'yahoo'
    : stockData.source || 'yahoo';
  const source = sourceConfig[effectiveSource] || sourceConfig.yahoo;
  const sourceLabel = stockData.source === 'cache' ? `Cached from ${source.label}` : source.label;
  const refreshLabel = stockData.stale
    ? 'Data may be stale'
    : !isLiveMode
      ? 'Manual refresh only'
      : isRegularMarketOpen()
        ? 'Live: 30 sec refresh'
        : 'Closed-market refresh: 5 min';

  // Calculate day range percentage
  const dayRange = stockData.high - stockData.low;
  const currentPosition = dayRange > 0 ? ((stockData.price - stockData.low) / dayRange) * 100 : 50;
  const sectionId = 'stock-info';
  const statCards = [
    { label: 'Open', value: `$${stockData.open.toFixed(2)}` },
    { label: 'Prev Close', value: `$${stockData.previousClose.toFixed(2)}` },
    { label: 'Day High', value: `$${stockData.high.toFixed(2)}`, className: 'text-stock-green' },
    { label: 'Day Low', value: `$${stockData.low.toFixed(2)}`, className: 'text-stock-red' },
  ];

  return (
    <div id={sectionId} className="scroll-mt-24 bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 h-full border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
      {/* Header */}
      <div className="flex justify-between items-start gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{stockData.symbol}</h2>
            <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gme-dark-300 text-gray-600 dark:text-gray-400 rounded-full">NYSE</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">GameStop Corp.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ExportShareControls id={sectionId} title="Stock Info" data={stockData} compact />
          <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${changeBgColor} ${changeColor}`}>
            {isPositive ? '+' : ''}{stockData.changePercent}
          </div>
        </div>
      </div>

      {/* Price */}
      <div className={`mb-6 p-4 rounded-lg transition-colors ${
        priceFlash === 'up' ? 'bg-stock-green/20' :
        priceFlash === 'down' ? 'bg-stock-red/20' : 'bg-gray-50 dark:bg-gme-dark-200'
      }`}>
        <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
          ${stockData.price.toFixed(2)}
        </div>
        <div className={`text-lg font-medium ${changeColor} flex items-center gap-2`}>
          {isPositive ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
          <span>{isPositive ? '+' : ''}{stockData.change.toFixed(2)} ({stockData.changePercent})</span>
        </div>
      </div>

      {/* Day Range Slider */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>Day Range</span>
          <span>${stockData.low.toFixed(2)} - ${stockData.high.toFixed(2)}</span>
        </div>
        <div className="relative h-2 bg-gray-200 dark:bg-gme-dark-300 rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-gradient-to-r from-stock-red via-yellow-500 to-stock-green rounded-full"
            style={{ width: '100%' }}
          />
          <div
            className="absolute w-3 h-3 bg-white dark:bg-white rounded-full shadow-md -top-0.5 transform -translate-x-1/2 border border-gray-300 dark:border-transparent"
            style={{ left: `${currentPosition}%` }}
          />
        </div>
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((stat) => (
            <div key={stat.label} className="bg-gray-50 dark:bg-gme-dark-200 rounded-lg p-3 transition-colors">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{stat.label}</div>
              <div className={`text-sm font-semibold ${stat.className || 'text-gray-900 dark:text-white'}`}>{stat.value}</div>
            </div>
        ))}
      </div>

      {/* Volume */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gme-dark-300">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Volume</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {parseInt(stockData.volume).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gme-dark-300">
        <div className="flex flex-wrap gap-2">
          <a
            href="https://finance.yahoo.com/quote/GME"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-2.5 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full hover:bg-purple-200 dark:hover:bg-purple-500/30 transition-colors"
          >
            Yahoo Finance
          </a>
          <a
            href="https://www.tradingview.com/symbols/NYSE-GME/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-2.5 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-colors"
          >
            TradingView
          </a>
        </div>
      </div>

      {/* Data Source & Timing */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gme-dark-300">
        <div className="flex items-center justify-between text-xs">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-2 py-0.5 rounded hover:opacity-80 transition-opacity ${source.className}`}>
            {sourceLabel}
          </a>
          <span className="text-gray-500 dark:text-gray-400">
            {stockData.stale ? (
              <span className="text-amber-600 dark:text-amber-500">{refreshLabel}</span>
            ) : (
              refreshLabel
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
