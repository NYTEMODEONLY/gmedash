import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getCompanyMetrics, CompanyMetrics, formatMarketCap } from '@/lib/data-providers';
import { cache, CACHE_TTL, CACHE_KEYS } from '@/lib/cache';

// Force dynamic rendering - required for runtime env vars
export const dynamic = 'force-dynamic';

interface CompanyInfo {
  name: string;
  symbol: string;
  exchange: string;
  sector: string;
  industry: string;
  marketCap: number | null;
  marketCapFormatted: string;
  employees: number | null;
  headquarters: string | null;
  ceo: string | null;
  founded: string | null;
  website: string;
  description: string;
  peRatio: number | null;
  eps: number | null;
  dividendYield: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  avgVolume: number | null;
  beta: number | null;
  sharesOutstanding: number | null;
  floatShares: number | null;
  dataSource: string;
}

const STATIC_INFO = {
  name: 'GameStop Corp.',
  symbol: 'GME',
  exchange: 'NYSE',
  sector: 'Consumer Cyclical',
  industry: 'Specialty Retail',
  employees: null,
  headquarters: null,
  ceo: null,
  founded: null,
  website: 'https://www.gamestop.com',
  description: 'GameStop Corp. is a leading specialty retailer offering video games, consumer electronics, and gaming merchandise through its e-commerce properties and thousands of stores.',
};

async function getSECCompanyProfile() {
  try {
    const response = await axios.get('https://data.sec.gov/submissions/CIK0001326380.json', {
      timeout: 10000,
      headers: {
        'User-Agent': 'GMEDASH-SEC-Reader/1.0 contact@example.com',
        Accept: 'application/json',
      },
    });

    const data = response.data;
    const business = data?.addresses?.business;
    const headquarters = business?.city && business?.stateOrCountry
      ? `${business.city}, ${business.stateOrCountry}`
      : null;
    const filings = data?.filings?.recent;
    const annualReportIndex = filings?.form?.findIndex((form: string) => form === '10-K') ?? -1;
    const annualReportUrl = annualReportIndex >= 0 && filings?.accessionNumber?.[annualReportIndex] && filings?.primaryDocument?.[annualReportIndex]
      ? `https://www.sec.gov/Archives/edgar/data/1326380/${filings.accessionNumber[annualReportIndex].replace(/-/g, '')}/${filings.primaryDocument[annualReportIndex]}`
      : null;
    const leadership = annualReportUrl ? await getLeadershipFromSECAnnualReport(annualReportUrl) : null;

    return {
      name: data?.name || STATIC_INFO.name,
      symbol: data?.tickers?.[0] || STATIC_INFO.symbol,
      exchange: data?.exchanges?.[0] || STATIC_INFO.exchange,
      industry: data?.sicDescription || STATIC_INFO.industry,
      headquarters,
      ceo: leadership?.ceo || null,
      dataSource: leadership?.ceo ? 'sec/yahoo/sec-10k' : 'sec/yahoo',
    };
  } catch (error) {
    console.error('SEC company profile error:', error);
    return {
      name: STATIC_INFO.name,
      symbol: STATIC_INFO.symbol,
      exchange: STATIC_INFO.exchange,
      industry: STATIC_INFO.industry,
      headquarters: null,
      ceo: null,
      dataSource: 'yahoo',
    };
  }
}

