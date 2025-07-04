// Risk Management Service for Automated Trading Bot
import { usePortfolioStore, Holding } from '@/store/portfolio';
import { AIRecommendation } from './aiAnalyzer';
import { TradingBotConfig } from './tradingBot';

export interface RiskAssessment {
  approved: boolean;
  reason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendations: string[];
  limits: {
    maxPositionSize: number;
    maxTradeAmount: number;
    suggestedQuantity?: number;
  };
}

export interface PortfolioRisk {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  diversificationScore: number; // 0-100, higher is better
  concentrationRisk: number; // 0-100, higher is riskier
  drawdownRisk: number; // Current drawdown percentage
  liquidityRisk: number; // 0-100, based on position sizes
  correlationRisk: number; // 0-100, based on sector correlation
}

export interface StopLossTarget {
  symbol: string;
  currentPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  quantity: number;
  triggerPercent: number;
  type: 'STOP_LOSS' | 'TAKE_PROFIT';
  shouldExecute: boolean;
}

class RiskManagerService {
  private readonly MAX_POSITION_CONCENTRATION = 25; // No single stock > 25% of portfolio
  private readonly MIN_DIVERSIFICATION_STOCKS = 3; // Minimum 3 different stocks
  private readonly MAX_SECTOR_CONCENTRATION = 40; // No sector > 40% of portfolio
  private readonly VOLATILITY_THRESHOLD = 5; // Daily volatility threshold %

  // Sector mappings for diversification analysis
  private readonly SECTOR_MAPPING: Record<string, string> = {
    // Technology
    'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology', 'GOOG': 'Technology',
    'META': 'Technology', 'NVDA': 'Technology', 'TSLA': 'Technology', 'NFLX': 'Technology',
    'AMD': 'Technology', 'INTC': 'Technology', 'CRM': 'Technology', 'ORCL': 'Technology',
    
    // Finance
    'JPM': 'Finance', 'BAC': 'Finance', 'WFC': 'Finance', 'GS': 'Finance',
    'MS': 'Finance', 'C': 'Finance', 'USB': 'Finance', 'PNC': 'Finance',
    
    // Healthcare
    'UNH': 'Healthcare', 'JNJ': 'Healthcare', 'PFE': 'Healthcare', 'ABBV': 'Healthcare',
    'TMO': 'Healthcare', 'ABT': 'Healthcare', 'DHR': 'Healthcare', 'BMY': 'Healthcare',
    
    // Consumer
    'AMZN': 'Consumer', 'WMT': 'Consumer', 'HD': 'Consumer', 'PG': 'Consumer',
    'KO': 'Consumer', 'PEP': 'Consumer', 'MCD': 'Consumer', 'NKE': 'Consumer',
    
    // Energy
    'XOM': 'Energy', 'CVX': 'Energy', 'COP': 'Energy', 'SLB': 'Energy',
    
    // Industrial
    'BA': 'Industrial', 'CAT': 'Industrial', 'GE': 'Industrial', 'MMM': 'Industrial',
  };

