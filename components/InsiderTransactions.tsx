'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import ExportShareControls from '@/components/ExportShareControls';

interface InsiderTransaction {
  id: string;
  filingDate: string;
  transactionDate: string;
  reporter: string;
  role: string;
  title: string;
  transactionCode: string;
  transactionType: string;
  acquiredDisposed: 'A' | 'D' | null;
  shares: number | null;
  price: number | null;
  value: number | null;
  sharesOwnedAfter: number | null;
  ownershipForm: string | null;
  sourceUrl: string;
}

interface InsiderResponse {
  source?: string;
  sourceUrl?: string;
  lastUpdated?: string;
  summary?: {
    openMarketBuys: number;
    openMarketBuyShares: number;
    openMarketBuyValue: number;
    openMarketSales: number;
    openMarketSaleShares: number;
    openMarketSaleValue: number;
  };
  transactions: InsiderTransaction[];
  error?: string;
}

const numberText = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  return value.toLocaleString();
};

const money = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A';
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const price = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A';
  return `$${value.toFixed(2)}`;
};

const badgeClass = (transaction: InsiderTransaction): string => {
  if (transaction.transactionCode === 'P') return 'bg-stock-green/10 text-stock-green dark:bg-stock-green/20';
  if (transaction.transactionCode === 'S') return 'bg-stock-red/10 text-stock-red dark:bg-stock-red/20';
  if (transaction.acquiredDisposed === 'A') return 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400';
  if (transaction.acquiredDisposed === 'D') return 'bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-400';
  return 'bg-gray-100 dark:bg-gme-dark-300 text-gray-800 dark:text-gray-300';
};

export default function InsiderTransactions() {
  const [data, setData] = useState<InsiderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInsiders = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get<InsiderResponse>('/api/insider-transactions', {
        timeout: 20000,
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching insider transactions:', error);
      setData({ transactions: [], error: 'Unable to load SEC insider transaction data.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsiders();
  }, [fetchInsiders]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 dark:bg-gme-dark-300 rounded w-1/3 mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="h-20 bg-gray-100 dark:bg-gme-dark-200 rounded-lg" />
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="h-12 bg-gray-100 dark:bg-gme-dark-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data?.transactions?.length) {
    return (
      <div className="bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Insider Stock Transactions</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{data?.error || 'No recent Form 3/4/5 transactions found.'}</p>
        <a
          href="https://www.sec.gov/edgar/browse/?CIK=0001326380&owner=include"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex text-sm text-gme-red hover:text-gme-red-dark font-medium"
        >
          SEC ownership filings
        </a>
      </div>
    );
  }

  const summary = data.summary;
  const sectionId = 'insider-stock-transactions';
  const summaryCards = [
    { label: 'Open-Market Buys', value: summary?.openMarketBuys || 0, detail: `${numberText(summary?.openMarketBuyShares)} shares`, className: 'text-stock-green' },
    { label: 'Buy Value', value: money(summary?.openMarketBuyValue), detail: 'Code P only' },
    { label: 'Open-Market Sales', value: summary?.openMarketSales || 0, detail: `${numberText(summary?.openMarketSaleShares)} shares`, className: 'text-stock-red' },
    { label: 'Sale Value', value: money(summary?.openMarketSaleValue), detail: 'Code S only' },
  ];

  return (
    <div id={sectionId} className="scroll-mt-24 bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Insider Stock Transactions</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Board, officer, and Section 16 ownership filings showing reported buys, sells, awards, and dispositions
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportShareControls id={sectionId} title="Insider Stock Transactions" data={data} />
          <a
            href={data.sourceUrl || 'https://www.sec.gov/edgar/browse/?CIK=0001326380&owner=include'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-full bg-gme-red/10 text-gme-red hover:bg-gme-red/20 transition-colors"
          >
            SEC Ownership
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {summaryCards.map((card) => (
            <div key={card.label} className="bg-gray-50 dark:bg-gme-dark-200 rounded-lg p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400">{card.label}</div>
              <div className={`mt-1 text-xl font-semibold ${card.className || 'text-gray-900 dark:text-white'}`}>{card.value}</div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{card.detail}</div>
            </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gme-dark-300">
          <thead className="bg-gray-50 dark:bg-gme-dark-200">
            <tr>
              {['Date', 'Insider', 'Role', 'Type', 'Shares', 'Price', 'Value', 'After'].map((label) => (
                <th key={label} className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gme-dark-300">
            {data.transactions.slice(0, 12).map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gme-dark-200 transition-colors">
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <a href={transaction.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-gme-red hover:text-gme-red-dark font-medium">
                    {format(parseISO(transaction.transactionDate), 'MMM dd, yyyy')}
                  </a>
                </td>
                <td className="px-3 py-4 text-sm text-gray-900 dark:text-white">{transaction.reporter}</td>
                <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{transaction.role}</td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badgeClass(transaction)}`}>
                    {transaction.transactionCode || 'N/A'} - {transaction.transactionType}
                  </span>
                </td>
                <td className="px-3 py-4 text-sm text-gray-900 dark:text-white">{numberText(transaction.shares)}</td>
                <td className="px-3 py-4 text-sm text-gray-900 dark:text-white">{price(transaction.price)}</td>
                <td className="px-3 py-4 text-sm text-gray-900 dark:text-white">{money(transaction.value)}</td>
                <td className="px-3 py-4 text-sm text-gray-900 dark:text-white">{numberText(transaction.sharesOwnedAfter)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-gray-50 dark:bg-gme-dark-200 rounded-lg transition-colors">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            Source:{' '}
            <a
              href={data.sourceUrl || 'https://www.sec.gov/edgar/browse/?CIK=0001326380&owner=include'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
            >
              SEC Forms 3, 4, and 5
            </a>
          </span>
          <span>{data.lastUpdated ? `Updated ${new Date(data.lastUpdated).toLocaleString()}` : 'SEC sourced'}</span>
        </div>
      </div>
    </div>
  );
}
