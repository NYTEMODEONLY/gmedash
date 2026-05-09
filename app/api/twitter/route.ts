import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Ryan Cohen's Twitter/X handle
const RYAN_COHEN_HANDLE = 'ryancohen';

interface Tweet {
  id: string;
  text: string;
  createdAt: string;
  url: string;
  source?: string;
  metrics?: {
    likes: number;
    retweets: number;
    replies: number;
  };
}

// Nitter instances for scraping (no API key needed)
const NITTER_INSTANCES = [
  'https://nitter.net',
  'https://nitter.privacydev.net',
  'https://nitter.poast.org',
  'https://nitter.1d4.us',
];

// Function to parse tweets from Nitter HTML
const parseTweetsFromNitter = (html: string): Tweet[] => {
  const tweets: Tweet[] = [];

  try {
    // Match tweet containers
    const tweetRegex = /<div class="timeline-item[^"]*"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi;
    const matches = html.match(tweetRegex) || [];

    for (const match of matches.slice(0, 10)) {
      // Extract tweet content
      const contentMatch = match.match(/<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      const dateMatch = match.match(/<span class="tweet-date"[^>]*><a[^>]*title="([^"]+)"/i);
      const linkMatch = match.match(/<a class="tweet-link"[^>]*href="([^"]+)"/i);
      const statsMatch = match.match(/<span class="tweet-stat"[^>]*>[\s\S]*?<\/span>/gi);

      if (contentMatch && contentMatch[1]) {
        // Clean HTML tags from content
        let text = contentMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();

        if (text) {
          const tweet: Tweet = {
            id: linkMatch ? linkMatch[1].split('/').pop() || String(Date.now()) : String(Date.now()),
            text: text.substring(0, 500),
            createdAt: dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString(),
            url: linkMatch ? `https://twitter.com${linkMatch[1]}` : `https://twitter.com/${RYAN_COHEN_HANDLE}`,
          };

          // Parse metrics if available
          if (statsMatch) {
            const metrics = { likes: 0, retweets: 0, replies: 0 };
            statsMatch.forEach((stat: string) => {
              const numMatch = stat.match(/>(\d+(?:,\d+)*|\d+\.?\d*[KMB]?)</);
              if (numMatch) {
                const numStr = numMatch[1].replace(/,/g, '');
                let num = 0;
                if (numStr.includes('K')) {
                  num = parseFloat(numStr) * 1000;
                } else if (numStr.includes('M')) {
                  num = parseFloat(numStr) * 1000000;
                } else if (numStr.includes('B')) {
                  num = parseFloat(numStr) * 1000000000;
                } else {
                  num = parseInt(numStr);
                }

                if (stat.includes('comment') || stat.includes('reply')) {
                  metrics.replies = num;
                } else if (stat.includes('retweet') || stat.includes('quote')) {
                  metrics.retweets = num;
                } else if (stat.includes('like') || stat.includes('heart')) {
                  metrics.likes = num;
                }
              }
            });
            tweet.metrics = metrics;
          }

          tweets.push(tweet);
        }
      }
    }
  } catch (error) {
    console.error('Error parsing Nitter HTML:', error);
  }

  return tweets;
};

const decodeHtml = (value: string): string => value
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

// Fallback: Use RSS feed from Nitter
const fetchFromNitterRSS = async (): Promise<Tweet[]> => {
  const tweets: Tweet[] = [];

  for (const instance of NITTER_INSTANCES) {
    try {
      const response = await axios.get(`${instance}/${RYAN_COHEN_HANDLE}/rss`, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GMEDASH/1.0)',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
      });

      // Parse RSS
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      let count = 0;

      while ((match = itemRegex.exec(response.data)) && count < 10) {
        const itemContent = match[1];

        const titleMatch = itemContent.match(/<title[^>]*>(.*?)<\/title>/i);
        const linkMatch = itemContent.match(/<link[^>]*>(.*?)<\/link>/i);
        const pubDateMatch = itemContent.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i);
        const descMatch = itemContent.match(/<description[^>]*>([\s\S]*?)<\/description>/i);

        const title = titleMatch ? decodeHtml(titleMatch[1]) : '';
        const description = descMatch ? decodeHtml(descMatch[1]) : '';
        const link = linkMatch ? decodeHtml(linkMatch[1]).replace(/https?:\/\/nitter\.[^/]+/, 'https://x.com').replace(/#m$/, '') : '';
        const pubDate = pubDateMatch ? pubDateMatch[1] : '';

        if (title || description) {
          const id = link.match(/status\/(\d+)/)?.[1] || String(Date.now() + count);
          tweets.push({
            id,
            text: (title || description).trim().substring(0, 500),
            createdAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            url: link.includes('x.com') ? link : `https://x.com/${RYAN_COHEN_HANDLE}`,
            source: `${instance.replace('https://', '')} RSS mirror`,
          });
          count++;
        }
      }

      if (tweets.length > 0) {
        return tweets;
      }
    } catch (error) {
      console.log(`Nitter instance ${instance} failed, trying next...`);
    }
  }

  return tweets;
};