function decodeSECText(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

async function getLeadershipFromSECAnnualReport(url: string): Promise<{ ceo: string | null } | null> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      responseType: 'text',
      headers: {
        'User-Agent': 'GMEDASH-SEC-Reader/1.0 contact@example.com',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    const text = decodeSECText(String(response.data));
    const ceoMatch = text.match(/Chief Executive Officer,\s*([A-Z][A-Za-z .'-]+?)(?:,|\sand\s|\.|\s+as of)/i)
      || text.match(/([A-Z][A-Za-z .'-]+?),\s*(?:the Company's\s*)?Chairman(?:\s+of the Board)?\s+and\s+Chief Executive Officer/i);

    return {
      ceo: ceoMatch?.[1]?.trim() || null,
    };
  } catch (error) {
    console.error('SEC annual report leadership error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const responseHeaders = {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
  };

  try {
    // Check cache first
    const cached = cache.get<CompanyInfo>(CACHE_KEYS.COMPANY_INFO);
    if (cached && !cached.isStale) {
      return NextResponse.json({
        ...cached.data,
        cacheAge: cache.getAge(CACHE_KEYS.COMPANY_INFO),
      }, { headers: responseHeaders });
    }

    // Fetch fresh metrics and SEC identity profile
    const [metrics, secProfile] = await Promise.all([
      getCompanyMetrics('GME'),
      getSECCompanyProfile(),
    ]);

    if (metrics) {
      const companyInfo: CompanyInfo = {
        ...STATIC_INFO,
        name: secProfile.name,
        symbol: secProfile.symbol,
        exchange: secProfile.exchange,
        industry: secProfile.industry,
        headquarters: secProfile.headquarters,
        ceo: secProfile.ceo || STATIC_INFO.ceo,
        marketCap: metrics.marketCap,
        marketCapFormatted: metrics.marketCapFormatted,
        peRatio: metrics.peRatio,
        eps: metrics.eps,
        dividendYield: metrics.dividendYield,
        fiftyTwoWeekHigh: metrics.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: metrics.fiftyTwoWeekLow,
        avgVolume: metrics.avgVolume,
        beta: metrics.beta,
        sharesOutstanding: metrics.sharesOutstanding,
        floatShares: null,
        dataSource: secProfile.dataSource,
      };

      // Cache the result
      cache.set(CACHE_KEYS.COMPANY_INFO, companyInfo, CACHE_TTL.COMPANY_INFO);

      return NextResponse.json({
        ...companyInfo,
        cacheAge: 0,
      }, { headers: responseHeaders });
    }

    // If fresh fetch failed, try to return stale cache
    const staleData = cache.getStale<CompanyInfo>(CACHE_KEYS.COMPANY_INFO);
    if (staleData) {
      return NextResponse.json({
        ...staleData,
        stale: true,
        cacheAge: cache.getAge(CACHE_KEYS.COMPANY_INFO),
      }, { headers: responseHeaders });
    }

    // Return static info with null metrics (not fake 0 values)
    const fallbackInfo: CompanyInfo = {
      ...STATIC_INFO,
      ...secProfile,
      ceo: secProfile.ceo || STATIC_INFO.ceo,
      marketCap: null,
      marketCapFormatted: 'N/A',
      peRatio: null,
      eps: null,
      dividendYield: null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
      avgVolume: null,
      beta: null,
      sharesOutstanding: null,
      floatShares: null,
      dataSource: secProfile.dataSource,
    };

    return NextResponse.json({
      ...fallbackInfo,
      message: 'Unable to fetch live public-market metrics from the configured free sources.',
    }, { headers: responseHeaders });

  } catch (error) {
    console.error('Company Info API error:', error);

    // Try to return stale cache on error
    const staleData = cache.getStale<CompanyInfo>(CACHE_KEYS.COMPANY_INFO);
    if (staleData) {
      return NextResponse.json({
        ...staleData,
        stale: true,
        cacheAge: cache.getAge(CACHE_KEYS.COMPANY_INFO),
      }, { headers: responseHeaders });
    }

    // Return static info with null metrics
    return NextResponse.json({
      ...STATIC_INFO,
      marketCap: null,
      marketCapFormatted: 'N/A',
      peRatio: null,
      eps: null,
      dividendYield: null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
      avgVolume: null,
      beta: null,
      sharesOutstanding: null,
      floatShares: null,
      dataSource: 'error',
      error: 'Failed to fetch company data',
    }, { headers: responseHeaders });
  }
}
