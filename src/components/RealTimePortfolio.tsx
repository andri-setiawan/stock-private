'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRealTimePortfolio } from '@/hooks/useRealTimePortfolio';
import { usePortfolioStore } from '@/store/portfolio';
import ClientOnly from './ClientOnly';
import { formatCurrency } from '@/utils/formatters';

interface PriceChangeIndicatorProps {
  change: number;
  changePercent: number;
  size?: 'sm' | 'md' | 'lg';
}

const PriceChangeIndicator: React.FC<PriceChangeIndicatorProps> = ({ 
  change, 
  changePercent, 
  size = 'md' 
}) => {
  const isPositive = change >= 0;
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold'
  };

  return (
    <div className={`flex items-center ${sizeClasses[size]} ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      <span className="mr-1">
        {isPositive ? '↗️' : '↘️'}
      </span>
      <span>
        {isPositive ? '+' : ''}${change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
      </span>
    </div>
  );
};

interface RealTimeValueCardProps {
  title: string;
  value: number;
  change?: number;
  changePercent?: number;
  format?: 'currency' | 'percentage';
  icon?: string;
  isLoading?: boolean;
}

const RealTimeValueCard: React.FC<RealTimeValueCardProps> = ({
  title,
  value,
  change,
  changePercent,
  format = 'currency',
  icon,
  isLoading = false
}) => {
  const formatValue = (val: number) => {
    if (format === 'currency') {
      return formatCurrency(val);
    }
    return `${val.toFixed(2)}%`;
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {icon && <span className="text-lg">{icon}</span>}
        {isLoading && (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">
        {formatValue(value)}
      </div>
      {change !== undefined && changePercent !== undefined && (
        <PriceChangeIndicator change={change} changePercent={changePercent} size="sm" />
      )}
    </div>
  );
};

interface LiveHoldingRowProps {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  change: number;
  changePercent: number;
  totalValue: number;
  profitLoss: number;
  profitLossPercent: number;
  isUpdating?: boolean;
}

const LiveHoldingRow: React.FC<LiveHoldingRowProps> = ({
  symbol,
  quantity,
  averagePrice,
  currentPrice,
  change,
  changePercent,
  totalValue,
  profitLoss,
  profitLossPercent,
  isUpdating = false
}) => {
  const [priceAnimation, setPriceAnimation] = useState(false);

  useEffect(() => {
    if (isUpdating) {
      setPriceAnimation(true);
      const timeout = setTimeout(() => setPriceAnimation(false), 1000);
      return () => clearTimeout(timeout);
    }
  }, [currentPrice, isUpdating]);

  return (
    <div className={`grid grid-cols-2 md:grid-cols-6 gap-2 p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${priceAnimation ? 'bg-blue-50' : ''}`}>
      <div className="font-medium text-gray-900 flex items-center">
        {symbol}
        {isUpdating && <span className="ml-2 text-blue-500 animate-pulse">●</span>}
      </div>
      
      <div className="text-sm text-gray-600">
        <div>Qty: {quantity}</div>
        <div className="text-xs">Avg: {formatCurrency(averagePrice)}</div>
      </div>
      
      <div className={`font-medium transition-colors ${priceAnimation ? 'text-blue-600' : 'text-gray-900'}`}>
        {formatCurrency(currentPrice)}
        <PriceChangeIndicator change={change} changePercent={changePercent} size="sm" />
      </div>
      
      <div className="font-medium text-gray-900">
        {formatCurrency(totalValue)}
      </div>
      
      <div className={`font-medium ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {profitLoss >= 0 ? '+' : '-'}{formatCurrency(Math.abs(profitLoss))}
      </div>
      
      <div className={`font-medium ${profitLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {profitLossPercent >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%
      </div>
    </div>
  );
};

const RealTimePortfolio: React.FC = () => {
  // Use proper Zustand selectors for reactive updates with dependencies
  const holdings = usePortfolioStore(state => state.holdings);
  const cashBalance = usePortfolioStore(state => state.cashBalance);
  const initialValue = usePortfolioStore(state => state.initialValue);
  const getPortfolioSummary = usePortfolioStore(state => state.getPortfolioSummary);

  // Memoize calculated values to prevent infinite loops
  const portfolioSummary = useMemo(() => {
    return getPortfolioSummary();
  }, [getPortfolioSummary]);
  
  const {
    realTimeData,
    isPolling,
    lastUpdate,
    marketStatus,
    startPolling,
    stopPolling,
    refreshPrices,
    isLoading,
    error
  } = useRealTimePortfolio({
    enablePolling: true,
    onPriceUpdate: (updates) => {
      console.log('📈 Portfolio price updates:', updates);
    },
    onError: (error) => {
      console.error('🚨 Real-time portfolio error:', error);
    }
  });
  const hasHoldings = Object.keys(holdings).length > 0;

  const handleTogglePolling = () => {
    if (isPolling) {
      stopPolling();
    } else {
      startPolling();
    }
  };

  if (!hasHoldings) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <div className="text-gray-500">
          <h3 className="text-lg font-medium mb-2">📊 Real-Time Portfolio</h3>
          <p>Start trading to see live portfolio updates</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Market Status & Controls */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{marketStatus.icon}</span>
              <div>
                <div className={`font-medium ${marketStatus.color}`}>
                  {marketStatus.status}
                </div>
                <div className="text-xs text-gray-500">{marketStatus.message}</div>
              </div>
            </div>
            
            {lastUpdate && (
              <ClientOnly fallback={<div className="text-xs text-gray-500">Last update: Loading...</div>}>
                <div className="text-xs text-gray-500">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </div>
              </ClientOnly>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={refreshPrices}
              disabled={isLoading}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 text-sm"
            >
              {isLoading ? '⟳' : '🔄'} Refresh
            </button>
            
            <button
              onClick={handleTogglePolling}
              className={`px-3 py-1 rounded-lg transition-colors text-sm ${
                isPolling 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isPolling ? '⏸️ Pause' : '▶️ Start'} Live Updates
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Real-Time Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RealTimeValueCard
          title="Total Portfolio Value"
          value={realTimeData?.totalValue || portfolioSummary.totalValue}
          change={realTimeData?.dayChange}
          changePercent={realTimeData?.dayChangePercent}
          icon="💼"
          isLoading={isLoading}
        />
        
        <RealTimeValueCard
          title="Total P&L"
          value={realTimeData ? (realTimeData.totalValue - initialValue) : portfolioSummary.totalProfitLoss}
          change={realTimeData?.dayChange}
          changePercent={realTimeData?.dayChangePercent}
          icon="📈"
        />
        
        <RealTimeValueCard
          title="Cash Balance"
          value={cashBalance}
          icon="💰"
        />
      </div>

      {/* Live Holdings Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center">
            📊 Live Holdings
            {isPolling && <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
          </h3>
          <div className="text-sm text-gray-500">
            {Object.keys(holdings).length} position{Object.keys(holdings).length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Table Header */}
        <div className="hidden md:grid md:grid-cols-6 gap-2 px-3 py-2 bg-gray-50 text-sm font-medium text-gray-500">
          <div>Symbol</div>
          <div>Quantity</div>
          <div>Live Price</div>
          <div>Value</div>
          <div>P&L ($)</div>
          <div>P&L (%)</div>
        </div>

        {/* Holdings Rows */}
        <div className="divide-y divide-gray-100">
          {Object.entries(holdings).map(([symbol, holding]) => {
            const update = realTimeData?.updates.find(u => u.symbol === symbol);
            const livePrice = realTimeData?.holdings[symbol];
            
            return (
              <LiveHoldingRow
                key={symbol}
                symbol={symbol}
                quantity={holding.quantity}
                averagePrice={holding.averagePrice}
                currentPrice={livePrice?.currentPrice || holding.currentPrice}
                change={livePrice?.change || 0}
                changePercent={livePrice?.changePercent || 0}
                totalValue={update?.holdingValue || holding.totalValue}
                profitLoss={update?.profitLoss || holding.profitLoss}
                profitLossPercent={update?.profitLossPercent || holding.profitLossPercent}
                isUpdating={isLoading || (update !== undefined)}
              />
            );
          })}
        </div>
      </div>

      {/* Real-Time Updates Log */}
      {realTimeData && realTimeData.updates.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            ⚡ Recent Price Updates
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {realTimeData.updates.slice(0, 5).map((update, index) => (
              <div key={`${update.symbol}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <div className="font-medium">{update.symbol}</div>
                <div className="flex items-center space-x-2">
                  <span>${update.oldPrice.toFixed(2)} → ${update.newPrice.toFixed(2)}</span>
                  <PriceChangeIndicator 
                    change={update.change} 
                    changePercent={update.changePercent} 
                    size="sm" 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimePortfolio;