// Unified AI Recommendation Service - Single Source of Truth
import { aiService, getUserPreferredProvider } from './aiService';
import { finnhubService } from './finnhub';

export interface UnifiedRecommendation {
  id: string;
  symbol: string;
  name: string;
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  targetPrice?: number;
  currentPrice: number;
  change: number;
  changePercent: number;
  timestamp: Date;
  aiProvider: 'gemini' | 'groq' | 'openai';
  keyFactors?: string[];
  marketContext?: string;
  sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  timeHorizon?: string;
}

class UnifiedRecommendationService {
  private cache: Map<string, { data: UnifiedRecommendation[]; timestamp: Date }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL
  private readonly TOP_STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMZN', 'META', 'NFLX'];

  // Get daily recommendations (used by AI Tips page, Orders page, Trading interface)
  async getDailyRecommendations(limit: number = 5): Promise<UnifiedRecommendation[]> {
    const cacheKey = `daily-recommendations-${limit}`;
    const cached = this.cache.get(cacheKey);
    
    // Check if cache is valid
    if (cached && (Date.now() - cached.timestamp.getTime() < this.CACHE_TTL)) {
      console.log('📋 Returning cached daily recommendations');
      if (cached.data.length > 0) {
        return cached.data.slice(0, limit);
      }
    }

    console.log('🔄 Fetching fresh daily recommendations...');
    
    try {
      // Set user's preferred AI provider
      const preferredProvider = getUserPreferredProvider();
      aiService.setProvider(preferredProvider);
      console.log(`🤖 Using ${preferredProvider.toUpperCase()} AI provider`);

      // Get recommendations for top stocks
      const recommendations = await this.generateRecommendations(this.TOP_STOCKS.slice(0, Math.max(limit, 8)));
      
      console.log(`📊 Generated ${recommendations.length} recommendations`);
      
      if (recommendations.length > 0) {
        // Cache the results
        this.cache.set(cacheKey, {
          data: recommendations,
          timestamp: new Date()
        });

        return recommendations.slice(0, limit);
      } else {
        console.log('⚠️ No recommendations generated, using fallback data');
        const fallbackData = this.getFallbackRecommendations(limit);
        
        // Cache fallback data with shorter TTL
        this.cache.set(cacheKey, {
          data: fallbackData,
          timestamp: new Date()
        });
        
        return fallbackData;
      }
    } catch (error) {
      console.error('❌ Error fetching daily recommendations:', error);
      
      // Return cached data if available, even if stale
      if (cached && cached.data.length > 0) {
        console.log('⚠️ Returning stale cached data due to error');
        return cached.data.slice(0, limit);
      }
      
      // Fallback to mock data if all else fails
      console.log('🔄 Using fallback recommendations due to error');
      return this.getFallbackRecommendations(limit);
    }
  }

