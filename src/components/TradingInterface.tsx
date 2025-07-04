'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { finnhubService } from '@/services/finnhub';
import { aiService, getUserPreferredProvider, TradeRecommendation } from '@/services/aiService';
import { usePortfolioStore } from '@/store/portfolio';

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

interface TradingInterfaceProps {
  initialSymbol?: string;
}

export default function TradingInterface({ initialSymbol = '' }: TradingInterfaceProps) {
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

  // Use proper Zustand selectors with memoization
  const executeTrade = usePortfolioStore(state => state.executeTrade);
  const holdings = usePortfolioStore(state => state.holdings);
  const getPortfolioSummary = usePortfolioStore(state => state.getPortfolioSummary);
  
  const portfolioSummary = useMemo(() => {
    return getPortfolioSummary();
  }, [getPortfolioSummary]);

  // Initialize AI service with user preference
  useEffect(() => {
    const preferredProvider = getUserPreferredProvider();
    aiService.setProvider(preferredProvider);
    
    // Listen for provider changes and refresh current recommendation
    const handleProviderChange = (newProvider: 'gemini' | 'groq' | 'openai') => {
      console.log(`🔄 TradingInterface: Provider changed to ${newProvider.toUpperCase()}`);
      // If we have a stock selected, re-analyze it with new provider
      if (stockData) {
        console.log(`🔄 Re-analyzing ${stockData.symbol} with new provider`);
        getAIRecommendation(stockData);
      }
    };
    
    aiService.addProviderChangeListener(handleProviderChange);
    
    // Cleanup listener on unmount
    return () => {
      aiService.removeProviderChangeListener(handleProviderChange);
    };
  }, [stockData]);

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
    } catch (error) {
      console.error('Error loading stock data:', error);
      setError('Failed to load stock data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrade = async (type: 'BUY' | 'SELL') => {
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

      if (success) {
        setError('');
        // Show success message or update UI
        alert(`${type} order executed: ${quantity} shares of ${stockData.symbol} at $${stockData.currentPrice}`);
      } else {
        setError('Trade execution failed. Please try again.');
      }
    } catch (error) {
      console.error('Trade execution error:', error);
      setError('Trade execution failed. Please try again.');
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

  return (
    <div className="p-4 space-y-4">
      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Trade Stocks</h2>
        
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

      {/* Stock Data */}
      {stockData && (
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

          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
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
            <div>
              <p className="text-gray-600">52W Range</p>
              <p className="font-semibold">
                {formatCurrency(stockData.low52)} - {formatCurrency(stockData.high52)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Industry</p>
              <p className="font-semibold">{stockData.industry || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* AI Recommendation */}
      {aiRecommendation && stockData && (
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

          {/* Main Recommendation Message */}
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

          {/* Risk Assessment */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white bg-opacity-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">Risk Level</div>
              <div className={`font-bold ${
                aiRecommendation.riskLevel === 'LOW' ? 'text-green-600' :
                aiRecommendation.riskLevel === 'MEDIUM' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {aiRecommendation.riskLevel}
              </div>
            </div>
            
            {aiRecommendation.targetPrice && (
              <div className="bg-white bg-opacity-50 rounded-lg p-3">
                <div className="text-sm text-gray-600">Target Price</div>
                <div className="font-bold text-gray-900">
                  {formatCurrency(aiRecommendation.targetPrice)}
                </div>
              </div>
            )}

            {aiRecommendation.suggestedShares && (
              <div className="bg-white bg-opacity-50 rounded-lg p-3">
                <div className="text-sm text-gray-600">Suggested Shares</div>
                <div className="font-bold text-gray-900">
                  {aiRecommendation.suggestedShares} shares
                </div>
              </div>
            )}
          </div>

          {/* Why Buy/Sell Justification */}
          <div className="bg-white bg-opacity-70 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">
              {aiRecommendation.recommendation === 'BUY' ? '✅ Why you should consider buying:' :
               aiRecommendation.recommendation === 'SELL' ? '⚠️ Why you should consider selling:' :
               '📊 Why you should hold:'}
            </h4>
            <div className="text-sm text-gray-700 space-y-1">
              {aiRecommendation.keyFactors?.map((factor, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>{factor}</span>
                </div>
              )) || (
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>{aiRecommendation.reasoning}</span>
                </div>
              )}
            </div>
          </div>

          {/* Market Context */}
          {aiRecommendation.marketContext && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-blue-900 mb-2">📈 Market Context</h4>
              <p className="text-sm text-blue-800">{aiRecommendation.marketContext}</p>
            </div>
          )}

          {/* Portfolio Impact */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">💼 Portfolio Impact</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Current Holdings:</span>
                <span className="ml-2 font-semibold">
                  {holdings[stockData.symbol]?.quantity || 0} shares
                </span>
              </div>
              <div>
                <span className="text-gray-600">Available Cash:</span>
                <span className="ml-2 font-semibold">
                  {formatCurrency(portfolioSummary.cashBalance)}
                </span>
              </div>
            </div>
            
            {aiRecommendation.recommendation === 'BUY' && (
              <div className="mt-2 text-sm text-gray-700">
                💡 This trade would {holdings[stockData.symbol] ? 'increase' : 'add'} your position in {stockData.symbol}
                {aiRecommendation.suggestedShares && 
                  ` by ${aiRecommendation.suggestedShares} shares (${formatCurrency(aiRecommendation.suggestedShares * stockData.currentPrice)})`
                }
              </div>
            )}
            
            {aiRecommendation.recommendation === 'SELL' && holdings[stockData.symbol] && (
              <div className="mt-2 text-sm text-gray-700">
                💡 You currently own {holdings[stockData.symbol].quantity} shares worth {formatCurrency(holdings[stockData.symbol].totalValue)}
                {holdings[stockData.symbol].profitLoss !== 0 && (
                  <span className={holdings[stockData.symbol].profitLoss > 0 ? 'text-green-600' : 'text-red-600'}>
                    {' '}({holdings[stockData.symbol].profitLoss > 0 ? '+' : ''}{formatCurrency(holdings[stockData.symbol].profitLoss)} P&L)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Confidence Indicator */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>AI Confidence Level</span>
              <span>{aiRecommendation.confidence}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  aiRecommendation.confidence >= 80 ? 'bg-green-500' :
                  aiRecommendation.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${aiRecommendation.confidence}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {aiRecommendation.confidence >= 80 ? 'High confidence - Strong signal' :
               aiRecommendation.confidence >= 60 ? 'Moderate confidence - Proceed with caution' :
               'Low confidence - Consider waiting for better opportunity'}
            </div>
          </div>
        </div>
      )}

      {/* Trading Controls */}
      {stockData && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Execute Trade</h3>
          
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleTrade('BUY')}
              disabled={quantity * stockData.currentPrice > portfolioSummary.cashBalance}
              className="bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              Buy ${(quantity * stockData.currentPrice).toFixed(2)}
            </button>
            
            <button
              onClick={() => handleTrade('SELL')}
              disabled={!holdings[stockData.symbol] || holdings[stockData.symbol].quantity < quantity}
              className="bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              Sell ${(quantity * stockData.currentPrice).toFixed(2)}
            </button>
          </div>
        </div>
      )}

      {/* AI Provider Indicator */}
      <div className="bg-white rounded-xl shadow-lg p-4 mt-4">
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
            Change in Settings
          </div>
        </div>
      </div>
    </div>
  );
}