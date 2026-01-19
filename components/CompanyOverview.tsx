'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface CompanyInfo {
  name: string;
  symbol: string;
  exchange: string;
  sector: string;
  industry: string;
  marketCap: number | null;
  marketCapFormatted: string;
  employees: number;
  headquarters: string;
  ceo: string;
  founded: string;
  website: string;
  description: string;
  peRatio: number | null;
  eps: number | null;
  dividendYield: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  avgVolume: number | null;
  beta: number | null;
  sharesOutstanding: number | null;
  floatShares: number | null;
  dataSource?: string;
  message?: string;
}

export default function CompanyOverview() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCompanyInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get<CompanyInfo>('/api/company-info', {
        timeout: 15000,
      });
      setCompanyInfo(response.data);
    } catch (err) {
      console.error('Error fetching company info:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanyInfo();
  }, [fetchCompanyInfo]);

  const formatNumber = (num: number): string => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-6"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i}>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!companyInfo) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">GME</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{companyInfo.name}</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>{companyInfo.exchange}: {companyInfo.symbol}</span>
              <span>•</span>
              <span>{companyInfo.sector}</span>
            </div>
          </div>
        </div>
        <a
          href={companyInfo.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Website
          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-6 leading-relaxed">
        {companyInfo.description}
      </p>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Market Cap</div>
          <div className="text-lg font-semibold text-gray-900">{companyInfo.marketCapFormatted}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">P/E Ratio</div>
          <div className="text-lg font-semibold text-gray-900">
            {companyInfo.peRatio ? companyInfo.peRatio.toFixed(2) : 'N/A'}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">EPS</div>
          <div className="text-lg font-semibold text-gray-900">
            {companyInfo.eps ? `$${companyInfo.eps.toFixed(2)}` : 'N/A'}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Avg Volume</div>
          <div className="text-lg font-semibold text-gray-900">
            {companyInfo.avgVolume ? formatNumber(companyInfo.avgVolume) : 'N/A'}
          </div>
        </div>
      </div>

      {/* 52-Week Range */}
      {companyInfo.fiftyTwoWeekHigh && companyInfo.fiftyTwoWeekLow ? (
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>52-Week Range</span>
            <span>${companyInfo.fiftyTwoWeekLow.toFixed(2)} - ${companyInfo.fiftyTwoWeekHigh.toFixed(2)}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <div className="text-xs text-gray-500 mb-2">52-Week Range</div>
          <div className="text-sm text-gray-400">Data unavailable</div>
        </div>
      )}

      {/* Additional Info */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">CEO</span>
            <span className="text-sm font-medium text-gray-900">{companyInfo.ceo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Headquarters</span>
            <span className="text-sm font-medium text-gray-900">{companyInfo.headquarters}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Founded</span>
            <span className="text-sm font-medium text-gray-900">{companyInfo.founded}</span>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Employees</span>
            <span className="text-sm font-medium text-gray-900">~{companyInfo.employees.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Industry</span>
            <span className="text-sm font-medium text-gray-900">{companyInfo.industry}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Beta</span>
            <span className="text-sm font-medium text-gray-900">
              {companyInfo.beta ? companyInfo.beta.toFixed(2) : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Shares Info */}
      {companyInfo.sharesOutstanding && companyInfo.sharesOutstanding > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Shares Outstanding</div>
              <div className="text-sm font-semibold text-gray-900">{formatNumber(companyInfo.sharesOutstanding)}</div>
            </div>
            {companyInfo.floatShares && (
              <div className="text-right">
                <div className="text-xs text-gray-500">Float</div>
                <div className="text-sm font-semibold text-gray-900">{formatNumber(companyInfo.floatShares)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Source Indicator */}
      {companyInfo.dataSource && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Data source: {companyInfo.dataSource}
            </span>
            {companyInfo.message && (
              <span className="text-xs text-amber-600">{companyInfo.message}</span>
            )}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex flex-wrap gap-2">
          <a
            href="https://news.gamestop.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
          >
            Investor Relations
          </a>
          <a
            href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001326380&type=&dateb=&owner=include&count=40"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
          >
            SEC Filings
          </a>
          <a
            href="https://finance.yahoo.com/quote/GME"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
          >
            Yahoo Finance
          </a>
        </div>
      </div>
    </div>
  );
}
