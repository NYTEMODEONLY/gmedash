import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

interface PressRelease {
  title: string;
  date: string;
  url: string;
  description: string;
  source: string;
}

// GameStop's investor relations press release sources
const PRESS_RELEASE_SOURCES = {
  // GameStop Investor Relations
  gamestop: 'https://news.gamestop.com/rss/news-releases.xml',
  // BusinessWire (GameStop often uses this)
  businesswire: 'https://feed.businesswire.com/rss/home/?rss=G1QFDERJXkJeEFpVUA==',
  // GlobeNewswire
  globenewswire: 'https://www.globenewswire.com/RssFeed/orgclass/1/feedTitle/GlobeNewswire%20-%20News%20Releases',
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

      let title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
      let description = descMatch ? descMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim() : '';
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

// Fetch from SEC EDGAR for 8-K filings (current reports / press releases)
const fetchSEC8KFilings = async (): Promise<PressRelease[]> => {
  const releases: PressRelease[] = [];
  const cik = '1326380'; // GameStop CIK

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

      for (let i = 0; i < Math.min(forms.length, 20); i++) {
        // 8-K filings are often press releases / material events
        if (forms[i] === '8-K') {
          releases.push({
            title: `GameStop 8-K: ${descriptions[i] || 'Current Report'}`,
            date: new Date(filingDates[i]).toISOString(),
            url: `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNumbers[i].replace(/-/g, '')}/${accessionNumbers[i]}-index.htm`,
            description: 'SEC Form 8-K - Report of material corporate events or changes',
            source: 'SEC EDGAR',
          });
        }
      }
    }
  } catch (error) {
    console.error('Error fetching SEC 8-K filings:', error);
  }

  return releases;
};

export async function GET(request: NextRequest) {
  try {
    const allReleases: PressRelease[] = [];

    // Fetch from multiple sources concurrently
    const fetchPromises = [
      // GameStop IR RSS
      axios.get(PRESS_RELEASE_SOURCES.gamestop, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GMEDASH/1.0)',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
      }).then(res => parseRSSFeed(res.data, 'GameStop IR'))
        .catch(() => []),

      // SEC 8-K filings
      fetchSEC8KFilings(),
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

    if (uniqueReleases.length === 0) {
      // Return recent 8-K filings from SEC as fallback
      const sec8K = await fetchSEC8KFilings();
      if (sec8K.length > 0) {
        return NextResponse.json(sec8K.slice(0, 10));
      }
      return NextResponse.json({ error: 'No press releases available' }, { status: 503 });
    }

    return NextResponse.json(uniqueReleases.slice(0, 10));

  } catch (error) {
    console.error('Press Releases API error:', error);
    return NextResponse.json({ error: 'Failed to fetch press releases' }, { status: 500 });
  }
}
