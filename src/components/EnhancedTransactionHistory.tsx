'use client';

import React, { useState, useMemo } from 'react';
import { usePortfolioStore, Transaction } from '@/store/portfolio';
import AIRecommendationAnalytics from './AIRecommendationAnalytics';
import { useClientTime, useIsClient } from '@/hooks/useClientTime';

type FilterType = 'all' | 'buy' | 'sell' | 'ai-guided' | 'manual';
type SortType = 'newest' | 'oldest' | 'amount-high' | 'amount-low' | 'confidence-high' | 'confidence-low';

interface TradePerformanceMetrics {
  totalTrades: number;
  aiGuidedTrades: number;
  manualTrades: number;
  aiSuccessRate: number;
  manualSuccessRate: number;
  avgAiConfidence: number;
  totalVolume: number;
  profitableTrades: number;
}

const EnhancedTransactionHistory: React.FC = () => {
  const { getTransactionHistory, holdings } = usePortfolioStore();
  const transactions = getTransactionHistory();

  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const isClient = useIsClient();

  // Calculate trade performance metrics
  const performanceMetrics = useMemo((): TradePerformanceMetrics => {
    const aiGuidedTrades = transactions.filter(t => t.aiRecommendation);
    const manualTrades = transactions.filter(t => !t.aiRecommendation);
    
    // Calculate success rates (simplified - based on current holdings profit)
    const calculateSuccessRate = (trades: Transaction[]) => {
      if (trades.length === 0) return 0;
      const successful = trades.filter(trade => {
        const holding = holdings[trade.symbol];
        if (!holding) return false;
        return holding.profitLoss > 0;
      });
      return (successful.length / trades.length) * 100;
    };

    const avgAiConfidence = aiGuidedTrades.length > 0 
      ? aiGuidedTrades.reduce((sum, t) => sum + (t.aiRecommendation?.confidence || 0), 0) / aiGuidedTrades.length
      : 0;

    const totalVolume = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const profitableTrades = transactions.filter(t => {
      const holding = holdings[t.symbol];
      return holding && holding.profitLoss > 0;
    }).length;

    return {
      totalTrades: transactions.length,
      aiGuidedTrades: aiGuidedTrades.length,
      manualTrades: manualTrades.length,
      aiSuccessRate: calculateSuccessRate(aiGuidedTrades),
      manualSuccessRate: calculateSuccessRate(manualTrades),
      avgAiConfidence,
      totalVolume,
      profitableTrades
    };
  }, [transactions, holdings]);

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    switch (filter) {
      case 'buy':
        filtered = filtered.filter(t => t.type === 'BUY');
        break;
      case 'sell':
        filtered = filtered.filter(t => t.type === 'SELL');
        break;
      case 'ai-guided':
        filtered = filtered.filter(t => t.aiRecommendation);
        break;
      case 'manual':
        filtered = filtered.filter(t => !t.aiRecommendation);
        break;
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'oldest':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'amount-high':
          return b.totalAmount - a.totalAmount;
        case 'amount-low':
          return a.totalAmount - b.totalAmount;
        case 'confidence-high':
          return (b.aiRecommendation?.confidence || 0) - (a.aiRecommendation?.confidence || 0);
        case 'confidence-low':
          return (a.aiRecommendation?.confidence || 0) - (b.aiRecommendation?.confidence || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [transactions, filter, sortBy, searchTerm]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const TransactionDate = ({ timestamp }: { timestamp: Date }) => {
    const { formattedTime } = useClientTime(timestamp.toISOString(), { showTime: true, showDate: true });
    return <>{formattedTime || '...'}</>;
  };

  const getTradeOutcome = (transaction: Transaction) => {
    const holding = holdings[transaction.symbol];
    if (!holding) {
      return { status: 'closed', profitLoss: 0, profitLossPercent: 0 };
    }

    const currentProfitLoss = holding.profitLoss;
    const profitLossPercent = holding.profitLossPercent;

    return {
      status: 'active',
      profitLoss: currentProfitLoss,
      profitLossPercent
    };
  };

  const AISuccessIndicator: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
    if (!transaction.aiRecommendation) return null;

    const outcome = getTradeOutcome(transaction);
    const isSuccessful = outcome.profitLoss > 0;
    const confidence = transaction.aiRecommendation.confidence;

    return (
      <div className="flex items-center space-x-2 mt-2">
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          isSuccessful 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {isSuccessful ? '✅ Successful' : '❌ Unsuccessful'}
        </div>
        <div className={`px-2 py-1 rounded-full text-xs ${
          confidence >= 80 ? 'bg-blue-100 text-blue-800' :
          confidence >= 60 ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {confidence}% confidence
        </div>
      </div>
    );
  };

  const TransactionDetailModal: React.FC<{ transaction: Transaction; onClose: () => void }> = ({ 
    transaction, 
    onClose 
  }) => {
    const outcome = getTradeOutcome(transaction);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Trade Details</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Basic trade info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Symbol</p>
                  <p className="font-semibold">{transaction.symbol}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <div className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                    transaction.type === 'BUY' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {transaction.type}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Quantity</p>
                  <p className="font-semibold">{transaction.quantity} shares</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Price</p>
                  <p className="font-semibold">{formatCurrency(transaction.price)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-semibold">{formatCurrency(transaction.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  {isClient && (
                    <p className="font-semibold"><TransactionDate timestamp={transaction.timestamp} /></p>
                  )}
                </div>
              </div>

              {/* Current outcome */}
              {outcome.status === 'active' && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-2">Current Outcome</p>
                  <div className={`p-3 rounded-lg ${
                    outcome.profitLoss >= 0 ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <p className={`font-semibold ${
                      outcome.profitLoss >= 0 ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {outcome.profitLoss >= 0 ? '+' : ''}{formatCurrency(outcome.profitLoss)}
                      ({outcome.profitLoss >= 0 ? '+' : ''}{outcome.profitLossPercent.toFixed(2)}%)
                    </p>
                  </div>
                </div>
              )}

              {/* AI recommendation details */}
              {transaction.aiRecommendation && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-2">AI Recommendation</p>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-blue-900">🤖 {transaction.aiRecommendation.action}</span>
                      <span className="text-blue-700 text-sm">
                        {transaction.aiRecommendation.confidence}% confidence
                      </span>
                    </div>
                    <p className="text-blue-800 text-sm">
                      {transaction.aiRecommendation.reasoning}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (transactions.length === 0) {
    return (
      <div className="p-4 pb-20">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Trade History & AI Analytics</h2>
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-gray-500 mb-2">No transactions yet</p>
            <p className="text-sm text-gray-400">Start trading to see AI recommendation tracking and performance analytics</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 space-y-6">
      {/* Performance Overview */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">AI Trading Performance</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{performanceMetrics.aiGuidedTrades}</p>
            <p className="text-sm text-blue-800">AI Guided</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
            <p className="text-2xl font-bold text-gray-600">{performanceMetrics.manualTrades}</p>
            <p className="text-sm text-gray-800">Manual</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{performanceMetrics.aiSuccessRate.toFixed(1)}%</p>
            <p className="text-sm text-green-800">AI Success</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">{performanceMetrics.avgAiConfidence.toFixed(0)}%</p>
            <p className="text-sm text-purple-800">Avg Confidence</p>
          </div>
        </div>

        {/* Comparison Chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Success Rate Comparison</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">AI Guided Trades</span>
                  <span className="text-sm font-medium">{performanceMetrics.aiSuccessRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${performanceMetrics.aiSuccessRate}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Manual Trades</span>
                  <span className="text-sm font-medium">{performanceMetrics.manualSuccessRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gray-500 h-2 rounded-full"
                    style={{ width: `${performanceMetrics.manualSuccessRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Portfolio Impact</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Volume</span>
                <span className="text-sm font-medium">{formatCurrency(performanceMetrics.totalVolume)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Profitable Trades</span>
                <span className="text-sm font-medium">{performanceMetrics.profitableTrades}/{performanceMetrics.totalTrades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Overall Success Rate</span>
                <span className="text-sm font-medium">
                  {((performanceMetrics.profitableTrades / performanceMetrics.totalTrades) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Recommendation Analytics */}
      <AIRecommendationAnalytics />

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-bold text-gray-900">Trade History</h3>
          
          {/* Search */}
          <div className="flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Search by symbol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { key: 'all', label: 'All Trades' },
            { key: 'ai-guided', label: '🤖 AI Guided' },
            { key: 'manual', label: '👤 Manual' },
            { key: 'buy', label: '📈 Buy Orders' },
            { key: 'sell', label: '📉 Sell Orders' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as FilterType)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="mb-6">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortType)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount-high">Highest Amount</option>
            <option value="amount-low">Lowest Amount</option>
            <option value="confidence-high">Highest AI Confidence</option>
            <option value="confidence-low">Lowest AI Confidence</option>
          </select>
        </div>

        {/* Transaction List */}
        <div className="space-y-3">
          {filteredAndSortedTransactions.map((transaction) => {
            const outcome = getTradeOutcome(transaction);
            
            return (
              <div
                key={transaction.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setSelectedTransaction(transaction)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`px-2 py-1 rounded text-xs font-semibold ${
                        transaction.type === 'BUY' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type}
                      </div>
                      
                      {transaction.aiRecommendation && (
                        <div className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          🤖 AI
                        </div>
                      )}
                      
                      <div>
                        <h4 className="font-semibold text-gray-900">{transaction.symbol}</h4>
                        <p className="text-sm text-gray-600">
                          {transaction.quantity} shares @ {formatCurrency(transaction.price)}
                        </p>
                      </div>
                    </div>

                    {transaction.aiRecommendation && (
                      <AISuccessIndicator transaction={transaction} />
                    )}
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(transaction.totalAmount)}</p>
                    {isClient && (
                      <p className="text-sm text-gray-600"><TransactionDate timestamp={transaction.timestamp} /></p>
                    )}
                    
                    {outcome.status === 'active' && (
                      <p className={`text-sm font-medium mt-1 ${
                        outcome.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {outcome.profitLoss >= 0 ? '+' : ''}{formatCurrency(outcome.profitLoss)}
                      </p>
                    )}
                  </div>
                </div>

                {transaction.aiRecommendation && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-blue-900">
                        🤖 {transaction.aiRecommendation.action}
                      </span>
                      <span className="text-sm text-blue-700">
                        {transaction.aiRecommendation.confidence}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-blue-800 truncate">
                      {transaction.aiRecommendation.reasoning}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredAndSortedTransactions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No transactions match your filters</p>
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
};

export default EnhancedTransactionHistory;