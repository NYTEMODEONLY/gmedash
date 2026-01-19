'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { NewsArticle } from '@/lib/api';

interface NewsSectionProps {
  news: NewsArticle[];
  isLoading: boolean;
}

type TabType = 'official' | 'media';

export default function NewsSection({ news, isLoading }: NewsSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>('official');
  const [showAll, setShowAll] = useState(false);

  // Separate official GameStop news from media news
  const officialNews = news.filter(article => article.source.name === 'GameStop IR');
  const mediaNews = news.filter(article => article.source.name !== 'GameStop IR');

  const currentNews = activeTab === 'official' ? officialNews : mediaNews;
  const displayedNews = showAll ? currentNews : currentNews.slice(0, 8);

  // Reset showAll when switching tabs
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setShowAll(false);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gme-dark-300 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border border-gray-200 dark:border-gme-dark-300 rounded-lg p-4">
                <div className="h-4 bg-gray-200 dark:bg-gme-dark-300 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gme-dark-300 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gme-dark-300 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!news.length) {
    return (
      <div className="bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No News Available</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Unable to fetch news articles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Latest News</h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {news.length} articles
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gme-dark-200 rounded-lg p-1">
        <button
          onClick={() => handleTabChange('official')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'official'
              ? 'bg-gme-red text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gme-dark-300'
          }`}
        >
          Official ({officialNews.length})
        </button>
        <button
          onClick={() => handleTabChange('media')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'media'
              ? 'bg-gme-red text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gme-dark-300'
          }`}
        >
          Media ({mediaNews.length})
        </button>
      </div>

      {/* Tab Description */}
      <div className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        {activeTab === 'official' ? (
          <span>Official SEC filings (8-K reports) containing material events and press releases from GameStop</span>
        ) : (
          <span>News coverage from Yahoo Finance, Google News, and other media sources</span>
        )}
      </div>

      {/* Articles List */}
      {currentNews.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">No {activeTab === 'official' ? 'official' : 'media'} news available</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {displayedNews.map((article, index) => (
              <article key={index} className="border border-gray-200 dark:border-gme-dark-300 rounded-lg p-4 hover:shadow-md hover:border-gme-red/30 dark:hover:border-gme-red/50 transition-all">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-gme-red transition-colors"
                    >
                      {article.title}
                    </a>
                  </h3>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 flex-shrink-0">
                    {format(parseISO(article.publishedAt), 'MMM dd')}
                  </span>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                  {article.description}
                </p>

                <div className="flex justify-between items-center">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    article.source.name === 'GameStop IR'
                      ? 'bg-gme-red/10 text-gme-red dark:bg-gme-red/20'
                      : 'bg-gray-100 dark:bg-gme-dark-200 text-gray-500 dark:text-gray-400'
                  }`}>
                    {article.source.name}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {format(parseISO(article.publishedAt), 'MMM dd, yyyy HH:mm')}
                  </span>
                </div>
              </article>
            ))}
          </div>

          {currentNews.length > 8 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-sm text-gme-red hover:text-gme-red-dark font-medium transition-colors cursor-pointer"
              >
                {showAll ? 'Show fewer articles' : `View all ${currentNews.length} articles`}
              </button>
            </div>
          )}
        </>
      )}

      <div className="mt-4 p-3 bg-gray-50 dark:bg-gme-dark-200 rounded-lg transition-colors">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium">Sources:</span> SEC EDGAR (Official), Yahoo Finance, Google News
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Auto-refresh: 5 min
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Official news from SEC filings. Media news may have 15-60 min delay due to RSS aggregation.
        </div>
      </div>
    </div>
  );
}
