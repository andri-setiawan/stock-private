// Advanced Portfolio Analytics Service
import { Holding, Transaction, PortfolioState } from '@/store/portfolio';

export interface PortfolioPerformanceMetrics {
  // Overall Performance
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  dayChange: number;
  dayChangePercent: number;
  
  // Risk Metrics
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  beta: number;
  
  // Diversification
  sectorAllocation: Record<string, { value: number; percentage: number; stocks: string[] }>;
  topHoldings: Array<{ symbol: string; value: number; percentage: number; holding: Holding }>;
  concentrationRisk: number;
  
  // Trading Analytics
  winRate: number;
  avgWinAmount: number;
  avgLossAmount: number;
  totalTrades: number;
  profitableTrades: number;
  
  // AI Performance
  aiRecommendationAccuracy: number;
  avgConfidenceOfWinningTrades: number;
  avgConfidenceOfLosingTrades: number;
  aiRecommendationStats: {
    buySignals: number;
    sellSignals: number;
    avgConfidence: number;
    successRate: number;
  };
}

export interface PortfolioDiversificationAnalysis {
  sectors: Record<string, {
    allocation: number;
    stocks: Array<{ symbol: string; weight: number; value: number }>;
    performance: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  concentrationScore: number; // 0-100, higher = more concentrated
  diversificationGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: string[];
}

export interface TimeSeriesData {
  timestamp: Date;
  portfolioValue: number;
  cashBalance: number;
  totalReturn: number;
  dayChange: number;
}

class PortfolioAnalyticsService {
  private readonly TRADING_DAYS_PER_YEAR = 252;
  private readonly RISK_FREE_RATE = 0.02; // 2% annual risk-free rate

  /**
   * Calculate comprehensive portfolio performance metrics
   */
  calculatePerformanceMetrics(
    portfolio: PortfolioState,
    priceHistory: Record<string, number[]>,
    sectorMappings: Record<string, string>
  ): PortfolioPerformanceMetrics {
    const summary = this.getBasicSummary(portfolio);
    const holdings = Object.entries(portfolio.holdings);
    
    // Calculate time-based metrics
    const daysSinceStart = this.getDaysSinceStart(portfolio);
    const annualizedReturn = this.calculateAnnualizedReturn(summary.totalProfitLossPercent, daysSinceStart);
    
    // Risk metrics
    const volatility = this.calculateVolatility(priceHistory, holdings);
    const sharpeRatio = this.calculateSharpeRatio(annualizedReturn, volatility);
    const maxDrawdown = this.calculateMaxDrawdown(portfolio);
    
    // Diversification analysis
    const sectorAllocation = this.calculateSectorAllocation(holdings, sectorMappings);
    const topHoldings = this.getTopHoldings(holdings);
    const concentrationRisk = this.calculateConcentrationRisk(holdings);
    
    // Trading analytics
    const tradingMetrics = this.calculateTradingMetrics(portfolio.transactions);
    
    // AI performance
    const aiMetrics = this.calculateAIPerformance(portfolio.transactions);

    return {
      totalReturn: summary.totalProfitLoss,
      totalReturnPercent: summary.totalProfitLossPercent,
      annualizedReturn,
      dayChange: this.calculateDayChange(portfolio),
      dayChangePercent: this.calculateDayChangePercent(portfolio),
      
      volatility,
      sharpeRatio,
      maxDrawdown,
      beta: 1.0, // Simplified - would need market data for accurate calculation
      
      sectorAllocation,
      topHoldings,
      concentrationRisk,
      
      ...tradingMetrics,
      ...aiMetrics
    };
  }

