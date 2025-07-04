import { 
  AdvancedOrder, 
  OrderExecutionResult, 
  StopLossOrder, 
  TakeProfitOrder, 
  TrailingStopOrder, 
  OCOOrder,
  MarketOrder,
  PositionSettings,
  RiskManagement,
  MarketCondition 
} from '@/types/orders';
import { usePortfolioStore } from '@/store/portfolio';
import { finnhubService } from '@/services/finnhub';

class OrderManagerService {
  private activeOrders: Map<string, AdvancedOrder> = new Map();
  private orderHistory: AdvancedOrder[] = [];
  private settings: PositionSettings;
  private riskSettings: RiskManagement;
  private marketCondition: MarketCondition;

  constructor() {
    // Default settings - can be configured via UI
    this.settings = {
      stopLossPercentage: 8, // 8% stop loss
      takeProfitPercentage: 15, // 15% take profit
      useTrailingStop: true,
      trailingStopPercentage: 5, // 5% trailing stop
      maxPositionSize: 10, // Max 10% of portfolio per position
      riskPerTrade: 2, // Max 2% risk per trade
    };

    this.riskSettings = {
      maxDrawdown: 15, // 15% max drawdown
      dailyLossLimit: 500, // $500 daily loss limit
      maxConsecutiveLosses: 3, // Stop after 3 consecutive losses
      correlationLimit: 0.7, // Max 70% correlation between positions
      sectorExposureLimit: {
        'Technology': 30,
        'Healthcare': 25,
        'Financial': 20,
        'Energy': 15,
        'Consumer': 20,
        'Industrial': 15,
        'Utilities': 10,
      },
      portfolioStopLoss: 20, // Emergency stop at 20% portfolio loss
    };

    this.marketCondition = {
      volatilityRegime: 'MEDIUM',
      trendRegime: 'BULL',
      liquidityCondition: 'HIGH',
      adjustments: {
        positionSizeMultiplier: 1.0,
        stopLossWidening: 0,
        profitTargetAdjustment: 0,
      },
    };

    // Start monitoring active orders
    this.startOrderMonitoring();
  }

  // Create a stop-loss order
  createStopLossOrder(
    symbol: string,
    quantity: number,
    entryPrice: number,
    stopLossPercentage?: number
  ): StopLossOrder {
    const stopPercentage = stopLossPercentage || this.settings.stopLossPercentage;
    const stopPrice = entryPrice * (1 - stopPercentage / 100);
    const triggerPrice = stopPrice * 1.005; // Trigger slightly above stop price

    return {
      id: this.generateOrderId(),
      symbol,
      type: 'STOP_LOSS',
      status: 'ACTIVE',
      quantity,
      side: 'SELL',
      stopPrice,
      triggerPrice,
      percentage: stopPercentage,
      createdAt: new Date(),
    };
  }

  // Create a take-profit order with multiple levels
  createTakeProfitOrder(
    symbol: string,
    quantity: number,
    entryPrice: number,
    takeProfitPercentage?: number,
    multiLevel: boolean = true
  ): TakeProfitOrder | TakeProfitOrder[] {
    const profitPercentage = takeProfitPercentage || this.settings.takeProfitPercentage;

    if (multiLevel) {
      // Create multiple take-profit levels
      return [
        {
          id: this.generateOrderId(),
          symbol,
          type: 'TAKE_PROFIT',
          status: 'ACTIVE',
          quantity: Math.floor(quantity * 0.33), // 33% at first level
          side: 'SELL',
          targetPrice: entryPrice * (1 + (profitPercentage * 0.6) / 100), // 60% of target
          profitPercentage: profitPercentage * 0.6,
          createdAt: new Date(),
        },
        {
          id: this.generateOrderId(),
          symbol,
          type: 'TAKE_PROFIT',
          status: 'ACTIVE',
          quantity: Math.floor(quantity * 0.33), // 33% at second level
          side: 'SELL',
          targetPrice: entryPrice * (1 + profitPercentage / 100), // Full target
          profitPercentage: profitPercentage,
          createdAt: new Date(),
        },
        {
          id: this.generateOrderId(),
          symbol,
          type: 'TAKE_PROFIT',
          status: 'ACTIVE',
          quantity: quantity - Math.floor(quantity * 0.66), // Remaining shares
          side: 'SELL',
          targetPrice: entryPrice * (1 + (profitPercentage * 1.5) / 100), // 150% of target
          profitPercentage: profitPercentage * 1.5,
          createdAt: new Date(),
        },
      ];
    }

    return {
      id: this.generateOrderId(),
      symbol,
      type: 'TAKE_PROFIT',
      status: 'ACTIVE',
      quantity,
      side: 'SELL',
      targetPrice: entryPrice * (1 + profitPercentage / 100),
      profitPercentage,
      createdAt: new Date(),
    };
  }

