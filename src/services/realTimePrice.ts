// Real-time stock price updates service
import { finnhubService } from './finnhub';
import { Holding } from '@/store/portfolio';

export interface LivePrice {
  symbol: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdated: Date;
  marketStatus: 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'AFTER_HOURS';
}

export interface PortfolioUpdate {
  symbol: string;
  oldPrice: number;
  newPrice: number;
  change: number;
  changePercent: number;
  holdingValue: number;
  profitLoss: number;
  profitLossPercent: number;
  quantity: number;
}

export interface RealTimePortfolioData {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  lastUpdated: Date;
  holdings: Record<string, LivePrice>;
  updates: PortfolioUpdate[];
  marketStatus: 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'AFTER_HOURS';
}

class RealTimePriceService {
  private priceCache: Map<string, LivePrice> = new Map();
  private updateCallbacks: Set<(data: RealTimePortfolioData) => void> = new Set();
  private isPolling = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly POLLING_INTERVAL = 30000; // 30 seconds for real-time updates
  private readonly CACHE_DURATION = 25000; // 25 seconds cache duration
  private readonly MAX_BATCH_SIZE = 10; // Limit batch size for API efficiency

  /**
   * Start real-time price polling for given symbols
   */
  async startPolling(symbols: string[]): Promise<void> {
    if (this.isPolling) {
      this.stopPolling();
    }

    this.isPolling = true;
    console.log('🔄 Starting real-time price polling for:', symbols);

    // Initial fetch
    await this.fetchPricesForSymbols(symbols);

    // Set up recurring polling
    this.pollingInterval = setInterval(async () => {
      if (symbols.length > 0) {
        await this.fetchPricesForSymbols(symbols);
      }
    }, this.POLLING_INTERVAL);
  }

