// Automated Trading Bot Service - Core orchestration engine for AI-powered automated trading
import { aiAnalyzerService, AIRecommendation } from './aiAnalyzer';
import { indicesService } from './indices';
import { usePortfolioStore } from '@/store/portfolio';
import { riskManagerService } from './riskManager';

export interface TradingBotConfig {
  enabled: boolean;
  intervals: {
    scanning: number;    // minutes (10, 30, 60, 360, 1440)
    execution: number;   // seconds between trades (minimum 30 seconds)
  };
  aiThresholds: {
    minimumConfidence: number;     // 80%+ for auto-execution
    riskLevelsEnabled: ('LOW' | 'MEDIUM' | 'HIGH')[];  // allowed risk levels
  };
  riskManagement: {
    maxPositionSize: number;       // % of portfolio per stock (default 10%)
    maxDailyTrades: number;        // limit (default 5 trades/day)
    maxDailyAmount: number;        // dollar limit (default $1000/day)
    stopLossPercent: number;       // auto-sell at -15%
    takeProfitPercent: number;     // auto-sell at +25%
    maxPortfolioDrawdown: number;  // pause trading at -20% total loss
  };
  marketConditions: {
    tradingHoursOnly: boolean;     // only during market hours (9:30-16:00 ET)
    avoidHighVolatility: boolean;  // skip trades during high volatility
    minimumLiquidity: number;      // minimum daily volume requirement
  };
  preferences: {
    diversificationTarget: number; // target number of different holdings
    cashReservePercent: number;    // minimum cash to keep (default 10%)
    rebalancingEnabled: boolean;   // auto-rebalance portfolio
  };
}

export interface QueuedTrade {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  targetPrice: number;
  recommendation: AIRecommendation;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  createdAt: Date;
  scheduledFor: Date;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  reason?: string;
}

export interface BotDecision {
  id: string;
  timestamp: Date;
  symbol: string;
  recommendation: AIRecommendation;
  decision: 'EXECUTE_TRADE' | 'SKIP_RISK' | 'SKIP_CONFIDENCE' | 'SKIP_LIMITS' | 'SKIP_MARKET_CONDITIONS';
  reason: string;
  tradeExecuted: boolean;
  tradeId?: string;
}

export interface BotPerformance {
  totalAutomatedTrades: number;
  successfulTrades: number;
  failedTrades: number;
  successRate: number;
  totalProfitLoss: number;
  bestTrade?: QueuedTrade;
  worstTrade?: QueuedTrade;
  averageHoldingPeriod: number; // days
  sharpeRatio?: number;
}

export interface BotStatus {
  status: 'RUNNING' | 'PAUSED' | 'STOPPED' | 'ERROR';
  isMonitoring: boolean;
  lastScan: Date | null;
  nextScan: Date | null;
  uptime: number; // seconds
  errorMessage?: string;
  currentActivity: {
    scanning: boolean;
    executing: boolean;
    pendingTrades: number;
    todayTradesCount: number;
    todayTradeAmount: number;
  };
}

class TradingBotService {
  private config: TradingBotConfig;
  private status: BotStatus['status'] = 'STOPPED';
  private isMonitoring = false;
  private scanningInterval?: NodeJS.Timeout;
  private executionQueue: QueuedTrade[] = [];
  private decisions: BotDecision[] = [];
  private performance: BotPerformance;
  private startTime?: Date;
  private lastScan?: Date;
  private errorMessage?: string;

  constructor() {
    this.config = this.getDefaultConfig();
    this.performance = this.getInitialPerformance();
    this.loadConfigFromStorage();
    this.loadDataFromStorage();
  }

  private getDefaultConfig(): TradingBotConfig {
    return {
      enabled: false, // Disabled by default for safety
      intervals: {
        scanning: 30,    // 30 minutes
        execution: 60,   // 60 seconds between trades
      },
      aiThresholds: {
        minimumConfidence: 80,
        riskLevelsEnabled: ['LOW', 'MEDIUM'], // Conservative by default
      },
      riskManagement: {
        maxPositionSize: 10,     // 10% max per stock
        maxDailyTrades: 5,       // 5 trades per day max
        maxDailyAmount: 1000,    // $1000 per day max
        stopLossPercent: 15,     // -15% stop loss
        takeProfitPercent: 25,   // +25% take profit
        maxPortfolioDrawdown: 20, // -20% total portfolio loss
      },
      marketConditions: {
        tradingHoursOnly: true,
        avoidHighVolatility: true,
        minimumLiquidity: 100000, // $100k daily volume minimum
      },
      preferences: {
        diversificationTarget: 8,  // Target 8 different stocks
        cashReservePercent: 15,    // Keep 15% cash
        rebalancingEnabled: true,
      },
    };
  }