  assessTradeRisk(
    symbol: string,
    action: 'BUY' | 'SELL',
    quantity: number,
    price: number,
    recommendation: AIRecommendation,
    config: TradingBotConfig
  ): RiskAssessment {
    const portfolio = usePortfolioStore.getState();
    const summary = portfolio.getPortfolioSummary();
    const tradeAmount = quantity * price;

    const risks: string[] = [];
    const recommendations: string[] = [];
    let severity: RiskAssessment['severity'] = 'LOW';
    let approved = true;

    // Check portfolio drawdown
    if (summary.totalProfitLossPercent < -config.riskManagement.maxPortfolioDrawdown) {
      risks.push(`Portfolio drawdown (${summary.totalProfitLossPercent.toFixed(1)}%) exceeds limit`);
      severity = 'CRITICAL';
      approved = false;
    }

    if (action === 'BUY') {
      // Position size risk
      const positionPercent = (tradeAmount / summary.totalValue) * 100;
      if (positionPercent > config.riskManagement.maxPositionSize) {
        risks.push(`Position size (${positionPercent.toFixed(1)}%) exceeds limit (${config.riskManagement.maxPositionSize}%)`);
        severity = severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
        approved = false;
      }

      // Cash reserve check
      const cashReserveNeeded = summary.totalValue * (config.preferences.cashReservePercent / 100);
      const availableCash = summary.cashBalance - cashReserveNeeded;
      
      if (tradeAmount > availableCash) {
        risks.push(`Trade would violate cash reserve requirement`);
        severity = severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
        approved = false;
      }

      // Concentration risk
      const existingHolding = portfolio.holdings[symbol];
      const newTotalValue = existingHolding ? existingHolding.totalValue + tradeAmount : tradeAmount;
      const concentrationPercent = (newTotalValue / (summary.totalValue + tradeAmount)) * 100;
      
      if (concentrationPercent > this.MAX_POSITION_CONCENTRATION) {
        risks.push(`Would create excessive concentration (${concentrationPercent.toFixed(1)}%) in ${symbol}`);
        severity = severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
        approved = false;
      }

      // Diversification check
      const currentStocks = Object.keys(portfolio.holdings).length;
      if (currentStocks === 0 && quantity * price > summary.totalValue * 0.5) {
        risks.push('First position is too large - consider diversifying');
        severity = severity === 'CRITICAL' || severity === 'HIGH' ? severity : 'MEDIUM';
        recommendations.push('Start with smaller positions to build diversification');
      }

      // AI confidence vs risk level alignment
      if (recommendation.confidence < 90 && recommendation.riskLevel === 'HIGH') {
        risks.push('High risk recommendation with moderate confidence');
        severity = severity === 'CRITICAL' || severity === 'HIGH' ? severity : 'MEDIUM';
        recommendations.push('Consider reducing position size for high-risk trades');
      }

    } else if (action === 'SELL') {
      // Check if we own the stock
      const holding = portfolio.holdings[symbol];
      if (!holding || holding.quantity < quantity) {
        risks.push(`Insufficient shares to sell (have: ${holding?.quantity || 0}, need: ${quantity})`);
        severity = 'CRITICAL';
        approved = false;
      }

      // Check if selling at a loss
      if (holding && price < holding.averagePrice * 0.9) {
        const lossPercent = ((price - holding.averagePrice) / holding.averagePrice) * 100;
        risks.push(`Selling at significant loss (${lossPercent.toFixed(1)}%)`);
        severity = severity === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM';
        recommendations.push('Consider stop-loss strategy instead of market sell');
      }
    }

    // Sector concentration analysis
    const sectorRisk = this.assessSectorConcentration(symbol, action, tradeAmount, portfolio);
    if (sectorRisk.risk) {
      risks.push(sectorRisk.message);
      if (sectorRisk.severity === 'HIGH') {
        severity = severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
      }
      recommendations.push(...sectorRisk.recommendations);
    }

    // Calculate suggested limits
    const maxAllowedPositionValue = summary.totalValue * (config.riskManagement.maxPositionSize / 100);
    const maxAllowedTradeAmount = Math.min(
      maxAllowedPositionValue,
      config.riskManagement.maxDailyAmount,
      summary.cashBalance * 0.9 // Leave some cash buffer
    );

    const suggestedQuantity = action === 'BUY' 
      ? Math.floor(maxAllowedTradeAmount / price)
      : undefined;

    return {
      approved,
      reason: risks.length > 0 ? risks.join('; ') : 'Trade meets all risk criteria',
      severity,
      recommendations,
      limits: {
        maxPositionSize: config.riskManagement.maxPositionSize,
        maxTradeAmount: maxAllowedTradeAmount,
        suggestedQuantity
      }
    };
  }

