import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'GME';

  return NextResponse.json({
    data: [],
    available: false,
    symbol,
    source: 'none',
    message: 'No reliable free public options-flow source is configured. The core dashboard omits options data rather than showing blocked, paid, scraped, or estimated records.',
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
    },
  });
}