  private getInitialPerformance(): BotPerformance {
    return {
      totalAutomatedTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      successRate: 0,
      totalProfitLoss: 0,
      averageHoldingPeriod: 0,
    };
  }

  // Market hours validation (9:30 AM - 4:00 PM ET)
  private isMarketHours(): boolean {
    const now = new Date();
    const etTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hour = etTime.getHours();
    const minute = etTime.getMinutes();
    const currentTime = hour * 100 + minute;
    
    // Market open: 9:30 AM (930), Market close: 4:00 PM (1600)
    const marketOpen = 930;
    const marketClose = 1600;
    
    // Check if it's a weekday (Monday = 1, Friday = 5)
    const dayOfWeek = etTime.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    
    return isWeekday && currentTime >= marketOpen && currentTime <= marketClose;
  }

  private getTodayTradesCount(): number {
    const today = new Date().toDateString();
    return this.decisions.filter(decision => 
      decision.timestamp.toDateString() === today && 
      decision.tradeExecuted
    ).length;
  }

  private getTodayTradeAmount(): number {
    const today = new Date().toDateString();
    return this.executionQueue
      .filter(trade => 
        trade.createdAt.toDateString() === today && 
        trade.status === 'COMPLETED'
      )
      .reduce((sum, trade) => sum + (trade.quantity * trade.targetPrice), 0);
  }

  private checkPortfolioDrawdown(): boolean {
    const portfolio = usePortfolioStore.getState();
    const summary = portfolio.getPortfolioSummary();
    const drawdownPercent = Math.abs(summary.totalProfitLossPercent);
    
    return drawdownPercent <= this.config.riskManagement.maxPortfolioDrawdown;
  }