  /**
   * Analyze portfolio diversification
   */
  analyzeDiversification(
    holdings: Record<string, Holding>,
    sectorMappings: Record<string, string>
  ): PortfolioDiversificationAnalysis {
    const totalValue = Object.values(holdings).reduce((sum, h) => sum + h.totalValue, 0);
    const sectors: Record<string, {
      allocation: number;
      stocks: Array<{ symbol: string; weight: number; value: number }>;
      performance: number;
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    }> = {};
    
    // Group by sectors
    Object.entries(holdings).forEach(([symbol, holding]) => {
      const sector = sectorMappings[symbol] || 'Unknown';
      if (!sectors[sector]) {
        sectors[sector] = {
          allocation: 0,
          stocks: [],
          performance: 0,
          riskLevel: 'MEDIUM'
        };
      }
      
      const weight = holding.totalValue / totalValue;
      sectors[sector].allocation += weight;
      sectors[sector].stocks.push({
        symbol,
        weight,
        value: holding.totalValue
      });
      sectors[sector].performance += holding.profitLossPercent * weight;
    });

    // Calculate concentration score
    const concentrationScore = this.calculateHerfindahlIndex(holdings) * 100;
    
    // Grade diversification
    const diversificationGrade = this.gradeDiversification(concentrationScore, Object.keys(sectors).length);
    
    // Generate recommendations
    const recommendations = this.generateDiversificationRecommendations(sectors, concentrationScore);

    return {
      sectors,
      concentrationScore,
      diversificationGrade,
      recommendations
    };
  }

  /**
   * Generate portfolio performance time series
   */
  generateTimeSeriesData(transactions: Transaction[]): TimeSeriesData[] {
    const timeSeriesData: TimeSeriesData[] = [];
    const initialValue = 10000; // Starting portfolio value
    
    // Simplified implementation - would need historical price data for accuracy
    transactions.forEach((transaction, index) => {
      const portfolioValue = initialValue + (index * 100); // Simplified calculation
      timeSeriesData.push({
        timestamp: new Date(transaction.timestamp),
        portfolioValue,
        cashBalance: portfolioValue * 0.2, // Simplified
        totalReturn: portfolioValue - initialValue,
        dayChange: index > 0 ? portfolioValue - timeSeriesData[index - 1].portfolioValue : 0
      });
    });

    return timeSeriesData;
  }

  // Private helper methods
  private getBasicSummary(portfolio: PortfolioState) {
    const totalHoldingsValue = Object.values(portfolio.holdings)
      .reduce((sum, holding) => sum + holding.totalValue, 0);
    const totalValue = portfolio.cashBalance + totalHoldingsValue;
    const totalProfitLoss = totalValue - portfolio.initialValue;
    const totalProfitLossPercent = (totalProfitLoss / portfolio.initialValue) * 100;

    return {
      totalValue,
      totalProfitLoss,
      totalProfitLossPercent,
      investedAmount: totalHoldingsValue
    };
  }

  private getDaysSinceStart(portfolio: PortfolioState): number {
    const startDate = portfolio.transactions.length > 0 
      ? new Date(portfolio.transactions[0].timestamp)
      : new Date();
    const daysDiff = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(daysDiff, 1); // Minimum 1 day
  }

  private calculateAnnualizedReturn(totalReturnPercent: number, days: number): number {
    if (days < 1) return 0;
    const years = days / 365;
    return Math.pow(1 + totalReturnPercent / 100, 1 / years) - 1;
  }

  private calculateVolatility(priceHistory: Record<string, number[]>, holdings: [string, Holding][]): number {
    // Simplified volatility calculation
    // In production, this would use actual price history
    const avgVolatility = holdings.reduce((sum, [, holding]) => {
      const volatility = Math.abs(holding.profitLossPercent) / 100;
      return sum + volatility * (holding.totalValue / holdings.reduce((total, [, h]) => total + h.totalValue, 0));
    }, 0);
    
    return avgVolatility;
  }

  private calculateSharpeRatio(annualizedReturn: number, volatility: number): number {
    if (volatility === 0) return 0;
    return (annualizedReturn - this.RISK_FREE_RATE) / volatility;
  }

  private calculateMaxDrawdown(portfolio: PortfolioState): number {
    // Simplified - would need historical portfolio values
    const currentValue = this.getBasicSummary(portfolio).totalValue;
    const initialValue = portfolio.initialValue;
    const maxValue = Math.max(currentValue, initialValue);
    return (maxValue - currentValue) / maxValue;
  }

