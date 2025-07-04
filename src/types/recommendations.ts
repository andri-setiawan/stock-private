// TypeScript interfaces for AI recommendations and market analysis

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  sector?: string;
}

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
  timeframe: 'SHORT' | 'MEDIUM' | 'LONG';
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
  lastUpdated: string;
}

export interface DailyInsight {
  id: string;
  title: string;
  description: string;
  type: 'OPPORTUNITY' | 'WARNING' | 'INFO';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  relatedStocks: string[];
  timestamp: string;
}

export interface TradingSignal {
  symbol: string;
  signalType: 'BREAKOUT' | 'REVERSAL' | 'MOMENTUM' | 'VOLUME_SPIKE';
  strength: number; // 0-100
  description: string;
  timeDetected: string;
}

export interface PortfolioRecommendation {
  action: 'REBALANCE' | 'TAKE_PROFIT' | 'CUT_LOSSES' | 'ADD_POSITION';
  symbol: string;
  currentWeight: number;
  suggestedWeight: number;
  reasoning: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface RiskMetrics {
  portfolioVolatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  beta: number;
  diversificationScore: number;
}

export interface PerformanceMetrics {
  totalReturn: number;
  dailyReturn: number;
  winRate: number;
  averageGain: number;
  averageLoss: number;
  profitFactor: number;
  recommendationsFollowed: number;
  recommendationAccuracy: number;
}

export interface MarketOverview {
  indices: {
    sp500: { value: number; change: number; changePercent: number };
    nasdaq: { value: number; change: number; changePercent: number };
    dow: { value: number; change: number; changePercent: number };
  };
  sectors: {
    name: string;
    performance: number;
    topStock: string;
  }[];
  marketState: 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'AFTER_HOURS';
  nextTradingSession: string;
}

export interface NewsImpact {
  headline: string;
  summary: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  affectedStocks: string[];
  impactScore: number; // 0-100
  publishedAt: string;
  source: string;
}

export interface TechnicalIndicators {
  symbol: string;
  rsi: number;
  macd: { macd: number; signal: number; histogram: number };
  movingAverages: {
    sma20: number;
    sma50: number;
    ema12: number;
    ema26: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  volume: {
    current: number;
    average: number;
    volumeRatio: number;
  };
  support: number[];
  resistance: number[];
}

export interface AlertConfig {
  id: string;
  type: 'PRICE' | 'VOLUME' | 'NEWS' | 'RECOMMENDATION';
  symbol?: string;
  condition: 'ABOVE' | 'BELOW' | 'CHANGE_PERCENT' | 'VOLUME_SPIKE';
  threshold: number;
  isActive: boolean;
  notificationMethod: 'PUSH' | 'EMAIL' | 'SMS';
  createdAt: string;
}

export interface UserPreferences {
  riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  investmentStyle: 'VALUE' | 'GROWTH' | 'MOMENTUM' | 'MIXED';
  tradingFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  preferredSectors: string[];
  maxPositionSize: number; // percentage of portfolio
  stopLossPercentage: number;
  takeProfitPercentage: number;
  notificationSettings: {
    dailyDigest: boolean;
    tradeAlerts: boolean;
    marketNews: boolean;
    performanceReports: boolean;
  };
}

export interface TradeExecution {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  totalValue: number;
  executedAt: string;
  aiRecommendationId?: string;
  userInitiated: boolean;
  reason: string;
  fees: number;
  status: 'PENDING' | 'EXECUTED' | 'FAILED' | 'CANCELLED';
}

export interface BacktestResult {
  strategy: string;
  period: { start: string; end: string };
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  benchmark: {
    return: number;
    volatility: number;
  };
  tradeHistory: {
    date: string;
    symbol: string;
    action: 'BUY' | 'SELL';
    price: number;
    quantity: number;
    portfolioValue: number;
  }[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}