  // Create a trailing stop order
  createTrailingStopOrder(
    symbol: string,
    quantity: number,
    currentPrice: number,
    trailPercentage?: number
  ): TrailingStopOrder {
    const trailPercent = trailPercentage || this.settings.trailingStopPercentage;
    const trailAmount = currentPrice * (trailPercent / 100);

    return {
      id: this.generateOrderId(),
      symbol,
      type: 'TRAILING_STOP',
      status: 'ACTIVE',
      quantity,
      side: 'SELL',
      trailAmount: trailAmount,
      trailType: 'PERCENTAGE',
      highWaterMark: currentPrice,
      currentStopPrice: currentPrice - trailAmount,
      createdAt: new Date(),
    };
  }

  // Create an OCO (One-Cancels-Other) order
  createOCOOrder(
    symbol: string,
    quantity: number,
    entryPrice: number
  ): OCOOrder {
    const stopLoss = this.createStopLossOrder(symbol, quantity, entryPrice);
    const takeProfit = this.createTakeProfitOrder(symbol, quantity, entryPrice) as TakeProfitOrder;

    return {
      id: this.generateOrderId(),
      symbol,
      type: 'OCO',
      status: 'ACTIVE',
      quantity,
      stopLossOrder: stopLoss,
      takeProfitOrder: takeProfit,
      createdAt: new Date(),
    };
  }

  // Calculate optimal position size based on risk management
  calculateOptimalPositionSize(
    symbol: string,
    currentPrice: number,
    confidence: number,
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
    portfolioValue: number,
    availableCash: number
  ): {
    recommendedShares: number;
    positionValue: number;
    riskAmount: number;
    positionSizeRatio: number;
  } {
    // Base position size as percentage of portfolio
    const basePositionPercent = this.settings.maxPositionSize;

    // Adjust based on confidence (higher confidence = larger position)
    const confidenceMultiplier = Math.min(confidence / 80, 1.5); // Max 1.5x for 80%+ confidence
    
    // Adjust based on risk level
    const riskMultiplier = {
      'LOW': 1.2,
      'MEDIUM': 1.0,
      'HIGH': 0.7
    }[riskLevel];

    // Adjust based on market conditions
    const marketMultiplier = this.marketCondition.adjustments.positionSizeMultiplier;

    // Calculate final position percentage
    const finalPositionPercent = Math.min(
      basePositionPercent * confidenceMultiplier * riskMultiplier * marketMultiplier,
      this.settings.maxPositionSize
    );

    // Calculate position value and shares
    const positionValue = Math.min(
      portfolioValue * (finalPositionPercent / 100),
      availableCash * 0.95 // Leave 5% cash buffer
    );

    const recommendedShares = Math.floor(positionValue / currentPrice);
    const actualPositionValue = recommendedShares * currentPrice;
    const positionSizeRatio = (actualPositionValue / portfolioValue) * 100;

    // Calculate risk amount (amount that could be lost with stop-loss)
    const stopLossPrice = currentPrice * (1 - this.settings.stopLossPercentage / 100);
    const riskAmount = recommendedShares * (currentPrice - stopLossPrice);

    return {
      recommendedShares,
      positionValue: actualPositionValue,
      riskAmount,
      positionSizeRatio,
    };
  }

  // Execute an order
  async executeOrder(order: AdvancedOrder): Promise<OrderExecutionResult> {
    try {
      const portfolioStore = usePortfolioStore.getState();
      
      if (order.type === 'MARKET') {
        // Execute market order immediately
        const marketOrder = order as MarketOrder;
        const success = await portfolioStore.executeTrade(
          order.symbol,
          marketOrder.side,
          order.quantity,
          marketOrder.price
        );

        if (success) {
          order.status = 'TRIGGERED';
          order.triggeredAt = new Date();
          this.orderHistory.push(order);
          
          return {
            success: true,
            orderId: order.id,
            executedPrice: marketOrder.price,
            executedQuantity: order.quantity,
            executedAt: new Date(),
          };
        }
      }

      return {
        success: false,
        orderId: order.id,
        reason: 'Order execution failed',
      };
    } catch (error) {
      console.error('Order execution error:', error);
      return {
        success: false,
        orderId: order.id,
        reason: 'Order execution error',
      };
    }
  }

