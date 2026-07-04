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
  source: 'yahoo' | 'nasdaq' | 'cache';
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
  source: 'yahoo' | 'nasdaq/sec' | 'sec' | 'cache';
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
  nasdaq: { lastSuccess: null, lastError: null, consecutiveErrors: 0 },
  sec: { lastSuccess: null, lastError: null, consecutiveErrors: 0 },
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
const NASDAQ_BASE = 'https://api.nasdaq.com/api/quote';
const SEC_COMPANY_FACTS_URL = 'https://data.sec.gov/api/xbrl/companyfacts/CIK0001326380.json';

function parseMarketNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed || /^N\/A$/i.test(trimmed) || /^NA$/i.test(trimmed)) return null;

  const multiplier = /T$/i.test(trimmed) ? 1e12 : /B$/i.test(trimmed) ? 1e9 : /M$/i.test(trimmed) ? 1e6 : 1;
  const numeric = Number(trimmed.replace(/[$,%\s,]/g, '').replace(/[TBM]$/i, ''));
  return Number.isFinite(numeric) ? numeric * multiplier : null;
}

function parsePercent(value: unknown): number | null {
  const number = parseMarketNumber(value);
  return number === null ? null : number;
}

function formatYahooPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function getLatestFact(
  facts: any,
  concept: string,
  unit: string,
  forms = ['10-K', '10-Q', '10-K/A', '10-Q/A']
) {
  const values = facts?.['us-gaap']?.[concept]?.units?.[unit];
  if (!Array.isArray(values)) return null;

  return values
    .filter((item) => forms.includes(item.form) && typeof item.val === 'number')
    .sort((a, b) => String(b.filed).localeCompare(String(a.filed)) || String(b.end).localeCompare(String(a.end)))[0] || null;
}

function findComparablePriorYearQuarter(facts: any, concept: string, latestQuarter: any) {
  const values = facts?.['us-gaap']?.[concept]?.units?.['USD/shares'];
  if (!Array.isArray(values) || !latestQuarter?.start || !latestQuarter?.end) return null;

  const latestStart = new Date(latestQuarter.start);
  const latestEnd = new Date(latestQuarter.end);
  const latestDurationDays = Math.round((latestEnd.getTime() - latestStart.getTime()) / 86400000);
  const priorStart = new Date(latestStart);
  const priorEnd = new Date(latestEnd);
  priorStart.setFullYear(priorStart.getFullYear() - 1);
  priorEnd.setFullYear(priorEnd.getFullYear() - 1);

  return values
    .filter((item) => (
      ['10-K', '10-Q', '10-K/A', '10-Q/A'].includes(item.form)
      && typeof item.val === 'number'
      && item.start
      && item.end
      && Math.abs(Math.round((new Date(item.end).getTime() - new Date(item.start).getTime()) / 86400000) - latestDurationDays) <= 14
      && Math.abs((new Date(item.start).getTime() - priorStart.getTime()) / 86400000) <= 14
      && Math.abs((new Date(item.end).getTime() - priorEnd.getTime()) / 86400000) <= 14
    ))
    .sort((a, b) => String(b.filed).localeCompare(String(a.filed)))[0] || null;
}

async function getSECMetricFacts() {
  try {
    const response = await axios.get(SEC_COMPANY_FACTS_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'GMEDASH-SEC-Reader/1.0 contact@example.com',
        Accept: 'application/json',
      },
    });

    const facts = response.data?.facts;
    const sharesOutstanding = getLatestFact(facts, 'CommonStockSharesOutstanding', 'shares')?.val ?? null;
    const dilutedAnnual = (facts?.['us-gaap']?.EarningsPerShareDiluted?.units?.['USD/shares'] || [])
      .filter((item: any) => ['10-K', '10-K/A'].includes(item.form) && item.fp === 'FY' && typeof item.val === 'number')
      .sort((a: any, b: any) => String(b.filed).localeCompare(String(a.filed)) || String(b.end).localeCompare(String(a.end)))[0] || null;
    const latestQuarter = (facts?.['us-gaap']?.EarningsPerShareDiluted?.units?.['USD/shares'] || [])
      .filter((item: any) => ['10-Q', '10-Q/A'].includes(item.form) && /^Q[1-3]$/.test(item.fp) && typeof item.val === 'number' && item.frame)
      .sort((a: any, b: any) => String(b.filed).localeCompare(String(a.filed)) || String(b.end).localeCompare(String(a.end)))[0] || null;
    const priorYearQuarter = findComparablePriorYearQuarter(facts, 'EarningsPerShareDiluted', latestQuarter);
    const eps = dilutedAnnual && latestQuarter && priorYearQuarter
      ? Number((dilutedAnnual.val - priorYearQuarter.val + latestQuarter.val).toFixed(2))
      : dilutedAnnual?.val ?? null;

    updateProviderHealth('sec', true);
    return {
      eps,
      sharesOutstanding,
      epsSource: latestQuarter && priorYearQuarter ? 'SEC diluted EPS TTM' : 'SEC diluted EPS FY',
    };
  } catch (error: any) {
    console.error('SEC metric facts error:', error?.message || error);
    updateProviderHealth('sec', false);
    return {
      eps: null,
      sharesOutstanding: null,
      epsSource: null,
    };
  }
}