  private calculateSectorAllocation(holdings: [string, Holding][], sectorMappings: Record<string, string>) {
    const totalValue = holdings.reduce((sum, [, holding]) => sum + holding.totalValue, 0);
    const sectorAllocation: Record<string, { value: number; percentage: number; stocks: string[] }> = {};

    holdings.forEach(([stockSymbol, holding]) => {
      const sector = sectorMappings[stockSymbol] || 'Technology';
      if (!sectorAllocation[sector]) {
        sectorAllocation[sector] = { value: 0, percentage: 0, stocks: [] };
      }
      
      sectorAllocation[sector].value += holding.totalValue;
      sectorAllocation[sector].stocks.push(stockSymbol);
    });

    // Calculate percentages
    Object.values(sectorAllocation).forEach(allocation => {
      allocation.percentage = (allocation.value / totalValue) * 100;
    });

    return sectorAllocation;
  }

  private getTopHoldings(holdings: [string, Holding][]): Array<{ symbol: string; value: number; percentage: number; holding: Holding }> {
    const totalValue = holdings.reduce((sum, [, holding]) => sum + holding.totalValue, 0);
    
    return holdings
      .map(([symbol, holding]) => ({
        symbol,
        value: holding.totalValue,
        percentage: (holding.totalValue / totalValue) * 100,
        holding
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }

  private calculateConcentrationRisk(holdings: [string, Holding][]): number {
    return this.calculateHerfindahlIndex(Object.fromEntries(holdings));
  }

  private calculateHerfindahlIndex(holdings: Record<string, Holding>): number {
    const totalValue = Object.values(holdings).reduce((sum, h) => sum + h.totalValue, 0);
    if (totalValue === 0) return 0;
    
    return Object.values(holdings).reduce((sum, holding) => {
      const weight = holding.totalValue / totalValue;
      return sum + Math.pow(weight, 2);
    }, 0);
  }

  private calculateDayChange(portfolio: PortfolioState): number {
    // Simplified - would need previous day's portfolio value
    return Object.values(portfolio.holdings).reduce((sum, holding) => {
      // Estimate day change based on current P&L
      return sum + (holding.totalValue * 0.01); // Simplified 1% assumption
    }, 0);
  }

  private calculateDayChangePercent(portfolio: PortfolioState): number {
    const dayChange = this.calculateDayChange(portfolio);
    const totalValue = this.getBasicSummary(portfolio).totalValue;
    return totalValue > 0 ? (dayChange / totalValue) * 100 : 0;
  }

  private calculateTradingMetrics(transactions: Transaction[]) {
    if (transactions.length === 0) {
      return {
        winRate: 0,
        avgWinAmount: 0,
        avgLossAmount: 0,
        totalTrades: 0,
        profitableTrades: 0
      };
    }

    const completedTrades = this.identifyCompletedTrades(transactions);
    const profitableTrades = completedTrades.filter(trade => trade.profit > 0);
    const losingTrades = completedTrades.filter(trade => trade.profit <= 0);

    return {
      winRate: completedTrades.length > 0 ? (profitableTrades.length / completedTrades.length) * 100 : 0,
      avgWinAmount: profitableTrades.length > 0 ? profitableTrades.reduce((sum, trade) => sum + trade.profit, 0) / profitableTrades.length : 0,
      avgLossAmount: losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, trade) => sum + trade.profit, 0) / losingTrades.length) : 0,
      totalTrades: completedTrades.length,
      profitableTrades: profitableTrades.length
    };
  }

