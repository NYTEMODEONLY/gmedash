'use client';

import { format, parseISO } from 'date-fns';
import { NewsArticle } from '@/lib/api';

interface NewsSectionProps {
  news: NewsArticle[];
  isLoading: boolean;
}

export default function NewsSection({ news, isLoading }: NewsSectionProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!news.length) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No News Available</h3>
          <p className="mt-1 text-sm text-gray-500">Unable to fetch news articles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Latest News</h2>
        <div className="text-sm text-gray-500">
          {news.length} articles
        </div>
      </div>

      <div className="space-y-4">
        {news.slice(0, 8).map((article, index) => (
          <article key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition-colors"
                >
                  {article.title}
                </a>
              </h3>
              <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                {format(parseISO(article.publishedAt), 'MMM dd')}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {article.description}
            </p>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 font-medium">
                {article.source.name}
              </span>
              <span className="text-xs text-gray-400">
                {format(parseISO(article.publishedAt), 'MMM dd, yyyy HH:mm')}
              </span>
            </div>
          </article>
        ))}
      </div>

      {news.length > 8 && (
        <div className="mt-4 text-center">
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View all {news.length} articles →
          </button>
        </div>
      )}

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-500">
          <span className="font-medium">Source:</span> NewsAPI - Latest GameStop and GME related news
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Articles are automatically updated and sorted by publication date.
        </div>
      </div>
    </div>
  );
} 