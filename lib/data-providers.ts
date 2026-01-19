import axios from 'axios';

// Unified stock quote format
export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
  open: number;
  high: number;
  low: number;
  volume: string;
  previousClose: number;
  source: 'finnhub' | 'yahoo' | 'cache';
}

// Unified company metrics format
export interface CompanyMetrics {
  marketCap: number | null;
  marketCapFormatted: string;
  peRatio: number | null;
  eps: number | null;
  beta: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  avgVolume: number | null;
  sharesOutstanding: number | null;
  dividendYield: number | null;
  source: 'finnhub' | 'yahoo' | 'cache';
}

// Unified historical data format
export interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Provider health tracking
interface ProviderHealth {
  lastSuccess: number | null;
  lastError: number | null;
  consecutiveErrors: number;
}

const providerHealth: Record<string, ProviderHealth> = {
  finnhub: { lastSuccess: null, lastError: null, consecutiveErrors: 0 },
  yahoo: { lastSuccess: null, lastError: null, consecutiveErrors: 0 },
};

function updateProviderHealth(provider: string, success: boolean) {
  const health = providerHealth[provider];
  if (success) {
    health.lastSuccess = Date.now();
    health.consecutiveErrors = 0;
  } else {
    health.lastError = Date.now();
    health.consecutiveErrors++;
  }
}

// Format market cap for display
export function formatMarketCap(value: number | null): string {
  if (value === null || value === 0) return 'N/A';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

// ============================================
// FINNHUB PROVIDER
// ============================================

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

function getFinnhubApiKey(): string | null {
  return process.env.FINNHUB_API_KEY || null;
}

export async function finnhubGetQuote(symbol: string = 'GME'): Promise<StockQuote | null> {
  const apiKey = getFinnhubApiKey();
  if (!apiKey) {
    console.log('Finnhub: No API key configured');
    return null;
  }

  try {
    const response = await axios.get(`${FINNHUB_BASE}/quote`, {
      params: { symbol, token: apiKey },
      timeout: 8000,
    });

    const data = response.data;

    // Finnhub returns: c (current), d (change), dp (percent change), h (high), l (low), o (open), pc (previous close)
    if (data && typeof data.c === 'number' && data.c > 0) {
      updateProviderHealth('finnhub', true);
      return {
        symbol,
        price: data.c,
        change: data.d || 0,
        changePercent: `${(data.dp || 0).toFixed(2)}%`,
        open: data.o || 0,
        high: data.h || 0,
        low: data.l || 0,
        volume: '0', // Finnhub quote doesn't include volume, need separate call
        previousClose: data.pc || 0,
        source: 'finnhub',
      };
    }

    return null;
  } catch (error: any) {
    console.error('Finnhub quote error:', error?.message || error);
    updateProviderHealth('finnhub', false);
    return null;
  }
}

export async function finnhubGetMetrics(symbol: string = 'GME'): Promise<CompanyMetrics | null> {
  const apiKey = getFinnhubApiKey();
  if (!apiKey) {
    console.log('Finnhub: No API key configured');
    return null;
  }

  try {
    const response = await axios.get(`${FINNHUB_BASE}/stock/metric`, {
      params: { symbol, metric: 'all', token: apiKey },
      timeout: 8000,
    });

    const data = response.data;
    const metric = data?.metric;

    if (metric) {
      updateProviderHealth('finnhub', true);
      const marketCap = metric.marketCapitalization ? metric.marketCapitalization * 1e6 : null;

      return {
        marketCap,
        marketCapFormatted: formatMarketCap(marketCap),
        peRatio: metric.peBasicExclExtraTTM || metric.peTTM || null,
        eps: metric.epsBasicExclExtraItemsTTM || metric.epsTTM || null,
        beta: metric.beta || null,
        fiftyTwoWeekHigh: metric['52WeekHigh'] || null,
        fiftyTwoWeekLow: metric['52WeekLow'] || null,
        avgVolume: metric['10DayAverageTradingVolume'] ? metric['10DayAverageTradingVolume'] * 1e6 : null,
        sharesOutstanding: metric.sharesOutstanding ? metric.sharesOutstanding * 1e6 : null,
        dividendYield: metric.dividendYieldIndicatedAnnual || null,
        source: 'finnhub',
      };
    }

    return null;
  } catch (error: any) {
    console.error('Finnhub metrics error:', error?.message || error);
    updateProviderHealth('finnhub', false);
    return null;
  }
}

export async function finnhubGetCandles(
  symbol: string = 'GME',
  resolution: string = 'D',
  from: number,
  to: number
): Promise<HistoricalDataPoint[]> {
  const apiKey = getFinnhubApiKey();
  if (!apiKey) {
    console.log('Finnhub: No API key configured');
    return [];
  }

  try {
    const response = await axios.get(`${FINNHUB_BASE}/stock/candle`, {
      params: { symbol, resolution, from, to, token: apiKey },
      timeout: 10000,
    });

    const data = response.data;

    if (data && data.s === 'ok' && data.t && data.t.length > 0) {
      updateProviderHealth('finnhub', true);
      return data.t.map((timestamp: number, i: number) => ({
        date: new Date(timestamp * 1000).toISOString().split('T')[0],
        open: data.o[i] || 0,
        high: data.h[i] || 0,
        low: data.l[i] || 0,
        close: data.c[i] || 0,
        volume: data.v[i] || 0,
      }));
    }

    return [];
  } catch (error: any) {
    console.error('Finnhub candles error:', error?.message || error);
    updateProviderHealth('finnhub', false);
    return [];
  }
}

// ============================================
// YAHOO FINANCE PROVIDER (FALLBACK)
// ============================================

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance';

export async function yahooGetQuote(symbol: string = 'GME'): Promise<StockQuote | null> {
  try {
    const response = await axios.get(`${YAHOO_BASE}/chart/${symbol}`, {
      params: {
        interval: '1m',
        range: '1d',
        includePrePost: true,
      },
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GMEDASH/1.0)',
      },
    });

    const result = response.data?.chart?.result?.[0];
    if (result) {
      const quote = result.indicators?.quote?.[0];
      const meta = result.meta;
      const timestamps = result.timestamp;

      if (meta && quote && timestamps && timestamps.length > 0) {
        const latestIndex = timestamps.length - 1;
        const price = meta.regularMarketPrice || quote.close?.[latestIndex];
        const previousClose = meta.previousClose;

        if (price && previousClose) {
          updateProviderHealth('yahoo', true);
          return {
            symbol: meta.symbol || symbol,
            price: Number(price),
            change: Number(price) - Number(previousClose),
            changePercent: `${(((Number(price) - Number(previousClose)) / Number(previousClose)) * 100).toFixed(2)}%`,
            open: Number(meta.regularMarketOpen || quote.open?.[0] || 0),
            high: Number(meta.regularMarketDayHigh || Math.max(...(quote.high?.filter((h: number) => h !== null) || [0]))),
            low: Number(meta.regularMarketDayLow || Math.min(...(quote.low?.filter((l: number) => l !== null && l > 0) || [0]))),
            volume: String(meta.regularMarketVolume || quote.volume?.[latestIndex] || 0),
            previousClose: Number(previousClose),
            source: 'yahoo',
          };
        }
      }
    }

    return null;
  } catch (error: any) {
    console.error('Yahoo quote error:', error?.message || error);
    updateProviderHealth('yahoo', false);
    return null;
  }
}

