import { NextRequest, NextResponse } from 'next/server';
import { getStockQuote, StockQuote } from '@/lib/data-providers';
import { cache, CACHE_TTL, CACHE_KEYS } from '@/lib/cache';

// Check if market is currently open
function isMarketOpen(): boolean {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getUTCHours();
  const minutes = now.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Weekend
  if (day === 0 || day === 6) return false;

  // Market hours: 9:30 AM - 4:00 PM EST = 14:30 - 21:00 UTC
  const marketOpenUTC = 14 * 60 + 30;
  const marketCloseUTC = 21 * 60;

  return totalMinutes >= marketOpenUTC && totalMinutes < marketCloseUTC;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'GME';

  try {
    // Check cache first
    const cached = cache.get<StockQuote>(CACHE_KEYS.STOCK_QUOTE);
    if (cached && !cached.isStale) {
      return NextResponse.json({
        ...cached.data,
        source: 'cache',
        cacheAge: cache.getAge(CACHE_KEYS.STOCK_QUOTE),
      });
    }

    // Fetch fresh data
    const quote = await getStockQuote(symbol);

    if (quote) {
      // Cache with appropriate TTL
      const ttl = isMarketOpen() ? CACHE_TTL.STOCK_QUOTE : CACHE_TTL.STOCK_QUOTE_CLOSED;
      cache.set(CACHE_KEYS.STOCK_QUOTE, quote, ttl);

      return NextResponse.json({
        ...quote,
        cacheAge: 0,
      });
    }

    // If fresh fetch failed, try to return stale cache
    const staleData = cache.getStale<StockQuote>(CACHE_KEYS.STOCK_QUOTE);
    if (staleData) {
      return NextResponse.json({
        ...staleData,
        source: 'cache',
        stale: true,
        cacheAge: cache.getAge(CACHE_KEYS.STOCK_QUOTE),
      });
    }

    return NextResponse.json(
      { error: 'Unable to fetch stock data from any provider' },
      { status: 503 }
    );
  } catch (error) {
    console.error('Stock API error:', error);

    // Try to return stale cache on error
    const staleData = cache.getStale<StockQuote>(CACHE_KEYS.STOCK_QUOTE);
    if (staleData) {
      return NextResponse.json({
        ...staleData,
        source: 'cache',
        stale: true,
        cacheAge: cache.getAge(CACHE_KEYS.STOCK_QUOTE),
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch stock data' },
      { status: 500 }
    );
  }
}