  // Monitor active orders for triggers
  private async startOrderMonitoring() {
    setInterval(async () => {
      await this.checkOrderTriggers();
    }, 30000); // Check every 30 seconds
  }

  private async checkOrderTriggers() {
    for (const [orderId, order] of this.activeOrders) {
      try {
        const currentPrice = await this.getCurrentPrice(order.symbol);
        
        if (await this.shouldTriggerOrder(order, currentPrice)) {
          await this.executeOrder(order);
          this.activeOrders.delete(orderId);
        } else if (order.type === 'TRAILING_STOP') {
          this.updateTrailingStop(order as TrailingStopOrder, currentPrice);
        }
      } catch (error) {
        console.error(`Error checking order ${orderId}:`, error);
      }
    }
  }

  private async shouldTriggerOrder(order: AdvancedOrder, currentPrice: number): Promise<boolean> {
    switch (order.type) {
      case 'STOP_LOSS':
        const stopOrder = order as StopLossOrder;
        return currentPrice <= stopOrder.triggerPrice;
        
      case 'TAKE_PROFIT':
        const profitOrder = order as TakeProfitOrder;
        return currentPrice >= profitOrder.targetPrice;
        
      case 'TRAILING_STOP':
        const trailOrder = order as TrailingStopOrder;
        return currentPrice <= trailOrder.currentStopPrice;
        
      case 'OCO':
        const ocoOrder = order as OCOOrder;
        return (
          await this.shouldTriggerOrder(ocoOrder.stopLossOrder, currentPrice) ||
          await this.shouldTriggerOrder(ocoOrder.takeProfitOrder, currentPrice)
        );
        
      default:
        return false;
    }
  }

  private updateTrailingStop(order: TrailingStopOrder, currentPrice: number) {
    if (currentPrice > order.highWaterMark) {
      order.highWaterMark = currentPrice;
      
      if (order.trailType === 'PERCENTAGE') {
        order.currentStopPrice = currentPrice * (1 - order.trailAmount / currentPrice);
      } else {
        order.currentStopPrice = currentPrice - order.trailAmount;
      }
    }
  }

  private async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const stockData = await finnhubService.getStockData(symbol);
      return stockData.currentPrice;
    } catch (error) {
      console.error(`Error getting price for ${symbol}:`, error);
      throw error;
    }
  }

  private generateOrderId(): string {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods for order management
  addOrder(order: AdvancedOrder) {
    this.activeOrders.set(order.id, order);
  }

  cancelOrder(orderId: string): boolean {
    const order = this.activeOrders.get(orderId);
    if (order) {
      order.status = 'CANCELLED';
      this.activeOrders.delete(orderId);
      this.orderHistory.push(order);
      return true;
    }
    return false;
  }

  getActiveOrders(): AdvancedOrder[] {
    return Array.from(this.activeOrders.values());
  }

  getOrderHistory(): AdvancedOrder[] {
    return this.orderHistory;
  }

  getSettings(): PositionSettings {
    return this.settings;
  }

  updateSettings(newSettings: Partial<PositionSettings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  getRiskSettings(): RiskManagement {
    return this.riskSettings;
  }

  updateRiskSettings(newSettings: Partial<RiskManagement>) {
    this.riskSettings = { ...this.riskSettings, ...newSettings };
  }

  // Portfolio protection check
  checkPortfolioProtection(portfolioValue: number, initialValue: number): {
    shouldHalt: boolean;
    reason?: string;
    drawdown: number;
  } {
    const drawdown = ((initialValue - portfolioValue) / initialValue) * 100;
    
    if (drawdown >= this.riskSettings.maxDrawdown) {
      return {
        shouldHalt: true,
        reason: `Portfolio drawdown (${drawdown.toFixed(2)}%) exceeded maximum (${this.riskSettings.maxDrawdown}%)`,
        drawdown,
      };
    }

    if (drawdown >= this.riskSettings.portfolioStopLoss) {
      return {
        shouldHalt: true,
        reason: `Emergency portfolio stop triggered at ${drawdown.toFixed(2)}% loss`,
        drawdown,
      };
    }

    return { shouldHalt: false, drawdown };
  }
}

export const orderManager = new OrderManagerService();
export default orderManager;