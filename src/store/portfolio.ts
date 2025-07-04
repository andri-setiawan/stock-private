import { create } from 'zustand';

export interface Holding {
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  totalValue: number;
  profitLoss: number;
  profitLossPercent: number;
  lastUpdated: Date;
}

export interface Transaction {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  totalAmount: number;
  timestamp: Date;
  aiRecommendation?: {
    action: string;
    confidence: number;
    reasoning: string;
  };
}

export interface PortfolioState {
  cashBalance: number;
  totalValue: number;
  initialValue: number;
  holdings: Record<string, Holding>;
  transactions: Transaction[];
  lastUpdated: Date;
  isLoading: boolean;
  error: string | null;
}

export interface PortfolioActions {
  loadPortfolio: () => Promise<void>;
  executeTrade: (
    symbol: string,
    type: 'BUY' | 'SELL',
    quantity: number,
    price: number,
    aiRecommendation?: {
      action: string;
      confidence: number;
      reasoning: string;
    }
  ) => Promise<boolean>;
  updateHoldingPrice: (symbol: string, currentPrice: number) => Promise<void>;
  updateAllHoldings: (priceUpdates: Record<string, number>) => Promise<void>;
  getPortfolioSummary: () => {
    totalValue: number;
    totalProfitLoss: number;
    totalProfitLossPercent: number;
    cashBalance: number;
    investedAmount: number;
  };
  resetPortfolio: () => Promise<void>;
  topUpCash: (amount: number) => Promise<void>;
  getTransactionHistory: () => Transaction[];
  getHoldingsByValue: () => Array<{ symbol: string; holding: Holding }>;
}

const INITIAL_CASH = 10000;