  private generateTradeId(): string {
    return `bot_trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDecisionId(): string {
    return `bot_decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Main bot orchestration methods
  async startBot(): Promise<boolean> {
    try {
      if (!this.config.enabled) {
        this.errorMessage = 'Bot is disabled in configuration';
        return false;
      }

      if (this.isMonitoring) {
        console.log('🤖 Trading bot is already running');
        return true;
      }

      this.status = 'RUNNING';
      this.isMonitoring = true;
      this.startTime = new Date();
      this.errorMessage = undefined;

      console.log(`🤖 Trading Bot started - scanning every ${this.config.intervals.scanning} minutes`);
      
      // Start initial scan
      await this.performScan();
      
      // Set up periodic scanning
      this.scanningInterval = setInterval(async () => {
        try {
          await this.performScan();
        } catch (error) {
          console.error('🤖 Error during scheduled scan:', error);
          this.logError('Scheduled scan failed', error);
        }
      }, this.config.intervals.scanning * 60 * 1000);

      return true;
    } catch (error) {
      console.error('🤖 Failed to start trading bot:', error);
      this.logError('Bot startup failed', error);
      this.status = 'ERROR';
      return false;
    }
  }

  stopBot(): void {
    this.isMonitoring = false;
    this.status = 'STOPPED';
    
    if (this.scanningInterval) {
      clearInterval(this.scanningInterval);
      this.scanningInterval = undefined;
    }

    // Cancel pending trades
    this.executionQueue.forEach(trade => {
      if (trade.status === 'PENDING') {
        trade.status = 'CANCELLED';
        trade.reason = 'Bot stopped by user';
      }
    });

    console.log('🤖 Trading Bot stopped');
  }

  pauseBot(): void {
    this.status = 'PAUSED';
    
    if (this.scanningInterval) {
      clearInterval(this.scanningInterval);
      this.scanningInterval = undefined;
    }

    console.log('🤖 Trading Bot paused');
  }

  emergencyStop(): void {
    this.stopBot();
    
    // Cancel all pending trades immediately
    this.executionQueue = this.executionQueue.map(trade => ({
      ...trade,
      status: 'CANCELLED' as const,
      reason: 'Emergency stop activated'
    }));

    this.status = 'STOPPED';
    console.log('🚨 EMERGENCY STOP - All trading halted');
  }

  private async performScan(): Promise<void> {
    if (this.status !== 'RUNNING') return;

    try {
      this.lastScan = new Date();
      console.log('🤖 Starting market scan...');

      // Emergency stop check
      const emergencyCheck = riskManagerService.isEmergencyStopRequired();
      if (emergencyCheck.required) {
        console.log(`🚨 Emergency stop triggered: ${emergencyCheck.reason}`);
        this.emergencyStop();
        return;
      }

      // Check market conditions
      if (this.config.marketConditions.tradingHoursOnly && !this.isMarketHours()) {
        console.log('🤖 Outside market hours - skipping scan');
        return;
      }

      // Check portfolio drawdown protection
      if (!this.checkPortfolioDrawdown()) {
        console.log('🤖 Portfolio drawdown limit exceeded - pausing trading');
        this.pauseBot();
        return;
      }

      // Check daily limits
      const todayTrades = this.getTodayTradesCount();
      const todayAmount = this.getTodayTradeAmount();

      if (todayTrades >= this.config.riskManagement.maxDailyTrades) {
        console.log('🤖 Daily trade limit reached - skipping scan');
        return;
      }

      if (todayAmount >= this.config.riskManagement.maxDailyAmount) {
        console.log('🤖 Daily amount limit reached - skipping scan');
        return;
      }

      // Check stop loss/take profit targets
      const stopLossTargets = riskManagerService.checkStopLossTargets(this.config);
      for (const target of stopLossTargets) {
        if (target.shouldExecute) {
          await this.executeStopLossTarget(target);
        }
      }

      // Get top stocks for analysis
      const topStocks = await indicesService.getTopPerformersAcrossIndices(30);
      const marketAnalysis = await aiAnalyzerService.generateDailyRecommendations(topStocks);

      console.log(`🤖 Analyzing ${marketAnalysis.recommendations.length} recommendations`);

      // Process each recommendation
      for (const recommendation of marketAnalysis.recommendations) {
        await this.processRecommendation(recommendation);
      }

      // Execute queued trades
      await this.executeQueuedTrades();

      console.log(`🤖 Scan completed - ${this.executionQueue.filter(t => t.status === 'PENDING').length} trades queued`);

    } catch (error) {
      console.error('🤖 Error during market scan:', error);
      this.logError('Market scan failed', error);
    }
  }

  private async processRecommendation(recommendation: AIRecommendation): Promise<void> {
    const decisionId = this.generateDecisionId();
    
    // Check confidence threshold
    if (recommendation.confidence < this.config.aiThresholds.minimumConfidence) {
      this.logDecision(decisionId, recommendation, 'SKIP_CONFIDENCE', 
        `Confidence ${recommendation.confidence}% below threshold ${this.config.aiThresholds.minimumConfidence}%`);
      return;
    }

    // Check risk level
    if (!this.config.aiThresholds.riskLevelsEnabled.includes(recommendation.riskLevel)) {
      this.logDecision(decisionId, recommendation, 'SKIP_RISK', 
        `Risk level ${recommendation.riskLevel} not enabled`);
      return;
    }

    // Skip HOLD recommendations for automated trading
    if (recommendation.action === 'HOLD') {
      this.logDecision(decisionId, recommendation, 'SKIP_RISK', 
        'HOLD recommendations not executed automatically');
      return;
    }

    // Calculate position size and validate trade
    const portfolio = usePortfolioStore.getState();
    const summary = portfolio.getPortfolioSummary();
    
    if (recommendation.action === 'BUY') {
      // Use risk manager for position sizing
      const positionSizing = riskManagerService.getPositionSizingRecommendation(
        recommendation.symbol,
        recommendation.currentPrice,
        recommendation.confidence,
        recommendation.riskLevel,
        this.config
      );

      // Assess trade risk
      const riskAssessment = riskManagerService.assessTradeRisk(
        recommendation.symbol,
        'BUY',
        positionSizing.quantity,
        recommendation.currentPrice,
        recommendation,
        this.config
      );

      if (!riskAssessment.approved) {
        this.logDecision(decisionId, recommendation, 'SKIP_RISK', 
          `Risk assessment failed: ${riskAssessment.reason}`);
        return;
      }

      if (positionSizing.quantity === 0) {
        this.logDecision(decisionId, recommendation, 'SKIP_LIMITS', 
          `Position sizing resulted in 0 shares: ${positionSizing.reasoning}`);
        return;
      }

      // Queue the buy trade
      const trade: QueuedTrade = {
        id: this.generateTradeId(),
        symbol: recommendation.symbol,
        action: 'BUY',
        quantity: positionSizing.quantity,
        targetPrice: recommendation.currentPrice,
        recommendation,
        priority: this.getTradePriority(recommendation.confidence),
        createdAt: new Date(),
        scheduledFor: new Date(Date.now() + this.config.intervals.execution * 1000),
        status: 'PENDING'
      };

      this.executionQueue.push(trade);
      this.logDecision(decisionId, recommendation, 'EXECUTE_TRADE', 
        `Queued BUY ${positionSizing.quantity} shares at $${recommendation.currentPrice} (${positionSizing.reasoning})`);

    } else if (recommendation.action === 'SELL') {
      const holding = portfolio.holdings[recommendation.symbol];
      
      if (!holding || holding.quantity === 0) {
        this.logDecision(decisionId, recommendation, 'SKIP_LIMITS', 
          `No shares to sell for ${recommendation.symbol}`);
        return;
      }

      // Assess sell trade risk
      const riskAssessment = riskManagerService.assessTradeRisk(
        recommendation.symbol,
        'SELL',
        holding.quantity,
        recommendation.currentPrice,
        recommendation,
        this.config
      );

      // Queue the sell trade (even if risk assessment has warnings)
      const trade: QueuedTrade = {
        id: this.generateTradeId(),
        symbol: recommendation.symbol,
        action: 'SELL',
        quantity: holding.quantity,
        targetPrice: recommendation.currentPrice,
        recommendation,
        priority: this.getTradePriority(recommendation.confidence),
        createdAt: new Date(),
        scheduledFor: new Date(Date.now() + this.config.intervals.execution * 1000),
        status: 'PENDING'
      };

      this.executionQueue.push(trade);
      this.logDecision(decisionId, recommendation, 'EXECUTE_TRADE', 
        `Queued SELL ${holding.quantity} shares at $${recommendation.currentPrice}${
          riskAssessment.severity !== 'LOW' ? ` (Warning: ${riskAssessment.reason})` : ''
        }`);
    }
  }

  private getTradePriority(confidence: number): QueuedTrade['priority'] {
    if (confidence >= 95) return 'URGENT';
    if (confidence >= 90) return 'HIGH';
    if (confidence >= 85) return 'MEDIUM';
    return 'LOW';
  }

  private async executeStopLossTarget(target: any): Promise<void> {
    try {
      console.log(`🎯 Executing ${target.type} for ${target.symbol} at $${target.currentPrice}`);
      
      // Create immediate trade execution
      const trade: QueuedTrade = {
        id: this.generateTradeId(),
        symbol: target.symbol,
        action: 'SELL',
        quantity: target.quantity,
        targetPrice: target.currentPrice,
        recommendation: {
          symbol: target.symbol,
          name: target.symbol,
          action: 'SELL',
          confidence: 100, // High confidence for stop loss/take profit
          reasoning: `Automated ${target.type.replace('_', ' ')} execution`,
          riskLevel: 'LOW' as const,
          currentPrice: target.currentPrice,
          targetPrice: target.currentPrice
        },
        priority: 'URGENT',
        createdAt: new Date(),
        scheduledFor: new Date(), // Execute immediately
        status: 'PENDING'
      };

      this.executionQueue.unshift(trade); // Add to front of queue for immediate execution
      
      const decisionId = this.generateDecisionId();
      this.logDecision(decisionId, trade.recommendation, 'EXECUTE_TRADE', 
        `Automatic ${target.type} triggered for ${target.symbol}`);
        
    } catch (error) {
      console.error(`Error executing ${target.type} for ${target.symbol}:`, error);
    }
  }

  private async executeQueuedTrades(): Promise<void> {
    const pendingTrades = this.executionQueue
      .filter(trade => trade.status === 'PENDING' && trade.scheduledFor <= new Date())
      .sort((a, b) => {
        // Sort by priority and then by scheduled time
        const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.scheduledFor.getTime() - b.scheduledFor.getTime();
      });

    for (const trade of pendingTrades) {
      try {
        trade.status = 'EXECUTING';
        console.log(`🤖 Executing ${trade.action} ${trade.quantity} ${trade.symbol} at $${trade.targetPrice}`);

        const portfolio = usePortfolioStore.getState();
        const success = await portfolio.executeTrade(
          trade.symbol,
          trade.action,
          trade.quantity,
          trade.targetPrice,
          {
            action: trade.recommendation.action,
            confidence: trade.recommendation.confidence,
            reasoning: `Automated trade: ${trade.recommendation.reasoning}`
          }
        );

        if (success) {
          trade.status = 'COMPLETED';
          this.performance.totalAutomatedTrades++;
          this.performance.successfulTrades++;
          console.log(`🤖 ✅ Trade completed successfully: ${trade.action} ${trade.quantity} ${trade.symbol}`);
        } else {
          trade.status = 'FAILED';
          trade.reason = 'Portfolio execution failed';
          this.performance.failedTrades++;
          console.log(`🤖 ❌ Trade failed: ${trade.action} ${trade.quantity} ${trade.symbol}`);
        }

        // Update performance metrics
        this.updatePerformanceMetrics();

        // Add delay between trades
        if (pendingTrades.indexOf(trade) < pendingTrades.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.config.intervals.execution * 1000));
        }

      } catch (error) {
        trade.status = 'FAILED';
        trade.reason = `Execution error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        this.performance.failedTrades++;
        console.error(`🤖 Trade execution error for ${trade.symbol}:`, error);
      }
    }

    this.saveDataToStorage();
  }

  private logDecision(
    id: string, 
    recommendation: AIRecommendation, 
    decision: BotDecision['decision'], 
    reason: string
  ): void {
    this.decisions.unshift({
      id,
      timestamp: new Date(),
      symbol: recommendation.symbol,
      recommendation,
      decision,
      reason,
      tradeExecuted: decision === 'EXECUTE_TRADE'
    });

    // Keep only last 100 decisions
    if (this.decisions.length > 100) {
      this.decisions = this.decisions.slice(0, 100);
    }
  }

  private logError(message: string, error: unknown): void {
    this.errorMessage = `${message}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    this.status = 'ERROR';
    console.error(`🤖 Bot Error: ${this.errorMessage}`);
  }

  private updatePerformanceMetrics(): void {
    if (this.performance.totalAutomatedTrades > 0) {
      this.performance.successRate = (this.performance.successfulTrades / this.performance.totalAutomatedTrades) * 100;
    }

    // Calculate total P&L from completed automated trades
    const completedTrades = this.executionQueue.filter(trade => trade.status === 'COMPLETED');
    // This would need more sophisticated P&L calculation based on actual portfolio performance
    // For now, we'll use a simplified calculation
  }

  // Public API methods
  getStatus(): BotStatus {
    const uptime = this.startTime ? (Date.now() - this.startTime.getTime()) / 1000 : 0;
    
    return {
      status: this.status,
      isMonitoring: this.isMonitoring,
      lastScan: this.lastScan || null,
      nextScan: this.scanningInterval && this.isMonitoring 
        ? new Date(Date.now() + this.config.intervals.scanning * 60 * 1000) 
        : null,
      uptime,
      errorMessage: this.errorMessage,
      currentActivity: {
        scanning: false, // Would be true during active scan
        executing: this.executionQueue.some(trade => trade.status === 'EXECUTING'),
        pendingTrades: this.executionQueue.filter(trade => trade.status === 'PENDING').length,
        todayTradesCount: this.getTodayTradesCount(),
        todayTradeAmount: this.getTodayTradeAmount(),
      }
    };
  }

  getConfig(): TradingBotConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<TradingBotConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfigToStorage();

    // Restart if configuration changes and bot is running
    if (this.isMonitoring) {
      console.log('🤖 Configuration updated - restarting bot with new settings');
      this.stopBot();
      if (this.config.enabled) {
        setTimeout(() => this.startBot(), 1000);
      }
    }
  }

