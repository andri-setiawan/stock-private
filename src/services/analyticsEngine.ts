// Core analytics engine for portfolio performance analysis
import { Transaction, Holding, PortfolioState } from '@/store/portfolio';

export interface PortfolioSnapshot {
  timestamp: Date;
  totalValue: number;
  cashBalance: number;
  holdingsValue: number;
  holdings: Record<string, {
    symbol: string;
    quantity: number;
    price: number;
    value: number;
  }>;
}

export interface AnalyticsMetrics {
  // Basic Performance Metrics
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  
  // Risk-Adjusted Metrics
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  
  // Risk Metrics
  volatility: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  beta: number;
  alpha: number;
  
  // Time-based Performance
  dayReturn: number;
  weekReturn: number;
  monthReturn: number;
  
  // Portfolio Health
  diversificationScore: number;
  riskScore: number; // 1-100 scale
  
  // Calculation metadata
  calculatedAt: Date;
  dataPointsUsed: number;
  timeframe: string;
}

export interface PortfolioAttribution {
  sectorContributions: Record<string, {
    sector: string;
    weight: number;
    contribution: number;
    return: number;
  }>;
  stockContributions: Record<string, {
    symbol: string;
    weight: number;
    contribution: number;
    return: number;
    profitLoss: number;
  }>;
  assetAllocation: {
    stocks: number;
    cash: number;
  };
  timeWeightedReturn: number;
}

export interface BenchmarkComparison {
  benchmarkName: string;
  portfolioReturn: number;
  benchmarkReturn: number;
  alpha: number;
  beta: number;
  trackingError: number;
  informationRatio: number;
  relativePerformance: number;
}

export interface AIPerformanceMetrics {
  totalRecommendations: number;
  successfulRecommendations: number;
  overallSuccessRate: number;
  
  confidenceAccuracy: Record<string, {
    range: string;
    recommendations: number;
    successRate: number;
    avgReturn: number;
  }>;
  
  timeToTarget: {
    average: number;
    median: number;
    distribution: Record<string, number>;
  };
  
  riskAdjustedPerformance: number;
  bestPerformingActions: Record<string, {
    action: string;
    successRate: number;
    avgReturn: number;
    count: number;
  }>;
  
  sectorPerformance: Record<string, {
    sector: string;
    successRate: number;
    avgReturn: number;
    count: number;
  }>;
}

class AnalyticsEngine {
  private portfolioSnapshots: PortfolioSnapshot[] = [];
  private readonly RISK_FREE_RATE = 0.02; // 2% annual risk-free rate
  private readonly TRADING_DAYS_PER_YEAR = 252;
  
  /**
   * Calculate comprehensive portfolio analytics
   */
  calculatePortfolioAnalytics(
    portfolio: PortfolioState,
    transactions: Transaction[],
    timeframe: 'week' | 'month' | 'quarter' | 'year' | 'all' = 'all'
  ): AnalyticsMetrics {
    const historicalData = this.generateHistoricalData(portfolio, transactions, timeframe);
    const returns = this.calculateReturns(historicalData);
    
    if (returns.length === 0) {
      return this.getDefaultMetrics();
    }
    
    // Calculate basic performance metrics
    const totalReturn = portfolio.totalValue - portfolio.initialValue;
    const totalReturnPercent = (totalReturn / portfolio.initialValue) * 100;
    const annualizedReturn = this.calculateAnnualizedReturn(returns, timeframe);
    
    // Calculate risk metrics
    const volatility = this.calculateVolatility(returns);
    const { maxDrawdown, maxDrawdownPercent } = this.calculateMaxDrawdown(historicalData);
    
    // Calculate risk-adjusted metrics
    const sharpeRatio = this.calculateSharpeRatio(annualizedReturn, volatility);
    const sortinoRatio = this.calculateSortinoRatio(returns, annualizedReturn);
    const calmarRatio = annualizedReturn / Math.abs(maxDrawdownPercent);
    
    // Calculate time-based returns
    const dayReturn = this.calculatePeriodReturn(historicalData, 1);
    const weekReturn = this.calculatePeriodReturn(historicalData, 7);
    const monthReturn = this.calculatePeriodReturn(historicalData, 30);
    
    // Calculate portfolio health metrics
    const diversificationScore = this.calculateDiversificationScore(portfolio.holdings);
    const riskScore = this.calculateRiskScore(volatility, maxDrawdownPercent, portfolio.holdings);
    
    return {
      totalReturn,
      totalReturnPercent,
      annualizedReturn,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      volatility,
      maxDrawdown,
      maxDrawdownPercent,
      beta: 1.0, // TODO: Calculate vs market benchmark
      alpha: annualizedReturn - this.RISK_FREE_RATE, // Simplified alpha calculation
      dayReturn,
      weekReturn,
      monthReturn,
      diversificationScore,
      riskScore,
      calculatedAt: new Date(),
      dataPointsUsed: returns.length,
      timeframe
    };
  }
  