export async function yahooGetHistorical(
  symbol: string = 'GME',
  range: string = '1y'
): Promise<HistoricalDataPoint[]> {
  try {
    const response = await axios.get(`${YAHOO_BASE}/chart/${symbol}`, {
      params: {
        interval: '1d',
        range,
      },
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GMEDASH/1.0)',
      },
    });

    const result = response.data?.chart?.result?.[0];
    if (!result) return [];

    const quote = result.indicators?.quote?.[0];
    const timestamps = result.timestamp;

    if (!quote || !timestamps) return [];

    updateProviderHealth('yahoo', true);
    return timestamps
      .map((timestamp: number, index: number) => ({
        date: new Date(timestamp * 1000).toISOString().split('T')[0],
        open: quote.open?.[index] || 0,
        high: quote.high?.[index] || 0,
        low: quote.low?.[index] || 0,
        close: quote.close?.[index] || 0,
        volume: quote.volume?.[index] || 0,
      }))
      .filter((item: HistoricalDataPoint) => item.close > 0);
  } catch (error: any) {
    console.error('Yahoo historical error:', error?.message || error);
    updateProviderHealth('yahoo', false);
    return [];
  }
}

export async function yahooGetMetricsFromChart(symbol: string = 'GME'): Promise<Partial<CompanyMetrics> | null> {
  try {
    const response = await axios.get(`${YAHOO_BASE}/chart/${symbol}`, {
      params: {
        interval: '1d',
        range: '1y',
      },
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GMEDASH/1.0)',
      },
    });

    const result = response.data?.chart?.result?.[0];
    const meta = result?.meta;
    const quotes = result?.indicators?.quote?.[0];

    if (!meta) return null;

    // Calculate 52-week high/low from historical data
    let fiftyTwoWeekHigh = meta.fiftyTwoWeekHigh || null;
    let fiftyTwoWeekLow = meta.fiftyTwoWeekLow || null;

    if (quotes?.high && quotes?.low) {
      const validHighs = quotes.high.filter((h: number | null) => h !== null && h > 0);
      const validLows = quotes.low.filter((l: number | null) => l !== null && l > 0);
      if (validHighs.length > 0 && !fiftyTwoWeekHigh) {
        fiftyTwoWeekHigh = Math.max(...validHighs);
      }
      if (validLows.length > 0 && !fiftyTwoWeekLow) {
        fiftyTwoWeekLow = Math.min(...validLows);
      }
    }

    updateProviderHealth('yahoo', true);
    return {
      fiftyTwoWeekHigh,
      fiftyTwoWeekLow,
      source: 'yahoo',
    };
  } catch (error: any) {
    console.error('Yahoo chart metrics error:', error?.message || error);
    updateProviderHealth('yahoo', false);
    return null;
  }
}

