import { geminiService } from './gemini';
import { groqService } from './groq';
import { openaiService } from './openai';

export type AIProvider = 'gemini' | 'groq' | 'openai';

export interface TradeRecommendation {
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  suggestedShares: number;
  reasoning: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  targetPrice: number;
  keyFactors?: string[];
  marketContext?: string;
  sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  timeHorizon?: string;
}

export interface StockAnalysis {
  symbol: string;
  analysis: string;
  keyPoints: string[];
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  timeHorizon: string;
}

export interface PortfolioInsights {
  overallHealth: string;
  diversificationScore: number;
  riskAssessment: string;
  suggestions: string[];
  rebalanceRecommendations: Array<{
    action: string;
    symbol: string;
    reason: string;
  }>;
}

interface StockData {
  symbol: string;
  name: string;
  currentPrice: number;
  changePercent: number;
  high52: number;
  low52: number;
  marketCap: number;
  peRatio: number;
  beta?: number;
  industry?: string;
}

interface Portfolio {
  cashBalance: number;
  totalValue: number;
  holdings: Record<string, {
    quantity: number;
    averagePrice: number;
    currentPrice: number;
    totalValue: number;
    profitLoss: number;
    profitLossPercent: number;
  }>;
}

class AIService {
  private currentProvider: AIProvider;
  private listeners: Array<(provider: AIProvider) => void> = [];

  constructor(provider: AIProvider = 'gemini') {
    this.currentProvider = provider;
  }

  setProvider(provider: AIProvider): void {
    const oldProvider = this.currentProvider;
    this.currentProvider = provider;
    console.log(`🤖 Switched AI provider to: ${provider.toUpperCase()}`);
    
    // Notify listeners if provider actually changed
    if (oldProvider !== provider) {
      this.listeners.forEach(listener => listener(provider));
    }
  }

  // Add listener for provider changes
  addProviderChangeListener(listener: (provider: AIProvider) => void): void {
    this.listeners.push(listener);
  }

  // Remove listener
  removeProviderChangeListener(listener: (provider: AIProvider) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  getCurrentProvider(): AIProvider {
    return this.currentProvider;
  }

  getProviderInfo(): { provider: AIProvider; model: string; speed: string; description: string } {
    switch (this.currentProvider) {
      case 'gemini':
        return {
          provider: 'gemini',
          model: 'Gemini 1.5 Flash',
          speed: 'Fast',
          description: 'Google\'s advanced AI model optimized for speed and efficiency'
        };
      case 'groq':
        return {
          provider: 'groq',
          model: 'Llama 3.1 70B',
          speed: 'Ultra Fast',
          description: 'Meta\'s powerful model with GROQ\'s lightning-fast inference'
        };
      case 'openai':
        return {
          provider: 'openai',
          model: 'GPT-4o Mini',
          speed: 'Very Fast',
          description: 'OpenAI\'s efficient and intelligent model for trading analysis'
        };
    }
  }

  private getService() {
    switch (this.currentProvider) {
      case 'gemini':
        return geminiService;
      case 'groq':
        return groqService;
      case 'openai':
        return openaiService;
      default:
        return geminiService; // fallback
    }
  }

  async getTradeRecommendation(
    stockData: StockData, 
    portfolio: Portfolio
  ): Promise<TradeRecommendation | null> {
    console.log(`🔍 Getting trade recommendation using ${this.currentProvider.toUpperCase()}`);
    try {
      const service = this.getService();
      const result = await service.getTradeRecommendation(stockData, portfolio);
      
      if (result) {
        console.log(`✅ ${this.currentProvider.toUpperCase()} recommendation: ${result.recommendation} with ${result.confidence}% confidence`);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ ${this.currentProvider.toUpperCase()} trade recommendation error:`, error);
      return null;
    }
  }

  async analyzeStock(stockData: StockData): Promise<StockAnalysis | null> {
    console.log(`📊 Analyzing stock ${stockData.symbol} using ${this.currentProvider.toUpperCase()}`);
    try {
      const service = this.getService();
      return await service.analyzeStock(stockData);
    } catch (error) {
      console.error(`❌ ${this.currentProvider.toUpperCase()} stock analysis error:`, error);
      return null;
    }
  }

  async analyzePortfolio(
    portfolio: Portfolio, 
    marketData: Record<string, StockData>
  ): Promise<PortfolioInsights | null> {
    console.log(`📈 Analyzing portfolio using ${this.currentProvider.toUpperCase()}`);
    try {
      const service = this.getService();
      return await service.analyzePortfolio(portfolio, marketData);
    } catch (error) {
      console.error(`❌ ${this.currentProvider.toUpperCase()} portfolio analysis error:`, error);
      return null;
    }
  }

  async getMarketInsights(symbols: string[]): Promise<string | null> {
    console.log(`🌍 Getting market insights using ${this.currentProvider.toUpperCase()}`);
    try {
      const service = this.getService();
      return await service.getMarketInsights(symbols);
    } catch (error) {
      console.error(`❌ ${this.currentProvider.toUpperCase()} market insights error:`, error);
      return null;
    }
  }

  async explainTrade(
    symbol: string,
    action: 'BUY' | 'SELL',
    quantity: number,
    price: number,
    reasoning?: string
  ): Promise<string | null> {
    console.log(`💡 Explaining trade using ${this.currentProvider.toUpperCase()}`);
    try {
      const service = this.getService();
      return await service.explainTrade(symbol, action, quantity, price, reasoning);
    } catch (error) {
      console.error(`❌ ${this.currentProvider.toUpperCase()} trade explanation error:`, error);
      return null;
    }
  }

  // Test all providers and return comparison
  async compareProviders(stockData: StockData, portfolio: Portfolio): Promise<{
    gemini: TradeRecommendation | null;
    groq: TradeRecommendation | null;
    openai: TradeRecommendation | null;
    comparison: string;
  }> {
    console.log('🔍 Comparing AI providers for the same stock...');
    
    const originalProvider = this.currentProvider;
    
    // Get Gemini recommendation
    this.setProvider('gemini');
    const geminiResult = await this.getTradeRecommendation(stockData, portfolio);
    
    // Get GROQ recommendation
    this.setProvider('groq');
    const groqResult = await this.getTradeRecommendation(stockData, portfolio);
    
    // Get OpenAI recommendation
    this.setProvider('openai');
    const openaiResult = await this.getTradeRecommendation(stockData, portfolio);
    
    // Restore original provider
    this.setProvider(originalProvider);
    
    let comparison = '📊 AI Provider Comparison:\n\n';
    
    const results = [
      { name: 'Gemini', result: geminiResult },
      { name: 'GROQ', result: groqResult },
      { name: 'OpenAI', result: openaiResult }
    ].filter(item => item.result);
    
    if (results.length > 0) {
      results.forEach(({ name, result }) => {
        comparison += `**${name}:** ${result!.recommendation} (${result!.confidence}% confidence)\n`;
      });
      comparison += '\n';
      
      const recommendations = results.map(r => r.result!.recommendation);
      const uniqueRecommendations = [...new Set(recommendations)];
      
      if (uniqueRecommendations.length === 1) {
        comparison += '✅ All providers agree on the recommendation!\n';
      } else {
        comparison += '⚠️ Providers have different opinions - consider additional research.\n';
      }
    } else {
      comparison += '❌ All providers failed to generate recommendations.\n';
    }
    
    return {
      gemini: geminiResult,
      groq: groqResult,
      openai: openaiResult,
      comparison
    };
  }
}

// Create singleton instance
export const aiService = new AIService();

// Utility function to get user's preferred provider from localStorage
export function getUserPreferredProvider(): AIProvider {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('ai-provider-preference');
    if (saved === 'gemini' || saved === 'groq' || saved === 'openai') {
      return saved as AIProvider;
    }
  }
  return 'gemini'; // default
}

// Utility function to save user's provider preference
export function saveUserPreferredProvider(provider: AIProvider): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ai-provider-preference', provider);
    aiService.setProvider(provider);
  }
}