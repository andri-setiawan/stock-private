'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePortfolioStore } from '@/store/portfolio';
import RealTimePortfolio from './RealTimePortfolio';

export default function PortfolioManager() {
  // Use proper Zustand selectors for reactive updates with dependencies
  const getPortfolioSummary = usePortfolioStore(state => state.getPortfolioSummary);
  const getHoldingsByValue = usePortfolioStore(state => state.getHoldingsByValue);
  const executeTrade = usePortfolioStore(state => state.executeTrade);

  // Memoize calculated values to prevent infinite loops
  const portfolioSummary = useMemo(() => {
    return getPortfolioSummary();
  }, [getPortfolioSummary]);

  const sortedHoldings = useMemo(() => {
    return getHoldingsByValue();
  }, [getHoldingsByValue]);

  const [viewMode, setViewMode] = useState<'overview' | 'realtime'>('overview');
  const [activeTradeModal, setActiveTradeModal] = useState<{ symbol: string; action: 'BUY' | 'SELL' } | null>(null);
  const [tradeQuantity, setTradeQuantity] = useState<number>(1);
  const [currentPrices, setCurrentPrices] = useState<{[symbol: string]: number}>({});

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  // Fetch current prices for holdings
  const fetchCurrentPrices = async () => {
    const symbols = sortedHoldings.map(h => h.symbol);
    if (symbols.length === 0) return;

    try {
      const prices: {[symbol: string]: number} = {};
      for (const symbol of symbols) {
        const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.NEXT_PUBLIC_FINNHUB_API_KEY}`);
        const data = await response.json();
        if (data.c) {
          prices[symbol] = data.c;
        }
      }
      setCurrentPrices(prices);
    } catch (error) {
      console.error('Error fetching current prices:', error);
    }
  };

  useEffect(() => {
    fetchCurrentPrices();
    const interval = setInterval(fetchCurrentPrices, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [sortedHoldings.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTrade = (symbol: string, action: 'BUY' | 'SELL') => {
    setActiveTradeModal({ symbol, action });
    setTradeQuantity(1);
  };

  const executeSingleTrade = async () => {
    if (!activeTradeModal) return;
    
    const currentPrice = currentPrices[activeTradeModal.symbol] || 0;
    if (currentPrice === 0) {
      alert('Unable to get current price. Please try again.');
      return;
    }

    try {
      const success = await executeTrade(
        activeTradeModal.symbol,
        activeTradeModal.action,
        tradeQuantity,
        currentPrice,
        {
          action: activeTradeModal.action,
          confidence: 75,
          reasoning: `Manual ${activeTradeModal.action.toLowerCase()} order from portfolio`
        }
      );

      if (success) {
        alert(`✅ ${activeTradeModal.action} order placed successfully for ${tradeQuantity} shares of ${activeTradeModal.symbol}`);
        setActiveTradeModal(null);
        fetchCurrentPrices(); // Refresh prices after trade
      } else {
        alert('❌ Trade execution failed. Please check your balance and try again.');
      }
    } catch (error) {
      console.error('Trade execution error:', error);
      alert('❌ Trade execution failed. Please try again.');
    }
  };

  const calculateTradeValue = () => {
    if (!activeTradeModal) return 0;
    const currentPrice = currentPrices[activeTradeModal.symbol] || 0;
    return currentPrice * tradeQuantity;
  };

  // Calculate live total P&L from individual holdings using current prices
  const calculateLiveTotalPL = useMemo(() => {
    let liveTotalValue = portfolioSummary.cashBalance;
    let liveTotalPL = 0;
    
    sortedHoldings.forEach(({ symbol, holding }) => {
      const livePrice = currentPrices[symbol] || holding.currentPrice;
      const liveProfitLoss = (livePrice - holding.averagePrice) * holding.quantity;
      const liveHoldingValue = livePrice * holding.quantity;
      
      liveTotalValue += liveHoldingValue;
      liveTotalPL += liveProfitLoss;
    });
    
    const liveTotalPLPercent = portfolioSummary.cashBalance > 0 ? (liveTotalPL / (liveTotalValue - liveTotalPL)) * 100 : 0;
    
    return {
      totalValue: liveTotalValue,
      totalProfitLoss: liveTotalPL,
      totalProfitLossPercent: liveTotalPLPercent
    };
  }, [sortedHoldings, currentPrices, portfolioSummary.cashBalance]);

  const renderOverviewMode = () => (
    <div className="space-y-4">
      {/* Portfolio Summary */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Portfolio Overview</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Total Value</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(calculateLiveTotalPL.totalValue)}
            </p>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Total P&L</p>
            <p className={`text-2xl font-bold ${
              calculateLiveTotalPL.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(calculateLiveTotalPL.totalProfitLoss)}
            </p>
            <p className={`text-sm ${
              calculateLiveTotalPL.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatPercent(calculateLiveTotalPL.totalProfitLossPercent)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Cash Available</p>
            <p className="font-semibold">{formatCurrency(portfolioSummary.cashBalance)}</p>
          </div>
          <div>
            <p className="text-gray-600">Invested Amount</p>
            <p className="font-semibold">{formatCurrency(portfolioSummary.investedAmount)}</p>
          </div>
        </div>
      </div>

      {/* Holdings */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Holdings ({sortedHoldings.length})
        </h3>
        
        {sortedHoldings.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📈</div>
            <p className="text-gray-500 mb-2">No holdings yet</p>
            <p className="text-sm text-gray-400">Start trading to build your portfolio!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedHoldings.map(({ symbol, holding }) => {
              const livePrice = currentPrices[symbol] || holding.currentPrice;
              const liveProfitLoss = (livePrice - holding.averagePrice) * holding.quantity;
              const liveProfitLossPercent = ((livePrice - holding.averagePrice) / holding.averagePrice) * 100;
              const liveTotalValue = livePrice * holding.quantity;
              
              return (
                <div
                  key={symbol}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{symbol}</h4>
                      <p className="text-sm text-gray-600">
                        {holding.quantity} shares @ {formatCurrency(holding.averagePrice)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(liveTotalValue)}</p>
                      <p className={`text-sm ${
                        liveProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(liveProfitLoss)} ({formatPercent(liveProfitLossPercent)})
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                    <span>Current: {formatCurrency(livePrice)}</span>
                    <span>
                      {((liveTotalValue / calculateLiveTotalPL.totalValue) * 100).toFixed(1)}% of portfolio
                    </span>
                  </div>

                  {/* Inline Trading Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTrade(symbol, 'BUY')}
                      className="flex-1 py-2 px-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      + Buy More
                    </button>
                    <button
                      onClick={() => handleTrade(symbol, 'SELL')}
                      className="flex-1 py-2 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      - Sell Shares
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {calculateLiveTotalPL.totalValue > 0 ? (((calculateLiveTotalPL.totalValue - portfolioSummary.cashBalance) / calculateLiveTotalPL.totalValue) * 100).toFixed(1) : '0.0'}%
            </p>
            <p className="text-sm text-gray-600">Invested</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {sortedHoldings.filter(h => h.holding.profitLoss > 0).length}
            </p>
            <p className="text-sm text-gray-600">Winning Positions</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      {/* View Mode Selector */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Portfolio Manager</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'overview'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setViewMode('realtime')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'realtime'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ⚡ Real-Time
            </button>
          </div>
        </div>
      </div>

      {/* Render selected view */}
      {viewMode === 'overview' ? renderOverviewMode() : <RealTimePortfolio />}

      {/* Trade Modal */}
      {activeTradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                {activeTradeModal.action} {activeTradeModal.symbol}
              </h3>
              <button
                onClick={() => setActiveTradeModal(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={tradeQuantity}
                  onChange={(e) => setTradeQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Current Price:</span>
                  <span>{formatCurrency(currentPrices[activeTradeModal.symbol] || 0)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>Total Value:</span>
                  <span className="font-semibold">{formatCurrency(calculateTradeValue())}</span>
                </div>
                {activeTradeModal.action === 'BUY' && (
                  <div className="flex justify-between text-sm mt-1">
                    <span>Available Cash:</span>
                    <span className={calculateTradeValue() > portfolioSummary.cashBalance ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(portfolioSummary.cashBalance)}
                    </span>
                  </div>
                )}
                {activeTradeModal.action === 'SELL' && (
                  <div className="flex justify-between text-sm mt-1">
                    <span>Owned Shares:</span>
                    <span className={tradeQuantity > (sortedHoldings.find(h => h.symbol === activeTradeModal.symbol)?.holding.quantity || 0) ? 'text-red-600' : 'text-green-600'}>
                      {sortedHoldings.find(h => h.symbol === activeTradeModal.symbol)?.holding.quantity || 0}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setActiveTradeModal(null)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={executeSingleTrade}
                  disabled={
                    (activeTradeModal.action === 'BUY' && calculateTradeValue() > portfolioSummary.cashBalance) ||
                    (activeTradeModal.action === 'SELL' && tradeQuantity > (sortedHoldings.find(h => h.symbol === activeTradeModal.symbol)?.holding.quantity || 0))
                  }
                  className={`flex-1 py-2 px-4 rounded-lg font-medium text-white transition-colors ${
                    activeTradeModal.action === 'BUY' 
                      ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-400' 
                      : 'bg-red-600 hover:bg-red-700 disabled:bg-gray-400'
                  }`}
                >
                  {activeTradeModal.action === 'BUY' ? 'Buy' : 'Sell'} {tradeQuantity} Share{tradeQuantity > 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}