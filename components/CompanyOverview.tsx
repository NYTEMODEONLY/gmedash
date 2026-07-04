'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ExportShareControls from '@/components/ExportShareControls';
import { createAnchorId } from '@/lib/export-share';

interface CompanyInfo {
  name: string;
  symbol: string;
  exchange: string;
  sector: string;
  industry: string;
  marketCap: number | null;
  marketCapFormatted: string;
  employees: number | null;
  employeesText?: string | null;
  headquarters: string | null;
  ceo: string | null;
  founded: string | null;
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
  annualReportUrl?: string | null;
  wikipediaUrl?: string;
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
      <div className="bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gme-dark-300 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gme-dark-300 rounded w-full mb-6"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i}>
                <div className="h-3 bg-gray-200 dark:bg-gme-dark-300 rounded w-1/2 mb-2"></div>
                <div className="h-5 bg-gray-200 dark:bg-gme-dark-300 rounded w-3/4"></div>
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

  const sectionId = 'company-overview';
  const metricCards = [
    { label: 'Market Cap', value: companyInfo.marketCapFormatted, rawValue: companyInfo.marketCap },
    { label: 'P/E Ratio', value: companyInfo.peRatio ? companyInfo.peRatio.toFixed(2) : 'N/A', rawValue: companyInfo.peRatio },
    { label: 'EPS', value: companyInfo.eps ? `$${companyInfo.eps.toFixed(2)}` : 'N/A', rawValue: companyInfo.eps },
    { label: 'Avg Volume', value: companyInfo.avgVolume ? formatNumber(companyInfo.avgVolume) : 'N/A', rawValue: companyInfo.avgVolume },
  ];
  const details = [
    { label: 'CEO', value: companyInfo.ceo || 'N/A' },
    { label: 'Headquarters', value: companyInfo.headquarters || 'N/A' },
    { label: 'Founded', value: companyInfo.founded || 'N/A' },
    { label: 'Employees', value: companyInfo.employeesText || (companyInfo.employees ? companyInfo.employees.toLocaleString() : 'N/A'), rawValue: companyInfo.employees },
    { label: 'Industry', value: companyInfo.industry },
    { label: 'Beta', value: companyInfo.beta ? companyInfo.beta.toFixed(2) : 'N/A', rawValue: companyInfo.beta },
  ];

  return (
    <div id={sectionId} className="scroll-mt-24 bg-white dark:bg-gme-dark-100 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gme-dark-300 transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-gradient-to-br from-gme-red to-gme-red-dark rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">GME</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{companyInfo.name}</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{companyInfo.exchange}: {companyInfo.symbol}</span>
              <span>•</span>
              <span>{companyInfo.sector}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportShareControls id={sectionId} title="Company Overview" data={companyInfo} />
          <a
            href={companyInfo.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gme-dark-300 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gme-dark-400 transition-colors"
          >
            Website
            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
        {companyInfo.description}
      </p>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {metricCards.map((metric) => {
          const metricId = createAnchorId(sectionId, metric.label);
          return (
            <div key={metric.label} id={metricId} className="scroll-mt-24 bg-gray-50 dark:bg-gme-dark-200 rounded-lg p-3 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{metric.label}</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">{metric.value}</div>
                </div>
                <ExportShareControls
                  id={metricId}
                  title={`Company Overview: ${metric.label}`}
                  data={{ label: metric.label, value: metric.value, rawValue: metric.rawValue, source: companyInfo.dataSource }}
                  compact
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 52-Week Range */}
      {companyInfo.fiftyTwoWeekHigh && companyInfo.fiftyTwoWeekLow ? (
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span>52-Week Range</span>
            <span>${companyInfo.fiftyTwoWeekLow.toFixed(2)} - ${companyInfo.fiftyTwoWeekHigh.toFixed(2)}</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gme-dark-300 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-stock-red via-yellow-400 to-stock-green rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">52-Week Range</div>
          <div className="text-sm text-gray-400 dark:text-gray-500">Data unavailable</div>
        </div>
      )}

      {/* Additional Info */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gme-dark-300">
        {[details.slice(0, 3), details.slice(3)].map((detailGroup, groupIndex) => (
          <div key={groupIndex} className="space-y-3">
            {detailGroup.map((detail) => {
              const detailId = createAnchorId(sectionId, detail.label);
              return (
                <div key={detail.label} id={detailId} className="scroll-mt-24 flex items-start justify-between gap-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{detail.label}</span>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white text-right">{detail.value}</span>
                    <ExportShareControls
                      id={detailId}
                      title={`Company Overview: ${detail.label}`}
                      data={{ label: detail.label, value: detail.value, rawValue: detail.rawValue, source: companyInfo.dataSource }}
                      compact
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Shares Info */}
      {companyInfo.sharesOutstanding && companyInfo.sharesOutstanding > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gme-dark-300">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Shares Outstanding</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">{formatNumber(companyInfo.sharesOutstanding)}</div>
            </div>
            {companyInfo.floatShares && (
              <div className="text-right">
                <div className="text-xs text-gray-500 dark:text-gray-400">Float</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{formatNumber(companyInfo.floatShares)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Source Indicator */}
      {companyInfo.dataSource && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gme-dark-300">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Data source: {companyInfo.dataSource}
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              {companyInfo.annualReportUrl && (
                <a
                  href={companyInfo.annualReportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gme-red hover:text-gme-red-dark font-medium transition-colors"
                >
                  SEC 10-K source
                </a>
              )}
              {companyInfo.wikipediaUrl && (
                <a
                  href={companyInfo.wikipediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
                >
                  Founded source
                </a>
              )}
              <a
                href="https://finance.yahoo.com/quote/GME/key-statistics"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium transition-colors"
              >
                Market metrics source
              </a>
            </div>
            {companyInfo.message && (
              <span className="text-xs text-amber-600 dark:text-amber-500">{companyInfo.message}</span>
            )}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gme-dark-300">
        <div className="flex flex-wrap gap-2">
          <a
            href="https://news.gamestop.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-gme-red/10 text-gme-red hover:bg-gme-red/20 transition-colors"
          >
            Investor Relations
          </a>
          <a
            href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001326380&type=&dateb=&owner=include&count=40"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
          >
            SEC Filings
          </a>
          <a
            href="https://finance.yahoo.com/quote/GME"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors"
          >
            Yahoo Finance
          </a>
          <a
            href="https://www.whydrs.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-stock-green/10 text-stock-green hover:bg-stock-green/20 transition-colors"
          >
            WhyDRS.org
          </a>
          <a
            href="https://www.drsgme.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            DRSGME.org
          </a>
        </div>
      </div>
    </div>
  );
}
