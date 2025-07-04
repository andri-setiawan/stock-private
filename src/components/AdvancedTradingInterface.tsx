'use client';

import { useState, useEffect, useCallback } from 'react';
import { finnhubService } from '@/services/finnhub';
import { aiService, getUserPreferredProvider, TradeRecommendation } from '@/services/aiService';
import { usePortfolioStore } from '@/store/portfolio';
import orderManager from '@/services/orderManager';
import { OrderType } from '@/types/orders';
import AIRecommendationSection from '@/components/AIRecommendationSection';

interface StockData {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  high52: number;
  low52: number;
  marketCap: number;
  peRatio: number;
  logo?: string;
  industry?: string;
}

interface AdvancedTradingInterfaceProps {
  initialSymbol?: string;
}

export default function AdvancedTradingInterface({ initialSymbol = '' }: AdvancedTradingInterfaceProps) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [searchResults, setSearchResults] = useState<Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>>([]);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<TradeRecommendation | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  
  // Advanced order settings
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [stopLossEnabled, setStopLossEnabled] = useState(true);
  const [takeProfitEnabled, setTakeProfitEnabled] = useState(true);
  const [trailingStopEnabled, setTrailingStopEnabled] = useState(false);
  const [customStopLoss, setCustomStopLoss] = useState(8);
  const [customTakeProfit, setCustomTakeProfit] = useState(15);
  const [trailingPercent, setTrailingPercent] = useState(5);
  const [useMultiLevelTakeProfit, setUseMultiLevelTakeProfit] = useState(true);

  const { executeTrade, getPortfolioSummary, holdings } = usePortfolioStore();
  const portfolioSummary = getPortfolioSummary();

  // Initialize AI service with user preference
  useEffect(() => {
    const preferredProvider = getUserPreferredProvider();
    aiService.setProvider(preferredProvider);
  }, []);

  // Load stock data if initialSymbol is provided
  useEffect(() => {
    if (initialSymbol) {
      loadStockData(initialSymbol);
    }
  }, [initialSymbol]); // eslint-disable-line react-hooks/exhaustive-deps

  const searchStocks = useCallback(async () => {
    if (!symbol.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await finnhubService.searchStocks(symbol.toUpperCase());
      setSearchResults(results.result?.slice(0, 5) || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [symbol]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (symbol.length >= 2) {
        searchStocks();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [symbol, searchStocks]);

  const selectStock = async (selectedSymbol: string) => {
    setSymbol(selectedSymbol);
    setSearchResults([]);
    await loadStockData(selectedSymbol);
  };

  const loadStockData = async (stockSymbol: string) => {
    setIsLoading(true);
    setError('');
    setStockData(null);
    setAiRecommendation(null);

    try {
      const data = await finnhubService.getStockData(stockSymbol.toUpperCase());
      setStockData(data);

      // Get AI recommendation
      const portfolio = {
        cashBalance: portfolioSummary.cashBalance,
        totalValue: portfolioSummary.totalValue,
        holdings: Object.fromEntries(
          Object.entries(holdings).map(([sym, holding]) => [
            sym,
            {
              quantity: holding.quantity,
              averagePrice: holding.averagePrice,
              currentPrice: holding.currentPrice,
              totalValue: holding.totalValue,
              profitLoss: holding.profitLoss,
              profitLossPercent: holding.profitLossPercent,
            },
          ])
        ),
      };

      const recommendation = await aiService.getTradeRecommendation(data, portfolio);
      setAiRecommendation(recommendation);

      // Auto-adjust quantity based on AI recommendation
      if (recommendation?.suggestedShares) {
        setQuantity(recommendation.suggestedShares);
      }
    } catch (error) {
      console.error('Error loading stock data:', error);
      setError('Failed to load stock data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateOptimalPosition = () => {
    if (!stockData || !aiRecommendation) return null;

    return orderManager.calculateOptimalPositionSize(
      stockData.symbol,
      stockData.currentPrice,
      aiRecommendation.confidence,
      aiRecommendation.riskLevel,
      portfolioSummary.totalValue,
      portfolioSummary.cashBalance
    );
  };

  const handleAdvancedTrade = async (type: 'BUY' | 'SELL') => {
    if (!stockData || quantity <= 0) return;

    const totalCost = quantity * stockData.currentPrice;
    
    if (type === 'BUY' && totalCost > portfolioSummary.cashBalance) {
      setError('Insufficient funds for this trade.');
      return;
    }

    const holding = holdings[stockData.symbol];
    if (type === 'SELL' && (!holding || holding.quantity < quantity)) {
      setError('Insufficient shares for this sale.');
      return;
    }

    try {
      // Execute the main trade first
      const success = await executeTrade(
        stockData.symbol,
        type,
        quantity,
        stockData.currentPrice,
        aiRecommendation
          ? {
              action: aiRecommendation.recommendation,
              confidence: aiRecommendation.confidence,
              reasoning: aiRecommendation.reasoning,
            }
          : undefined
      );

      if (success && type === 'BUY') {
        // Create advanced orders for the new position
        await createAdvancedOrders(stockData.symbol, quantity, stockData.currentPrice);
        setError('');
        alert(`✅ Advanced trade executed successfully!\n${quantity} shares of ${stockData.symbol} at $${stockData.currentPrice}\nStop-loss and take-profit orders created.`);
      } else if (success) {
        setError('');
        alert(`✅ ${type} order executed: ${quantity} shares of ${stockData.symbol} at $${stockData.currentPrice}`);
      } else {
        setError('Trade execution failed. Please try again.');
      }
    } catch (error) {
      console.error('Trade execution error:', error);
      setError('Trade execution failed. Please try again.');
    }
  };

  const createAdvancedOrders = async (symbol: string, shares: number, entryPrice: number) => {
    try {
      // Create stop-loss order if enabled
      if (stopLossEnabled) {
        const stopLossOrder = orderManager.createStopLossOrder(
          symbol, 
          shares, 
          entryPrice, 
          customStopLoss
        );
        orderManager.addOrder(stopLossOrder);
      }

      // Create take-profit order(s) if enabled
      if (takeProfitEnabled) {
        const takeProfitOrders = orderManager.createTakeProfitOrder(
          symbol, 
          shares, 
          entryPrice, 
          customTakeProfit,
          useMultiLevelTakeProfit
        );
        
        if (Array.isArray(takeProfitOrders)) {
          takeProfitOrders.forEach(order => orderManager.addOrder(order));
        } else {
          orderManager.addOrder(takeProfitOrders);
        }
      }

      // Create trailing stop if enabled
      if (trailingStopEnabled) {
        const trailingOrder = orderManager.createTrailingStopOrder(
          symbol, 
          shares, 
          entryPrice, 
          trailingPercent
        );
        orderManager.addOrder(trailingOrder);
      }

      // Create OCO order if both stop-loss and take-profit are enabled
      if (stopLossEnabled && takeProfitEnabled && !useMultiLevelTakeProfit) {
        const ocoOrder = orderManager.createOCOOrder(symbol, shares, entryPrice);
        orderManager.addOrder(ocoOrder);
      }
    } catch (error) {
      console.error('Error creating advanced orders:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'BUY': return 'text-green-600';
      case 'SELL': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getRecommendationBg = (rec: string) => {
    switch (rec) {
      case 'BUY': return 'bg-green-50 border-green-200';
      case 'SELL': return 'bg-red-50 border-red-200';
      default: return 'bg-yellow-50 border-yellow-200';
    }
  };

  const optimalPosition = calculateOptimalPosition();

  return (
    <div className="p-4 space-y-4">
      {/* AI Recommendations Section */}
      <AIRecommendationSection 
        onStockSelect={selectStock}
        currentSymbol={stockData?.symbol}
      />

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Advanced Trading Interface</h2>
        
        <div className="relative">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="Enter stock symbol (e.g., AAPL, GOOGL)"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-2 border border-gray-200 rounded-lg bg-white max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => selectStock(result.symbol)}
                className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <div className="font-semibold">{result.symbol}</div>
                <div className="text-sm text-gray-600 truncate">{result.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      )}

      {/* Stock Data & AI Recommendation */}
      {stockData && (
        <>
          {/* Stock Information */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{stockData.symbol}</h3>
                <p className="text-gray-600">{stockData.name}</p>
              </div>
              {stockData.logo && (
                <img src={stockData.logo} alt={stockData.name} className="w-12 h-12 rounded" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stockData.currentPrice)}</p>
                <p className={`text-sm ${stockData.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stockData.changePercent >= 0 ? '+' : ''}{stockData.change.toFixed(2)} 
                  ({stockData.changePercent.toFixed(2)}%)
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Day Range</p>
                <p className="font-semibold">
                  {formatCurrency(stockData.dayLow)} - {formatCurrency(stockData.dayHigh)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Market Cap</p>
                <p className="font-semibold">
                  ${stockData.marketCap ? (stockData.marketCap / 1000000000).toFixed(2) + 'B' : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">P/E Ratio</p>
                <p className="font-semibold">{stockData.peRatio?.toFixed(2) || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* AI Recommendation */}
          {aiRecommendation && (
            <div className={`rounded-xl shadow-lg p-6 border-2 ${getRecommendationBg(aiRecommendation.recommendation)}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`text-2xl font-bold ${getRecommendationColor(aiRecommendation.recommendation)}`}>
                    🤖 AI Recommendation
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${getRecommendationColor(aiRecommendation.recommendation)}`}>
                    {aiRecommendation.recommendation}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Confidence</div>
                  <div className={`text-lg font-bold ${
                    aiRecommendation.confidence >= 80 ? 'text-green-600' :
                    aiRecommendation.confidence >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {aiRecommendation.confidence}%
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className={`text-lg font-semibold mb-2 ${getRecommendationColor(aiRecommendation.recommendation)}`}>
                  {aiRecommendation.recommendation === 'BUY' && 
                    `💡 Consider buying ${stockData.symbol} - Strong buy signal detected!`
                  }
                  {aiRecommendation.recommendation === 'SELL' && 
                    `⚠️ Consider selling ${stockData.symbol} - Exit signal detected!`
                  }
                  {aiRecommendation.recommendation === 'HOLD' && 
                    `⏳ Hold your position in ${stockData.symbol} - Wait for better opportunity`
                  }
                </div>
                <div className="text-gray-700">
                  <strong>AI Analysis:</strong> {aiRecommendation.reasoning}
                </div>
              </div>

              {/* Optimal Position Sizing */}
              {optimalPosition && aiRecommendation.recommendation === 'BUY' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-blue-900 mb-2">🎯 Optimal Position Sizing</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-600">Recommended Shares:</span>
                      <span className="ml-2 font-semibold">{optimalPosition.recommendedShares}</span>
                    </div>
                    <div>
                      <span className="text-blue-600">Position Value:</span>
                      <span className="ml-2 font-semibold">{formatCurrency(optimalPosition.positionValue)}</span>
                    </div>
                    <div>
                      <span className="text-blue-600">Risk Amount:</span>
                      <span className="ml-2 font-semibold">{formatCurrency(optimalPosition.riskAmount)}</span>
                    </div>
                    <div>
                      <span className="text-blue-600">Portfolio %:</span>
                      <span className="ml-2 font-semibold">{optimalPosition.positionSizeRatio.toFixed(2)}%</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setQuantity(optimalPosition.recommendedShares)}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Use Optimal Size
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Advanced Order Configuration */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">🔧 Advanced Order Settings</h3>
            
            {/* Order Type Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Order Type</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as OrderType)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="MARKET">Market Order (Immediate)</option>
                <option value="STOP_LOSS">Stop Loss Order</option>
                <option value="TAKE_PROFIT">Take Profit Order</option>
                <option value="TRAILING_STOP">Trailing Stop Order</option>
                <option value="OCO">OCO (One-Cancels-Other)</option>
              </select>
            </div>

            {/* Risk Management Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Stop Loss */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Stop Loss Protection</label>
                  <input
                    type="checkbox"
                    checked={stopLossEnabled}
                    onChange={(e) => setStopLossEnabled(e.target.checked)}
                    className="rounded"
                  />
                </div>
                {stopLossEnabled && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Stop Loss %</label>
                    <input
                      type="number"
                      value={customStopLoss}
                      onChange={(e) => setCustomStopLoss(Number(e.target.value))}
                      min="1"
                      max="50"
                      step="0.5"
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Take Profit */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Take Profit</label>
                  <input
                    type="checkbox"
                    checked={takeProfitEnabled}
                    onChange={(e) => setTakeProfitEnabled(e.target.checked)}
                    className="rounded"
                  />
                </div>
                {takeProfitEnabled && (
                  <>
                    <div className="mb-2">
                      <label className="block text-xs text-gray-600 mb-1">Take Profit %</label>
                      <input
                        type="number"
                        value={customTakeProfit}
                        onChange={(e) => setCustomTakeProfit(Number(e.target.value))}
                        min="1"
                        max="100"
                        step="1"
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={useMultiLevelTakeProfit}
                        onChange={(e) => setUseMultiLevelTakeProfit(e.target.checked)}
                        className="rounded"
                      />
                      <label className="text-xs text-gray-600">Multi-level (33%/33%/34%)</label>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Trailing Stop */}
            <div className="border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Trailing Stop</label>
                <input
                  type="checkbox"
                  checked={trailingStopEnabled}
                  onChange={(e) => setTrailingStopEnabled(e.target.checked)}
                  className="rounded"
                />
              </div>
              {trailingStopEnabled && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Trailing %</label>
                  <input
                    type="number"
                    value={trailingPercent}
                    onChange={(e) => setTrailingPercent(Number(e.target.value))}
                    min="1"
                    max="20"
                    step="0.5"
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Trading Controls */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Execute Advanced Trade</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Total Cost:</span>
                <span className="font-semibold">{formatCurrency(quantity * stockData.currentPrice)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Available Cash:</span>
                <span>{formatCurrency(portfolioSummary.cashBalance)}</span>
              </div>
              {holdings[stockData.symbol] && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Current Holding:</span>
                  <span>{holdings[stockData.symbol].quantity} shares</span>
                </div>
              )}
              {stopLossEnabled && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Max Loss (Stop Loss):</span>
                  <span>{formatCurrency(quantity * stockData.currentPrice * customStopLoss / 100)}</span>
                </div>
              )}
              {takeProfitEnabled && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Target Profit:</span>
                  <span>{formatCurrency(quantity * stockData.currentPrice * customTakeProfit / 100)}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleAdvancedTrade('BUY')}
                disabled={quantity * stockData.currentPrice > portfolioSummary.cashBalance}
                className="bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                🚀 Advanced Buy ${(quantity * stockData.currentPrice).toFixed(2)}
              </button>
              
              <button
                onClick={() => handleAdvancedTrade('SELL')}
                disabled={!holdings[stockData.symbol] || holdings[stockData.symbol].quantity < quantity}
                className="bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                📉 Advanced Sell ${(quantity * stockData.currentPrice).toFixed(2)}
              </button>
            </div>

            {/* Order Summary */}
            {(stopLossEnabled || takeProfitEnabled || trailingStopEnabled) && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">📋 Order Summary</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  {stopLossEnabled && (
                    <div>• Stop Loss: {customStopLoss}% ({formatCurrency(stockData.currentPrice * (1 - customStopLoss/100))})</div>
                  )}
                  {takeProfitEnabled && (
                    <div>• Take Profit: {customTakeProfit}% ({formatCurrency(stockData.currentPrice * (1 + customTakeProfit/100))})</div>
                  )}
                  {trailingStopEnabled && (
                    <div>• Trailing Stop: {trailingPercent}% (Dynamic)</div>
                  )}
                  {useMultiLevelTakeProfit && takeProfitEnabled && (
                    <div>• Multi-level exits at {customTakeProfit * 0.6}%, {customTakeProfit}%, {customTakeProfit * 1.5}%</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* AI Provider Indicator */}
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">AI Analysis by:</span>
                <div className="flex items-center space-x-2">
                  {aiService.getCurrentProvider() === 'gemini' ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
                        <span className="text-white font-bold text-xs">G</span>
                      </div>
                      <span className="font-medium text-blue-700">Google Gemini</span>
                    </div>
                  ) : aiService.getCurrentProvider() === 'groq' ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-600 rounded flex items-center justify-center">
                        <span className="text-white font-bold text-xs">Q</span>
                      </div>
                      <span className="font-medium text-orange-700">GROQ AI</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded flex items-center justify-center">
                        <span className="text-white font-bold text-xs">AI</span>
                      </div>
                      <span className="font-medium text-green-700">OpenAI</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Advanced Order Management
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}