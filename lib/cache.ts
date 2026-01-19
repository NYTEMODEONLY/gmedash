// In-memory cache with TTL support
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class Cache {
  private store: Map<string, CacheEntry<any>> = new Map();

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get<T>(key: string): { data: T; isStale: boolean } | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    const isStale = age > entry.ttl;

    return {
      data: entry.data as T,
      isStale,
    };
  }

  // Get data even if stale (for fallback when APIs fail)
  getStale<T>(key: string): T | null {
    const entry = this.store.get(key);
    return entry ? (entry.data as T) : null;
  }

  // Check if cache has fresh data
  hasFresh(key: string): boolean {
    const result = this.get(key);
    return result !== null && !result.isStale;
  }

  // Clear specific key or all
  clear(key?: string): void {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }

  // Get cache age in seconds
  getAge(key: string): number | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    return Math.floor((Date.now() - entry.timestamp) / 1000);
  }
}

// Singleton cache instance
export const cache = new Cache();

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  STOCK_QUOTE: 30 * 1000,         // 30 seconds during market hours
  STOCK_QUOTE_CLOSED: 5 * 60 * 1000, // 5 minutes when market closed
  COMPANY_INFO: 60 * 60 * 1000,   // 1 hour
  HISTORICAL: 5 * 60 * 1000,      // 5 minutes
  SHORT_INTEREST: 24 * 60 * 60 * 1000, // 24 hours
  NEWS: 5 * 60 * 1000,            // 5 minutes
  SEC_FILINGS: 10 * 60 * 1000,    // 10 minutes
};

// Cache keys
export const CACHE_KEYS = {
  STOCK_QUOTE: 'stock_quote_GME',
  COMPANY_INFO: 'company_info_GME',
  HISTORICAL: (period: string) => `historical_GME_${period}`,
  SHORT_INTEREST: 'short_interest_GME',
};
