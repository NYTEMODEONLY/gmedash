import { NextResponse } from 'next/server';
import axios from 'axios';
import { cache, CACHE_TTL, CACHE_KEYS } from '@/lib/cache';

// Force dynamic rendering - required for runtime env vars
export const dynamic = 'force-dynamic';

interface ShortInterestData {
  date: string;
  shortInterest: number;
  daysToCover: number;
  sharesShort?: number;
  source: string;
}

// Finnhub doesn't have short interest in free tier, but we can try
async function getFinnhubShortInterest(): Promise<ShortInterestData | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;

  try {
    // Finnhub basic metrics might have some short data
    const response = await axios.get('https://finnhub.io/api/v1/stock/metric', {
      params: {
        symbol: 'GME',
        metric: 'all',
        token: apiKey,
      },
      timeout: 8000,
    });

    const metric = response.data?.metric;
    if (metric) {
      // Check for short interest related fields
      const shortPercentOfFloat = metric.shortPercentOutstanding || null;

      if (shortPercentOfFloat !== null) {
        return {
          date: new Date().toISOString().split('T')[0],
          shortInterest: parseFloat((shortPercentOfFloat * 100).toFixed(2)),
          daysToCover: metric.shortRatio || 0,
          sharesShort: metric.sharesShort || undefined,
          source: 'finnhub',
        };
      }
    }

    return null;
  } catch (error: any) {
    console.log('Finnhub short interest not available:', error?.message);
    return null;
  }
}

// Try Yahoo Finance as backup (often blocked)
async function getYahooShortInterest(): Promise<ShortInterestData | null> {
  try {
    const response = await axios.get(
      'https://query1.finance.yahoo.com/v10/finance/quoteSummary/GME?modules=defaultKeyStatistics',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json',
          Referer: 'https://finance.yahoo.com/',
        },
        timeout: 8000,
      }
    );

    const keyStats = response.data?.quoteSummary?.result?.[0]?.defaultKeyStatistics;

    if (keyStats) {
      const shortPercentOfFloat = keyStats.shortPercentOfFloat?.raw;
      const shortRatio = keyStats.shortRatio?.raw;

      if (shortPercentOfFloat !== undefined) {
        return {
          date: new Date().toISOString().split('T')[0],
          shortInterest: parseFloat((shortPercentOfFloat * 100).toFixed(2)),
          daysToCover: shortRatio || 0,
          sharesShort: keyStats.sharesShort?.raw,
          source: 'yahoo',
        };
      }
    }

    return null;
  } catch (error: any) {
    console.log('Yahoo short interest not available:', error?.message);
    return null;
  }
}

export async function GET() {
  try {
    // Check cache first
    const cached = cache.get<ShortInterestData[]>(CACHE_KEYS.SHORT_INTEREST);
    if (cached && !cached.isStale) {
      return NextResponse.json({
        data: cached.data,
        source: 'cache',
        cacheAge: cache.getAge(CACHE_KEYS.SHORT_INTEREST),
      });
    }

    // Try Finnhub first
    let shortData = await getFinnhubShortInterest();

    // Try Yahoo as fallback
    if (!shortData) {
      shortData = await getYahooShortInterest();
    }

    if (shortData) {
      // Cache the result
      cache.set(CACHE_KEYS.SHORT_INTEREST, [shortData], CACHE_TTL.SHORT_INTEREST);

      return NextResponse.json({
        data: [shortData],
        source: shortData.source,
        cacheAge: 0,
      });
    }

    // Check for stale cache
    const staleData = cache.getStale<ShortInterestData[]>(CACHE_KEYS.SHORT_INTEREST);
    if (staleData) {
      return NextResponse.json({
        data: staleData,
        source: 'cache',
        stale: true,
        cacheAge: cache.getAge(CACHE_KEYS.SHORT_INTEREST),
      });
    }

    // No data available - return clear message
    return NextResponse.json({
      data: [],
      available: false,
      message: 'Short interest data requires premium API access. This data is typically published bi-monthly by FINRA.',
      source: 'none',
    });
  } catch (error) {
    console.error('Short interest API error:', error);

    // Try stale cache on error
    const staleData = cache.getStale<ShortInterestData[]>(CACHE_KEYS.SHORT_INTEREST);
    if (staleData) {
      return NextResponse.json({
        data: staleData,
        source: 'cache',
        stale: true,
        cacheAge: cache.getAge(CACHE_KEYS.SHORT_INTEREST),
      });
    }

    return NextResponse.json({
      data: [],
      available: false,
      error: 'Failed to fetch short interest data',
      source: 'error',
    });
  }
}
