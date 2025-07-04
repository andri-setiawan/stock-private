// Advanced caching service with multiple storage backends
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  size: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalItems: number;
  totalSize: number;
  oldestItem: number;
  newestItem: number;
}

class CacheService {
  private memoryCache = new Map<string, CacheItem<unknown>>();
  private readonly maxMemoryItems: number;
  private readonly maxMemorySize: number; // in bytes
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(maxItems = 1000, maxSize = 50 * 1024 * 1024) { // 50MB default
    this.maxMemoryItems = maxItems;
    this.maxMemorySize = maxSize;
    
    // Cleanup interval
    setInterval(() => this.cleanup(), 5 * 60 * 1000); // Every 5 minutes
  }

  private calculateSize(data: unknown): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 1024; // Default size if calculation fails
    }
  }

  private isExpired(item: CacheItem<unknown>): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  private evictLRU(): void {
    if (this.memoryCache.size === 0) return;

    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, item] of this.memoryCache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
    }
  }

  private enforceMemoryLimits(): void {
    // Remove expired items first
    this.cleanup();

    // Check size limit
    let totalSize = 0;
    for (const item of this.memoryCache.values()) {
      totalSize += item.size;
    }

    // Evict items if over size limit
    while (totalSize > this.maxMemorySize && this.memoryCache.size > 0) {
      this.evictLRU();
      totalSize = 0;
      for (const item of this.memoryCache.values()) {
        totalSize += item.size;
      }
    }

    // Evict items if over count limit
    while (this.memoryCache.size > this.maxMemoryItems) {
      this.evictLRU();
    }
  }

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    const size = this.calculateSize(data);
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      size,
    };

    this.memoryCache.set(key, item as CacheItem<unknown>);
    this.enforceMemoryLimits();

    // Also store in localStorage for persistence (if available and data is small enough)
    if (typeof window !== 'undefined' && size < 100 * 1024) { // 100KB limit for localStorage
      try {
        const persistentItem = {
          data,
          timestamp: item.timestamp,
          ttl,
        };
        localStorage.setItem(`cache_${key}`, JSON.stringify(persistentItem));
      } catch (error) {
        console.warn('Failed to persist cache item to localStorage:', error);
      }
    }
  }

  get<T>(key: string): T | null {
    // Check memory cache first
    const memoryItem = this.memoryCache.get(key) as CacheItem<T> | undefined;
    
    if (memoryItem) {
      if (this.isExpired(memoryItem)) {
        this.memoryCache.delete(key);
        this.stats.misses++;
        
        // Clean up localStorage too
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`cache_${key}`);
        }
        
        return null;
      }

      memoryItem.hits++;
      this.stats.hits++;
      return memoryItem.data;
    }

    // Check localStorage if not in memory
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`cache_${key}`);
        if (stored) {
          const parsedItem = JSON.parse(stored);
          const isExpired = Date.now() - parsedItem.timestamp > parsedItem.ttl;
          
          if (!isExpired) {
            // Restore to memory cache
            this.set(key, parsedItem.data, parsedItem.ttl - (Date.now() - parsedItem.timestamp));
            this.stats.hits++;
            return parsedItem.data;
          } else {
            localStorage.removeItem(`cache_${key}`);
          }
        }
      } catch (error) {
        console.warn('Failed to read from localStorage cache:', error);
      }
    }

    this.stats.misses++;
    return null;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    const deleted = this.memoryCache.delete(key);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`cache_${key}`);
    }
    
    return deleted;
  }

  clear(): void {
    this.memoryCache.clear();
    
    if (typeof window !== 'undefined') {
      // Clear only cache items from localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  cleanup(): void {
    const keysToDelete: string[] = [];

    for (const [key, item] of this.memoryCache.entries()) {
      if (this.isExpired(item)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.memoryCache.delete(key);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`cache_${key}`);
      }
    });

    console.debug(`Cache cleanup: removed ${keysToDelete.length} expired items`);
  }

  getStats(): CacheStats {
    const items = Array.from(this.memoryCache.values());
    const totalSize = items.reduce((sum, item) => sum + item.size, 0);
    const timestamps = items.map(item => item.timestamp);

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      totalItems: this.memoryCache.size,
      totalSize,
      oldestItem: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestItem: timestamps.length > 0 ? Math.max(...timestamps) : 0,
    };
  }

  // Specialized methods for common use cases
  memoize<Args extends unknown[], Return>(
    fn: (...args: Args) => Promise<Return>,
    keyFn: (...args: Args) => string,
    ttl: number = 5 * 60 * 1000
  ): (...args: Args) => Promise<Return> {
    return async (...args: Args): Promise<Return> => {
      const key = keyFn(...args);
      const cached = this.get<Return>(key);
      
      if (cached !== null) {
        return cached;
      }
      
      const result = await fn(...args);
      this.set(key, result, ttl);
      return result;
    };
  }

  // Batch operations
  setMany<T>(items: Array<{ key: string; data: T; ttl?: number }>): void {
    items.forEach(item => {
      this.set(item.key, item.data, item.ttl);
    });
  }

  getMany<T>(keys: string[]): Array<{ key: string; data: T | null }> {
    return keys.map(key => ({
      key,
      data: this.get<T>(key),
    }));
  }

  // Cache warming
  async warmup<T>(
    keys: string[],
    fetchFn: (key: string) => Promise<T>,
    ttl: number = 5 * 60 * 1000
  ): Promise<void> {
    const promises = keys.map(async key => {
      if (!this.has(key)) {
        try {
          const data = await fetchFn(key);
          this.set(key, data, ttl);
        } catch (error) {
          console.warn(`Failed to warm up cache for key ${key}:`, error);
        }
      }
    });

    await Promise.allSettled(promises);
  }
}

