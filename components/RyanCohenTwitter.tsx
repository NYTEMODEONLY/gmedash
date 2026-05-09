'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import axios from 'axios';

interface Tweet {
  id: string;
  text: string;
  createdAt: string;
  url: string;
  source?: string;
}

interface TwitterResponse {
  tweets: Tweet[];
  profileUrl: string;
  handle: string;
  source?: string;
  message?: string;
  lastUpdated?: string;
}

export default function RyanCohenTwitter() {
  const [feed, setFeed] = useState<TwitterResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const profileUrl = feed?.profileUrl || 'https://x.com/ryancohen';
  const handle = feed?.handle || '@ryancohen';

  const fetchTweets = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get<TwitterResponse>('/api/twitter', { timeout: 15000 });
      setFeed(response.data);
      setMessage(response.data.message || null);
    } catch (error) {
      console.error('Error fetching Ryan Cohen posts:', error);
      setMessage('Unable to load the free Ryan Cohen post feed.');
      setFeed(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTweets();
    const interval = window.setInterval(fetchTweets, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [fetchTweets]);

  return (
    <div className="bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ryan Cohen</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">GameStop Chairman & CEO</p>
          </div>
        </div>
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30 transition-colors"
        >
          {handle}
          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="border border-gray-100 dark:border-gme-dark-300 rounded-lg p-4">
              <div className="h-4 bg-gray-200 dark:bg-gme-dark-300 rounded w-5/6 mb-3" />
              <div className="h-3 bg-gray-200 dark:bg-gme-dark-300 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : feed?.tweets?.length ? (
        <div className="space-y-4">
          {feed.tweets.slice(0, 5).map((tweet) => (
            <a
              key={tweet.id}
              href={tweet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-gray-100 dark:border-gme-dark-300 p-4 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gme-dark-200 transition-all"
            >
              <p className="text-sm text-gray-900 dark:text-white leading-relaxed">{tweet.text}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{formatDistanceToNow(parseISO(tweet.createdAt), { addSuffix: true })}</span>
                <span>{tweet.source || 'Free RSS mirror'}</span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-1.414 1.414a4 4 0 01-5.657-5.657l1.414-1.414m7.657 3.657l1.414-1.414a4 4 0 00-5.657-5.657l-1.414 1.414" />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">Official X Profile</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            {message || 'The free public mirror is unavailable right now. Open X for the live profile.'}
          </p>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gme-dark-300">
        <div className="flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>{feed?.source || 'Free Nitter RSS mirror of public X posts'}</span>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
          >
            View on X
          </a>
        </div>
      </div>
    </div>
  );
}
