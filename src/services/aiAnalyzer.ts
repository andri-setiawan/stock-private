// Enhanced AI analysis service for generating buy/sell recommendations
// AI analysis service for generating buy/sell recommendations
import { finnhubService } from './finnhub';
import { IndexStock } from './indices';

export interface AIRecommendation {
  symbol: string;
  name: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  currentPrice: number;
  targetPrice: number;
  expectedReturn: number; // percentage
  reasoning: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  timeframe: 'SHORT' | 'MEDIUM' | 'LONG'; // days: 1-7, weeks: 1-4, months: 1-6
  keyFactors: string[];
  marketData: {
    volume: number;
    changePercent: number;
    volatility: number;
    sector: string;
  };
  generatedAt: string;
}

export interface MarketAnalysis {
  marketSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  volatilityIndex: number;
  recommendations: AIRecommendation[];
  marketSummary: string;
  topOpportunities: AIRecommendation[];
  riskWarnings: string[];
}

class AIAnalyzerService {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for AI analysis

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

  async analyzeStock(stock: IndexStock): Promise<AIRecommendation> {
    const cacheKey = `analysis_${stock.symbol}`;
    const cached = this.getFromCache<AIRecommendation>(cacheKey);
    if (cached) return cached;

    try {
      // Get additional market data
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const [quote, profile, news] = await Promise.all([
        finnhubService.getQuote(stock.symbol),
        finnhubService.getCompanyProfile(stock.symbol),
        finnhubService.getCompanyNews(
          stock.symbol, 
          yesterday.toISOString().split('T')[0], 
          today.toISOString().split('T')[0]
        )
      ]) as [any, any, any]; // eslint-disable-line @typescript-eslint/no-explicit-any

      // Prepare comprehensive data for AI analysis
      const analysisPrompt = this.buildAnalysisPrompt(stock, quote, profile, news);
      
      // Get AI recommendation using a generic prompt
      const aiResponse = await this.generateAIResponse(analysisPrompt);
      
      // Parse and structure the AI response
      const recommendation = this.parseAIResponse(aiResponse, stock);
      
      this.setCache(cacheKey, recommendation);
      return recommendation;
    } catch (error) {
      console.error(`Error analyzing ${stock.symbol}:`, error);
      
      // Return fallback recommendation
      return this.getFallbackRecommendation(stock);
    }
  }

  private buildAnalysisPrompt(stock: IndexStock, quote: any, profile: any, news: any[]): string { // eslint-disable-line @typescript-eslint/no-explicit-any
    const newsHeadlines = news.slice(0, 3).map(n => n.headline).join('; ');
    
    return `
Analyze this stock for trading recommendation:

STOCK: ${stock.symbol} - ${stock.name}
SECTOR: ${stock.sector}
CURRENT PRICE: $${stock.price}
CHANGE TODAY: ${stock.changePercent}%
VOLUME: ${stock.volume.toLocaleString()}
MARKET CAP: $${(stock.marketCap || 0).toLocaleString()}M

TECHNICAL DATA:
- Open: $${quote.o || stock.price}
- High: $${quote.h || stock.price}
- Low: $${quote.l || stock.price}
- Previous Close: $${quote.pc || stock.price}

RECENT NEWS: ${newsHeadlines || 'No recent news'}

COMPANY INFO:
- Industry: ${profile?.finnhubIndustry || 'Unknown'}
- Country: ${profile?.country || 'Unknown'}
- Exchange: ${profile?.exchange || 'Unknown'}

Please provide a trading recommendation with:
1. Action: BUY/SELL/HOLD
2. Confidence: 0-100 (how certain you are)
3. Target price for next 1-5 days
4. Expected return percentage
5. Risk level: LOW/MEDIUM/HIGH
6. Key reasoning (2-3 bullet points)
7. Time frame: SHORT (1-3 days), MEDIUM (1-2 weeks), LONG (1+ months)

Format your response as JSON:
{
  "action": "BUY/SELL/HOLD",
  "confidence": 85,
  "targetPrice": 150.50,
  "expectedReturn": 5.2,
  "riskLevel": "MEDIUM",
  "timeframe": "SHORT",
  "reasoning": "Clear explanation of why this recommendation",
  "keyFactors": ["factor1", "factor2", "factor3"]
}

Focus on maximizing short-term profits while managing risk.
`;
  }