  private assessSectorConcentration(
    symbol: string, 
    action: 'BUY' | 'SELL', 
    tradeAmount: number, 
    portfolio: any
  ): { risk: boolean; message: string; severity: 'MEDIUM' | 'HIGH'; recommendations: string[] } {
    const sector = this.SECTOR_MAPPING[symbol] || 'Other';
    const summary = portfolio.getPortfolioSummary();
    
    // Calculate current sector allocation
    const sectorValues: Record<string, number> = {};
    Object.entries(portfolio.holdings).forEach(([sym, holding]: [string, Holding]) => {
      const symSector = this.SECTOR_MAPPING[sym] || 'Other';
      sectorValues[symSector] = (sectorValues[symSector] || 0) + holding.totalValue;
    });

    // Simulate the trade
    if (action === 'BUY') {
      sectorValues[sector] = (sectorValues[sector] || 0) + tradeAmount;
    } else {
      sectorValues[sector] = Math.max(0, (sectorValues[sector] || 0) - tradeAmount);
    }

    const totalValue = summary.totalValue + (action === 'BUY' ? tradeAmount : 0);
    const sectorPercent = ((sectorValues[sector] || 0) / totalValue) * 100;

    if (sectorPercent > this.MAX_SECTOR_CONCENTRATION) {
      return {
        risk: true,
        message: `Sector concentration (${sector}: ${sectorPercent.toFixed(1)}%) exceeds limit (${this.MAX_SECTOR_CONCENTRATION}%)`,
        severity: 'HIGH',
        recommendations: [
          `Consider diversifying into other sectors`,
          `Current ${sector} allocation is too high`
        ]
      };
    }

    if (sectorPercent > this.MAX_SECTOR_CONCENTRATION * 0.8) {
      return {
        risk: true,
        message: `Approaching sector concentration limit for ${sector} (${sectorPercent.toFixed(1)}%)`,
        severity: 'MEDIUM',
        recommendations: [
          `Monitor sector allocation in ${sector}`,
          `Consider other sectors for next trades`
        ]
      };
    }

    return { risk: false, message: '', severity: 'MEDIUM', recommendations: [] };
  }

  assessPortfolioRisk(): PortfolioRisk {
    const portfolio = usePortfolioStore.getState();
    const summary = portfolio.getPortfolioSummary();
    const holdings = Object.entries(portfolio.holdings);

    // Diversification score (number of holdings and balance)
    const numHoldings = holdings.length;
    let diversificationScore = Math.min((numHoldings / 10) * 50, 50); // Up to 50 points for count

    // Add points for balance between holdings
    if (holdings.length > 1) {
      const holdingValues = holdings.map(([_, holding]) => holding.totalValue);
      const avgValue = holdingValues.reduce((a, b) => a + b, 0) / holdingValues.length;
      const variance = holdingValues.reduce((acc, val) => acc + Math.pow(val - avgValue, 2), 0) / holdingValues.length;
      const coefficientOfVariation = Math.sqrt(variance) / avgValue;
      diversificationScore += Math.max(0, 50 - (coefficientOfVariation * 100)); // Up to 50 points for balance
    }

    // Concentration risk
    let maxPositionPercent = 0;
    holdings.forEach(([_, holding]) => {
      const positionPercent = (holding.totalValue / summary.investedAmount) * 100;
      maxPositionPercent = Math.max(maxPositionPercent, positionPercent);
    });
    const concentrationRisk = Math.min(maxPositionPercent, 100);

    // Drawdown risk
    const drawdownRisk = Math.abs(Math.min(summary.totalProfitLossPercent, 0));

    // Liquidity risk (based on position sizes)
    const liquidityRisk = holdings.length > 0 
      ? Math.min((summary.investedAmount / summary.totalValue) * 100, 100)
      : 0;

    // Sector correlation risk
    const sectorAllocation: Record<string, number> = {};
    holdings.forEach(([symbol, holding]) => {
      const sector = this.SECTOR_MAPPING[symbol] || 'Other';
      sectorAllocation[sector] = (sectorAllocation[sector] || 0) + holding.totalValue;
    });

    let maxSectorPercent = 0;
    Object.values(sectorAllocation).forEach(value => {
      const percent = (value / summary.investedAmount) * 100;
      maxSectorPercent = Math.max(maxSectorPercent, percent);
    });
    const correlationRisk = Math.min(maxSectorPercent, 100);

    // Overall risk assessment
    let overallRisk: PortfolioRisk['overallRisk'] = 'LOW';
    if (drawdownRisk > 15 || concentrationRisk > 30 || correlationRisk > 50 || diversificationScore < 30) {
      overallRisk = 'HIGH';
    } else if (drawdownRisk > 10 || concentrationRisk > 20 || correlationRisk > 35 || diversificationScore < 50) {
      overallRisk = 'MEDIUM';
    }

    if (drawdownRisk > 25 || concentrationRisk > 50) {
      overallRisk = 'CRITICAL';
    }

    return {
      overallRisk,
      diversificationScore: Math.round(diversificationScore),
      concentrationRisk: Math.round(concentrationRisk),
      drawdownRisk: Math.round(drawdownRisk),
      liquidityRisk: Math.round(liquidityRisk),
      correlationRisk: Math.round(correlationRisk)
    };
  }

