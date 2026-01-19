'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useTheme } from '@/lib/ThemeContext';

interface HeaderProps {
  onRefresh: () => void;
  lastUpdated: Date | null;
  isLoading: boolean;
  isLiveMode?: boolean;
  onToggleLiveMode?: () => void;
}

type MarketStatus = 'pre-market' | 'open' | 'after-hours' | 'closed';

const getMarketStatus = (): { status: MarketStatus; label: string; color: string; bgColor: string; textColor: string } => {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Weekend
  if (day === 0 || day === 6) {
    return { status: 'closed', label: 'Market Closed', color: 'bg-gray-500', bgColor: 'bg-gray-500/20', textColor: 'text-gray-400' };
  }

  // Times in EST (adjust for local timezone would be better in production)
  const preMarketOpen = 4 * 60; // 4:00 AM
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 16 * 60; // 4:00 PM
  const afterHoursClose = 20 * 60; // 8:00 PM

  if (totalMinutes >= preMarketOpen && totalMinutes < marketOpen) {
    return { status: 'pre-market', label: 'Pre-Market', color: 'bg-yellow-500', bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-500' };
  } else if (totalMinutes >= marketOpen && totalMinutes < marketClose) {
    return { status: 'open', label: 'Market Open', color: 'bg-stock-green', bgColor: 'bg-stock-green/20', textColor: 'text-stock-green' };
  } else if (totalMinutes >= marketClose && totalMinutes < afterHoursClose) {
    return { status: 'after-hours', label: 'After Hours', color: 'bg-orange-500', bgColor: 'bg-orange-500/20', textColor: 'text-orange-500' };
  } else {
    return { status: 'closed', label: 'Market Closed', color: 'bg-gray-500', bgColor: 'bg-gray-500/20', textColor: 'text-gray-400' };
  }
};

export default function Header({ onRefresh, lastUpdated, isLoading, isLiveMode = true, onToggleLiveMode }: HeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [marketStatus, setMarketStatus] = useState(getMarketStatus());
  const [currentTime, setCurrentTime] = useState(new Date());
  const { theme, toggleTheme } = useTheme();

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
    <header className="bg-white dark:bg-gme-dark-100 border-b border-gray-200 dark:border-gme-dark-300 sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4 sm:gap-0">
          {/* Left side - Title and status */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gme-gradient rounded-lg flex items-center justify-center shadow-lg gme-glow">
                <span className="text-white font-bold text-sm">GME</span>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  GameStop Dashboard
                </h1>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>NYSE: GME</span>
                  <span className="hidden sm:inline">|</span>
                  <span className="hidden sm:inline">{format(currentTime, 'h:mm a')} ET</span>
                </div>
              </div>
            </div>

            {/* Market Status Badge */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center px-2.5 py-1 rounded-full ${marketStatus.bgColor}`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${marketStatus.color} ${marketStatus.status === 'open' ? 'animate-pulse' : ''}`}></div>
                <span className={`text-xs font-medium ${marketStatus.textColor}`}>
                  {marketStatus.label}
                </span>
              </div>

              {isLiveMode && (
                <div className="flex items-center px-2.5 py-1 rounded-full bg-accent-blue/20">
                  <div className="w-2 h-2 rounded-full mr-2 bg-accent-blue animate-pulse"></div>
                  <span className="text-xs font-medium text-accent-blue">Live</span>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {lastUpdated && (
              <div className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
                Updated: {format(lastUpdated, 'HH:mm:ss')}
              </div>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gme-dark-300 hover:bg-gray-200 dark:hover:bg-gme-dark-400 border border-gray-200 dark:border-gme-dark-400 transition-all"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            {onToggleLiveMode && (
              <button
                onClick={onToggleLiveMode}
                className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded-lg transition-all ${
                  isLiveMode
                    ? 'border-stock-green/50 text-stock-green bg-stock-green/10 hover:bg-stock-green/20'
                    : 'border-gray-300 dark:border-gme-dark-400 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gme-dark-300 hover:bg-gray-200 dark:hover:bg-gme-dark-400'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full mr-2 ${isLiveMode ? 'bg-stock-green' : 'bg-gray-400 dark:bg-gray-500'}`}></div>
                {isLiveMode ? 'Live' : 'Manual'}
              </button>
            )}

            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gme-red hover:bg-gme-red-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gme-red disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-gme-red/25"
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