  private parseAIResponse(aiResponse: string, stock: IndexStock): AIRecommendation {
    try {
      // Extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in AI response');
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Calculate volatility based on price movement
      const volatility = Math.abs(stock.changePercent) > 5 ? 
        Math.abs(stock.changePercent) : Math.random() * 3 + 1;
      
      return {
        symbol: stock.symbol,
        name: stock.name,
        action: parsed.action || 'HOLD',
        confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
        currentPrice: stock.price,
        targetPrice: parsed.targetPrice || stock.price,
        expectedReturn: parsed.expectedReturn || 0,
        reasoning: parsed.reasoning || 'AI analysis based on current market conditions',
        riskLevel: parsed.riskLevel || 'MEDIUM',
        timeframe: parsed.timeframe || 'SHORT',
        keyFactors: parsed.keyFactors || ['Market momentum', 'Technical indicators'],
        marketData: {
          volume: stock.volume,
          changePercent: stock.changePercent,
          volatility,
          sector: stock.sector || 'Unknown'
        },
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return this.getFallbackRecommendation(stock);
    }
  }

  private getFallbackRecommendation(stock: IndexStock): AIRecommendation {
    // Generate basic recommendation based on price movement
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 40;
    let expectedReturn = 0;
    let reasoning = 'Basic analysis due to AI service unavailability';
    
    if (stock.changePercent > 3) {
      action = 'SELL';
      confidence = 60;
      expectedReturn = -2;
      reasoning = 'Stock showing high gains, potential for profit-taking';
    } else if (stock.changePercent < -3) {
      action = 'BUY';
      confidence = 65;
      expectedReturn = 3;
      reasoning = 'Stock showing oversold conditions, potential rebound';
    } else if (stock.volume > 1000000 && Math.abs(stock.changePercent) < 1) {
      action = 'BUY';
      confidence = 55;
      expectedReturn = 2;
      reasoning = 'High volume with stable price, potential breakout';
    }

    return {
      symbol: stock.symbol,
      name: stock.name,
      action,
      confidence,
      currentPrice: stock.price,
      targetPrice: stock.price * (1 + expectedReturn / 100),
      expectedReturn,
      reasoning,
      riskLevel: 'MEDIUM',
      timeframe: 'SHORT',
      keyFactors: ['Technical analysis', 'Volume pattern'],
      marketData: {
        volume: stock.volume,
        changePercent: stock.changePercent,
        volatility: Math.abs(stock.changePercent),
        sector: stock.sector || 'Unknown'
      },
      generatedAt: new Date().toISOString()
    };
  }

  async analyzeBulkStocks(stocks: IndexStock[]): Promise<AIRecommendation[]> {
    const batchSize = 5; // Process in smaller batches to avoid rate limits
    const recommendations: AIRecommendation[] = [];
    
    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize);
      const batchPromises = batch.map(stock => this.analyzeStock(stock));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        const validResults = batchResults
          .filter((result): result is PromiseFulfilledResult<AIRecommendation> => 
            result.status === 'fulfilled'
          )
          .map(result => result.value);
        
        recommendations.push(...validResults);
        
        // Small delay between batches to respect rate limits
        if (i + batchSize < stocks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Error processing batch ${i}:`, error);
      }
    }
    
    return recommendations;
  }

  async generateDailyRecommendations(stocks: IndexStock[]): Promise<MarketAnalysis> {
    const cacheKey = 'daily_analysis';
    const cached = this.getFromCache<MarketAnalysis>(cacheKey);
    if (cached) return cached;

    try {
      // Analyze top performing and most active stocks
      const topStocks = stocks
        .filter(stock => stock.volume > 500000) // Minimum volume filter
        .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
        .slice(0, 15); // Analyze top 15 most active stocks

      const recommendations = await this.analyzeBulkStocks(topStocks);
      
      // Generate market analysis
      const marketAnalysis = this.generateMarketAnalysis(recommendations, stocks);
      
      this.setCache(cacheKey, marketAnalysis);
      return marketAnalysis;
    } catch (error) {
      console.error('Error generating daily recommendations:', error);
      return this.getFallbackMarketAnalysis(stocks);
    }
  }

  private generateMarketAnalysis(recommendations: AIRecommendation[], allStocks: IndexStock[]): MarketAnalysis {
    // Calculate market sentiment
    const bullishCount = recommendations.filter(r => r.action === 'BUY').length;
    const bearishCount = recommendations.filter(r => r.action === 'SELL').length;
    
    let marketSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (bullishCount > bearishCount * 1.5) marketSentiment = 'BULLISH';
    else if (bearishCount > bullishCount * 1.5) marketSentiment = 'BEARISH';
    
    // Calculate volatility index
    const avgVolatility = allStocks.reduce((sum, stock) => 
      sum + Math.abs(stock.changePercent), 0) / allStocks.length;
    
    // Get top opportunities (high confidence + good expected return)
    const topOpportunities = recommendations
      .filter(r => r.confidence > 70 && Math.abs(r.expectedReturn) > 2)
      .sort((a, b) => (b.confidence * Math.abs(b.expectedReturn)) - (a.confidence * Math.abs(a.expectedReturn)))
      .slice(0, 5);
    
    // Generate market summary
    const marketSummary = this.generateMarketSummary(marketSentiment, avgVolatility, topOpportunities.length);
    
    // Generate risk warnings
    const riskWarnings = this.generateRiskWarnings(recommendations, avgVolatility);
    
    return {
      marketSentiment,
      volatilityIndex: Math.round(avgVolatility * 10) / 10,
      recommendations: recommendations.sort((a, b) => b.confidence - a.confidence),
      marketSummary,
      topOpportunities,
      riskWarnings
    };
  }

  private generateMarketSummary(sentiment: string, volatility: number, opportunities: number): string {
    const time = new Date().toLocaleTimeString();
    return `Market Analysis (${time}): ${sentiment} sentiment detected with ${volatility.toFixed(1)}% average volatility. ${opportunities} high-confidence opportunities identified for today's trading session.`;
  }

  private generateRiskWarnings(recommendations: AIRecommendation[], volatility: number): string[] {
    const warnings: string[] = [];
    
    if (volatility > 3) {
      warnings.push('High market volatility detected - consider reducing position sizes');
    }
    
    const highRiskCount = recommendations.filter(r => r.riskLevel === 'HIGH').length;
    if (highRiskCount > recommendations.length * 0.4) {
      warnings.push('Many high-risk opportunities detected - diversify your trades');
    }
    
    const avgConfidence = recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length;
    if (avgConfidence < 60) {
      warnings.push('Lower confidence signals today - consider smaller position sizes');
    }
    
    return warnings;
  }

  private getFallbackMarketAnalysis(stocks: IndexStock[]): MarketAnalysis {
    const avgChange = stocks.reduce((sum, stock) => sum + stock.changePercent, 0) / stocks.length;
    
    return {
      marketSentiment: avgChange > 0.5 ? 'BULLISH' : avgChange < -0.5 ? 'BEARISH' : 'NEUTRAL',
      volatilityIndex: Math.abs(avgChange),
      recommendations: [],
      marketSummary: 'AI analysis temporarily unavailable - showing basic market data',
      topOpportunities: [],
      riskWarnings: ['AI analysis service unavailable - trade with caution']
    };
  }

  private async generateAIResponse(prompt: string): Promise<string> {
    try {
      // Import GoogleGenerativeAI dynamically to avoid build issues
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('AI response generation error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const aiAnalyzerService = new AIAnalyzerService();