  /**
   * Calculate portfolio attribution analysis
   */
  calculatePortfolioAttribution(
    portfolio: PortfolioState,
    transactions: Transaction[]
  ): PortfolioAttribution {
    const stockContributions: Record<string, any> = {};
    const sectorContributions: Record<string, any> = {};
    
    // Calculate individual stock contributions
    Object.entries(portfolio.holdings).forEach(([symbol, holding]) => {
      const weight = holding.totalValue / portfolio.totalValue;
      const stockReturn = holding.profitLossPercent;
      const contribution = weight * stockReturn;
      
      stockContributions[symbol] = {
        symbol,
        weight: weight * 100,
        contribution,
        return: stockReturn,
        profitLoss: holding.profitLoss
      };
      
      // Group by sector (simplified - using first letter of symbol for demo)
      const sector = this.inferSector(symbol);
      if (!sectorContributions[sector]) {
        sectorContributions[sector] = {
          sector,
          weight: 0,
          contribution: 0,
          return: 0
        };
      }
      
      sectorContributions[sector].weight += weight * 100;
      sectorContributions[sector].contribution += contribution;
      sectorContributions[sector].return += stockReturn * weight;
    });
    
    // Calculate asset allocation
    const holdingsValue = Object.values(portfolio.holdings)
      .reduce((sum, holding) => sum + holding.totalValue, 0);
    
    const assetAllocation = {
      stocks: (holdingsValue / portfolio.totalValue) * 100,
      cash: (portfolio.cashBalance / portfolio.totalValue) * 100
    };
    
    // Calculate time-weighted return
    const timeWeightedReturn = this.calculateTimeWeightedReturn(transactions, portfolio);
    
    return {
      sectorContributions,
      stockContributions,
      assetAllocation,
      timeWeightedReturn
    };
  }
  
  /**
   * Analyze AI recommendation performance
   */
  analyzeAIPerformance(transactions: Transaction[]): AIPerformanceMetrics {
    const aiTransactions = transactions.filter(t => t.aiRecommendation);
    
    if (aiTransactions.length === 0) {
      return this.getDefaultAIMetrics();
    }
    
    // Calculate overall success rate
    const successfulTrades = aiTransactions.filter(t => this.isTradeSuccessful(t));
    const overallSuccessRate = (successfulTrades.length / aiTransactions.length) * 100;
    
    // Group by confidence levels
    const confidenceAccuracy = this.analyzeConfidenceAccuracy(aiTransactions);
    
    // Calculate time to target
    const timeToTarget = this.calculateTimeToTarget(aiTransactions);
    
    // Analyze best performing actions
    const bestPerformingActions = this.analyzeBestActions(aiTransactions);
    
    // Analyze sector performance
    const sectorPerformance = this.analyzeSectorPerformance(aiTransactions);
    
    // Calculate risk-adjusted performance
    const riskAdjustedPerformance = this.calculateAIRiskAdjustedPerformance(aiTransactions);
    
    return {
      totalRecommendations: aiTransactions.length,
      successfulRecommendations: successfulTrades.length,
      overallSuccessRate,
      confidenceAccuracy,
      timeToTarget,
      riskAdjustedPerformance,
      bestPerformingActions,
      sectorPerformance
    };
  }
  
