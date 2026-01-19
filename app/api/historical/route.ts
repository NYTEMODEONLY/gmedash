import { NextRequest, NextResponse } from 'next/server';
import { getHistoricalData, HistoricalDataPoint } from '@/lib/data-providers';
import { cache, CACHE_TTL, CACHE_KEYS } from '@/lib/cache';

interface CachedHistoricalData {
  data: HistoricalDataPoint[];
  source: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'GME';
  const period = searchParams.get('period') || '1Y';

  const cacheKey = CACHE_KEYS.HISTORICAL(period);

  try {
    // Check cache first
    const cached = cache.get<CachedHistoricalData>(cacheKey);
    if (cached && !cached.isStale) {
      return NextResponse.json({
        data: cached.data.data,
        source: 'cache',
        originalSource: cached.data.source,
        cacheAge: cache.getAge(cacheKey),
        count: cached.data.data.length,
      });
    }

    // Fetch fresh data with retry logic built into the provider
    const result = await getHistoricalData(symbol, period);

    if (result.data.length > 0) {
      // Cache the result
      cache.set(cacheKey, result, CACHE_TTL.HISTORICAL);

      return NextResponse.json({
        data: result.data,
        source: result.source,
        cacheAge: 0,
        count: result.data.length,
      });
    }

    // If fresh fetch failed, try to return stale cache
    const staleData = cache.getStale<CachedHistoricalData>(cacheKey);
    if (staleData) {
      return NextResponse.json({
        data: staleData.data,
        source: 'cache',
        originalSource: staleData.source,
        stale: true,
        cacheAge: cache.getAge(cacheKey),
        count: staleData.data.length,
      });
    }

    // No data available
    return NextResponse.json({
      data: [],
      source: 'none',
      message: 'Unable to fetch historical data. Add FINNHUB_API_KEY to enable real-time data.',
      count: 0,
    });

  } catch (error) {
    console.error('Historical data API error:', error);

    // Try to return stale cache on error
    const staleData = cache.getStale<CachedHistoricalData>(cacheKey);
    if (staleData) {
      return NextResponse.json({
        data: staleData.data,
        source: 'cache',
        originalSource: staleData.source,
        stale: true,
        cacheAge: cache.getAge(cacheKey),
        count: staleData.data.length,
      });
    }

    return NextResponse.json({
      data: [],
      source: 'error',
      error: 'Failed to fetch historical data',
      count: 0,
    });
  }
}
