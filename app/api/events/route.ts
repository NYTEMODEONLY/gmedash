import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

interface UpcomingEvent {
  title: string;
  date: string;
  type: 'earnings' | 'dividend' | 'meeting' | 'filing' | 'other';
  description: string;
  source?: string;
}

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

// Get upcoming SEC filing deadlines based on fiscal calendar
const getEstimatedFilingDates = (): UpcomingEvent[] => {
  const events: UpcomingEvent[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();

  // GameStop fiscal year ends on the Saturday nearest to January 31
  // 10-K due ~60 days after fiscal year end (around late March/early April)
  // 10-Q due ~40 days after each quarter end

  // Q1 ends around late April/early May
  // Q2 ends around late July/early August
  // Q3 ends around late October/early November
  // Q4 ends around late January/early February

  const estimatedDates = [
    { month: 3, day: 25, type: '10-K', quarter: 'FY' }, // Annual report (March)
    { month: 5, day: 10, type: '10-Q', quarter: 'Q1' }, // Q1 report (June)
    { month: 8, day: 10, type: '10-Q', quarter: 'Q2' }, // Q2 report (September)
    { month: 11, day: 10, type: '10-Q', quarter: 'Q3' }, // Q3 report (December)
  ];

  for (const est of estimatedDates) {
    let date = new Date(currentYear, est.month, est.day);

    // If date has passed, check next year
    if (date < now) {
      date = new Date(currentYear + 1, est.month, est.day);
    }

    // Only include if within next 6 months
    const sixMonthsFromNow = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
    if (date <= sixMonthsFromNow) {
      events.push({
        title: `${est.type} Filing (${est.quarter})`,
        date: date.toISOString(),
        type: 'filing',
        description: est.type === '10-K'
          ? 'Annual Report - Comprehensive business and financial overview'
          : `Quarterly Report - ${est.quarter} financial results`,
        source: 'Estimated',
      });
    }
  }

  return events;
};

// Check for upcoming annual meeting (typically in June)
const getAnnualMeetingEstimate = (): UpcomingEvent | null => {
  const now = new Date();
  const currentYear = now.getFullYear();

  // GameStop annual meeting is typically in June
  let meetingDate = new Date(currentYear, 5, 15); // June 15

  if (meetingDate < now) {
    meetingDate = new Date(currentYear + 1, 5, 15);
  }

  // Only return if within next 6 months
  const sixMonthsFromNow = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
  if (meetingDate <= sixMonthsFromNow) {
    return {
      title: 'Annual Shareholders Meeting',
      date: meetingDate.toISOString(),
      type: 'meeting',
      description: 'Annual meeting of GameStop shareholders (date is estimated)',
      source: 'Estimated',
    };
  }

  return null;
};

export async function GET(request: NextRequest) {
  try {
    const events: UpcomingEvent[] = [];

    // Fetch actual earnings date
    const earningsEvent = await fetchEarningsDate();
    if (earningsEvent) {
      events.push(earningsEvent);
    }

    // Add estimated filing dates
    const filingDates = getEstimatedFilingDates();
    events.push(...filingDates);

    // Add annual meeting estimate
    const meetingEvent = getAnnualMeetingEstimate();
    if (meetingEvent) {
      events.push(meetingEvent);
    }

    // Sort by date
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Return only upcoming events (next 6 months)
    const now = new Date();
    const upcomingEvents = events.filter(event => new Date(event.date) > now);

    if (upcomingEvents.length === 0) {
      return NextResponse.json({
        events: [],
        message: 'No upcoming events scheduled. Check GameStop Investor Relations for updates.',
      });
    }

    return NextResponse.json({
      events: upcomingEvents.slice(0, 5),
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json({
      events: [],
      error: 'Unable to fetch upcoming events',
    }, { status: 200 }); // Return 200 so UI handles gracefully
  }
}
