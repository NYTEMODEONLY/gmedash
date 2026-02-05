import { NextResponse } from 'next/server';
import axios from 'axios';

// Revalidate every 10 minutes
export const revalidate = 600;

interface PressRelease {
  title: string;
  date: string;
  url: string;
  description: string;
  source: string;
}

// Strip HTML tags and entities from text
const cleanText = (text: string): string => {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Parse RSS feed for press releases
const parseRSSFeed = (xmlText: string, sourceName: string): PressRelease[] => {
  const releases: PressRelease[] = [];

  try {
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    let count = 0;

    while ((match = itemRegex.exec(xmlText)) && count < 15) {
      const itemContent = match[1];

      const titleMatch = itemContent.match(/<title[^>]*>(.*?)<\/title>/i);
      const descMatch = itemContent.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
      const linkMatch = itemContent.match(/<link[^>]*>(.*?)<\/link>/i);
      const pubDateMatch = itemContent.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i);

      const title = titleMatch ? cleanText(titleMatch[1]) : '';
      const description = descMatch ? cleanText(descMatch[1]) : '';
      const link = linkMatch ? linkMatch[1].trim() : '';
      const pubDate = pubDateMatch ? pubDateMatch[1] : '';

      // Filter for GameStop related content
      const isGameStopRelated =
        title.toLowerCase().includes('gamestop') ||
        title.toLowerCase().includes('gme') ||
        description.toLowerCase().includes('gamestop') ||
        sourceName === 'GameStop IR';

      if (isGameStopRelated && title) {
        releases.push({
          title: title.substring(0, 200),
          date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          url: link,
          description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
          source: sourceName,
        });
        count++;
      }
    }
  } catch (error) {
    console.error(`Error parsing RSS feed for ${sourceName}:`, error);
  }

  return releases;
};

// Fetch from SEC EDGAR for 8-K filings and other material press-release-type filings
const fetchSECFilings = async (): Promise<PressRelease[]> => {
  const releases: PressRelease[] = [];
  const cik = '1326380'; // GameStop CIK

  // Form types that typically represent press releases or material announcements
  const pressReleaseFormTypes = ['8-K', '8-K/A', 'SC 14A', 'DEFA14A', 'DEF 14A'];

  const getFormDescription = (form: string): string => {
    if (form.startsWith('8-K')) return 'Report of material corporate events or changes';
    if (form.includes('14A')) return 'Proxy statement / shareholder meeting materials';
    return 'SEC Filing';
  };

  try {
    const response = await axios.get(`https://data.sec.gov/submissions/CIK${cik.padStart(10, '0')}.json`, {
      headers: {
        'User-Agent': 'GMEDASH-SEC-Reader/1.0 contact@example.com',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    const data = response.data;
    if (data && data.filings && data.filings.recent) {
      const recent = data.filings.recent;
      const forms = recent.form || [];
      const filingDates = recent.filingDate || [];
      const accessionNumbers = recent.accessionNumber || [];
      const descriptions = recent.primaryDocument || [];

      // Search through more filings (up to 100) to find press-release-type filings
      for (let i = 0; i < Math.min(forms.length, 100); i++) {
        if (pressReleaseFormTypes.some(type => forms[i] === type || forms[i].startsWith(type))) {
          releases.push({
            title: `GameStop ${forms[i]}: ${descriptions[i] || 'Current Report'}`,
            date: new Date(filingDates[i]).toISOString(),
            url: `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNumbers[i].replace(/-/g, '')}/${accessionNumbers[i]}-index.htm`,
            description: `SEC Form ${forms[i]} - ${getFormDescription(forms[i])}`,
            source: 'SEC EDGAR',
          });

          if (releases.length >= 15) break;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching SEC filings:', error);
  }

  return releases;
};

export async function GET() {
  try {
    const allReleases: PressRelease[] = [];

    // Fetch from multiple sources concurrently
    const fetchPromises = [
      // Google News filtered for GameStop press releases / investor relations
      axios.get('https://news.google.com/rss/search?q=%22GameStop%22+%22press+release%22+OR+%22investor+relations%22&hl=en-US&gl=US&ceid=US:en', {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
      }).then(res => {
        const parsed = parseRSSFeed(res.data, 'GameStop IR');
        // Re-tag these as GameStop IR since they come from press release searches
        return parsed.map(r => ({ ...r, source: 'GameStop IR' }));
      }).catch((err) => {
        console.log('Google News press releases failed:', err.message);
        return [];
      }),

      // SEC 8-K and other material filings
      fetchSECFilings(),
    ];

    const results = await Promise.allSettled(fetchPromises);

    results.forEach((result) => {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        allReleases.push(...result.value);
      }
    });

    // Sort by date (newest first)
    allReleases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Remove duplicates based on title similarity
    const uniqueReleases = allReleases.filter((release, index, arr) => {
      const titleWords = release.title.toLowerCase().split(' ').slice(0, 5).join(' ');
      return !arr.slice(0, index).some(prevRelease => {
        const prevTitleWords = prevRelease.title.toLowerCase().split(' ').slice(0, 5).join(' ');
        return titleWords === prevTitleWords;
      });
    });

    const headers = {
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60',
    };

    if (uniqueReleases.length === 0) {
      // Return recent SEC filings as fallback
      const secFilings = await fetchSECFilings();
      if (secFilings.length > 0) {
        return NextResponse.json(secFilings.slice(0, 10), { headers });
      }
      return NextResponse.json({ error: 'No press releases available' }, { status: 503 });
    }

    return NextResponse.json(uniqueReleases.slice(0, 10), { headers });

  } catch (error) {
    console.error('Press Releases API error:', error);
    return NextResponse.json({ error: 'Failed to fetch press releases' }, { status: 500 });
  }
}