async function nasdaqGetSummary(symbol: string = 'GME') {
  try {
    const response = await axios.get(`${NASDAQ_BASE}/${symbol}/summary`, {
      params: { assetclass: 'stocks' },
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GMEDASH/1.0)',
        Accept: 'application/json',
        Origin: 'https://www.nasdaq.com',
        Referer: `https://www.nasdaq.com/market-activity/stocks/${symbol.toLowerCase()}`,
      },
    });

    const summary = response.data?.data?.summaryData;
    if (!summary) return null;
    updateProviderHealth('nasdaq', true);
    return summary;
  } catch (error: any) {
    console.error('Nasdaq summary error:', error?.message || error);
    updateProviderHealth('nasdaq', false);
    return null;
  }
}

async function nasdaqGetInfo(symbol: string = 'GME') {
  try {
    const response = await axios.get(`${NASDAQ_BASE}/${symbol}/info`, {
      params: { assetclass: 'stocks' },
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GMEDASH/1.0)',
        Accept: 'application/json',
        Origin: 'https://www.nasdaq.com',
        Referer: `https://www.nasdaq.com/market-activity/stocks/${symbol.toLowerCase()}`,
      },
    });

    const data = response.data?.data;
    if (!data) return null;
    updateProviderHealth('nasdaq', true);
    return data;
  } catch (error: any) {
    console.error('Nasdaq info error:', error?.message || error);
    updateProviderHealth('nasdaq', false);
    return null;
  }
}

async function nasdaqGetHistorical(symbol: string, assetClass: 'stocks' | 'etf' = 'stocks'): Promise<HistoricalDataPoint[]> {
  const to = new Date();
  const from = new Date();
  from.setFullYear(from.getFullYear() - 1);

  try {
    const response = await axios.get(`${NASDAQ_BASE}/${symbol}/historical`, {
      params: {
        assetclass: assetClass,
        fromdate: from.toISOString().split('T')[0],
        todate: to.toISOString().split('T')[0],
        limit: 365,
      },
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GMEDASH/1.0)',
        Accept: 'application/json',
        Origin: 'https://www.nasdaq.com',
        Referer: `https://www.nasdaq.com/market-activity/${assetClass}/${symbol.toLowerCase()}`,
      },
    });

    const rows = response.data?.data?.tradesTable?.rows;
    if (!Array.isArray(rows)) return [];

    updateProviderHealth('nasdaq', true);
    return rows
      .map((row: any) => ({
        date: new Date(row.date).toISOString().split('T')[0],
        open: parseMarketNumber(row.open) || 0,
        high: parseMarketNumber(row.high) || 0,
        low: parseMarketNumber(row.low) || 0,
        close: parseMarketNumber(row.close) || 0,
        volume: parseMarketNumber(row.volume) || 0,
      }))
      .filter((item: HistoricalDataPoint) => item.close > 0)
      .sort((a: HistoricalDataPoint, b: HistoricalDataPoint) => a.date.localeCompare(b.date));
  } catch (error: any) {
    console.error('Nasdaq historical error:', error?.message || error);
    updateProviderHealth('nasdaq', false);
    return [];
  }
}

