import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// More reliable RSS feeds that focus on GME/GameStop
const RSS_FEEDS = {
  yahoo: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=GME&region=US&lang=en-US',
  google: 'https://news.google.com/rss/search?q=GameStop+GME&hl=en-US&gl=US&ceid=US:en',
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

    while ((match = itemRegex.exec(xmlText)) && count < 10) {
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
        description.toLowerCase().includes('gme');

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

// Fetch official GameStop news from SEC EDGAR (8-K filings and press releases)
const fetchSECOfficialNews = async (): Promise<any[]> => {
  const articles: any[] = [];
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
      const primaryDocuments = recent.primaryDocument || [];
      const primaryDocDescriptions = recent.primaryDocDescription || [];

      // Get 8-K filings (current reports / material events / press releases)
      for (let i = 0; i < Math.min(forms.length, 50); i++) {
        if (forms[i] === '8-K' || forms[i] === '8-K/A') {
          const accessionNumber = accessionNumbers[i].replace(/-/g, '');
          const primaryDoc = primaryDocuments[i];
          const description = primaryDocDescriptions[i] || 'Current Report - Material Event';

          // Create a readable title from the document
          let title = `GameStop ${forms[i]}: ${description}`;
          if (title.length > 100) {
            title = title.substring(0, 97) + '...';
          }

          articles.push({
            title: title,
            description: `SEC Form ${forms[i]} - Report of material corporate events or changes filed with the Securities and Exchange Commission.`,
            url: `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNumber}/${primaryDoc}`,
            publishedAt: new Date(filingDates[i]).toISOString(),
            source: { name: 'GameStop IR' },
          });

          if (articles.length >= 15) break;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching SEC official news:', error);
  }

  return articles;
};

export async function GET() {
  try {
    const allArticles: any[] = [];

    // Fetch from multiple sources with timeout handling
    const feedPromises = [
      // Official GameStop news from SEC EDGAR (8-K filings)
      fetchSECOfficialNews(),

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

    return NextResponse.json(uniqueArticles.slice(0, 20));

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
