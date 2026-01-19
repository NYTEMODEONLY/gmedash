import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// More reliable RSS feeds that focus on GME/GameStop
const RSS_FEEDS = {
  yahoo: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=GME&region=US&lang=en-US',
  google: 'https://news.google.com/rss/search?q=GameStop+GME&hl=en-US&gl=US&ceid=US:en',
};

// 8-K Item codes and their descriptions
const FORM_8K_ITEMS: Record<string, string> = {
  '1.01': 'Entry into a Material Definitive Agreement',
  '1.02': 'Termination of a Material Definitive Agreement',
  '1.03': 'Bankruptcy or Receivership',
  '2.01': 'Completion of Acquisition or Disposition of Assets',
  '2.02': 'Results of Operations and Financial Condition',
  '2.03': 'Creation of a Direct Financial Obligation',
  '2.04': 'Triggering Events That Accelerate or Increase a Direct Financial Obligation',
  '2.05': 'Costs Associated with Exit or Disposal Activities',
  '2.06': 'Material Impairments',
  '3.01': 'Notice of Delisting or Failure to Satisfy a Continued Listing Rule',
  '3.02': 'Unregistered Sales of Equity Securities',
  '3.03': 'Material Modification to Rights of Security Holders',
  '4.01': 'Changes in Registrant\'s Certifying Accountant',
  '4.02': 'Non-Reliance on Previously Issued Financial Statements',
  '5.01': 'Changes in Control of Registrant',
  '5.02': 'Departure/Election of Directors or Officers; Compensatory Arrangements',
  '5.03': 'Amendments to Articles of Incorporation or Bylaws',
  '5.04': 'Temporary Suspension of Trading Under Employee Benefit Plans',
  '5.05': 'Amendment to Registrant\'s Code of Ethics',
  '5.06': 'Change in Shell Company Status',
  '5.07': 'Submission of Matters to a Vote of Security Holders',
  '5.08': 'Shareholder Director Nominations',
  '6.01': 'ABS Informational and Computational Material',
  '6.02': 'Change of Servicer or Trustee',
  '6.03': 'Change in Credit Enhancement',
  '6.04': 'Failure to Make a Required Distribution',
  '6.05': 'Securities Act Updating Disclosure',
  '7.01': 'Regulation FD Disclosure',
  '8.01': 'Other Events',
  '9.01': 'Financial Statements and Exhibits',
};

// Form type descriptions
const FORM_DESCRIPTIONS: Record<string, string> = {
  '8-K': 'Current Report - Material corporate event or change',
  '8-K/A': 'Amended Current Report - Updated material event disclosure',
  '10-K': 'Annual Report - Comprehensive yearly financial overview',
  '10-K/A': 'Amended Annual Report',
  '10-Q': 'Quarterly Report - Quarterly financial results',
  '10-Q/A': 'Amended Quarterly Report',
  'DEF 14A': 'Proxy Statement - Annual meeting and voting matters',
  'DEFA14A': 'Additional Proxy Soliciting Materials',
  '4': 'Statement of Changes in Beneficial Ownership',
  'SC 13G': 'Beneficial Ownership Report (Passive Investor)',
  'SC 13G/A': 'Amended Beneficial Ownership Report',
  'SC 13D': 'Beneficial Ownership Report (Active Investor)',
  'SC 13D/A': 'Amended Beneficial Ownership Report',
  '3': 'Initial Statement of Beneficial Ownership',
  '144': 'Notice of Proposed Sale of Securities',
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
  let cleaned = decodeHTMLEntities(text);
  cleaned = cleaned.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  cleaned = cleaned.replace(/<[^>]*$/g, '');
  cleaned = cleaned.replace(/^[^<]*>/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '').trim();
  return cleaned;
};

