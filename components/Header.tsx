'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface HeaderProps {
  onRefresh: () => void;
  lastUpdated: Date | null;
  isLoading: boolean;
  isLiveMode?: boolean;
  onToggleLiveMode?: () => void;
}

type MarketStatus = 'pre-market' | 'open' | 'after-hours' | 'closed';

const getMarketStatus = (): { status: MarketStatus; label: string; color: string } => {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Weekend
  if (day === 0 || day === 6) {
    return { status: 'closed', label: 'Market Closed', color: 'bg-gray-500' };
  }

  // Times in EST (adjust for local timezone would be better in production)
  const preMarketOpen = 4 * 60; // 4:00 AM
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 16 * 60; // 4:00 PM
  const afterHoursClose = 20 * 60; // 8:00 PM

  if (totalMinutes >= preMarketOpen && totalMinutes < marketOpen) {
    return { status: 'pre-market', label: 'Pre-Market', color: 'bg-yellow-500' };
  } else if (totalMinutes >= marketOpen && totalMinutes < marketClose) {
    return { status: 'open', label: 'Market Open', color: 'bg-green-500' };
  } else if (totalMinutes >= marketClose && totalMinutes < afterHoursClose) {
    return { status: 'after-hours', label: 'After Hours', color: 'bg-orange-500' };
  } else {
    return { status: 'closed', label: 'Market Closed', color: 'bg-gray-500' };
  }
};

export default function Header({ onRefresh, lastUpdated, isLoading, isLiveMode = true, onToggleLiveMode }: HeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [marketStatus, setMarketStatus] = useState(getMarketStatus());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update market status every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketStatus(getMarketStatus());
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4 sm:gap-0">
          {/* Left side - Title and status */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">GME</span>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  GameStop Dashboard
                </h1>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>NYSE: GME</span>
                  <span className="hidden sm:inline">|</span>
                  <span className="hidden sm:inline">{format(currentTime, 'h:mm a')} ET</span>
                </div>
              </div>
            </div>

            {/* Market Status Badge */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center px-2.5 py-1 rounded-full ${
                marketStatus.status === 'open' ? 'bg-green-100' :
                marketStatus.status === 'pre-market' ? 'bg-yellow-100' :
                marketStatus.status === 'after-hours' ? 'bg-orange-100' : 'bg-gray-100'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${marketStatus.color} ${marketStatus.status === 'open' ? 'animate-pulse' : ''}`}></div>
                <span className={`text-xs font-medium ${
                  marketStatus.status === 'open' ? 'text-green-700' :
                  marketStatus.status === 'pre-market' ? 'text-yellow-700' :
                  marketStatus.status === 'after-hours' ? 'text-orange-700' : 'text-gray-700'
                }`}>
                  {marketStatus.label}
                </span>
              </div>

              {isLiveMode && (
                <div className="flex items-center px-2.5 py-1 rounded-full bg-blue-100">
                  <div className="w-2 h-2 rounded-full mr-2 bg-blue-500 animate-pulse"></div>
                  <span className="text-xs font-medium text-blue-700">Live</span>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {lastUpdated && (
              <div className="text-xs text-gray-500 hidden md:block">
                Updated: {format(lastUpdated, 'HH:mm:ss')}
              </div>
            )}

            {onToggleLiveMode && (
              <button
                onClick={onToggleLiveMode}
                className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded-lg transition-all ${
                  isLiveMode
                    ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                    : 'border-gray-300 text-gray-700 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full mr-2 ${isLiveMode ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                {isLiveMode ? 'Live' : 'Manual'}
              </button>
            )}

            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {isRefreshing || isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="hidden sm:inline">Refreshing...</span>
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