  /**
   * Generate benchmark comparison
   */
  async generateBenchmarkComparison(
    portfolio: PortfolioState,
    benchmarkSymbol: string = 'SPY'
  ): Promise<BenchmarkComparison> {
    // TODO: Integrate with real benchmark data
    // For now, using mock data
    const portfolioReturn = ((portfolio.totalValue - portfolio.initialValue) / portfolio.initialValue) * 100;
    const benchmarkReturn = 10.5; // Mock S&P 500 return
    
    const alpha = portfolioReturn - benchmarkReturn;
    const beta = 1.0; // TODO: Calculate correlation with benchmark
    const trackingError = Math.abs(portfolioReturn - benchmarkReturn);
    const informationRatio = alpha / trackingError;
    
    return {
      benchmarkName: benchmarkSymbol,
      portfolioReturn,
      benchmarkReturn,
      alpha,
      beta,
      trackingError,
      informationRatio,
      relativePerformance: portfolioReturn - benchmarkReturn
    };
  }
  
  // Private helper methods
  
  private generateHistoricalData(
    portfolio: PortfolioState,
    transactions: Transaction[],
    timeframe: string
  ): PortfolioSnapshot[] {
    // Generate historical portfolio snapshots based on transactions
    const snapshots: PortfolioSnapshot[] = [];
    let currentValue = portfolio.initialValue;
    
    // Sort transactions by timestamp
    const sortedTransactions = [...transactions].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Create snapshots for each transaction
    sortedTransactions.forEach(transaction => {
      if (transaction.type === 'BUY') {
        currentValue += transaction.totalAmount * 0.01; // Assume 1% daily growth (mock)
      }
      
      snapshots.push({
        timestamp: new Date(transaction.timestamp),
        totalValue: currentValue,
        cashBalance: 0, // Simplified
        holdingsValue: currentValue,
        holdings: {} // Simplified
      });
    });
    
    // Add current snapshot
    snapshots.push({
      timestamp: new Date(),
      totalValue: portfolio.totalValue,
      cashBalance: portfolio.cashBalance,
      holdingsValue: portfolio.totalValue - portfolio.cashBalance,
      holdings: {}
    });
    
    return snapshots;
  }
  
  private calculateReturns(snapshots: PortfolioSnapshot[]): number[] {
    const returns: number[] = [];
    
    for (let i = 1; i < snapshots.length; i++) {
      const currentValue = snapshots[i].totalValue;
      const previousValue = snapshots[i - 1].totalValue;
      const dailyReturn = (currentValue - previousValue) / previousValue;
      returns.push(dailyReturn);
    }
    
    return returns;
  }
  
  private calculateAnnualizedReturn(returns: number[], timeframe: string): number {
    if (returns.length === 0) return 0;
    
    const totalReturn = returns.reduce((acc, ret) => (1 + acc) * (1 + ret) - 1, 0);
    const periodsPerYear = this.getPeriodsPerYear(timeframe);
    const periods = returns.length;
    
    return Math.pow(1 + totalReturn, periodsPerYear / periods) - 1;
  }
  
  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (returns.length - 1);
    
