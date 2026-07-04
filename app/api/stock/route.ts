import { NextRequest, NextResponse } from 'next/server';
import { getStockQuote, StockQuote } from '@/lib/data-providers';
import { cache, CACHE_TTL, CACHE_KEYS } from '@/lib/cache';

export const dynamic = 'force-dynamic';

// Check if market is currently open
function isMarketOpen(): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const partMap = parts.reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const day = dayMap[partMap.weekday || 'Sun'];
  const hours = Number(partMap.hour || 0);
  const minutes = Number(partMap.minute || 0);
  const totalMinutes = hours * 60 + minutes;

  // Weekend
  if (day === 0 || day === 6) return false;

  const marketOpenET = 9 * 60 + 30;
  const marketCloseET = 16 * 60;

  return totalMinutes >= marketOpenET && totalMinutes < marketCloseET;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get('symbol') || 'GME').toUpperCase();
  const responseHeaders = {
    'Cache-Control': 'no-store, max-age=0',
  };

  if (symbol !== 'GME') {
    return NextResponse.json(
      { error: 'This dashboard is scoped to GME only.' },
      { status: 400, headers: responseHeaders }
    );
  }

  try {
    // Check cache first
    const cached = cache.get<StockQuote>(CACHE_KEYS.STOCK_QUOTE);
    if (cached && !cached.isStale) {
      return NextResponse.json({
        ...cached.data,
        source: 'cache',
        originalSource: cached.data.source,
        cacheAge: cache.getAge(CACHE_KEYS.STOCK_QUOTE),
      }, { headers: responseHeaders });
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
      }, { headers: responseHeaders });
    }

    // If fresh fetch failed, try to return stale cache
    const staleData = cache.getStale<StockQuote>(CACHE_KEYS.STOCK_QUOTE);
    if (staleData) {
      return NextResponse.json({
        ...staleData,
        source: 'cache',
        originalSource: staleData.source,
        stale: true,
        cacheAge: cache.getAge(CACHE_KEYS.STOCK_QUOTE),
      }, { headers: responseHeaders });
    }

    return NextResponse.json(
      { error: 'Unable to fetch stock data from any provider' },
      { status: 503, headers: responseHeaders }
    );
  } catch (error) {
    console.error('Stock API error:', error);

    // Try to return stale cache on error
    const staleData = cache.getStale<StockQuote>(CACHE_KEYS.STOCK_QUOTE);
    if (staleData) {
      return NextResponse.json({
        ...staleData,
        source: 'cache',
        originalSource: staleData.source,
        stale: true,
        cacheAge: cache.getAge(CACHE_KEYS.STOCK_QUOTE),
      }, { headers: responseHeaders });
    }

    return NextResponse.json(
      { error: 'Failed to fetch stock data' },
      { status: 500, headers: responseHeaders }
    );
  }
}
