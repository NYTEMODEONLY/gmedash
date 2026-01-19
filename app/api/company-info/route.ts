import { NextRequest, NextResponse } from 'next/server';
import { getCompanyMetrics, CompanyMetrics, formatMarketCap } from '@/lib/data-providers';
import { cache, CACHE_TTL, CACHE_KEYS } from '@/lib/cache';

// Force dynamic rendering - required for runtime env vars
export const dynamic = 'force-dynamic';

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
  dataSource: string;
}

// Static company info that doesn't change
const STATIC_INFO = {
  name: 'GameStop Corp.',
  symbol: 'GME',
  exchange: 'NYSE',
  sector: 'Consumer Cyclical',
  industry: 'Specialty Retail',
  employees: 8000,
  headquarters: 'Grapevine, Texas',
  ceo: 'Ryan Cohen',
  founded: '1984',
  website: 'https://www.gamestop.com',
  description: 'GameStop Corp. is a leading specialty retailer offering video games, consumer electronics, and gaming merchandise through its e-commerce properties and thousands of stores.',
};

export async function GET(request: NextRequest) {
  try {
    // Check cache first
    const cached = cache.get<CompanyInfo>(CACHE_KEYS.COMPANY_INFO);
    if (cached && !cached.isStale) {
      return NextResponse.json({
        ...cached.data,
        cacheAge: cache.getAge(CACHE_KEYS.COMPANY_INFO),
      });
    }

    // Fetch fresh metrics
    const metrics = await getCompanyMetrics('GME');

    if (metrics) {
      const companyInfo: CompanyInfo = {
        ...STATIC_INFO,
        marketCap: metrics.marketCap,
        marketCapFormatted: metrics.marketCapFormatted,
        peRatio: metrics.peRatio,
        eps: metrics.eps,
        dividendYield: metrics.dividendYield,
        fiftyTwoWeekHigh: metrics.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: metrics.fiftyTwoWeekLow,
        avgVolume: metrics.avgVolume,
        beta: metrics.beta,
        sharesOutstanding: metrics.sharesOutstanding,
        floatShares: null, // Not available from Finnhub basic metrics
        dataSource: metrics.source,
      };

      // Cache the result
      cache.set(CACHE_KEYS.COMPANY_INFO, companyInfo, CACHE_TTL.COMPANY_INFO);

      return NextResponse.json({
        ...companyInfo,
        cacheAge: 0,
      });
    }

    // If fresh fetch failed, try to return stale cache
    const staleData = cache.getStale<CompanyInfo>(CACHE_KEYS.COMPANY_INFO);
    if (staleData) {
      return NextResponse.json({
        ...staleData,
        stale: true,
        cacheAge: cache.getAge(CACHE_KEYS.COMPANY_INFO),
      });
    }

    // Return static info with null metrics (not fake 0 values)
    const fallbackInfo: CompanyInfo = {
      ...STATIC_INFO,
      marketCap: null,
      marketCapFormatted: 'N/A',
      peRatio: null,
      eps: null,
      dividendYield: null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
      avgVolume: null,
      beta: null,
      sharesOutstanding: null,
      floatShares: null,
      dataSource: 'static',
    };

    return NextResponse.json({
      ...fallbackInfo,
      message: 'Unable to fetch live metrics. Add FINNHUB_API_KEY to enable real-time data.',
    });

  } catch (error) {
    console.error('Company Info API error:', error);

    // Try to return stale cache on error
    const staleData = cache.getStale<CompanyInfo>(CACHE_KEYS.COMPANY_INFO);
    if (staleData) {
      return NextResponse.json({
        ...staleData,
        stale: true,
        cacheAge: cache.getAge(CACHE_KEYS.COMPANY_INFO),
      });
    }

    // Return static info with null metrics
    return NextResponse.json({
      ...STATIC_INFO,
      marketCap: null,
      marketCapFormatted: 'N/A',
      peRatio: null,
      eps: null,
      dividendYield: null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
      avgVolume: null,
      beta: null,
      sharesOutstanding: null,
      floatShares: null,
      dataSource: 'error',
      error: 'Failed to fetch company data',
    });
  }
}