  getExecutionQueue(): QueuedTrade[] {
    return [...this.executionQueue].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getDecisions(limit = 50): BotDecision[] {
    return this.decisions.slice(0, limit);
  }

  getPerformance(): BotPerformance {
    return { ...this.performance };
  }

  // Storage methods
  private saveConfigToStorage(): void {
    try {
      localStorage.setItem('trading_bot_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Error saving bot config:', error);
    }
  }

  private loadConfigFromStorage(): void {
    try {
      const stored = localStorage.getItem('trading_bot_config');
      if (stored) {
        this.config = { ...this.getDefaultConfig(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading bot config:', error);
    }
  }

  private saveDataToStorage(): void {
    try {
      const data = {
        executionQueue: this.executionQueue,
        decisions: this.decisions,
        performance: this.performance
      };
      localStorage.setItem('trading_bot_data', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving bot data:', error);
    }
  }

  private loadDataFromStorage(): void {
    try {
      const stored = localStorage.getItem('trading_bot_data');
      if (stored) {
        const data = JSON.parse(stored);
        this.executionQueue = data.executionQueue || [];
        this.decisions = data.decisions || [];
        this.performance = { ...this.getInitialPerformance(), ...data.performance };
      }
    } catch (error) {
      console.error('Error loading bot data:', error);
    }
  }

  // Cleanup old data
  cleanupOldData(): void {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Clean up old trades and decisions
    this.executionQueue = this.executionQueue.filter(trade => 
      trade.createdAt > thirtyDaysAgo
    );

    this.decisions = this.decisions.filter(decision => 
      decision.timestamp > thirtyDaysAgo
    );

    this.saveDataToStorage();
  }
}

export const tradingBotService = new TradingBotService();

// Auto-cleanup on service load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    tradingBotService.cleanupOldData();
  }, 5000);
}