// Utility function to parse RSS XML
const parseRSSFeed = (xmlText: string, sourceName: string): any[] => {
  const articles: any[] = [];

  try {
    const itemRegex = /<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/gi;
    let match;
    let count = 0;

    while ((match = itemRegex.exec(xmlText)) && count < 10) {
      const itemContent = match[1] || match[2];

      const titleMatch = itemContent.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
      const descMatch = itemContent.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>|<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>|<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i);
      const linkMatch = itemContent.match(/<link[^>]*>([^<]*)<\/link>|<link[^>]*href="([^"]+)"/i);
      const pubDateMatch = itemContent.match(/<pubDate[^>]*>(.*?)<\/pubDate>|<published[^>]*>(.*?)<\/published>|<updated[^>]*>(.*?)<\/updated>/i);

      let title = titleMatch ? titleMatch[1] : '';
      title = stripHTMLAndClean(title);

      let description = '';
      if (descMatch) {
        const rawDesc = descMatch[1] || descMatch[2] || descMatch[3] || '';
        description = stripHTMLAndClean(rawDesc);
      }

      let link = linkMatch ? (linkMatch[1] || linkMatch[2]).trim() : '';
      const pubDate = pubDateMatch ? (pubDateMatch[1] || pubDateMatch[2] || pubDateMatch[3]) : '';

      const isRelevant =
        title.toLowerCase().includes('gamestop') ||
        title.toLowerCase().includes('gme') ||
        description.toLowerCase().includes('gamestop') ||
        description.toLowerCase().includes('gme');

      if (isRelevant && title && link) {
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

// Create a meaningful title from 8-K item codes
const create8KTitle = (items: string, primaryDocDescription: string): string => {
  if (primaryDocDescription && primaryDocDescription.length > 10 && !primaryDocDescription.match(/^gme-\d+/i)) {
    // Use the document description if it's meaningful
    return `GameStop: ${primaryDocDescription}`;
  }

  if (!items) {
    return 'GameStop 8-K: Corporate Announcement';
  }

  // Parse item codes and create a meaningful title
  const itemCodes = items.split(',').map(i => i.trim());
  const descriptions: string[] = [];

  for (const code of itemCodes) {
    if (FORM_8K_ITEMS[code]) {
      descriptions.push(FORM_8K_ITEMS[code]);
    }
  }

  if (descriptions.length > 0) {
    // Use the first (most important) item for the title
    return `GameStop: ${descriptions[0]}`;
  }

  return 'GameStop 8-K: Corporate Announcement';
};

// Fetch official GameStop news from SEC EDGAR
const fetchSECOfficialNews = async (): Promise<any[]> => {
  const articles: any[] = [];
  const cik = '1326380'; // GameStop CIK

  try {
    const response = await axios.get(`https://data.sec.gov/submissions/CIK${cik.padStart(10, '0')}.json`, {
      headers: {
        'User-Agent': 'GMEDASH-SEC-Reader/1.0 contact@example.com',
        'Accept': 'application/json',
      },
      timeout: 15000,
    });

    const data = response.data;
    if (data && data.filings && data.filings.recent) {
      const recent = data.filings.recent;
      const forms = recent.form || [];
      const filingDates = recent.filingDate || [];
      const accessionNumbers = recent.accessionNumber || [];
      const primaryDocuments = recent.primaryDocument || [];
      const primaryDocDescriptions = recent.primaryDocDescription || [];
      const items = recent.items || []; // 8-K item codes

      // Forms we're interested in for news/announcements
      const newsForms = ['8-K', '8-K/A', '10-K', '10-Q', 'DEF 14A', 'DEFA14A'];

      for (let i = 0; i < Math.min(forms.length, 100); i++) {
        const form = forms[i];

        if (newsForms.includes(form)) {
          const accessionNumber = accessionNumbers[i].replace(/-/g, '');
          const primaryDoc = primaryDocuments[i];
          const docDescription = primaryDocDescriptions[i] || '';
          const itemCodes = items[i] || '';

          let title: string;
          let description: string;

          if (form === '8-K' || form === '8-K/A') {
            title = create8KTitle(itemCodes, docDescription);
            description = FORM_DESCRIPTIONS[form] || 'SEC Filing';
            if (itemCodes) {
              const itemList = itemCodes.split(',').map((c: string) => c.trim()).slice(0, 3);
              const itemDescs = itemList.map((c: string) => FORM_8K_ITEMS[c]).filter(Boolean);
              if (itemDescs.length > 0) {
                description = itemDescs.join('; ');
              }
            }
          } else if (form === '10-K' || form === '10-K/A') {
            title = 'GameStop: Annual Report Filed';
            description = FORM_DESCRIPTIONS[form] || 'Annual financial report filed with the SEC';
          } else if (form === '10-Q' || form === '10-Q/A') {
            title = 'GameStop: Quarterly Report Filed';
            description = FORM_DESCRIPTIONS[form] || 'Quarterly financial report filed with the SEC';
          } else if (form === 'DEF 14A' || form === 'DEFA14A') {
            title = 'GameStop: Proxy Statement Filed';
            description = FORM_DESCRIPTIONS[form] || 'Proxy materials for shareholder meeting';
          } else {
            title = `GameStop ${form}: ${docDescription || 'SEC Filing'}`;
            description = FORM_DESCRIPTIONS[form] || 'SEC regulatory filing';
          }

          // Truncate title if too long
          if (title.length > 120) {
            title = title.substring(0, 117) + '...';
          }

          articles.push({
            title: title,
            description: description,
            url: `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNumber}/${primaryDoc}`,
            publishedAt: new Date(filingDates[i]).toISOString(),
            source: { name: 'GameStop IR' },
          });

          if (articles.length >= 20) break;
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
      // Official GameStop news from SEC EDGAR
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
      return NextResponse.json([{
        title: 'Visit Yahoo Finance for Latest GME News',
        description: 'Click to view the latest GameStop news and updates on Yahoo Finance.',
        url: 'https://finance.yahoo.com/quote/GME/news',
        publishedAt: new Date().toISOString(),
        source: { name: 'Yahoo Finance' },
      }]);
    }

    return NextResponse.json(uniqueArticles.slice(0, 25));

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
