import { stockDataCache, cacheKeys } from './cacheService';
import { performanceMonitor, measureNetworkCall } from '@/utils/performance';
import { validateInput, stockSymbolSchema, sanitizeErrorMessage } from '@/utils/validation';

const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

// Rate limiting configuration
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 60, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      
      if (waitTime > 0) {
        console.warn(`Rate limit reached, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.waitIfNeeded(); // Check again after waiting
      }
    }
    
    this.requests.push(now);
  }
}

const rateLimiter = new RateLimiter(60, 60000); // 60 requests per minute

export interface StockQuote {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

export interface CompanyProfile {
  country: string;
  currency: string;
  exchange: string;
  finnhubIndustry: string;
  ipo: string;
  logo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
}

export interface SearchResult {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}

export interface BasicFinancials {
  metric: {
    '52WeekHigh': number;
    '52WeekLow': number;
    '52WeekLowDate': string;
    '52WeekHighDate': string;
    '52WeekPriceReturnDaily': number;
    'beta': number;
    'epsBasicExclExtraItemsTTM': number;
    'peBasicExclExtraTTM': number;
    'marketCapitalization': number;
    'psTTM': number;
    'pbAnnual': number;
    [key: string]: number | string;
  };
}

export interface CandleData {
  c: number[]; // Close prices
  h: number[]; // High prices
  l: number[]; // Low prices
  o: number[]; // Open prices
  s: string; // Status
  t: number[]; // Timestamps
  v: number[]; // Volume
}

export interface NewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export interface StockData {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  openPrice: number;
  previousClose: number;
  high52: number;
  low52: number;
  marketCap: number;
  peRatio: number;
  beta?: number;
  logo?: string;
  industry?: string;
  country?: string;
  currency?: string;
  exchange?: string;
}

class FinnhubService {
  private readonly timeout: number = 10000; // 10 second timeout

  private async fetchData<T>(endpoint: string, cacheTTL?: number): Promise<T> {
    // Validate API key
    if (!FINNHUB_API_KEY) {
      throw new Error('Finnhub API key is not configured');
    }

    const url = `${BASE_URL}${endpoint}&token=${FINNHUB_API_KEY}`;
    const cacheKey = `finnhub:${endpoint}`;

    // Check cache first
    if (cacheTTL) {
      const cached = stockDataCache.get<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Rate limiting
    await rateLimiter.waitIfNeeded();

    // Make request with timeout and monitoring
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await measureNetworkCall(
        `finnhub_${endpoint.split('?')[0]}`,
        fetch(url, { 
          signal: controller.signal,
          headers: {
            'User-Agent': 'StockTraderAI/1.0',
          }
        }),
        { endpoint, url }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        
        // Handle specific status codes
        switch (response.status) {
          case 401:
            throw new Error('Invalid API key');
          case 403:
            throw new Error('API access forbidden');
          case 429:
            throw new Error('Rate limit exceeded');
          case 500:
            throw new Error('Finnhub server error');
          default:
            throw new Error(`Finnhub API error: ${response.status} - ${errorText}`);
        }
      }

      const data = await response.json();

      // Validate response data
      if (!data || (Array.isArray(data) && data.length === 0 && !endpoint.includes('news'))) {
        throw new Error('No data received from Finnhub API');
      }

      // Cache successful response
      if (cacheTTL) {
        stockDataCache.set(cacheKey, data, cacheTTL);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - Finnhub API is not responding');
        }
        performanceMonitor.recordError('finnhub_fetch', error);
      }
      
      throw error;
    }
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    const validation = validateInput(stockSymbolSchema, symbol);
    if (!validation.success) {
      throw new Error(`Invalid stock symbol: ${validation.error}`);
    }

    const cacheKey = cacheKeys.stockQuote(validation.data);
    const cached = stockDataCache.get<StockQuote>(cacheKey);
    if (cached) {
      return cached;
    }

    const quote = await this.fetchData<StockQuote>(`/quote?symbol=${validation.data}`, 30000); // 30 second cache
    
    // Validate quote data
    if (typeof quote.c !== 'number' || quote.c <= 0) {
      throw new Error(`Invalid quote data for ${validation.data}`);
    }

    return quote;
  }

  async searchStocks(query: string): Promise<SearchResult> {
    if (!query || query.trim().length < 1) {
      throw new Error('Search query is required');
    }

    const sanitizedQuery = query.trim().substring(0, 50); // Limit query length
    return this.fetchData<SearchResult>(`/search?q=${encodeURIComponent(sanitizedQuery)}`, 300000); // 5 minute cache
  }

  async getCompanyProfile(symbol: string): Promise<CompanyProfile> {
    const validation = validateInput(stockSymbolSchema, symbol);
    if (!validation.success) {
      throw new Error(`Invalid stock symbol: ${validation.error}`);
    }

    const cacheKey = cacheKeys.stockProfile(validation.data);
    const cached = stockDataCache.get<CompanyProfile>(cacheKey);
    if (cached) {
      return cached;
    }

    const profile = await this.fetchData<CompanyProfile>(`/stock/profile2?symbol=${validation.data}`, 3600000); // 1 hour cache
    
    // Validate profile data
    if (!profile.name || !profile.ticker) {
      throw new Error(`Company profile not found for ${validation.data}`);
    }

    return profile;
  }

  async getBasicFinancials(symbol: string): Promise<BasicFinancials> {
    const validation = validateInput(stockSymbolSchema, symbol);
    if (!validation.success) {
      throw new Error(`Invalid stock symbol: ${validation.error}`);
    }

    return this.fetchData<BasicFinancials>(`/stock/metric?symbol=${validation.data}&metric=all`, 3600000); // 1 hour cache
  }

  async getCandles(
    symbol: string, 
    resolution: string = 'D', 
    from: number, 
    to: number
  ): Promise<CandleData> {
    const validation = validateInput(stockSymbolSchema, symbol);
    if (!validation.success) {
      throw new Error(`Invalid stock symbol: ${validation.error}`);
    }

    // Validate date range
    if (from >= to || from < 0 || to < 0) {
      throw new Error('Invalid date range');
    }

    const now = Math.floor(Date.now() / 1000);
    if (from > now || to > now) {
      throw new Error('Date range cannot be in the future');
    }

    return this.fetchData<CandleData>(
      `/stock/candle?symbol=${validation.data}&resolution=${resolution}&from=${from}&to=${to}`,
      1800000 // 30 minute cache
    );
  }

  async getMarketNews(category: string = 'general'): Promise<NewsItem[]> {
    const validCategories = ['general', 'forex', 'crypto', 'merger'];
    if (!validCategories.includes(category)) {
      category = 'general';
    }

    return this.fetchData<NewsItem[]>(`/news?category=${category}`, 300000); // 5 minute cache
  }

  async getCompanyNews(symbol: string, from: string, to: string): Promise<NewsItem[]> {
    const validation = validateInput(stockSymbolSchema, symbol);
    if (!validation.success) {
      throw new Error(`Invalid stock symbol: ${validation.error}`);
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(from) || !dateRegex.test(to)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD');
    }

    return this.fetchData<NewsItem[]>(
      `/company-news?symbol=${validation.data}&from=${from}&to=${to}`,
      1800000 // 30 minute cache
    );
  }

  // Enhanced helper method to get comprehensive stock data with error handling
  async getStockData(symbol: string): Promise<StockData> {
    const validation = validateInput(stockSymbolSchema, symbol);
    if (!validation.success) {
      throw new Error(`Invalid stock symbol: ${validation.error}`);
    }

    const cacheKey = cacheKeys.stockData(validation.data);
    const cached = stockDataCache.get<StockData>(cacheKey);
    if (cached) {
      return cached;
    }

    return performanceMonitor.measureAsync('get_stock_data', async () => {
      try {
        // Fetch data with proper error handling for each source
        const results = await Promise.allSettled([
          this.getQuote(validation.data),
          this.getCompanyProfile(validation.data),
          this.getBasicFinancials(validation.data)
        ]);

        // Check if quote fetch was successful (minimum required)
        const quoteResult = results[0];
        if (quoteResult.status === 'rejected') {
          throw new Error(`Failed to fetch quote for ${validation.data}: ${quoteResult.reason}`);
        }
        const quote = quoteResult.value;

        // Profile and financials are optional but preferred
        const profile = results[1].status === 'fulfilled' ? results[1].value : null;
        const financials = results[2].status === 'fulfilled' ? results[2].value : null;

        // Build stock data with fallbacks
        const stockData: StockData = {
          symbol: validation.data,
          name: profile?.name || validation.data,
          currentPrice: quote.c,
          change: quote.d,
          changePercent: quote.dp,
          dayHigh: quote.h,
          dayLow: quote.l,
          openPrice: quote.o,
          previousClose: quote.pc,
          high52: financials?.metric['52WeekHigh'] || quote.c * 1.2, // Fallback estimate
          low52: financials?.metric['52WeekLow'] || quote.c * 0.8, // Fallback estimate
          marketCap: profile?.marketCapitalization || 0,
          peRatio: financials?.metric.peBasicExclExtraTTM || 0,
          beta: financials?.metric.beta,
          logo: profile?.logo,
          industry: profile?.finnhubIndustry,
          country: profile?.country,
          currency: profile?.currency || 'USD',
          exchange: profile?.exchange,
        };

        // Validate critical data
        if (stockData.currentPrice <= 0) {
          throw new Error(`Invalid stock price for ${validation.data}`);
        }

        // Cache for 2 minutes for real-time data
        stockDataCache.set(cacheKey, stockData, 120000);

        return stockData;
      } catch (error) {
        const errorMessage = sanitizeErrorMessage(error);
        console.error(`Error fetching stock data for ${validation.data}:`, errorMessage);
        throw new Error(`Failed to fetch stock data: ${errorMessage}`);
      }
    });
  }

  // Batch operations for efficiency
  async getMultipleQuotes(symbols: string[]): Promise<Record<string, StockQuote | null>> {
    if (symbols.length === 0) {
      return {};
    }

    if (symbols.length > 10) {
      throw new Error('Too many symbols requested at once (max 10)');
    }

    const results: Record<string, StockQuote | null> = {};
    
    // Process in parallel with error handling
    const promises = symbols.map(async symbol => {
      try {
        const quote = await this.getQuote(symbol);
        results[symbol] = quote;
      } catch (error) {
        console.warn(`Failed to fetch quote for ${symbol}:`, error);
        results[symbol] = null;
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.getQuote('AAPL'); // Test with a known stock
      return true;
    } catch (error) {
      console.error('Finnhub health check failed:', error);
      return false;
    }
  }

  // Cache management
  clearCache(): void {
    stockDataCache.clear();
  }

  getCacheStats() {
    return stockDataCache.getStats();
  }
}

export const finnhubService = new FinnhubService();