// Mock data service for when APIs are rate limited or unavailable
import { IndexStock } from './indices';

export class MockDataService {
  /**
   * Generate mock stock data for when real API is unavailable
   */
  static generateMockStocks(symbols: string[]): IndexStock[] {
    return symbols.map(symbol => ({
      symbol,
      name: this.getCompanyName(symbol),
      price: this.generatePrice(),
      change: this.generateChange(),
      changePercent: this.generateChangePercent(),
      volume: this.generateVolume(),
      marketCap: this.generateMarketCap(),
      sector: this.getSector(symbol),
      lastUpdated: new Date().toISOString()
    }));
  }

  private static getCompanyName(symbol: string): string {
    const companyNames: Record<string, string> = {
      'AAPL': 'Apple Inc.',
      'MSFT': 'Microsoft Corporation',
      'GOOGL': 'Alphabet Inc.',
      'AMZN': 'Amazon.com Inc.',
      'NVDA': 'NVIDIA Corporation',
      'TSLA': 'Tesla Inc.',
      'META': 'Meta Platforms Inc.',
      'BRK.B': 'Berkshire Hathaway Inc.',
      'UNH': 'UnitedHealth Group Inc.',
      'JNJ': 'Johnson & Johnson',
      'V': 'Visa Inc.',
      'WMT': 'Walmart Inc.',
      'XOM': 'Exxon Mobil Corporation',
      'JPM': 'JPMorgan Chase & Co.',
      'PG': 'Procter & Gamble Co.'
    };
    return companyNames[symbol] || `${symbol} Corporation`;
  }

  private static getSector(symbol: string): string {
    const sectors: Record<string, string> = {
      'AAPL': 'Technology',
      'MSFT': 'Technology',
      'GOOGL': 'Technology',
      'AMZN': 'Consumer Discretionary',
      'NVDA': 'Technology',
      'TSLA': 'Consumer Discretionary',
      'META': 'Technology',
      'BRK.B': 'Financial Services',
      'UNH': 'Healthcare',
      'JNJ': 'Healthcare',
      'V': 'Financial Services',
      'WMT': 'Consumer Staples',
      'XOM': 'Energy',
      'JPM': 'Financial Services',
      'PG': 'Consumer Staples'
    };
    return sectors[symbol] || 'Technology';
  }

  private static generatePrice(): number {
    // Generate realistic stock prices between $20 and $500
    return Math.round((Math.random() * 480 + 20) * 100) / 100;
  }

  private static generateChange(): number {
    // Generate price changes between -$10 and +$10
    return Math.round((Math.random() * 20 - 10) * 100) / 100;
  }

  private static generateChangePercent(): number {
    // Generate percentage changes between -5% and +5%
    return Math.round((Math.random() * 10 - 5) * 100) / 100;
  }

  private static generateVolume(): number {
    // Generate volume between 100K and 50M
    return Math.floor(Math.random() * 49900000) + 100000;
  }

  private static generateMarketCap(): number {
    // Generate market cap between $1B and $3T (in millions)
    return Math.floor(Math.random() * 2999000) + 1000;
  }

  /**
   * Get a subset of popular stocks with realistic data
   */
  static getPopularStocks(count: number = 20): IndexStock[] {
    const popularSymbols = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'BRK.B', 'UNH', 'JNJ',
      'V', 'WMT', 'XOM', 'JPM', 'PG', 'MA', 'CVX', 'HD', 'LLY', 'ABBV'
    ];
    
    return this.generateMockStocks(popularSymbols.slice(0, count));
  }

  /**
   * Generate trending stocks with higher volatility
   */
  static getTrendingStocks(): IndexStock[] {
    const trending = this.getPopularStocks(10);
    
    // Increase volatility for trending stocks
    return trending.map(stock => ({
      ...stock,
      changePercent: Math.round((Math.random() * 20 - 10) * 100) / 100, // -10% to +10%
      volume: stock.volume * (1 + Math.random()), // Higher volume
    }));
  }
}

export const mockDataService = new MockDataService();