import { NextResponse } from 'next/server';
import axios from 'axios';

// Revalidate every 5 minutes - prevents Vercel from serving stale cached responses
export const revalidate = 300;

// RSS feeds for GME/GameStop news
const RSS_FEEDS = {
  google: 'https://news.google.com/rss/search?q=GameStop+GME&hl=en-US&gl=US&ceid=US:en',
  bing: 'https://www.bing.com/news/search?q=GameStop+GME&format=rss',
};

// Helper function to decode HTML entities
const decodeHTMLEntities = (text: string): string => {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
};

// Helper function to strip HTML tags and clean text
const stripHTMLAndClean = (text: string): string => {
  // First decode HTML entities (so &lt;a&gt; becomes <a>)
  let cleaned = decodeHTMLEntities(text);

  // Remove CDATA wrappers
  cleaned = cleaned.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

  // Remove all HTML tags (including multiline)
  cleaned = cleaned.replace(/<[^>]*>/g, '');

  // Remove any remaining HTML-like patterns (handles malformed tags)
  cleaned = cleaned.replace(/<[^>]*$/g, ''); // Unclosed tags at end
  cleaned = cleaned.replace(/^[^<]*>/g, ''); // Unclosed tags at start

  // Clean up whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // If still contains URL patterns from stripped anchor tags, remove them
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '').trim();

  return cleaned;
};

// Utility function to parse RSS XML
const parseRSSFeed = (xmlText: string, sourceName: string): any[] => {
  const articles: any[] = [];

  try {
    // Match <item> for RSS 2.0 or <entry> for Atom feeds
    const itemRegex = /<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/gi;
    let match;
    let count = 0;

    while ((match = itemRegex.exec(xmlText)) && count < 25) {
      const itemContent = match[1] || match[2];

      const titleMatch = itemContent.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
      const descMatch = itemContent.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>|<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>|<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i);
      const linkMatch = itemContent.match(/<link[^>]*>([^<]*)<\/link>|<link[^>]*href="([^"]+)"/i);
      const pubDateMatch = itemContent.match(/<pubDate[^>]*>(.*?)<\/pubDate>|<published[^>]*>(.*?)<\/published>|<updated[^>]*>(.*?)<\/updated>/i);

      // Process title - decode entities then strip any HTML
      let title = titleMatch ? titleMatch[1] : '';
      title = stripHTMLAndClean(title);

      // Process description - decode entities then strip all HTML
      let description = '';
      if (descMatch) {
        const rawDesc = descMatch[1] || descMatch[2] || descMatch[3] || '';
        description = stripHTMLAndClean(rawDesc);
      }

      let link = linkMatch ? (linkMatch[1] || linkMatch[2]).trim() : '';
      const pubDate = pubDateMatch ? (pubDateMatch[1] || pubDateMatch[2] || pubDateMatch[3]) : '';

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

        // Handle Bing News redirect URLs
        if (link.includes('bing.com') && link.includes('url=')) {
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

export async function GET() {
  try {
    const allArticles: any[] = [];

    // Fetch from multiple sources with timeout handling
    const feedPromises = [
      // Google News GME search (primary source)
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

      // Bing News GME search (secondary source)
      axios.get(RSS_FEEDS.bing, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
      }).then(res => parseRSSFeed(res.data, 'Bing News'))
        .catch((err) => {
          console.log('Bing News RSS failed:', err.message);
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

    const headers = {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
    };

    if (uniqueArticles.length === 0) {
      return NextResponse.json([{
        title: 'Visit Yahoo Finance for Latest GME News',
        description: 'Click to view the latest GameStop news and updates on Yahoo Finance.',
        url: 'https://finance.yahoo.com/quote/GME/news',
        publishedAt: new Date().toISOString(),
        source: { name: 'Yahoo Finance' },
      }], { headers });
    }

    return NextResponse.json(uniqueArticles.slice(0, 15), { headers });

  } catch (error) {
    console.error('News API error:', error);
    return NextResponse.json([{
      title: 'Visit Yahoo Finance for Latest GME News',
      description: 'Click to view the latest GameStop news and updates on Yahoo Finance.',
      url: 'https://finance.yahoo.com/quote/GME/news',
      publishedAt: new Date().toISOString(),
      source: { name: 'Yahoo Finance' },
    }], {
      headers: { 'Cache-Control': 'no-cache' },
    });
  }
}