  // Get recommendation for specific stock (used by Trading interface)
  async getStockRecommendation(symbol: string): Promise<UnifiedRecommendation | null> {
    const cacheKey = `stock-${symbol}`;
    const cached = this.cache.get(cacheKey);
    
    // Check if cache is valid (shorter TTL for individual stocks)
    if (cached && (Date.now() - cached.timestamp.getTime() < (this.CACHE_TTL / 2))) {
      console.log(`📋 Returning cached recommendation for ${symbol}`);
      return cached.data[0] || null;
    }

    console.log(`🔄 Fetching fresh recommendation for ${symbol}...`);
    
    try {
      // Set user's preferred AI provider
      const preferredProvider = getUserPreferredProvider();
      aiService.setProvider(preferredProvider);

      const recommendations = await this.generateRecommendations([symbol]);
      
      if (recommendations.length > 0) {
        // Cache the result
        this.cache.set(cacheKey, {
          data: recommendations,
          timestamp: new Date()
        });

        return recommendations[0];
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error fetching recommendation for ${symbol}:`, error);
      
      // Return cached data if available, even if stale
      if (cached && cached.data.length > 0) {
        console.log(`⚠️ Returning stale cached data for ${symbol}`);
        return cached.data[0];
      }
      
      return null;
    }
  }

  // Generate AI recommendations for given symbols
  private async generateRecommendations(symbols: string[]): Promise<UnifiedRecommendation[]> {
    const recommendations: UnifiedRecommendation[] = [];
    
    // Create simple portfolio for AI analysis
    const mockPortfolio = {
      cashBalance: 10000,
      totalValue: 15000,
      holdings: {}
    };

    console.log(`🔍 Generating recommendations for ${symbols.length} symbols: ${symbols.join(', ')}`);

    for (const symbol of symbols) {
      try {
        console.log(`📈 Processing ${symbol}...`);
        
        // Get current stock data
        const stockData = await finnhubService.getStockData(symbol);
        console.log(`✅ Got ${symbol} data: $${stockData.currentPrice} (${stockData.changePercent?.toFixed(2)}%)`);
        
        // Get AI recommendation
        const aiRecommendation = await aiService.getTradeRecommendation(stockData, mockPortfolio);
        
        if (aiRecommendation) {
          console.log(`🤖 ${symbol} AI rec: ${aiRecommendation.recommendation} (${aiRecommendation.confidence}%)`);
          
          const recommendation: UnifiedRecommendation = {
            id: `${symbol}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            symbol: symbol,
            name: stockData.name || symbol,
            recommendation: aiRecommendation.recommendation,
            confidence: aiRecommendation.confidence,
            reasoning: aiRecommendation.reasoning,
            riskLevel: aiRecommendation.riskLevel,
            targetPrice: aiRecommendation.targetPrice,
            currentPrice: stockData.currentPrice,
            change: stockData.change || 0,
            changePercent: stockData.changePercent || 0,
            timestamp: new Date(),
            aiProvider: aiService.getCurrentProvider(),
            keyFactors: aiRecommendation.keyFactors,
            marketContext: aiRecommendation.marketContext,
            sentiment: aiRecommendation.sentiment,
            timeHorizon: aiRecommendation.timeHorizon,
          };
          
          recommendations.push(recommendation);
        } else {
          console.log(`⚠️ ${symbol}: AI recommendation was null`);
        }
      } catch (error) {
        console.error(`❌ Error getting recommendation for ${symbol}:`, error);
        
        // Log more details about the error
        if (error.message) {
          console.error(`   Error message: ${error.message}`);
        }
        if (error.response) {
          console.error(`   API response status: ${error.response.status}`);
        }
        
        // Continue with other symbols
      }
    }

    console.log(`📊 Successfully generated ${recommendations.length} recommendations out of ${symbols.length} attempted`);
    
    // Sort by confidence (highest first)
    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  // Fallback recommendations when all else fails
  private getFallbackRecommendations(limit: number): UnifiedRecommendation[] {
    const fallbackData: UnifiedRecommendation[] = [
      {
        id: 'fallback-1',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        recommendation: 'BUY',
        confidence: 85,
        reasoning: 'Strong quarterly earnings beat expectations, iPhone sales momentum continues, AI integration driving growth.',
        riskLevel: 'LOW',
        targetPrice: 195.00,
        currentPrice: 188.50,
        change: 2.30,
        changePercent: 1.23,
        timestamp: new Date(),
        aiProvider: getUserPreferredProvider(),
        keyFactors: ['Strong earnings', 'AI integration', 'iPhone momentum'],
        marketContext: 'Tech sector showing resilience amid market volatility',
        sentiment: 'BULLISH',
        timeHorizon: 'Medium-term outlook remains positive',
      },
      {
        id: 'fallback-2',
        symbol: 'NVDA',
        name: 'NVIDIA Corporation',
        recommendation: 'BUY',
        confidence: 92,
        reasoning: 'AI chip demand surge, data center growth acceleration, strong guidance for next quarter.',
        riskLevel: 'MEDIUM',
        targetPrice: 520.00,
        currentPrice: 485.75,
        change: 8.45,
        changePercent: 1.77,
        timestamp: new Date(),
        aiProvider: getUserPreferredProvider(),
        keyFactors: ['AI chip demand', 'Data center growth', 'Strong guidance'],
        marketContext: 'AI revolution continues to drive semiconductor demand',
        sentiment: 'BULLISH',
        timeHorizon: 'Long-term AI trend supporting growth',
      },
      {
        id: 'fallback-3',
        symbol: 'TSLA',
        name: 'Tesla, Inc.',
        recommendation: 'HOLD',
        confidence: 68,
        reasoning: 'Mixed signals on delivery numbers, autonomous driving progress positive but competitive pressure increasing.',
        riskLevel: 'HIGH',
        currentPrice: 248.30,
        change: -3.20,
        changePercent: -1.27,
        timestamp: new Date(),
        aiProvider: getUserPreferredProvider(),
        keyFactors: ['Mixed delivery numbers', 'Autonomous driving progress', 'Competitive pressure'],
        marketContext: 'EV market showing signs of saturation in some segments',
        sentiment: 'NEUTRAL',
        timeHorizon: 'Short-term volatility expected',
      },
    ];

    return fallbackData.slice(0, limit);
  }

  // Clear cache (useful for testing or manual refresh)
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }

  // Get cache status for debugging
  getCacheStatus(): { keys: string[]; totalItems: number } {
    return {
      keys: Array.from(this.cache.keys()),
      totalItems: this.cache.size
    };
  }

  // Force refresh of daily recommendations
  async refreshDailyRecommendations(): Promise<UnifiedRecommendation[]> {
    this.cache.delete('daily-recommendations-5');
    this.cache.delete('daily-recommendations-3');
    return await this.getDailyRecommendations();
  }
}

// Export singleton instance
export const unifiedRecommendations = new UnifiedRecommendationService();
export default unifiedRecommendations;