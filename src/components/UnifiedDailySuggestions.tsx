'use client';

import React, { useState, useEffect } from 'react';
import { usePortfolioStore } from '@/store/portfolio';
import { unifiedRecommendations, UnifiedRecommendation } from '@/services/unifiedRecommendations';
import { aiService, getUserPreferredProvider } from '@/services/aiService';

const UnifiedDailySuggestions: React.FC = () => {
  const [recommendations, setRecommendations] = useState<UnifiedRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'all' | 'buy' | 'analysis'>('all');
  
  const { executeTrade, cashBalance, holdings } = usePortfolioStore();

  useEffect(() => {
    // Initialize AI service with user's preferred provider
    const preferredProvider = getUserPreferredProvider();
    aiService.setProvider(preferredProvider);
    console.log(`🤖 UnifiedDailySuggestions: Using ${preferredProvider.toUpperCase()} AI provider`);
    
    // Listen for provider changes and refresh recommendations
    const handleProviderChange = (newProvider: 'gemini' | 'groq' | 'openai') => {
      console.log(`🔄 UnifiedDailySuggestions: Provider changed to ${newProvider.toUpperCase()}, refreshing...`);
      unifiedRecommendations.clearCache();
      fetchRecommendations(true);
    };
    
    aiService.addProviderChangeListener(handleProviderChange);
    
    fetchRecommendations();
    
    // Cleanup listener on unmount
    return () => {
      aiService.removeProviderChangeListener(handleProviderChange);
    };
  }, []);

  const fetchRecommendations = async (forceRefresh = false) => {
    try {
      setError(null);
      if (forceRefresh) {
        setRefreshing(true);
        unifiedRecommendations.clearCache();
      } else {
        setLoading(true);
      }
      
      const recs = await unifiedRecommendations.getDailyRecommendations(10);
      setRecommendations(recs);
    } catch (err) {
      setError('Failed to fetch recommendations. Please try again.');
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleTrade = async (rec: UnifiedRecommendation, action: 'BUY' | 'SELL') => {
    if (action === 'BUY') {
      const maxAffordable = Math.floor(cashBalance / rec.currentPrice);
      const suggestedShares = Math.min(maxAffordable, 10); // Limit to 10 shares for demo
      
      if (suggestedShares <= 0) {
        alert('Insufficient funds for this trade.');
        return;
      }

      const success = await executeTrade(
        rec.symbol,
        'BUY',
        suggestedShares,
        rec.currentPrice,
        {
          action: rec.recommendation,
          confidence: rec.confidence,
          reasoning: rec.reasoning,
        }
      );

      if (success) {
        alert(`✅ Bought ${suggestedShares} shares of ${rec.symbol} for ${(suggestedShares * rec.currentPrice).toFixed(2)}`);
      }
    } else {
      const holding = holdings[rec.symbol];
      if (!holding || holding.quantity <= 0) {
        alert('You don\'t own any shares of this stock.');
        return;
      }

      const sharesToSell = Math.min(holding.quantity, 10);
      const success = await executeTrade(
        rec.symbol,
        'SELL',
        sharesToSell,
        rec.currentPrice,
        {
          action: rec.recommendation,
          confidence: rec.confidence,
          reasoning: rec.reasoning,
        }
      );

      if (success) {
        alert(`✅ Sold ${sharesToSell} shares of ${rec.symbol} for ${(sharesToSell * rec.currentPrice).toFixed(2)}`);
      }
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

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRecommendations = recommendations.filter(rec => {
    if (selectedTab === 'buy') return rec.recommendation === 'BUY';
    return true;
  });

  const buySignals = recommendations.filter(r => r.recommendation === 'BUY').length;
  const sellSignals = recommendations.filter(r => r.recommendation === 'SELL').length;
  const avgConfidence = recommendations.length > 0 
    ? Math.round(recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length)
    : 0;

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 space-y-4">
      {/* Header with Refresh */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🤖 AI Trading Suggestions</h1>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm text-gray-600">Powered by</span>
              {recommendations.length > 0 && recommendations[0].aiProvider === 'gemini' ? (
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-xs">G</span>
                  </div>
                  <span className="text-xs font-medium text-blue-700">Google Gemini</span>
                </div>
              ) : recommendations.length > 0 && recommendations[0].aiProvider === 'groq' ? (
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-gradient-to-br from-orange-500 to-red-600 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-xs">Q</span>
                  </div>
                  <span className="text-xs font-medium text-orange-700">GROQ AI</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-xs">AI</span>
                  </div>
                  <span className="text-xs font-medium text-green-700">OpenAI</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => fetchRecommendations(true)}
            disabled={refreshing}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{recommendations.length}</div>
            <div className="text-sm text-gray-600">Total Analyzed</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{buySignals}</div>
            <div className="text-sm text-gray-600">Buy Signals</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{sellSignals}</div>
            <div className="text-sm text-gray-600">Sell Signals</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{avgConfidence}%</div>
            <div className="text-sm text-gray-600">Avg Confidence</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-4">
          <button
            onClick={() => setSelectedTab('all')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              selectedTab === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Recommendations
          </button>
          <button
            onClick={() => setSelectedTab('buy')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              selectedTab === 'buy'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Buy Opportunities
          </button>
          <button
            onClick={() => setSelectedTab('analysis')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              selectedTab === 'analysis'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Market Analysis
          </button>
        </div>

        {/* Recommendations List */}
        {selectedTab === 'all' || selectedTab === 'buy' ? (
          <div className="space-y-4">
            {filteredRecommendations.length > 0 ? (
              filteredRecommendations.map((rec) => (
                <div key={rec.id} className={`border-2 rounded-lg p-4 ${getRecommendationBg(rec.recommendation)}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{rec.symbol}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getRecommendationColor(rec.recommendation)}`}>
                          {rec.recommendation}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getRiskBadgeColor(rec.riskLevel)}`}>
                          {rec.riskLevel} Risk
                        </span>
                        <span className="text-sm text-gray-600">{rec.confidence}% confidence</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{rec.name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{formatCurrency(rec.currentPrice)}</div>
                      <div className={`text-sm ${rec.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {rec.changePercent >= 0 ? '+' : ''}{rec.change.toFixed(2)} ({rec.changePercent.toFixed(2)}%)
                      </div>
                      {rec.targetPrice && (
                        <div className="text-xs text-gray-500">Target: {formatCurrency(rec.targetPrice)}</div>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-700 text-sm mb-3">{rec.reasoning}</p>

                  {rec.keyFactors && rec.keyFactors.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-600 mb-1">Key Factors:</p>
                      <div className="flex flex-wrap gap-1">
                        {rec.keyFactors.map((factor, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Generated: {new Date(rec.timestamp).toLocaleString()}
                    </div>
                    <div className="flex space-x-2">
                      {rec.recommendation === 'BUY' && (
                        <button
                          onClick={() => handleTrade(rec, 'BUY')}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        >
                          🚀 Buy Now
                        </button>
                      )}
                      {rec.recommendation === 'SELL' && holdings[rec.symbol] && (
                        <button
                          onClick={() => handleTrade(rec, 'SELL')}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                        >
                          📉 Sell Now
                        </button>
                      )}
                      <button
                        onClick={() => window.location.href = `/trade?symbol=${rec.symbol}`}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        📊 Analyze
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No recommendations available</h3>
                <p className="text-gray-600 mb-4">Try refreshing to get the latest AI analysis.</p>
                <button
                  onClick={() => fetchRecommendations(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
                >
                  🔄 Refresh Recommendations
                </button>
              </div>
            )}
          </div>
        ) : (
          // Market Analysis Tab
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">📊 Market Summary</h4>
              <p className="text-blue-800 text-sm">
                Based on analysis of {recommendations.length} stocks using {aiService.getCurrentProvider().toUpperCase()} AI, 
                we found {buySignals} buy opportunities with an average confidence of {avgConfidence}%.
              </p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">💡 Trading Opportunities</h4>
              <p className="text-green-800 text-sm">
                {buySignals > 0 
                  ? `${buySignals} strong buy signals detected. Consider diversifying your portfolio with top-rated recommendations.`
                  : 'No strong buy signals detected at current market conditions. Consider holding existing positions.'
                }
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Risk Assessment</h4>
              <p className="text-yellow-800 text-sm">
                Current market shows mixed signals. Always consider your risk tolerance and portfolio diversification 
                before making trades. AI recommendations are for informational purposes only.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedDailySuggestions;