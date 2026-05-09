import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

interface UpcomingEvent {
  title: string;
  date: string;
  type: 'earnings' | 'dividend' | 'meeting' | 'filing' | 'other';
  description: string;
  source?: string;
}

export const dynamic = 'force-dynamic';

// Get estimated earnings date from Yahoo Finance
const fetchEarningsDate = async (): Promise<UpcomingEvent | null> => {
  try {
    const response = await axios.get('https://query1.finance.yahoo.com/v8/finance/chart/GME', {
      params: {
        interval: '1d',
        range: '1d',
      },
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GMEDASH/1.0)',
      },
    });

    const meta = response.data?.chart?.result?.[0]?.meta;

    if (meta?.earningsTimestamp) {
      const earningsDate = new Date(meta.earningsTimestamp * 1000);

      // Only return if earnings date is in the future
      if (earningsDate > new Date()) {
        return {
          title: 'Earnings Report',
          date: earningsDate.toISOString(),
          type: 'earnings',
          description: 'GameStop quarterly earnings announcement',
          source: 'Yahoo Finance',
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching earnings date:', error);
    return null;
  }
};

export async function GET(request: NextRequest) {
  const responseHeaders = {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
  };

  try {
    const events: UpcomingEvent[] = [];

    // Fetch actual earnings date
    const earningsEvent = await fetchEarningsDate();
    if (earningsEvent) {
      events.push(earningsEvent);
    }

    // Sort by date
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Return only upcoming events (next 6 months)
    const now = new Date();
    const upcomingEvents = events.filter(event => new Date(event.date) > now);

    if (upcomingEvents.length === 0) {
      return NextResponse.json({
        events: [],
        message: 'No confirmed upcoming events found from the configured free public sources.',
      }, { headers: responseHeaders });
    }

    return NextResponse.json({
      events: upcomingEvents.slice(0, 5),
      lastUpdated: new Date().toISOString(),
    }, { headers: responseHeaders });

  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json({
      events: [],
      error: 'Unable to fetch upcoming events',
    }, { status: 200, headers: responseHeaders }); // Return 200 so UI handles gracefully
  }
}