    return Math.sqrt(variance * this.TRADING_DAYS_PER_YEAR);
  }
  
  private calculateMaxDrawdown(snapshots: PortfolioSnapshot[]): { maxDrawdown: number; maxDrawdownPercent: number } {
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let peak = 0;
    
    snapshots.forEach(snapshot => {
      if (snapshot.totalValue > peak) {
        peak = snapshot.totalValue;
      }
      
      const drawdown = peak - snapshot.totalValue;
      const drawdownPercent = (drawdown / peak) * 100;
      
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPercent = drawdownPercent;
      }
    });
    
    return { maxDrawdown, maxDrawdownPercent };
  }
  
  private calculateSharpeRatio(annualizedReturn: number, volatility: number): number {
    if (volatility === 0) return 0;
    return (annualizedReturn - this.RISK_FREE_RATE) / volatility;
  }
  
  private calculateSortinoRatio(returns: number[], annualizedReturn: number): number {
    const negativeReturns = returns.filter(ret => ret < 0);
    if (negativeReturns.length === 0) return annualizedReturn / 0.01; // Very high ratio if no negative returns
    
    const downside = Math.sqrt(
      negativeReturns.reduce((sum, ret) => sum + Math.pow(ret, 2), 0) / negativeReturns.length
    );
    
    return (annualizedReturn - this.RISK_FREE_RATE) / (downside * Math.sqrt(this.TRADING_DAYS_PER_YEAR));
  }
  
  private calculatePeriodReturn(snapshots: PortfolioSnapshot[], days: number): number {
    if (snapshots.length < 2) return 0;
    
    const current = snapshots[snapshots.length - 1];
    const previous = snapshots[Math.max(0, snapshots.length - days - 1)];
    
    return ((current.totalValue - previous.totalValue) / previous.totalValue) * 100;
  }
  
  private calculateDiversificationScore(holdings: Record<string, Holding>): number {
    const numHoldings = Object.keys(holdings).length;
    if (numHoldings === 0) return 0;
    
    // Calculate concentration (Herfindahl index)
    const totalValue = Object.values(holdings).reduce((sum, h) => sum + h.totalValue, 0);
    const weights = Object.values(holdings).map(h => h.totalValue / totalValue);
    const herfindahl = weights.reduce((sum, w) => sum + w * w, 0);
    
    // Convert to diversification score (0-100)
    return Math.max(0, 100 - (herfindahl * 100));
  }
  
  private calculateRiskScore(volatility: number, maxDrawdown: number, holdings: Record<string, Holding>): number {
    // Combine multiple risk factors into a single score (1-100)
    const volRisk = Math.min(volatility * 100, 50); // Cap at 50
    const drawdownRisk = Math.min(maxDrawdown, 30); // Cap at 30
    const concentrationRisk = Math.max(0, 20 - Object.keys(holdings).length); // Penalty for concentration
    
    return Math.min(100, volRisk + drawdownRisk + concentrationRisk);
  }
  
  private calculateTimeWeightedReturn(transactions: Transaction[], portfolio: PortfolioState): number {
    // Simplified time-weighted return calculation
    return ((portfolio.totalValue - portfolio.initialValue) / portfolio.initialValue) * 100;
  }
  
  private inferSector(symbol: string): string {
    // Simplified sector inference - in real implementation, use sector mapping
    const sectorMap: Record<string, string> = {
      'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology', 'AMZN': 'Technology',
      'TSLA': 'Automotive', 'AMD': 'Technology', 'NVDA': 'Technology',
      'JPM': 'Financial', 'BAC': 'Financial', 'WFC': 'Financial',
      'JNJ': 'Healthcare', 'PFE': 'Healthcare', 'MRNA': 'Healthcare'
    };
    
    return sectorMap[symbol] || 'Other';
  }
  
  private isTradeSuccessful(transaction: Transaction): boolean {
    // Simplified success criteria - in real implementation, track actual outcomes
    return Math.random() > 0.3; // Mock 70% success rate
  }
  
  private analyzeConfidenceAccuracy(transactions: Transaction[]): Record<string, any> {
    const buckets = { 'low': [], 'medium': [], 'high': [] };
    
    transactions.forEach(t => {
      if (!t.aiRecommendation) return;
      
      const confidence = t.aiRecommendation.confidence;
      if (confidence < 60) buckets.low.push(t);
      else if (confidence < 80) buckets.medium.push(t);
      else buckets.high.push(t);
    });
    
    const result: Record<string, any> = {};
    Object.entries(buckets).forEach(([range, trades]) => {
      const successful = trades.filter(t => this.isTradeSuccessful(t));
      result[range] = {
        range: range === 'low' ? '0-60%' : range === 'medium' ? '60-80%' : '80-100%',
        recommendations: trades.length,
        successRate: trades.length > 0 ? (successful.length / trades.length) * 100 : 0,
        avgReturn: 5.2 // Mock average return
      };
    });
    
    return result;
  }
  
  private calculateTimeToTarget(transactions: Transaction[]): any {
    // Mock time to target analysis
    return {
      average: 3.5, // days
      median: 2.8,
      distribution: {
        '0-1 days': 25,
        '1-3 days': 40,
        '3-7 days': 25,
        '7+ days': 10
      }
    };
  }
  
  private analyzeBestActions(transactions: Transaction[]): Record<string, any> {
    const actions = { 'BUY': [], 'SELL': [] };
    
    transactions.forEach(t => {
      if (t.aiRecommendation) {
        actions[t.type].push(t);
      }
    });
    
    const result: Record<string, any> = {};
    Object.entries(actions).forEach(([action, trades]) => {
      const successful = trades.filter(t => this.isTradeSuccessful(t));
      result[action.toLowerCase()] = {
        action,
        successRate: trades.length > 0 ? (successful.length / trades.length) * 100 : 0,
        avgReturn: 4.8, // Mock
        count: trades.length
      };
    });
    
    return result;
  }
  
  private analyzeSectorPerformance(transactions: Transaction[]): Record<string, any> {
    const sectors: Record<string, any[]> = {};
    
    transactions.forEach(t => {
      const sector = this.inferSector(t.symbol);
      if (!sectors[sector]) sectors[sector] = [];
      sectors[sector].push(t);
    });
    
    const result: Record<string, any> = {};
    Object.entries(sectors).forEach(([sector, trades]) => {
      const successful = trades.filter(t => this.isTradeSuccessful(t));
      result[sector.toLowerCase()] = {
        sector,
        successRate: trades.length > 0 ? (successful.length / trades.length) * 100 : 0,
        avgReturn: 6.1, // Mock
        count: trades.length
      };
    });
    
    return result;
  }
  
  private calculateAIRiskAdjustedPerformance(transactions: Transaction[]): number {
    // Mock risk-adjusted performance calculation
    return 1.25; // Positive risk-adjusted performance
  }
  
  private getPeriodsPerYear(timeframe: string): number {
    switch (timeframe) {
      case 'week': return 52;
      case 'month': return 12;
      case 'quarter': return 4;
      case 'year': return 1;
      default: return this.TRADING_DAYS_PER_YEAR;
    }
  }
  
  private getDefaultMetrics(): AnalyticsMetrics {
    return {
      totalReturn: 0,
      totalReturnPercent: 0,
      annualizedReturn: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      volatility: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      beta: 1,
      alpha: 0,
      dayReturn: 0,
      weekReturn: 0,
      monthReturn: 0,
      diversificationScore: 0,
      riskScore: 0,
      calculatedAt: new Date(),
      dataPointsUsed: 0,
      timeframe: 'all'
    };
  }
  
  private getDefaultAIMetrics(): AIPerformanceMetrics {
    return {
      totalRecommendations: 0,
      successfulRecommendations: 0,
      overallSuccessRate: 0,
      confidenceAccuracy: {},
      timeToTarget: { average: 0, median: 0, distribution: {} },
      riskAdjustedPerformance: 0,
      bestPerformingActions: {},
      sectorPerformance: {}
    };
  }
}

export const analyticsEngine = new AnalyticsEngine();