  private identifyCompletedTrades(transactions: Transaction[]): Array<{ symbol: string; profit: number; confidence?: number }> {
    // Simplified - identify buy/sell pairs for the same symbol
    const trades: Array<{ symbol: string; profit: number; confidence?: number }> = [];
    const positions: Record<string, { quantity: number; totalCost: number; avgConfidence?: number }> = {};

    transactions.forEach(transaction => {
      const { symbol, type, quantity, totalAmount } = transaction;
      
      if (!positions[symbol]) {
        positions[symbol] = { quantity: 0, totalCost: 0 };
      }

      if (type === 'BUY') {
        positions[symbol].quantity += quantity;
        positions[symbol].totalCost += totalAmount;
        if (transaction.aiRecommendation?.confidence) {
          positions[symbol].avgConfidence = transaction.aiRecommendation.confidence;
        }
      } else if (type === 'SELL' && positions[symbol].quantity > 0) {
        const soldRatio = quantity / positions[symbol].quantity;
        const costBasis = positions[symbol].totalCost * soldRatio;
        const profit = totalAmount - costBasis;
        
        trades.push({
          symbol,
          profit,
          confidence: positions[symbol].avgConfidence
        });

        positions[symbol].quantity -= quantity;
        positions[symbol].totalCost -= costBasis;
      }
    });

    return trades;
  }

  private calculateAIPerformance(transactions: Transaction[]) {
    const aiTransactions = transactions.filter(t => t.aiRecommendation);
    if (aiTransactions.length === 0) {
      return {
        aiRecommendationAccuracy: 0,
        avgConfidenceOfWinningTrades: 0,
        avgConfidenceOfLosingTrades: 0,
        aiRecommendationStats: {
          buySignals: 0,
          sellSignals: 0,
          avgConfidence: 0,
          successRate: 0
        }
      };
    }

    const completedTrades = this.identifyCompletedTrades(transactions);
    const aiTrades = completedTrades.filter(trade => trade.confidence !== undefined);
    const winningAiTrades = aiTrades.filter(trade => trade.profit > 0);
    const losingAiTrades = aiTrades.filter(trade => trade.profit <= 0);

    const buySignals = aiTransactions.filter(t => t.type === 'BUY').length;
    const sellSignals = aiTransactions.filter(t => t.type === 'SELL').length;
    const avgConfidence = aiTransactions.reduce((sum, t) => sum + (t.aiRecommendation?.confidence || 0), 0) / aiTransactions.length;

    return {
      aiRecommendationAccuracy: aiTrades.length > 0 ? (winningAiTrades.length / aiTrades.length) * 100 : 0,
      avgConfidenceOfWinningTrades: winningAiTrades.length > 0 ? 
        winningAiTrades.reduce((sum, trade) => sum + (trade.confidence || 0), 0) / winningAiTrades.length : 0,
      avgConfidenceOfLosingTrades: losingAiTrades.length > 0 ? 
        losingAiTrades.reduce((sum, trade) => sum + (trade.confidence || 0), 0) / losingAiTrades.length : 0,
      aiRecommendationStats: {
        buySignals,
        sellSignals,
        avgConfidence,
        successRate: aiTrades.length > 0 ? (winningAiTrades.length / aiTrades.length) * 100 : 0
      }
    };
  }

  private gradeDiversification(concentrationScore: number, sectorCount: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (sectorCount >= 8 && concentrationScore < 0.15) return 'A';
    if (sectorCount >= 6 && concentrationScore < 0.25) return 'B';
    if (sectorCount >= 4 && concentrationScore < 0.35) return 'C';
    if (sectorCount >= 3 && concentrationScore < 0.50) return 'D';
    return 'F';
  }

  private generateDiversificationRecommendations(sectors: Record<string, { allocation: number; [key: string]: unknown }>, concentrationScore: number): string[] {
    const recommendations: string[] = [];
    
    if (concentrationScore > 0.5) {
      recommendations.push("Portfolio is highly concentrated. Consider diversifying across more stocks.");
    }
    
    if (Object.keys(sectors).length < 4) {
      recommendations.push("Add holdings from additional sectors to improve diversification.");
    }
    
    const dominantSector = Object.entries(sectors).find(([, data]) => data.allocation > 0.4);
    if (dominantSector) {
      recommendations.push(`Reduce exposure to ${dominantSector[0]} sector (currently ${(dominantSector[1].allocation * 100).toFixed(1)}%).`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push("Portfolio diversification looks healthy!");
    }
    
    return recommendations;
  }
}

export const portfolioAnalyticsService = new PortfolioAnalyticsService();