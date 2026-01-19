'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import StockInfoCard from '@/components/StockInfoCard';
import CompanyOverview from '@/components/CompanyOverview';
import PriceChart from '@/components/PriceChart';
import ShortingChart from '@/components/ShortingChart';
import VolumeChart from '@/components/VolumeChart';
import NewsSection from '@/components/NewsSection';
import SECFilings from '@/components/SECFilings';
import RyanCohenTwitter from '@/components/RyanCohenTwitter';
import PressReleases from '@/components/PressReleases';
import UpcomingEvents from '@/components/UpcomingEvents';
import Footer from '@/components/Footer';
import {
  getStockQuote,
  getHistoricalData,
  getShortInterest,
  getNews,
  getSECFilings,
  createPriceStream,
  StockQuote,
  HistoricalData,
  ShortInterest,
  NewsArticle,
  SECFiling,
} from '@/lib/api';

export default function Dashboard() {
  // State for all data
  const [stockData, setStockData] = useState<StockQuote | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [shortingData, setShortingData] = useState<ShortInterest[]>([]);
  const [newsData, setNewsData] = useState<NewsArticle[]>([]);
  const [secFilings, setSecFilings] = useState<SECFiling[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(false);
  const [isLoadingShorting, setIsLoadingShorting] = useState(false);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [isLoadingSEC, setIsLoadingSEC] = useState(false);

  // UI state
  const [selectedPeriod, setSelectedPeriod] = useState('1Y');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [priceStreamCleanup, setPriceStreamCleanup] = useState<(() => void) | null>(null);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch stock quote
      setIsLoadingStock(true);
      const quote = await getStockQuote();
      setStockData(quote);
      setIsLoadingStock(false);

      // Fetch historical data
      setIsLoadingHistorical(true);
      const historical = await getHistoricalData('GME', selectedPeriod);
      setHistoricalData(historical);
      setIsLoadingHistorical(false);

      // Fetch shorting data
      setIsLoadingShorting(true);
      const shorting = await getShortInterest();
      setShortingData(shorting);
      setIsLoadingShorting(false);

      // Fetch news
      setIsLoadingNews(true);
      const news = await getNews();
      setNewsData(news);
      setIsLoadingNews(false);

      // Fetch SEC filings
      setIsLoadingSEC(true);
      const filings = await getSECFilings();
      setSecFilings(filings);
      setIsLoadingSEC(false);

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod]);

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Live price streaming
  useEffect(() => {
    if (isLiveMode && !priceStreamCleanup) {
      const cleanup = createPriceStream('GME', (quote) => {
        if (quote) {
          setStockData(quote);
          setLastUpdated(new Date());
        }
      });
      setPriceStreamCleanup(() => cleanup);
    } else if (!isLiveMode && priceStreamCleanup) {
      priceStreamCleanup();
      setPriceStreamCleanup(null);
    }

    return () => {
      if (priceStreamCleanup) {
        priceStreamCleanup();
      }
    };
  }, [isLiveMode, priceStreamCleanup]);

  // Auto-refresh other data every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (isLiveMode) {
        // Refresh news every 5 minutes
        setIsLoadingNews(true);
        getNews().then(news => {
          setNewsData(news);
          setIsLoadingNews(false);
        }).catch(() => setIsLoadingNews(false));

        // Refresh SEC filings every 10 minutes
        if (Math.random() > 0.5) { // 50% chance to reduce API calls
          setIsLoadingSEC(true);
          getSECFilings().then(filings => {
            setSecFilings(filings);
            setIsLoadingSEC(false);
          }).catch(() => setIsLoadingSEC(false));
        }
      }
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [isLiveMode]);

  // Handle period change
  const handlePeriodChange = useCallback(async (period: string) => {
    setSelectedPeriod(period);
    setIsLoadingHistorical(true);

    try {
      const historical = await getHistoricalData('GME', period);
      setHistoricalData(historical);
    } catch (err) {
      console.error('Error fetching historical data:', err);
      setError('Failed to fetch historical data.');
    } finally {
      setIsLoadingHistorical(false);
    }
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await fetchAllData();
  }, [fetchAllData]);

  // Toggle live mode
  const toggleLiveMode = useCallback(() => {
    setIsLiveMode(prev => !prev);
  }, []);

  return (
    <div className="min-h-screen bg-gme-dark">
      <Header
        onRefresh={handleRefresh}
        lastUpdated={lastUpdated}
        isLoading={isLoading}
        isLiveMode={isLiveMode}
        onToggleLiveMode={toggleLiveMode}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Company Overview - Full Width */}
        <div className="mb-8">
          <CompanyOverview />
        </div>

        {/* Stock Info and Price Chart Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Stock Info Card - 1/3 Width */}
          <div className="lg:col-span-1">
            <StockInfoCard
              stockData={stockData}
              isLoading={isLoadingStock}
            />
          </div>

          {/* Price Chart - 2/3 Width */}
          <div className="lg:col-span-2">
            <PriceChart
              data={historicalData}
              isLoading={isLoadingHistorical}
              onPeriodChange={handlePeriodChange}
              selectedPeriod={selectedPeriod}
            />
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ShortingChart
            data={shortingData}
            isLoading={isLoadingShorting}
          />
          <VolumeChart
            data={historicalData}
            isLoading={isLoadingHistorical}
          />
        </div>

        {/* Ryan Cohen Twitter and Press Releases Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <RyanCohenTwitter />
          <PressReleases autoRefresh={isLiveMode} />
        </div>

        {/* Upcoming Events Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            <UpcomingEvents />
          </div>
          <div className="lg:col-span-2">
            <NewsSection
              news={newsData}
              isLoading={isLoadingNews}
            />
          </div>
        </div>

        {/* SEC Filings - Full Width */}
        <div className="mb-8">
          <SECFilings
            filings={secFilings}
            isLoading={isLoadingSEC}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