function calculateBeta(stockData: HistoricalDataPoint[], marketData: HistoricalDataPoint[]): number | null {
  const marketByDate = new Map(marketData.map((item) => [item.date, item.close]));
  const pairs = stockData
    .filter((item) => marketByDate.has(item.date))
    .map((item) => ({ date: item.date, stockClose: item.close, marketClose: marketByDate.get(item.date) || 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const returns = [];
  for (let index = 1; index < pairs.length; index++) {
    const previous = pairs[index - 1];
    const current = pairs[index];
    if (previous.stockClose > 0 && previous.marketClose > 0) {
      returns.push({
        stock: (current.stockClose - previous.stockClose) / previous.stockClose,
        market: (current.marketClose - previous.marketClose) / previous.marketClose,
      });
    }
  }

  if (returns.length < 50) return null;

  const avgStock = returns.reduce((sum, item) => sum + item.stock, 0) / returns.length;
  const avgMarket = returns.reduce((sum, item) => sum + item.market, 0) / returns.length;
  const covariance = returns.reduce((sum, item) => sum + ((item.stock - avgStock) * (item.market - avgMarket)), 0);
  const variance = returns.reduce((sum, item) => sum + ((item.market - avgMarket) ** 2), 0);

  return variance > 0 ? Number((covariance / variance).toFixed(2)) : null;
}

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

export async function nasdaqGetQuote(symbol: string = 'GME'): Promise<StockQuote | null> {
  const [info, summary] = await Promise.all([
    nasdaqGetInfo(symbol),
    nasdaqGetSummary(symbol),
  ]);

  if (!info?.primaryData) return null;

  const primary = info.primaryData;
  const price = parseMarketNumber(primary.lastSalePrice);
  const previousClose = parseMarketNumber(summary?.PreviousClose?.value);
  const change = parseMarketNumber(primary.netChange);
  const changePercent = parsePercent(primary.percentageChange);
  const dayRange = String(primary.dayrange?.value || info.keyStats?.dayrange?.value || '');
  const [dayLowText, dayHighText] = dayRange.split('-').map((part) => part?.trim());
  const dayLow = parseMarketNumber(dayLowText);
  const dayHigh = parseMarketNumber(dayHighText);

  if (price === null || previousClose === null) return null;

  return {
    symbol,
    price,
    change: change ?? price - previousClose,
    changePercent: changePercent !== null ? formatYahooPercent(changePercent) : formatYahooPercent(((price - previousClose) / previousClose) * 100),
    open: parseMarketNumber(primary.openPrice) || price,
    high: dayHigh || price,
    low: dayLow || price,
    volume: String(parseMarketNumber(primary.volume) || parseMarketNumber(summary?.ShareVolume?.value) || 0),
    previousClose,
    source: 'nasdaq',
  };
}

// ============================================
// UNIFIED FETCHERS WITH FALLBACK
// ============================================

export async function getStockQuote(symbol: string = 'GME'): Promise<StockQuote | null> {
  const yahooQuote = await yahooGetQuote(symbol);
  if (yahooQuote) {
    return yahooQuote;
  }

  return nasdaqGetQuote(symbol);
}

export async function getCompanyMetrics(symbol: string = 'GME'): Promise<CompanyMetrics | null> {
  const [yahooFullMetrics, nasdaqSummary, secFacts, nasdaqStockHistory, nasdaqMarketHistory, nasdaqInfo] = await Promise.all([
    yahooGetFullMetrics(symbol),
    nasdaqGetSummary(symbol),
    getSECMetricFacts(),
    nasdaqGetHistorical(symbol, 'stocks'),
    nasdaqGetHistorical('SPY', 'etf'),
    nasdaqGetInfo(symbol),
  ]);

  const marketCap = parseMarketNumber(nasdaqSummary?.MarketCap?.value)
    || (secFacts.sharesOutstanding && parseMarketNumber(nasdaqInfo?.primaryData?.lastSalePrice)
      ? secFacts.sharesOutstanding * (parseMarketNumber(nasdaqInfo?.primaryData?.lastSalePrice) || 0)
      : null);
  const fiftyTwoWeekRange = String(nasdaqSummary?.FiftTwoWeekHighLow?.value || nasdaqInfo?.keyStats?.fiftyTwoWeekHighLow?.value || '');
  const [rangeHighText, rangeLowText] = fiftyTwoWeekRange.includes('/')
    ? fiftyTwoWeekRange.split('/').map((part) => part.trim())
    : String(nasdaqInfo?.keyStats?.fiftyTwoWeekHighLow?.value || '').split('-').reverse().map((part) => part.trim());
  const fiftyTwoWeekHigh = parseMarketNumber(rangeHighText) || yahooFullMetrics?.fiftyTwoWeekHigh || null;
  const fiftyTwoWeekLow = parseMarketNumber(rangeLowText) || yahooFullMetrics?.fiftyTwoWeekLow || null;
  const avgVolume = parseMarketNumber(nasdaqSummary?.AverageVolume?.value) || yahooFullMetrics?.avgVolume || null;
  const beta = calculateBeta(nasdaqStockHistory, nasdaqMarketHistory);
  const price = parseMarketNumber(nasdaqInfo?.primaryData?.lastSalePrice);
  const peRatio = price && secFacts.eps && secFacts.eps > 0 ? Number((price / secFacts.eps).toFixed(2)) : yahooFullMetrics?.peRatio || null;

  if (marketCap || secFacts.eps || fiftyTwoWeekHigh || fiftyTwoWeekLow || avgVolume || beta || secFacts.sharesOutstanding) {
    return {
      marketCap,
      marketCapFormatted: formatMarketCap(marketCap),
      peRatio,
      eps: secFacts.eps ?? yahooFullMetrics?.eps ?? null,
      beta: beta ?? yahooFullMetrics?.beta ?? null,
      fiftyTwoWeekHigh,
      fiftyTwoWeekLow,
      avgVolume,
      sharesOutstanding: secFacts.sharesOutstanding,
      dividendYield: yahooFullMetrics?.dividendYield ?? null,
      source: marketCap || avgVolume || beta ? 'nasdaq/sec' : 'sec',
    };
  }

  if (yahooFullMetrics) return yahooFullMetrics;

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
  if (yahooData.length > 0) {
    return { data: yahooData, source: 'yahoo' };
  }

  const nasdaqData = await nasdaqGetHistorical(symbol, 'stocks');
  return { data: nasdaqData, source: nasdaqData.length > 0 ? 'nasdaq' : 'none' };
}

// Export provider health for debugging
export function getProviderHealth() {
  return providerHealth;
}
