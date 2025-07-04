// Enhanced data pipeline for major indices (S&P 500, NASDAQ, DOW)
import { finnhubService } from './finnhub';
import { MockDataService } from './mockData';

export interface IndexStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  sector?: string;
  lastUpdated: string;
}

export interface IndexData {
  name: string;
  stocks: IndexStock[];
  lastUpdated: string;
  topPerformers: IndexStock[];
  topLosers: IndexStock[];
}

class IndicesService {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private readonly CACHE_DURATION = 30 * 1000; // 30 seconds
  private readonly REQUEST_DELAY = 100; // 100ms delay between requests to avoid rate limiting

  // Major index symbols and their top constituents
  private readonly INDEX_CONSTITUENTS = {
    sp500: [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'BRK.B', 'UNH', 'JNJ',
      'V', 'WMT', 'XOM', 'JPM', 'PG', 'MA', 'CVX', 'HD', 'LLY', 'ABBV',
      'PFE', 'KO', 'AVGO', 'PEP', 'TMO', 'COST', 'MRK', 'DHR', 'VZ', 'ADBE'
    ],
    nasdaq100: [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'AVGO', 'NFLX', 'ORCL',
      'CRM', 'ADBE', 'INTC', 'CSCO', 'AMD', 'QCOM', 'TXN', 'INTU', 'ISRG', 'BKNG',
      'CMCSA', 'AMGN', 'HON', 'GILD', 'LRCX', 'MU', 'ADI', 'MELI', 'MDLZ', 'REGN'
    ],
    dow30: [
      'AAPL', 'MSFT', 'UNH', 'GS', 'HD', 'MCD', 'V', 'CAT', 'BA', 'AXP',
      'TRV', 'JPM', 'JNJ', 'PG', 'CVX', 'MRK', 'WMT', 'DIS', 'NKE', 'CRM',
      'KO', 'IBM', 'MMM', 'DOW', 'INTC', 'CSCO', 'VZ', 'HON', 'WBA', 'AMGN'
    ]
  };

  private isDataFresh(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && this.isDataFresh(cached.timestamp)) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getIndexStocks(indexName: keyof typeof this.INDEX_CONSTITUENTS): Promise<IndexStock[]> {
    const cacheKey = `index_${indexName}`;
    const cached = this.getFromCache<IndexStock[]>(cacheKey);
    if (cached) return cached;

    try {
      const symbols = this.INDEX_CONSTITUENTS[indexName];
      
      // Process symbols in smaller batches with delays to avoid rate limiting
      const batchSize = 5;
      const stocks: IndexStock[] = [];
      
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (symbol) => {
          try {
            // Add small delay between individual requests
            await this.delay(this.REQUEST_DELAY);
            
            const quote = await finnhubService.getQuote(symbol);
            const profile = await finnhubService.getCompanyProfile(symbol);
            
            return {
              symbol,
              name: profile?.name || symbol,
              price: quote.c || 0,
              change: quote.d || 0,
              changePercent: quote.dp || 0,
              volume: Math.floor(Math.random() * 10000000) + 100000, // Placeholder volume data
              marketCap: profile?.marketCapitalization || 0,
              sector: profile?.finnhubIndustry || 'Unknown',
              lastUpdated: new Date().toISOString()
            } as IndexStock;
          } catch (error) {
            console.warn(`Failed to fetch data for ${symbol}:`, error);
            return null;
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        const validStocks = batchResults
          .filter((result): result is PromiseFulfilledResult<IndexStock> => 
            result.status === 'fulfilled' && result.value !== null
          )
          .map(result => result.value)
          .filter(stock => stock.price > 0); // Filter out invalid data

        stocks.push(...validStocks);
        
        // Add delay between batches
        if (i + batchSize < symbols.length) {
          await this.delay(500); // 500ms delay between batches
        }
      }

      this.setCache(cacheKey, stocks);
      return stocks;
    } catch (error) {
      console.error(`Error fetching ${indexName} stocks:`, error);
      
      // Fallback to mock data if API fails
      console.log(`Using mock data for ${indexName} due to API failure`);
      const mockStocks = MockDataService.getPopularStocks(Math.min(this.INDEX_CONSTITUENTS[indexName].length, 15));
      this.setCache(cacheKey, mockStocks);
      return mockStocks;
    }
  }

  async getIndexData(indexName: keyof typeof this.INDEX_CONSTITUENTS): Promise<IndexData> {
    const stocks = await this.getIndexStocks(indexName);
    
    // Sort by performance
    const sortedByPerformance = [...stocks].sort((a, b) => b.changePercent - a.changePercent);
    
    return {
      name: indexName.toUpperCase(),
      stocks,
      lastUpdated: new Date().toISOString(),
      topPerformers: sortedByPerformance.slice(0, 10),
      topLosers: sortedByPerformance.slice(-10).reverse()
    };
  }

  async getAllIndices(): Promise<{ [key: string]: IndexData }> {
    const [sp500, nasdaq100, dow30] = await Promise.all([
      this.getIndexData('sp500'),
      this.getIndexData('nasdaq100'),
      this.getIndexData('dow30')
    ]);

    return { sp500, nasdaq100, dow30 };
  }

  async getTopPerformersAcrossIndices(limit: number = 20): Promise<IndexStock[]> {
    const allIndices = await this.getAllIndices();
    const allStocks: IndexStock[] = [];
    
    // Combine all stocks from all indices (remove duplicates)
    const symbolMap = new Map<string, IndexStock>();
    
    Object.values(allIndices).forEach(index => {
      index.stocks.forEach(stock => {
        if (!symbolMap.has(stock.symbol) || symbolMap.get(stock.symbol)!.changePercent < stock.changePercent) {
          symbolMap.set(stock.symbol, stock);
        }
      });
    });

    allStocks.push(...symbolMap.values());
    
    // Sort by performance and return top performers
    return allStocks
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, limit)
      .filter(stock => stock.volume > 100000); // Filter by minimum volume
  }

  async getHighVolumeStocks(limit: number = 15): Promise<IndexStock[]> {
    const allIndices = await this.getAllIndices();
    const allStocks: IndexStock[] = [];
    
    // Combine all unique stocks
    const symbolMap = new Map<string, IndexStock>();
    Object.values(allIndices).forEach(index => {
      index.stocks.forEach(stock => {
        if (!symbolMap.has(stock.symbol)) {
          symbolMap.set(stock.symbol, stock);
        }
      });
    });

    allStocks.push(...symbolMap.values());
    
    // Sort by volume and return top volume stocks
    return allStocks
      .sort((a, b) => b.volume - a.volume)
      .slice(0, limit)
      .filter(stock => stock.price > 5); // Filter penny stocks
  }

  async getMarketMovers(): Promise<{
    topGainers: IndexStock[];
    topLosers: IndexStock[];
    highVolume: IndexStock[];
  }> {
    const [topGainers, highVolume] = await Promise.all([
      this.getTopPerformersAcrossIndices(10),
      this.getHighVolumeStocks(10)
    ]);

    // Get top losers (worst performers)
    const allIndices = await this.getAllIndices();
    const allStocks: IndexStock[] = [];
    const symbolMap = new Map<string, IndexStock>();
    
    Object.values(allIndices).forEach(index => {
      index.stocks.forEach(stock => {
        if (!symbolMap.has(stock.symbol)) {
          symbolMap.set(stock.symbol, stock);
        }
      });
    });

    allStocks.push(...symbolMap.values());
    const topLosers = allStocks
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 10);

    return {
      topGainers,
      topLosers,
      highVolume
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const indicesService = new IndicesService();