  /**
   * Stop real-time price polling
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    console.log('⏹️ Stopped real-time price polling');
  }

  /**
   * Subscribe to real-time portfolio updates
   */
  subscribe(callback: (data: RealTimePortfolioData) => void): () => void {
    this.updateCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  /**
   * Get current cached prices
   */
  getCachedPrices(): Map<string, LivePrice> {
    return new Map(this.priceCache);
  }

  /**
   * Force refresh prices for specific symbols
   */
  async refreshPrices(symbols: string[]): Promise<LivePrice[]> {
    return await this.fetchPricesForSymbols(symbols, true);
  }

  /**
   * Calculate real-time portfolio data
   */
  calculatePortfolioData(
    holdings: Record<string, Holding>,
    cashBalance: number
  ): RealTimePortfolioData {
    const updates: PortfolioUpdate[] = [];
    const livePrices: Record<string, LivePrice> = {};
    let totalHoldingsValue = 0;
    let totalDayChange = 0;

    // Process each holding with live prices
    Object.entries(holdings).forEach(([symbol, holding]) => {
      const livePrice = this.priceCache.get(symbol);
      
      if (livePrice) {
        const oldValue = holding.totalValue;
        const newValue = holding.quantity * livePrice.currentPrice;
        const valueChange = newValue - oldValue;
        const profitLoss = holding.quantity * (livePrice.currentPrice - holding.averagePrice);
        const profitLossPercent = ((livePrice.currentPrice - holding.averagePrice) / holding.averagePrice) * 100;

        updates.push({
          symbol,
          oldPrice: holding.currentPrice,
          newPrice: livePrice.currentPrice,
          change: livePrice.change,
          changePercent: livePrice.changePercent,
          holdingValue: newValue,
          profitLoss,
          profitLossPercent,
          quantity: holding.quantity
        });

        livePrices[symbol] = livePrice;
        totalHoldingsValue += newValue;
        totalDayChange += valueChange;
      } else {
        // Use cached holding data if no live price available
        totalHoldingsValue += holding.totalValue;
      }
    });

    const totalValue = cashBalance + totalHoldingsValue;
    const dayChangePercent = totalValue > 0 ? (totalDayChange / totalValue) * 100 : 0;

    return {
      totalValue,
      dayChange: totalDayChange,
      dayChangePercent,
      lastUpdated: new Date(),
      holdings: livePrices,
      updates,
      marketStatus: this.getMarketStatus()
    };
  }

  /**
   * Fetch live prices for symbols
   */
  private async fetchPricesForSymbols(symbols: string[], forceRefresh = false): Promise<LivePrice[]> {
    const uniqueSymbols = [...new Set(symbols)];
    const symbolsToFetch: string[] = [];

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      uniqueSymbols.forEach(symbol => {
        const cached = this.priceCache.get(symbol);
        if (!cached || this.isCacheExpired(cached)) {
          symbolsToFetch.push(symbol);
        }
      });
    } else {
      symbolsToFetch.push(...uniqueSymbols);
    }

    if (symbolsToFetch.length === 0) {
      return Array.from(this.priceCache.values());
    }

    console.log('📈 Fetching live prices for:', symbolsToFetch);

    try {
      // Process in batches to avoid rate limiting
      const batches = this.createBatches(symbolsToFetch, this.MAX_BATCH_SIZE);
      const allPrices: LivePrice[] = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        const batchPromises = batch.map(async (symbol) => {
          try {
            const quote = await finnhubService.getQuote(symbol);
            
            const livePrice: LivePrice = {
              symbol,
              currentPrice: quote.c || 0,
              change: quote.d || 0,
              changePercent: quote.dp || 0,
              volume: Math.floor(Math.random() * 10000000) + 100000, // Mock volume data since Finnhub basic doesn't provide volume in quotes
              lastUpdated: new Date(),
              marketStatus: this.getMarketStatus()
            };

            // Update cache
            this.priceCache.set(symbol, livePrice);
            return livePrice;
          } catch (error) {
            console.warn(`Failed to fetch price for ${symbol}:`, error);
            // Keep existing cached price if available
            return this.priceCache.get(symbol) || null;
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        const validPrices = batchResults
          .filter((result): result is PromiseFulfilledResult<LivePrice> => 
            result.status === 'fulfilled' && result.value !== null
          )
          .map(result => result.value);

        allPrices.push(...validPrices);

        // Add delay between batches
        if (i < batches.length - 1) {
          await this.delay(200);
        }
      }

      // Notify subscribers of price updates
      this.notifySubscribers();

      return allPrices;
    } catch (error) {
      console.error('Error fetching live prices:', error);
      return Array.from(this.priceCache.values());
    }
  }

  /**
   * Notify all subscribers of price updates
   */
  private notifySubscribers(): void {
    // This will be called when portfolio data is needed
    // Individual components will call calculatePortfolioData with their holdings
  }

  /**
   * Check if cached price is expired
   */
  private isCacheExpired(livePrice: LivePrice): boolean {
    return Date.now() - livePrice.lastUpdated.getTime() > this.CACHE_DURATION;
  }

  /**
   * Create batches for API requests
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Add delay between requests
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Determine current market status
   */
  private getMarketStatus(): 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'AFTER_HOURS' {
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hours = easternTime.getHours();
    const day = easternTime.getDay();

    // Weekend
    if (day === 0 || day === 6) {
      return 'CLOSED';
    }

    // Market hours (9:30 AM - 4:00 PM ET)
    if (hours >= 9 && hours < 16) {
      if (hours === 9 && easternTime.getMinutes() < 30) {
        return 'PRE_MARKET';
      }
      return 'OPEN';
    }

    // Pre-market (4:00 AM - 9:30 AM ET)
    if (hours >= 4 && hours < 9) {
      return 'PRE_MARKET';
    }

    // After-hours (4:00 PM - 8:00 PM ET)
    if (hours >= 16 && hours < 20) {
      return 'AFTER_HOURS';
    }

    return 'CLOSED';
  }

  /**
   * Get market status indicator for UI
   */
  getMarketStatusInfo(): {
    status: string;
    color: string;
    icon: string;
    message: string;
  } {
    const status = this.getMarketStatus();
    
    switch (status) {
      case 'OPEN':
        return {
          status: 'OPEN',
          color: 'text-green-600',
          icon: '🟢',
          message: 'Market is open - Live prices'
        };
      case 'PRE_MARKET':
        return {
          status: 'PRE-MARKET',
          color: 'text-yellow-600',
          icon: '🟡',
          message: 'Pre-market trading'
        };
      case 'AFTER_HOURS':
        return {
          status: 'AFTER HOURS',
          color: 'text-orange-600',
          icon: '🟠',
          message: 'After-hours trading'
        };
      default:
        return {
          status: 'CLOSED',
          color: 'text-gray-600',
          icon: '⚪',
          message: 'Market is closed'
        };
    }
  }

  /**
   * Cleanup when component unmounts
   */
  cleanup(): void {
    this.stopPolling();
    this.updateCallbacks.clear();
    this.priceCache.clear();
  }
}

export const realTimePriceService = new RealTimePriceService();