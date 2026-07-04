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
  source: 'yahoo' | 'cache';
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
  source: 'yahoo' | 'cache';
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
// YAHOO FINANCE PROVIDER
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

export async function yahooGetFullMetrics(symbol: string = 'GME'): Promise<CompanyMetrics | null> {
  try {
    const chartResponse = await axios.get(`${YAHOO_BASE}/chart/${symbol}`, {
      params: { interval: '1d', range: '1y' },
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GMEDASH/1.0)',
      },
    });

    const chartResult = chartResponse.data?.chart?.result?.[0];
    const meta = chartResult?.meta;

    if (meta) {
      // Get what we can from chart meta
      const quotes = chartResult?.indicators?.quote?.[0];
      let fiftyTwoWeekHigh = meta.fiftyTwoWeekHigh || null;
      let fiftyTwoWeekLow = meta.fiftyTwoWeekLow || null;
      const avgVolume = meta.regularMarketVolume || null;

      // Calculate 52-week from historical if not in meta
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
        marketCap: null,
        marketCapFormatted: 'N/A',
        peRatio: null, // Can't calculate without EPS
        eps: null,
        beta: null,
        fiftyTwoWeekHigh,
        fiftyTwoWeekLow,
        avgVolume,
        sharesOutstanding: null,
        dividendYield: null,
        source: 'yahoo',
      };
    }

    return null;
  } catch (error: any) {
    console.error('Yahoo full metrics error:', error?.message || error);
    updateProviderHealth('yahoo', false);
    return null;
  }
}

// ============================================
// UNIFIED FETCHERS WITH FALLBACK
// ============================================

export async function getStockQuote(symbol: string = 'GME'): Promise<StockQuote | null> {
  const yahooQuote = await yahooGetQuote(symbol);
  if (yahooQuote) {
    return yahooQuote;
  }

  return null;
}

export async function getCompanyMetrics(symbol: string = 'GME'): Promise<CompanyMetrics | null> {
  const yahooFullMetrics = await yahooGetFullMetrics(symbol);
  if (yahooFullMetrics) {
    return yahooFullMetrics;
  }

  // Last resort: Try to get partial data from Yahoo chart
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
