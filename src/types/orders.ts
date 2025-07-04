// Advanced Order Types for Phase 14
export type OrderType = 'MARKET' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'TRAILING_STOP' | 'OCO';

export type OrderStatus = 'PENDING' | 'ACTIVE' | 'TRIGGERED' | 'CANCELLED' | 'EXPIRED';

export interface BaseOrder {
  id: string;
  symbol: string;
  type: OrderType;
  status: OrderStatus;
  quantity: number;
  createdAt: Date;
  triggeredAt?: Date;
  expiresAt?: Date;
  parentOrderId?: string; // For OCO orders
}

export interface MarketOrder extends BaseOrder {
  type: 'MARKET';
  side: 'BUY' | 'SELL';
  price: number;
}

export interface StopLossOrder extends BaseOrder {
  type: 'STOP_LOSS';
  side: 'SELL';
  stopPrice: number;
  triggerPrice: number;
  percentage?: number; // Stop loss percentage from entry
  timeBasedExpiry?: Date; // Auto-cancel if not triggered
}

export interface TakeProfitOrder extends BaseOrder {
  type: 'TAKE_PROFIT';
  side: 'SELL';
  targetPrice: number;
  profitPercentage: number;
  partialSell?: {
    levels: Array<{
      percentage: number; // Percentage of position to sell
      profitThreshold: number; // Profit percentage threshold
    }>;
  };
}

export interface TrailingStopOrder extends BaseOrder {
  type: 'TRAILING_STOP';
  side: 'SELL';
  trailAmount: number; // Dollar amount or percentage
  trailType: 'AMOUNT' | 'PERCENTAGE';
  highWaterMark: number; // Highest price achieved
  currentStopPrice: number;
}

export interface OCOOrder extends BaseOrder {
  type: 'OCO';
  stopLossOrder: StopLossOrder;
  takeProfitOrder: TakeProfitOrder;
}

export type AdvancedOrder = MarketOrder | StopLossOrder | TakeProfitOrder | TrailingStopOrder | OCOOrder;

// Order execution result
export interface OrderExecutionResult {
  success: boolean;
  orderId: string;
  executedPrice?: number;
  executedQuantity?: number;
  executedAt?: Date;
  fee?: number;
  reason?: string; // For failures
}

// Position management settings
export interface PositionSettings {
  stopLossPercentage: number; // Default stop loss %
  takeProfitPercentage: number; // Default take profit %
  useTrailingStop: boolean;
  trailingStopPercentage: number;
  maxPositionSize: number; // Max position size as % of portfolio
  riskPerTrade: number; // Max risk per trade as % of portfolio
}

// Risk management settings
export interface RiskManagement {
  maxDrawdown: number; // Maximum portfolio drawdown %
  dailyLossLimit: number; // Maximum daily loss amount
  maxConsecutiveLosses: number; // Stop trading after X losses
  correlationLimit: number; // Max correlation between positions
  sectorExposureLimit: Record<string, number>; // Max exposure per sector
  portfolioStopLoss: number; // Emergency portfolio stop %
}

// Market condition awareness
export interface MarketCondition {
  volatilityRegime: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  trendRegime: 'BULL' | 'BEAR' | 'SIDEWAYS';
  liquidityCondition: 'HIGH' | 'MEDIUM' | 'LOW';
  adjustments: {
    positionSizeMultiplier: number;
    stopLossWidening: number; // Percentage to widen stops
    profitTargetAdjustment: number; // Percentage to adjust targets
  };
}

// Enhanced trade recommendation with order management
export interface EnhancedTradeRecommendation {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  
  // Enhanced position management
  positionSizing: {
    recommendedShares: number;
    positionValue: number;
    riskAmount: number; // Amount at risk
    positionSizeRatio: number; // % of portfolio
  };
  
  // Automatic order suggestions
  suggestedOrders: {
    entry: MarketOrder;
    stopLoss: StopLossOrder;
    takeProfit: TakeProfitOrder | TakeProfitOrder[]; // Multiple levels
    trailing?: TrailingStopOrder;
  };
  
  // Timing recommendations
  timing: {
    immediateEntry: boolean;
    optimalEntryWindow?: {
      start: Date;
      end: Date;
    };
    avoidTimes?: Array<{
      reason: string;
      start: Date;
      end: Date;
    }>;
  };
}