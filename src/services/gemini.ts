import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not defined');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

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

class GeminiService {
  private model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  async getTradeRecommendation(
    stockData: StockData, 
    portfolio: Portfolio
  ): Promise<TradeRecommendation | null> {
    const prompt = `
      As a professional stock trading AI assistant, analyze this data and provide a clear recommendation.
      
      Stock Analysis:
      - Symbol: ${stockData.symbol}
      - Company: ${stockData.name}
      - Current Price: $${stockData.currentPrice}
      - Day Change: ${stockData.changePercent}%
      - 52-Week Range: $${stockData.low52} - $${stockData.high52}
      - Market Cap: ${stockData.marketCap ? `$${(stockData.marketCap / 1000000000).toFixed(2)}B` : 'N/A'}
      - P/E Ratio: ${stockData.peRatio || 'N/A'}
      - Beta: ${stockData.beta || 'N/A'}
      - Industry: ${stockData.industry || 'N/A'}
      
      Portfolio Context:
      - Available Cash: $${portfolio.cashBalance.toFixed(2)}
      - Total Portfolio Value: $${portfolio.totalValue.toFixed(2)}
      - Current Holdings: ${Object.keys(portfolio.holdings).length} positions
      - Existing Position in ${stockData.symbol}: ${portfolio.holdings[stockData.symbol] ? 
        `${portfolio.holdings[stockData.symbol].quantity} shares at avg $${portfolio.holdings[stockData.symbol].averagePrice}` : 
        'None'}
      
      Technical Indicators:
      - Current price vs 52-week range: ${((stockData.currentPrice - stockData.low52) / (stockData.high52 - stockData.low52) * 100).toFixed(1)}% of range
      - Distance from 52-week high: ${((stockData.high52 - stockData.currentPrice) / stockData.high52 * 100).toFixed(1)}%
      
      Provide a JSON response with:
      {
        "recommendation": "BUY/SELL/HOLD",
        "confidence": 0-100,
        "suggestedShares": number (0 if HOLD/SELL),
        "reasoning": "2-3 sentence explanation focusing on key factors",
        "riskLevel": "LOW/MEDIUM/HIGH",
        "targetPrice": number (estimated fair value),
        "keyFactors": ["factor1", "factor2", "factor3"] (3-4 key bullet points explaining the recommendation),
        "marketContext": "Brief analysis of current market conditions affecting this stock",
        "sentiment": "BULLISH/BEARISH/NEUTRAL",
        "timeHorizon": "Short-term/Medium-term/Long-term outlook and expected timeline"
      }
      
      Consider:
      - Technical analysis (price relative to 52-week range)
      - Fundamental metrics (P/E ratio, market cap)
      - Portfolio diversification and risk management
      - Market sentiment and sector trends
      - Economic factors and news events
      - Risk management (don't recommend using all available cash)
      - Provide specific, actionable insights in keyFactors
      - Include relevant market context that affects the recommendation
    `;

    try {
      console.log('🤖 GEMINI: Sending request to Gemini API...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('🤖 GEMINI: Raw response received:', text.substring(0, 200) + '...');
      
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('🤖 GEMINI: JSON extracted successfully');
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('🤖 GEMINI: JSON parsed successfully:', {
            recommendation: parsed.recommendation,
            confidence: parsed.confidence,
            riskLevel: parsed.riskLevel
          });
          return parsed;
        } catch (parseError) {
          console.error('🤖 GEMINI: JSON parse error:', parseError);
          console.error('🤖 GEMINI: Raw JSON string:', jsonMatch[0]);
          return null;
        }
      }
      
      console.error('🤖 GEMINI: Failed to extract JSON from response:', text);
      return null;
    } catch (error) {
      console.error('🤖 GEMINI: API error:', error);
      if (error instanceof Error) {
        console.error('🤖 GEMINI: Error details:', {
          message: error.message,
          stack: error.stack?.substring(0, 500)
        });
      }
      return null;
    }
  }

  async analyzeStock(stockData: StockData): Promise<StockAnalysis | null> {
    const prompt = `
      Provide a comprehensive analysis of ${stockData.symbol} (${stockData.name}).
      
      Current Data:
      - Price: $${stockData.currentPrice}
      - Day Change: ${stockData.changePercent}%
      - 52-Week Range: $${stockData.low52} - $${stockData.high52}
      - Market Cap: ${stockData.marketCap ? `$${(stockData.marketCap / 1000000000).toFixed(2)}B` : 'N/A'}
      - P/E Ratio: ${stockData.peRatio || 'N/A'}
      - Industry: ${stockData.industry || 'N/A'}
      
      Provide analysis in the following format:
      {
        "symbol": "${stockData.symbol}",
        "analysis": "2-3 paragraph comprehensive analysis",
        "keyPoints": ["bullet point 1", "bullet point 2", "bullet point 3"],
        "sentiment": "BULLISH/BEARISH/NEUTRAL",
        "timeHorizon": "Short-term/Medium-term/Long-term outlook"
      }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return null;
    } catch (error) {
      console.error('Gemini stock analysis error:', error);
      return null;
    }
  }

  async analyzePortfolio(
    portfolio: Portfolio, 
    marketData: Record<string, StockData>
  ): Promise<PortfolioInsights | null> {
    const holdings = Object.entries(portfolio.holdings)
      .map(([symbol, holding]) => ({
        symbol,
        quantity: holding.quantity,
        value: holding.totalValue,
        profitLoss: holding.profitLoss,
        weight: (holding.totalValue / portfolio.totalValue * 100).toFixed(1)
      }));

    const prompt = `
      Analyze this investment portfolio and provide insights:
      
      Portfolio Summary:
      - Total Value: $${portfolio.totalValue.toFixed(2)}
      - Cash Balance: $${portfolio.cashBalance.toFixed(2)} (${(portfolio.cashBalance / portfolio.totalValue * 100).toFixed(1)}%)
      - Number of Positions: ${holdings.length}
      
      Holdings:
      ${holdings.map(h => 
        `- ${h.symbol}: ${h.quantity} shares, $${h.value.toFixed(2)} (${h.weight}%), P/L: $${h.profitLoss.toFixed(2)}`
      ).join('\n')}
      
      Market Data Available: ${Object.keys(marketData).join(', ')}
      
      Provide analysis in JSON format:
      {
        "overallHealth": "Assessment of portfolio health",
        "diversificationScore": 0-100,
        "riskAssessment": "Risk level and explanation",
        "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
        "rebalanceRecommendations": [
          {"action": "BUY/SELL/REDUCE", "symbol": "STOCK", "reason": "why"}
        ]
      }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return null;
    } catch (error) {
      console.error('Gemini portfolio analysis error:', error);
      return null;
    }
  }

  async getMarketInsights(symbols: string[]): Promise<string | null> {
    const prompt = `
      Provide brief market insights for these stocks: ${symbols.join(', ')}
      
      Consider:
      - Overall market sentiment
      - Sector trends
      - Economic factors
      - Any significant news or events
      
      Keep response concise (2-3 paragraphs) and actionable.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini market insights error:', error);
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
    const prompt = `
      Explain this trade decision in simple terms:
      
      Action: ${action} ${quantity} shares of ${symbol} at $${price}
      ${reasoning ? `AI Reasoning: ${reasoning}` : ''}
      
      Provide a brief, educational explanation of:
      1. What this trade means
      2. Potential risks and rewards
      3. How it fits into a trading strategy
      
      Keep it conversational and beginner-friendly.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini trade explanation error:', error);
      return null;
    }
  }
}

export const geminiService = new GeminiService();