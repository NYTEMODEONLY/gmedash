import axios from 'axios';

// Data validation utilities
const validateStockQuote = (data: any): boolean => {
  return data && 
         typeof data.symbol === 'string' && 
         typeof data.price === 'number' && 
         !isNaN(data.price) && 
         data.price > 0;
};

const validateNewsArticle = (article: any): boolean => {
  return article &&
         typeof article.title === 'string' && 
         article.title.length > 0 &&
         typeof article.url === 'string' && 
         article.url.startsWith('http');
};

const validateSECFiling = (filing: any): boolean => {
  return filing &&
         typeof filing.formType === 'string' &&
         typeof filing.filingDate === 'string' &&
         typeof filing.url === 'string' &&
         filing.url.startsWith('http');
};

// Enhanced error handling with retry logic
const withRetry = async <T>(
  fn: () => Promise<T>, 
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
};

// API Base URLs - Now using Next.js API routes to avoid CORS issues

// Types
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
}

export interface HistoricalData {
  date: string;
  close: number;
  volume: number;
  high: number;
  low: number;
  open: number;
}

export interface ShortInterest {
  date: string;
  shortInterest: number;
  daysToCover: number;
}

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: {
    name: string;
  };
}

export interface SECFiling {
  formType: string;
  filingDate: string;
  description: string;
  url: string;
  companyName: string;
}

// Enhanced real-time stock quote using Next.js API route
export const getStockQuote = async (symbol: string = 'GME'): Promise<StockQuote | null> => {
  try {
    const response = await axios.get(`/api/stock?symbol=${symbol}`, {
      timeout: 10000,
    });

    const stockQuote = response.data;
    
    if (validateStockQuote(stockQuote)) {
      return stockQuote;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching stock quote:', error);
    return null;
  }
};

// Real-time price streaming (for live updates)
export const createPriceStream = (symbol: string = 'GME', callback: (quote: StockQuote | null) => void) => {
  let isActive = true;
  
  const fetchPrice = async () => {
    if (!isActive) return;
    
    try {
      const quote = await getStockQuote(symbol);
      callback(quote);
    } catch (error) {
      console.error('Error in price stream:', error);
    }
    
    // Schedule next update (30 seconds during market hours, 5 minutes after hours)
    const now = new Date();
    const isMarketHours = isMarketOpen(now);
    const interval = isMarketHours ? 30000 : 300000; // 30s or 5min
    
    if (isActive) {
      setTimeout(fetchPrice, interval);
    }
  };
  
  // Start the stream
  fetchPrice();
  
  // Return cleanup function
  return () => {
    isActive = false;
  };
};

// Market hours checker
const isMarketOpen = (date: Date): boolean => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partMap = parts.reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});

  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const day = dayMap[partMap.weekday || 'Sun'];
  const hours = Number(partMap.hour || 0);
  const minutes = Number(partMap.minute || 0);
  const totalMinutes = hours * 60 + minutes;

  if (day === 0 || day === 6) return false;

  const marketOpen = 9 * 60 + 30;
  const marketClose = 16 * 60;

  return totalMinutes >= marketOpen && totalMinutes < marketClose;
};

export const getHistoricalData = async (
  symbol: string = 'GME',
  period: string = '1Y'
): Promise<HistoricalData[]> => {
  try {
    const response = await axios.get(`/api/historical?symbol=${symbol}&period=${period}`, {
      timeout: 10000,
    });

    // Handle new response format with data property
    const responseData = response.data;
    if (responseData?.data && Array.isArray(responseData.data)) {
      return responseData.data;
    }

    // Fallback for direct array response
    return Array.isArray(responseData) ? responseData : [];
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return [];
  }
};

// Enhanced short interest data using Next.js API route
export const getShortInterest = async (symbol: string = 'GME'): Promise<ShortInterest[]> => {
  try {
    const response = await axios.get('/api/short-interest', {
      timeout: 15000,
    });

    const responseData = response.data;

    if (responseData?.error) {
      throw new Error(responseData.error);
    }

    // Handle new response format with data property
    if (responseData?.data && Array.isArray(responseData.data)) {
      return responseData.data;
    }

    return Array.isArray(responseData) ? responseData : [];
  } catch (error) {
    console.error('Error fetching real short interest data:', error);
    return []; // Return empty array - no mock data
  }
};


// Enhanced news aggregation using Next.js API route
export const getNews = async (): Promise<NewsArticle[]> => {
  try {
    const response = await axios.get('/api/news', {
      timeout: 15000,
    });

    if (response.data?.error) {
      throw new Error(response.data.error);
    }

    const articles = response.data || [];
    
    // Validate articles on client side
    return articles.filter((article: any) => validateNewsArticle(article));
    
  } catch (error) {
    console.error('Error fetching real news data:', error);
    return []; // Return empty array instead of mock data
  }
};


// Enhanced SEC filings using Next.js API route
export const getSECFilings = async (cik: string = '1326380'): Promise<SECFiling[]> => {
  try {
    const response = await axios.get(`/api/sec?cik=${cik}`, {
      timeout: 15000,
    });

    if (response.data?.error) {
      throw new Error(response.data.error);
    }

    const filings = response.data || [];
    
    // Validate filings on client side
    return filings.filter((filing: any) => validateSECFiling(filing));
    
  } catch (error) {
    console.error('Error fetching real SEC filings:', error);
    return []; // Return empty array instead of mock data
  }
};


 
