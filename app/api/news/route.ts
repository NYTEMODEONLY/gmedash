import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// More reliable RSS feeds that focus on GME/GameStop
const RSS_FEEDS = {
  yahoo: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=GME&region=US&lang=en-US',
  google: 'https://news.google.com/rss/search?q=GameStop+GME&hl=en-US&gl=US&ceid=US:en',
  sec: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001326380&type=8-K&dateb=&owner=include&count=10&output=atom',
};

// Utility function to parse RSS XML
const parseRSSFeed = (xmlText: string, sourceName: string): any[] => {
  const articles: any[] = [];

  try {
    // Match <item> for RSS 2.0 or <entry> for Atom feeds
    const itemRegex = /<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/gi;
    let match;
    let count = 0;

    while ((match = itemRegex.exec(xmlText)) && count < 10) {
      const itemContent = match[1] || match[2];

      const titleMatch = itemContent.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
      const descMatch = itemContent.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>|<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>|<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i);
      const linkMatch = itemContent.match(/<link[^>]*>([^<]*)<\/link>|<link[^>]*href="([^"]+)"/i);
      const pubDateMatch = itemContent.match(/<pubDate[^>]*>(.*?)<\/pubDate>|<published[^>]*>(.*?)<\/published>|<updated[^>]*>(.*?)<\/updated>/i);

      let title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
      let description = '';
      if (descMatch) {
        description = (descMatch[1] || descMatch[2] || descMatch[3] || '')
          .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
          .replace(/<[^>]+>/g, '')
          .trim();
      }
      let link = linkMatch ? (linkMatch[1] || linkMatch[2]).trim() : '';
      const pubDate = pubDateMatch ? (pubDateMatch[1] || pubDateMatch[2] || pubDateMatch[3]) : '';

      // Decode HTML entities
      title = title
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      description = description
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      // Filter for GameStop/GME related content
      const isRelevant =
        title.toLowerCase().includes('gamestop') ||
        title.toLowerCase().includes('gme') ||
        description.toLowerCase().includes('gamestop') ||
        description.toLowerCase().includes('gme') ||
        sourceName === 'SEC';

      if (isRelevant && title && link) {
        // Handle Google News redirect URLs
        if (link.includes('news.google.com') && link.includes('url=')) {
          const urlMatch = link.match(/url=([^&]+)/);
          if (urlMatch) {
            link = decodeURIComponent(urlMatch[1]);
          }
        }

        articles.push({
          title: title.substring(0, 200),
          description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
          url: link,
          publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          source: { name: sourceName },
        });
        count++;
      }
    }
  } catch (error) {
    console.error(`Error parsing RSS feed for ${sourceName}:`, error);
  }

  return articles;
};

// Fetch news from Yahoo Finance API (alternative)
const fetchYahooFinanceNews = async (): Promise<any[]> => {
  try {
    const response = await axios.get('https://query1.finance.yahoo.com/v8/finance/chart/GME', {
      params: {
        interval: '1d',
        range: '5d',
      },
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GMEDASH/1.0)',
      },
    });

    // Yahoo chart API doesn't return news, but we can use it to verify the ticker is valid
    // The actual news comes from RSS
    return [];
  } catch (error) {
    return [];
  }
};

export async function GET() {
  try {
    const allArticles: any[] = [];

    // Fetch from multiple sources with timeout handling
    const feedPromises = [
      // Yahoo Finance GME RSS
      axios.get(RSS_FEEDS.yahoo, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
      }).then(res => parseRSSFeed(res.data, 'Yahoo Finance'))
        .catch((err) => {
          console.log('Yahoo Finance RSS failed:', err.message);
          return [];
        }),

      // Google News GME search
      axios.get(RSS_FEEDS.google, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
      }).then(res => parseRSSFeed(res.data, 'Google News'))
        .catch((err) => {
          console.log('Google News RSS failed:', err.message);
          return [];
        }),
    ];

    const feedResults = await Promise.allSettled(feedPromises);

    feedResults.forEach((result) => {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        allArticles.push(...result.value);
      }
    });

    // Sort by publication date (newest first)
    allArticles.sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime();
      const dateB = new Date(b.publishedAt).getTime();
      return dateB - dateA;
    });

    // Remove duplicates based on title similarity
    const uniqueArticles = allArticles.filter((article, index, arr) => {
      const titleWords = article.title.toLowerCase().split(' ').slice(0, 6).join(' ');
      return !arr.slice(0, index).some(prevArticle => {
        const prevTitleWords = prevArticle.title.toLowerCase().split(' ').slice(0, 6).join(' ');
        return titleWords === prevTitleWords || article.url === prevArticle.url;
      });
    });

    if (uniqueArticles.length === 0) {
      // Return a message indicating no news is available
      return NextResponse.json([{
        title: 'Visit Yahoo Finance for Latest GME News',
        description: 'Click to view the latest GameStop news and updates on Yahoo Finance.',
        url: 'https://finance.yahoo.com/quote/GME/news',
        publishedAt: new Date().toISOString(),
        source: { name: 'Yahoo Finance' },
      }]);
    }

    return NextResponse.json(uniqueArticles.slice(0, 15));

  } catch (error) {
    console.error('News API error:', error);
    return NextResponse.json([{
      title: 'Visit Yahoo Finance for Latest GME News',
      description: 'Click to view the latest GameStop news and updates on Yahoo Finance.',
      url: 'https://finance.yahoo.com/quote/GME/news',
      publishedAt: new Date().toISOString(),
      source: { name: 'Yahoo Finance' },
    }]);
  }
}