const parseJinaDate = (label: string): string => {
  const now = new Date();
  const hasYear = /\b\d{4}\b/.test(label);
  const parsed = new Date(hasYear ? label : `${label}, ${now.getFullYear()}`);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return now.toISOString();
};

const fetchFromJinaXProfile = async (): Promise<Tweet[]> => {
  try {
    const response = await axios.get(`https://r.jina.ai/http://x.com/${RYAN_COHEN_HANDLE}`, {
      timeout: 10000,
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GMEDASH/1.0)',
        Accept: 'text/markdown,text/plain',
      },
    });

    const lines = String(response.data).split(/\r?\n/).map((line) => line.trim());
    const tweets: Tweet[] = [];

    for (let i = 0; i < lines.length && tweets.length < 10; i++) {
      const match = lines[i].match(/^\[([A-Za-z]{3,9}\s+\d{1,2}(?:,\s+\d{4})?)\]\(https?:\/\/x\.com\/ryancohen\/status\/(\d+)\)$/i);
      if (!match) continue;

      const textLine = lines.slice(i + 1).find((line) => line && !line.startsWith('[') && line !== '·');
      if (!textLine) continue;

      tweets.push({
        id: match[2],
        text: decodeHtml(textLine).substring(0, 500),
        createdAt: parseJinaDate(match[1]),
        url: `https://x.com/${RYAN_COHEN_HANDLE}/status/${match[2]}`,
        source: 'Jina AI public X snapshot',
      });
    }

    return tweets;
  } catch (error) {
    console.log('Jina X profile fallback failed:', error);
    return [];
  }
};

// Alternative: Use Twitter embed approach
const fetchRecentTweetsViaSearch = async (): Promise<Tweet[]> => {
  // Since we can't access Twitter API directly without keys,
  // We'll provide fallback curated data and direct users to Twitter
  return [];
};

export async function GET(request: NextRequest) {
  const responseHeaders = {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=120',
  };

  try {
    // Try Nitter RSS first
    let tweets = await fetchFromNitterRSS();
    let source = 'Free Nitter RSS mirror of public X posts';

    if (tweets.length === 0) {
      tweets = await fetchFromJinaXProfile();
      source = 'Free Jina AI public X profile snapshot';
    }

    if (tweets.length === 0) {
      // Return a message directing users to check Twitter directly
      return NextResponse.json({
        tweets: [],
        message: 'Unable to fetch Ryan Cohen posts from the free RSS mirror right now. Open X directly for the live profile.',
        profileUrl: `https://x.com/${RYAN_COHEN_HANDLE}`,
        handle: `@${RYAN_COHEN_HANDLE}`,
      }, { headers: responseHeaders });
    }

    // Sort by date (newest first)
    tweets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      tweets: tweets.slice(0, 10),
      profileUrl: `https://x.com/${RYAN_COHEN_HANDLE}`,
      handle: `@${RYAN_COHEN_HANDLE}`,
      source,
      lastUpdated: new Date().toISOString(),
    }, { headers: responseHeaders });

  } catch (error) {
    console.error('Twitter API error:', error);
    return NextResponse.json({
      tweets: [],
      message: 'Unable to fetch tweets. Please visit X directly.',
      profileUrl: `https://x.com/${RYAN_COHEN_HANDLE}`,
      handle: `@${RYAN_COHEN_HANDLE}`,
    }, { status: 200, headers: responseHeaders }); // Return 200 with empty tweets so UI can handle gracefully
  }
}
