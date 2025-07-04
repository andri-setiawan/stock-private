'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { usePortfolioStore } from '@/store/portfolio';
import { aiService, getUserPreferredProvider, PortfolioInsights } from '@/services/aiService';
import { finnhubService, StockData } from '@/services/finnhub';

export default function Analytics() {
  // Use proper Zustand selectors with memoization
  const holdings = usePortfolioStore(state => state.holdings);
  const getPortfolioSummary = usePortfolioStore(state => state.getPortfolioSummary);
  
  const [insights, setInsights] = useState<PortfolioInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const portfolioSummary = useMemo(() => {
    return getPortfolioSummary();
  }, [getPortfolioSummary]);

  const generateInsights = useCallback(async () => {
    setIsLoading(true);
    try {
      // Initialize AI service with user preference
      const preferredProvider = getUserPreferredProvider();
      aiService.setProvider(preferredProvider);
      
      // Get current market data for holdings
      const marketData: Record<string, StockData> = {};
      const symbols = Object.keys(holdings);
      
      const marketPromises = symbols.map(async (symbol) => {
        try {
          const data = await finnhubService.getStockData(symbol);
          return { symbol, data };
        } catch (error) {
          console.error(`Failed to get market data for ${symbol}:`, error);
          return null;
        }
      });

      const marketResults = await Promise.all(marketPromises);
      marketResults.forEach((result) => {
        if (result) {
          marketData[result.symbol] = result.data;
        }
      });

      // Get AI insights
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

      const aiInsights = await aiService.analyzePortfolio(portfolio, marketData);
      setInsights(aiInsights);
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setIsLoading(false);
    }
  }, [holdings, portfolioSummary]);

  useEffect(() => {
    if (Object.keys(holdings).length > 0) {
      generateInsights();
    }
  }, [holdings, generateInsights]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getWinRate = () => {
    const completedTrades = transactions.filter(t => t.type === 'SELL');
    if (completedTrades.length === 0) return 0;
    
    const winners = completedTrades.filter(trade => {
      const buyTrades = transactions.filter(
        t => t.symbol === trade.symbol && t.type === 'BUY' && t.timestamp < trade.timestamp
      );
      const avgBuyPrice = buyTrades.reduce((sum, t) => sum + t.price, 0) / buyTrades.length;
      return trade.price > avgBuyPrice;
    });
    
    return (winners.length / completedTrades.length) * 100;
  };

  const getBestPerformer = () => {
    const holdingsArray = Object.entries(holdings);
    if (holdingsArray.length === 0) return null;
    
    return holdingsArray.reduce((best, [symbol, holding]) => {
      if (!best || holding.profitLossPercent > best.profitLossPercent) {
        return { symbol, profitLossPercent: holding.profitLossPercent };
      }
      return best;
    }, null as { symbol: string; profitLossPercent: number } | null);
  };

  const getWorstPerformer = () => {
    const holdingsArray = Object.entries(holdings);
    if (holdingsArray.length === 0) return null;
    
    return holdingsArray.reduce((worst, [symbol, holding]) => {
      if (!worst || holding.profitLossPercent < worst.profitLossPercent) {
        return { symbol, profitLossPercent: holding.profitLossPercent };
      }
      return worst;
    }, null as { symbol: string; profitLossPercent: number } | null);
  };

  const bestPerformer = getBestPerformer();
  const worstPerformer = getWorstPerformer();

  return (
    <div className="p-4 pb-20 space-y-4">
      {/* Performance Overview */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Performance Analytics</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Total Return</p>
            <p className={`text-xl font-bold ${
              portfolioSummary.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {((portfolioSummary.totalProfitLoss / 10000) * 100).toFixed(2)}%
            </p>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Win Rate</p>
            <p className="text-xl font-bold text-gray-900">
              {getWinRate().toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {bestPerformer && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Best Performer</p>
                  <p className="text-lg font-bold text-green-900">{bestPerformer.symbol}</p>
                </div>
                <p className="text-lg font-bold text-green-600">
                  +{bestPerformer.profitLossPercent.toFixed(2)}%
                </p>
              </div>
            </div>
          )}

          {worstPerformer && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">Worst Performer</p>
                  <p className="text-lg font-bold text-red-900">{worstPerformer.symbol}</p>
                </div>
                <p className="text-lg font-bold text-red-600">
                  {worstPerformer.profitLossPercent.toFixed(2)}%
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Portfolio Distribution */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Portfolio Distribution</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <span className="font-medium text-blue-900">Cash</span>
            <div className="text-right">
              <p className="font-semibold text-blue-900">{formatCurrency(portfolioSummary.cashBalance)}</p>
              <p className="text-sm text-blue-700">
                {((portfolioSummary.cashBalance / portfolioSummary.totalValue) * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          {Object.entries(holdings)
            .sort(([,a], [,b]) => b.totalValue - a.totalValue)
            .map(([symbol, holding]) => (
              <div key={symbol} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900">{symbol}</span>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(holding.totalValue)}</p>
                  <p className="text-sm text-gray-600">
                    {((holding.totalValue / portfolioSummary.totalValue) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">🤖 AI Portfolio Analysis</h3>
          {Object.keys(holdings).length > 0 && (
            <button
              onClick={generateInsights}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {isLoading ? 'Analyzing...' : 'Refresh Analysis'}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        ) : insights ? (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Overall Health</h4>
              <p className="text-blue-800">{insights.overallHealth}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600">Diversification Score</p>
                <p className="text-xl font-bold text-green-900">{insights.diversificationScore}/100</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-600">Risk Level</p>
                <p className="text-lg font-bold text-yellow-900">
                  {insights.riskAssessment.split(' ')[0]}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Suggestions</h4>
              <ul className="space-y-2">
                {insights.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span className="text-gray-700">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>

            {insights.rebalanceRecommendations.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Rebalance Recommendations</h4>
                <div className="space-y-2">
                  {insights.rebalanceRecommendations.map((rec, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{rec.symbol}</span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          rec.action === 'BUY' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {rec.action}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{rec.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : Object.keys(holdings).length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📈</div>
            <p className="text-gray-500 mb-2">No portfolio data yet</p>
            <p className="text-sm text-gray-400">Start trading to see AI insights</p>
          </div>
        ) : (
          <p className="text-gray-500">Click &quot;Refresh Analysis&quot; to get AI insights</p>
        )}
      </div>

      {/* Trading Stats */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Trading Statistics</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
            <p className="text-sm text-gray-600">Total Trades</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{Object.keys(holdings).length}</p>
            <p className="text-sm text-gray-600">Positions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {transactions.filter(t => t.aiRecommendation).length}
            </p>
            <p className="text-sm text-gray-600">AI Trades</p>
          </div>
        </div>
      </div>
    </div>
  );
}