export const usePortfolioStore = create<PortfolioState & PortfolioActions>()((set, get) => ({
  // Initial state
  cashBalance: INITIAL_CASH,
  totalValue: INITIAL_CASH,
  initialValue: INITIAL_CASH,
  holdings: {},
  transactions: [],
  lastUpdated: new Date(),
  isLoading: false,
  error: null,

  // Load portfolio from database
  loadPortfolio: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/portfolio');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load portfolio');
      }

      const portfolio = result.data;
      
      // Convert holdings array to object
      const holdingsMap: Record<string, Holding> = {};
      portfolio.holdings?.forEach((holding: {
        symbol: string;
        quantity: number;
        averagePrice: number;
        currentPrice?: number;
        totalValue?: number;
        profitLoss?: number;
        profitLossPercent?: number;
        lastUpdated?: string;
        createdAt?: string;
      }) => {
        holdingsMap[holding.symbol] = {
          quantity: holding.quantity,
          averagePrice: holding.averagePrice,
          currentPrice: holding.currentPrice || holding.averagePrice,
          totalValue: holding.totalValue || (holding.quantity * (holding.currentPrice || holding.averagePrice)),
          profitLoss: holding.profitLoss || 0,
          profitLossPercent: holding.profitLossPercent || 0,
          lastUpdated: new Date(holding.lastUpdated || holding.createdAt)
        };
      });

      set({
        cashBalance: portfolio.cashBalance,
        totalValue: portfolio.totalValue,
        initialValue: portfolio.initialValue,
        holdings: holdingsMap,
        transactions: portfolio.transactions.map((tx: {
          id: string;
          symbol: string;
          type: string;
          quantity: number;
          price: number;
          totalAmount: number;
          transactionDate?: string;
          createdAt?: string;
          aiRecommendation?: {
            action: string;
            confidence: number;
            reasoning: string;
          };
        }) => ({
          id: tx.id,
          symbol: tx.symbol,
          type: tx.type,
          quantity: tx.quantity,
          price: tx.price,
          totalAmount: tx.totalAmount,
          timestamp: new Date(tx.transactionDate || tx.createdAt),
          aiRecommendation: tx.aiRecommendation
        })),
        lastUpdated: new Date(portfolio.updatedAt),
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Failed to load portfolio:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load portfolio',
        isLoading: false 
      });
    }
  },

  // Execute trade with strict validation
  executeTrade: async (symbol, type, quantity, price, aiRecommendation) => {
    const state = get();
    const totalCost = quantity * price;

    console.log('📊 Executing trade:', { symbol, type, quantity, price, totalCost });
    console.log('📊 Current cash balance:', state.cashBalance);

    // STRICT CLIENT-SIDE VALIDATION FIRST
    if (type === 'BUY') {
      if (totalCost > state.cashBalance) {
        const errorMsg = `Insufficient funds. Need $${totalCost.toFixed(2)}, have $${state.cashBalance.toFixed(2)}`;
        console.error('❌', errorMsg);
        set({ error: errorMsg });
        return false;
      }
    } else if (type === 'SELL') {
      const holding = state.holdings[symbol];
      if (!holding || holding.quantity < quantity) {
        const errorMsg = `Insufficient shares. Need ${quantity}, have ${holding?.quantity || 0}`;
        console.error('❌', errorMsg);
        set({ error: errorMsg });
        return false;
      }
    }

    set({ isLoading: true, error: null });

    try {
      // Call the trade execution API to execute the trade
      const response = await fetch('/api/portfolio/execute-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          type,
          quantity,
          price,
          aiRecommendation
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Trade execution failed');
      }

      // Reload portfolio to get updated state
      await get().loadPortfolio();
      
      console.log('✅ Trade executed successfully');
      return true;

    } catch (error) {
      console.error('Trade execution error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Trade execution failed',
        isLoading: false 
      });
      return false;
    }
  },

  updateHoldingPrice: async (symbol, currentPrice) => {
    const state = get();
    const holding = state.holdings[symbol];
    
    if (!holding) return;

    const updatedHolding: Holding = {
      ...holding,
      currentPrice,
      totalValue: holding.quantity * currentPrice,
      profitLoss: holding.quantity * (currentPrice - holding.averagePrice),
      profitLossPercent: holding.averagePrice > 0 ? ((currentPrice - holding.averagePrice) / holding.averagePrice) * 100 : 0,
      lastUpdated: new Date(),
    };

    set({
      holdings: {
        ...state.holdings,
        [symbol]: updatedHolding,
      },
      lastUpdated: new Date(),
    });
  },

  updateAllHoldings: async (priceUpdates) => {
    const state = get();
    const updatedHoldings = { ...state.holdings };
    const holdingsToUpdate = [];
    
    Object.entries(priceUpdates).forEach(([symbol, currentPrice]) => {
      const holding = updatedHoldings[symbol];
      if (holding) {
        const updatedHolding = {
          ...holding,
          currentPrice,
          totalValue: holding.quantity * currentPrice,
          profitLoss: holding.quantity * (currentPrice - holding.averagePrice),
          profitLossPercent: holding.averagePrice > 0 ? ((currentPrice - holding.averagePrice) / holding.averagePrice) * 100 : 0,
          lastUpdated: new Date(),
        };
        
        updatedHoldings[symbol] = updatedHolding;
        
        // Prepare data for database update
        holdingsToUpdate.push({
          symbol,
          currentPrice,
          totalValue: updatedHolding.totalValue,
          profitLoss: updatedHolding.profitLoss,
          profitLossPercent: updatedHolding.profitLossPercent
        });
      }
    });

    // Calculate new total value
    const totalHoldingsValue = Object.values(updatedHoldings).reduce((sum, holding) => sum + holding.totalValue, 0);
    const newTotalValue = state.cashBalance + totalHoldingsValue;

    // Update local state immediately
    set({
      holdings: updatedHoldings,
      totalValue: newTotalValue,
      lastUpdated: new Date(),
    });

    // Update database asynchronously
    if (holdingsToUpdate.length > 0) {
      try {
        const response = await fetch('/api/portfolio/holdings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            holdings: holdingsToUpdate,
            totalValue: newTotalValue 
          }),
        });

        if (!response.ok) {
          console.error('Failed to update holdings in database:', await response.text());
        } else {
          console.log('✅ Holdings updated in database');
        }
      } catch (error) {
        console.error('Error updating holdings in database:', error);
      }
    }
  },

  getPortfolioSummary: () => {
    const state = get();
    const totalHoldingsValue = Object.values(state.holdings)
      .reduce((sum, holding) => sum + holding.totalValue, 0);
    const totalValue = state.cashBalance + totalHoldingsValue;
    const totalProfitLoss = totalValue - state.initialValue;
    const totalProfitLossPercent = state.initialValue > 0 ? (totalProfitLoss / state.initialValue) * 100 : 0;

    return {
      totalValue,
      totalProfitLoss,
      totalProfitLossPercent,
      cashBalance: state.cashBalance,
      investedAmount: totalHoldingsValue,
    };
  },

  resetPortfolio: async () => {
    set({ isLoading: true, error: null });
    try {
      // Call API to reset portfolio in database
      const response = await fetch('/api/portfolio/reset', {
        method: 'POST'
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to reset portfolio');
      }

      // Reload portfolio after reset
      await get().loadPortfolio();
      
      console.log('✅ Portfolio reset successfully');
    } catch (error) {
      console.error('Portfolio reset error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to reset portfolio',
        isLoading: false 
      });
    }
  },

  topUpCash: async (amount) => {
    if (amount <= 0) {
      set({ error: 'Top-up amount must be positive' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      // Call API to add cash
      const response = await fetch('/api/portfolio/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to top up cash');
      }

      // Reload portfolio after top-up
      await get().loadPortfolio();
      
      console.log('✅ Cash topped up successfully');
    } catch (error) {
      console.error('Top-up error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to top up cash',
        isLoading: false 
      });
    }
  },

  getTransactionHistory: () => {
    return get().transactions.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  },

  getHoldingsByValue: () => {
    const holdings = get().holdings;
    return Object.entries(holdings)
      .map(([symbol, holding]) => ({ symbol, holding }))
      .sort((a, b) => b.holding.totalValue - a.holding.totalValue);
  },
}));