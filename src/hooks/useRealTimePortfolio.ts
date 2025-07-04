// React hook for real-time portfolio updates
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePortfolioStore } from '@/store/portfolio';
import { realTimePriceService, RealTimePortfolioData, PortfolioUpdate } from '@/services/realTimePrice';

export interface UseRealTimePortfolioOptions {
  enablePolling?: boolean;
  pollingInterval?: number;
  onPriceUpdate?: (updates: PortfolioUpdate[]) => void;
  onError?: (error: Error) => void;
}

export interface UseRealTimePortfolioReturn {
  realTimeData: RealTimePortfolioData | null;
  isPolling: boolean;
  lastUpdate: Date | null;
  marketStatus: {
    status: string;
    color: string;
    icon: string;
    message: string;
  };
  startPolling: () => void;
  stopPolling: () => void;
  refreshPrices: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const useRealTimePortfolio = (
  options: UseRealTimePortfolioOptions = {}
): UseRealTimePortfolioReturn => {
  const {
    enablePolling = true,
    onPriceUpdate,
    onError
  } = options;

  const portfolioStore = usePortfolioStore();
  const { holdings, cashBalance, updateAllHoldings } = portfolioStore;

  const [realTimeData, setRealTimeData] = useState<RealTimePortfolioData | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  /**
   * Calculate and update real-time portfolio data
   */
  const updateRealTimeData = useCallback(() => {
    if (!mountedRef.current) return;

    try {
      const data = realTimePriceService.calculatePortfolioData(holdings, cashBalance);
      setRealTimeData(data);
      setLastUpdate(data.lastUpdated);
      setError(null);

      // Trigger price update callback
      if (onPriceUpdate && data.updates.length > 0) {
        onPriceUpdate(data.updates);
      }

      // Update portfolio store with new prices
      if (data.updates.length > 0) {
        const priceUpdates: Record<string, number> = {};
        data.updates.forEach(update => {
          priceUpdates[update.symbol] = update.newPrice;
        });
        updateAllHoldings(priceUpdates);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update portfolio data';
      setError(errorMessage);
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    }
  }, [holdings, cashBalance, onPriceUpdate, onError, updateAllHoldings]);

  /**
   * Start real-time polling
   */
  const startPolling = useCallback(async () => {
    if (!mountedRef.current) return;

    const symbols = Object.keys(holdings);
    if (symbols.length === 0) {
      setIsPolling(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🚀 Starting real-time polling for portfolio');
      await realTimePriceService.startPolling(symbols);
      setIsPolling(true);

      // Initial data calculation
      updateRealTimeData();

      // Set up periodic updates to reflect new price data
      const updateInterval = setInterval(() => {
        if (mountedRef.current) {
          updateRealTimeData();
        }
      }, 5000); // Update UI every 5 seconds

      updateTimeoutRef.current = updateInterval;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start real-time polling';
      setError(errorMessage);
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      setIsLoading(false);
    }
  }, [holdings, updateRealTimeData, onError]);

  /**
   * Stop real-time polling
   */
  const stopPolling = useCallback(() => {
    console.log('⏹️ Stopping real-time polling');
    realTimePriceService.stopPolling();
    setIsPolling(false);

    if (updateTimeoutRef.current) {
      clearInterval(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
  }, []);

  /**
   * Manually refresh prices
   */
  const refreshPrices = useCallback(async () => {
    if (!mountedRef.current) return;

    const symbols = Object.keys(holdings);
    if (symbols.length === 0) return;

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 Manually refreshing prices');
      await realTimePriceService.refreshPrices(symbols);
      updateRealTimeData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh prices';
      setError(errorMessage);
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      setIsLoading(false);
    }
  }, [holdings, updateRealTimeData, onError]);

  /**
   * Get market status information
   */
  const marketStatus = realTimePriceService.getMarketStatusInfo();

  /**
   * Effect to handle auto-start polling when holdings change
   */
  useEffect(() => {
    if (!enablePolling) return;

    const symbols = Object.keys(holdings);
    
    if (symbols.length > 0 && !isPolling) {
      startPolling();
    } else if (symbols.length === 0 && isPolling) {
      stopPolling();
    }
  }, [holdings, enablePolling, isPolling, startPolling, stopPolling]);

  /**
   * Effect to update real-time data when holdings change
   */
  useEffect(() => {
    if (Object.keys(holdings).length > 0) {
      updateRealTimeData();
    }
  }, [holdings, cashBalance, updateRealTimeData]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopPolling();
      if (updateTimeoutRef.current) {
        clearInterval(updateTimeoutRef.current);
      }
    };
  }, [stopPolling]);

  return {
    realTimeData,
    isPolling,
    lastUpdate,
    marketStatus,
    startPolling,
    stopPolling,
    refreshPrices,
    isLoading,
    error
  };
};