// ============================================
// UNIFIED FETCHERS WITH FALLBACK
// ============================================

export async function getStockQuote(symbol: string = 'GME'): Promise<StockQuote | null> {
  // Try Finnhub first
  const finnhubQuote = await finnhubGetQuote(symbol);
  if (finnhubQuote) {
    // Get volume from Yahoo since Finnhub quote doesn't include it
    const yahooQuote = await yahooGetQuote(symbol);
    if (yahooQuote) {
      finnhubQuote.volume = yahooQuote.volume;
    }
    return finnhubQuote;
  }

  // Fallback to Yahoo
  const yahooQuote = await yahooGetQuote(symbol);
  if (yahooQuote) {
    return yahooQuote;
  }

  return null;
}

export async function getCompanyMetrics(symbol: string = 'GME'): Promise<CompanyMetrics | null> {
  // Try Finnhub first
  const finnhubMetrics = await finnhubGetMetrics(symbol);
  if (finnhubMetrics && finnhubMetrics.marketCap !== null) {
    // Supplement with Yahoo 52-week data if missing
    if (!finnhubMetrics.fiftyTwoWeekHigh || !finnhubMetrics.fiftyTwoWeekLow) {
      const yahooData = await yahooGetMetricsFromChart(symbol);
      if (yahooData) {
        finnhubMetrics.fiftyTwoWeekHigh = finnhubMetrics.fiftyTwoWeekHigh || yahooData.fiftyTwoWeekHigh || null;
        finnhubMetrics.fiftyTwoWeekLow = finnhubMetrics.fiftyTwoWeekLow || yahooData.fiftyTwoWeekLow || null;
      }
    }
    return finnhubMetrics;
  }

  // Fallback: Try to get partial data from Yahoo chart
  const yahooData = await yahooGetMetricsFromChart(symbol);
  if (yahooData) {
    return {
      marketCap: null,
      marketCapFormatted: 'N/A',
      peRatio: null,
      eps: null,
      beta: null,
      fiftyTwoWeekHigh: yahooData.fiftyTwoWeekHigh || null,
      fiftyTwoWeekLow: yahooData.fiftyTwoWeekLow || null,
      avgVolume: null,
      sharesOutstanding: null,
      dividendYield: null,
      source: 'yahoo',
    };
  }

  return null;
}

export async function getHistoricalData(
  symbol: string = 'GME',
  period: string = '1Y'
): Promise<{ data: HistoricalDataPoint[]; source: string }> {
  // Map period to Finnhub timestamps
  const now = Math.floor(Date.now() / 1000);
  const periodMap: Record<string, number> = {
    '1W': 7 * 24 * 60 * 60,
    '1M': 30 * 24 * 60 * 60,
    '3M': 90 * 24 * 60 * 60,
    '6M': 180 * 24 * 60 * 60,
    '1Y': 365 * 24 * 60 * 60,
    '5Y': 5 * 365 * 24 * 60 * 60,
  };

  const seconds = periodMap[period] || periodMap['1Y'];
  const from = now - seconds;

  // Try Finnhub first
  const finnhubData = await finnhubGetCandles(symbol, 'D', from, now);
  if (finnhubData.length > 0) {
    return { data: finnhubData, source: 'finnhub' };
  }

  // Fallback to Yahoo
  const yahooRangeMap: Record<string, string> = {
    '1W': '5d',
    '1M': '1mo',
    '3M': '3mo',
    '6M': '6mo',
    '1Y': '1y',
    '5Y': '5y',
  };

  const yahooRange = yahooRangeMap[period] || '1y';
  const yahooData = await yahooGetHistorical(symbol, yahooRange);

  return { data: yahooData, source: yahooData.length > 0 ? 'yahoo' : 'none' };
}

// Export provider health for debugging
export function getProviderHealth() {
  return providerHealth;
}
