import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

interface UpcomingEvent {
  title: string;
  date: string;
  type: 'earnings' | 'dividend' | 'meeting' | 'filing' | 'other';
  description: string;
  source?: string;
  url?: string;
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

const parseIRDate = (value: unknown): string | null => {
  if (!value) return null;
  const raw = String(value);
  const microsoftDate = raw.match(/\/Date\((\d+)(?:[-+]\d+)?\)\//);
  const parsed = microsoftDate ? new Date(Number(microsoftDate[1])) : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const fetchGameStopIREvents = async (): Promise<UpcomingEvent[]> => {
  const endpoints = [
    {
      url: 'https://investor.gamestop.com/feed/Event.svc/GetEventList',
      resultKey: 'GetEventListResult',
    },
    {
      url: 'https://investor.gamestop.com/feed/Presentation.svc/GetPresentationList',
      resultKey: 'GetPresentationListResult',
    },
  ];

  const events: UpcomingEvent[] = [];

  await Promise.all(endpoints.map(async (endpoint) => {
    try {
      const response = await axios.get(endpoint.url, {
        params: {
          LanguageId: 1,
          eventDateFilter: 1,
          pageSize: 20,
          pageNumber: 0,
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GMEDASH/1.0)',
          Accept: 'application/json',
        },
      });

      const rows = response.data?.[endpoint.resultKey] || [];
      rows.forEach((row: any) => {
        const date = parseIRDate(row.EventDate || row.StartDate || row.Date || row.PressReleaseDate);
        if (!date || new Date(date) <= new Date()) return;

        const title = row.Title || row.EventTitle || row.Headline || 'GameStop Investor Event';
        events.push({
          title,
          date,
          type: /earnings/i.test(title) ? 'earnings' : /meeting|annual/i.test(title) ? 'meeting' : 'other',
          description: row.Description || row.EventDescription || 'Confirmed GameStop investor-relations event',
          source: 'GameStop Investor Relations',
          url: row.LinkToDetailPage || row.WebcastUrl || row.Url || 'https://news.gamestop.com/events-and-presentations',
        });
      });
    } catch (error) {
      console.error(`Error fetching ${endpoint.url}:`, error);
    }
  }));

  return events;
};

export async function GET(request: NextRequest) {
  const responseHeaders = {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
  };

  try {
    const events: UpcomingEvent[] = [];

    const [irEvents, earningsEvent] = await Promise.all([
      fetchGameStopIREvents(),
      fetchEarningsDate(),
    ]);

    events.push(...irEvents);
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
        message: 'No confirmed upcoming events found from GameStop IR event feeds or Yahoo Finance metadata.',
        lastUpdated: new Date().toISOString(),
        sources: ['GameStop Investor Relations', 'Yahoo Finance chart metadata'],
      }, { headers: responseHeaders });
    }

    return NextResponse.json({
      events: upcomingEvents.slice(0, 5),
      lastUpdated: new Date().toISOString(),
      sources: ['GameStop Investor Relations', 'Yahoo Finance chart metadata'],
    }, { headers: responseHeaders });

  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json({
      events: [],
      error: 'Unable to fetch upcoming events',
    }, { status: 200, headers: responseHeaders }); // Return 200 so UI handles gracefully
  }
}
