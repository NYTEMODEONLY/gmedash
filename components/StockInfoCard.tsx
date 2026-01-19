'use client';

import { useEffect, useState, useRef } from 'react';
import { StockQuote } from '@/lib/api';

interface ExtendedStockQuote extends StockQuote {
  source?: string;
  stale?: boolean;
  cacheAge?: number;
}

interface StockInfoCardProps {
  stockData: ExtendedStockQuote | null;
  isLoading: boolean;
}

export default function StockInfoCard({ stockData, isLoading }: StockInfoCardProps) {
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
      <div className="bg-gme-dark-100 rounded-lg shadow-md p-6 h-full border border-gme-dark-300">
        <div className="animate-pulse">
          <div className="h-4 bg-gme-dark-300 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gme-dark-300 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gme-dark-300 rounded"></div>
            <div className="h-4 bg-gme-dark-300 rounded w-3/4"></div>
            <div className="h-4 bg-gme-dark-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stockData) {
    return (
      <div className="bg-gme-dark-100 rounded-lg shadow-md p-6 h-full border border-gme-dark-300">
        <div className="text-center text-gray-500 py-8">
          <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-white">No Data Available</h3>
          <p className="mt-1 text-sm text-gray-500">Unable to fetch stock data</p>
        </div>
      </div>
    );
  }

  const isPositive = stockData.change >= 0;
  const changeColor = isPositive ? 'text-stock-green' : 'text-stock-red';
  const changeBgColor = isPositive ? 'bg-stock-green/10 border-stock-green/30' : 'bg-stock-red/10 border-stock-red/30';

  // Calculate day range percentage
  const dayRange = stockData.high - stockData.low;
  const currentPosition = dayRange > 0 ? ((stockData.price - stockData.low) / dayRange) * 100 : 50;

  return (
    <div className="bg-gme-dark-100 rounded-lg shadow-md p-6 h-full border border-gme-dark-300">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white">{stockData.symbol}</h2>
            <span className="text-xs px-2 py-0.5 bg-gme-dark-300 text-gray-400 rounded-full">NYSE</span>
          </div>
          <p className="text-sm text-gray-500">GameStop Corp.</p>
        </div>
        <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${changeBgColor} ${changeColor}`}>
          {isPositive ? '+' : ''}{stockData.changePercent}
        </div>
      </div>

      {/* Price */}
      <div className={`mb-6 p-4 rounded-lg transition-colors ${
        priceFlash === 'up' ? 'bg-stock-green/20' :
        priceFlash === 'down' ? 'bg-stock-red/20' : 'bg-gme-dark-200'
      }`}>
        <div className="text-4xl font-bold text-white mb-1">
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
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Day Range</span>
          <span>${stockData.low.toFixed(2)} - ${stockData.high.toFixed(2)}</span>
        </div>
        <div className="relative h-2 bg-gme-dark-300 rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-gradient-to-r from-stock-red via-yellow-500 to-stock-green rounded-full"
            style={{ width: '100%' }}
          />
          <div
            className="absolute w-3 h-3 bg-white rounded-full shadow-md -top-0.5 transform -translate-x-1/2"
            style={{ left: `${currentPosition}%` }}
          />
        </div>
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gme-dark-200 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Open</div>
          <div className="text-sm font-semibold text-white">${stockData.open.toFixed(2)}</div>
        </div>
        <div className="bg-gme-dark-200 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Prev Close</div>
          <div className="text-sm font-semibold text-white">${stockData.previousClose.toFixed(2)}</div>
        </div>
        <div className="bg-gme-dark-200 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Day High</div>
          <div className="text-sm font-semibold text-stock-green">${stockData.high.toFixed(2)}</div>
        </div>
        <div className="bg-gme-dark-200 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Day Low</div>
          <div className="text-sm font-semibold text-stock-red">${stockData.low.toFixed(2)}</div>
        </div>
      </div>

      {/* Volume */}
      <div className="mt-4 pt-4 border-t border-gme-dark-300">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Volume</span>
          <span className="text-sm font-semibold text-white">
            {parseInt(stockData.volume).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-4 pt-4 border-t border-gme-dark-300">
        <div className="flex flex-wrap gap-2">
          <a
            href="https://finance.yahoo.com/quote/GME"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-2.5 py-1 bg-purple-500/20 text-purple-400 rounded-full hover:bg-purple-500/30 transition-colors"
          >
            Yahoo Finance
          </a>
          <a
            href="https://www.tradingview.com/symbols/NYSE-GME/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-2.5 py-1 bg-blue-500/20 text-blue-400 rounded-full hover:bg-blue-500/30 transition-colors"
          >
            TradingView
          </a>
        </div>
      </div>

      {/* Data Source */}
      {stockData.source && (
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className={`px-2 py-0.5 rounded ${
            stockData.source === 'finnhub' ? 'bg-stock-green/20 text-stock-green' :
            stockData.source === 'yahoo' ? 'bg-purple-500/20 text-purple-400' :
            'bg-gme-dark-300 text-gray-500'
          }`}>
            {stockData.source}
          </span>
          {stockData.stale && (
            <span className="text-amber-500">Data may be stale</span>
          )}
        </div>
      )}
    </div>
  );
}