// Create cache instances for different data types
export const stockDataCache = new CacheService(500, 20 * 1024 * 1024); // 20MB for stock data
export const aiRecommendationCache = new CacheService(200, 10 * 1024 * 1024); // 10MB for AI recommendations
export const userDataCache = new CacheService(100, 5 * 1024 * 1024); // 5MB for user data
export const generalCache = new CacheService(1000, 50 * 1024 * 1024); // 50MB for general use

// Cache key generators
export const cacheKeys = {
  stockData: (symbol: string) => `stock_data:${symbol}`,
  stockQuote: (symbol: string) => `stock_quote:${symbol}`,
  stockProfile: (symbol: string) => `stock_profile:${symbol}`,
  stockNews: (symbol: string, date: string) => `stock_news:${symbol}:${date}`,
  aiRecommendation: (symbol: string, portfolioHash: string) => `ai_rec:${symbol}:${portfolioHash}`,
  marketAnalysis: (date: string) => `market_analysis:${date}`,
  portfolioAnalytics: (userId: string, timeframe: string) => `portfolio_analytics:${userId}:${timeframe}`,
  dailySuggestions: (date: string) => `daily_suggestions:${date}`,
};

// Utility functions
export function createPortfolioHash(portfolio: Record<string, unknown>): string {
  const sortedKeys = Object.keys(portfolio).sort();
  const hashInput = sortedKeys.map(key => `${key}:${portfolio[key]}`).join('|');
  
  // Simple hash function (in production, use a proper crypto hash)
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

// Cache monitoring
export function logCacheStats(): void {
  const stats = [
    { name: 'Stock Data', cache: stockDataCache },
    { name: 'AI Recommendations', cache: aiRecommendationCache },
    { name: 'User Data', cache: userDataCache },
    { name: 'General', cache: generalCache },
  ];

  console.group('Cache Statistics');
  stats.forEach(({ name, cache }) => {
    const stat = cache.getStats();
    console.log(`${name}:`, {
      'Hit Rate': `${(stat.hitRate * 100).toFixed(1)}%`,
      'Items': stat.totalItems,
      'Size': `${(stat.totalSize / 1024 / 1024).toFixed(2)}MB`,
      'Hits/Misses': `${stat.hits}/${stat.misses}`,
    });
  });
  console.groupEnd();
}

// Auto-cleanup and monitoring in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Log cache stats every 5 minutes in development
  setInterval(logCacheStats, 5 * 60 * 1000);
}