  checkStopLossTargets(config: TradingBotConfig): StopLossTarget[] {
    const portfolio = usePortfolioStore.getState();
    const targets: StopLossTarget[] = [];

    Object.entries(portfolio.holdings).forEach(([symbol, holding]) => {
      // Stop loss check
      const stopLossPrice = holding.averagePrice * (1 - config.riskManagement.stopLossPercent / 100);
      const stopLossTriggered = holding.currentPrice <= stopLossPrice;

      if (stopLossTriggered) {
        targets.push({
          symbol,
          currentPrice: holding.currentPrice,
          stopLossPrice,
          takeProfitPrice: holding.averagePrice * (1 + config.riskManagement.takeProfitPercent / 100),
          quantity: holding.quantity,
          triggerPercent: config.riskManagement.stopLossPercent,
          type: 'STOP_LOSS',
          shouldExecute: true
        });
      }

      // Take profit check
      const takeProfitPrice = holding.averagePrice * (1 + config.riskManagement.takeProfitPercent / 100);
      const takeProfitTriggered = holding.currentPrice >= takeProfitPrice;

      if (takeProfitTriggered) {
        targets.push({
          symbol,
          currentPrice: holding.currentPrice,
          stopLossPrice,
          takeProfitPrice,
          quantity: holding.quantity,
          triggerPercent: config.riskManagement.takeProfitPercent,
          type: 'TAKE_PROFIT',
          shouldExecute: true
        });
      }
    });

    return targets;
  }

  getPositionSizingRecommendation(
    symbol: string,
    price: number,
    confidence: number,
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
    config: TradingBotConfig
  ): { quantity: number; amount: number; reasoning: string } {
    const portfolio = usePortfolioStore.getState();
    const summary = portfolio.getPortfolioSummary();

    // Base position size from configuration
    let basePositionPercent = config.riskManagement.maxPositionSize;

    // Adjust based on confidence
    if (confidence >= 95) basePositionPercent *= 1.0;      // Full position
    else if (confidence >= 90) basePositionPercent *= 0.8; // 80% of max
    else if (confidence >= 85) basePositionPercent *= 0.6; // 60% of max
    else basePositionPercent *= 0.4;                       // 40% of max

    // Adjust based on risk level
    if (riskLevel === 'HIGH') basePositionPercent *= 0.5;
    else if (riskLevel === 'MEDIUM') basePositionPercent *= 0.75;

    // Adjust based on portfolio diversification
    const numHoldings = Object.keys(portfolio.holdings).length;
    if (numHoldings < 3) basePositionPercent *= 0.6; // Smaller positions when less diversified

    // Calculate actual amount
    const maxAmount = summary.totalValue * (basePositionPercent / 100);
    const availableCash = summary.cashBalance * (1 - config.preferences.cashReservePercent / 100);
    const investmentAmount = Math.min(maxAmount, availableCash);
    
    const quantity = Math.floor(investmentAmount / price);
    const actualAmount = quantity * price;

    const reasoning = `Position sized at ${basePositionPercent.toFixed(1)}% based on ${confidence}% confidence, ${riskLevel} risk, and ${numHoldings} current holdings`;

    return {
      quantity,
      amount: actualAmount,
      reasoning
    };
  }

  // Emergency risk checks
  isEmergencyStopRequired(): { required: boolean; reason: string } {
    const portfolio = usePortfolioStore.getState();
    const summary = portfolio.getPortfolioSummary();

    // Extreme drawdown
    if (summary.totalProfitLossPercent < -30) {
      return {
        required: true,
        reason: `Extreme portfolio drawdown: ${summary.totalProfitLossPercent.toFixed(1)}%`
      };
    }

    // Portfolio risk assessment
    const portfolioRisk = this.assessPortfolioRisk();
    if (portfolioRisk.overallRisk === 'CRITICAL') {
      return {
        required: true,
        reason: 'Critical portfolio risk level detected'
      };
    }

    return { required: false, reason: 'No emergency conditions detected' };
  }
}

export const riskManagerService = new RiskManagerService();