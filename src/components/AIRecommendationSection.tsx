'use client';

import { useState, useEffect } from 'react';
import { unifiedRecommendations, UnifiedRecommendation } from '@/services/unifiedRecommendations';
import { aiService, getUserPreferredProvider } from '@/services/aiService';

interface AIRecommendationSectionProps {
  onStockSelect: (symbol: string) => void;
  currentSymbol?: string;
}

export default function AIRecommendationSection({ onStockSelect, currentSymbol }: AIRecommendationSectionProps) {
  const [recommendations, setRecommendations] = useState<UnifiedRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize AI service with user's preferred provider
    const preferredProvider = getUserPreferredProvider();
    aiService.setProvider(preferredProvider);
    console.log(`🤖 AIRecommendationSection: Using ${preferredProvider.toUpperCase()} AI provider`);
    
    // Listen for provider changes and refresh recommendations
    const handleProviderChange = (newProvider: 'gemini' | 'groq' | 'openai') => {
      console.log(`🔄 AIRecommendationSection: Provider changed to ${newProvider.toUpperCase()}, refreshing...`);
      unifiedRecommendations.clearCache();
      loadRecommendations();
    };
    
    aiService.addProviderChangeListener(handleProviderChange);
    
    loadRecommendations();
    
    // Cleanup listener on unmount
    return () => {
      aiService.removeProviderChangeListener(handleProviderChange);
    };
  }, []);

  const loadRecommendations = async () => {
    try {
      setIsLoading(true);
      
      // Use unified recommendation service for consistency
      const recommendations = await unifiedRecommendations.getDailyRecommendations(3);
      setRecommendations(recommendations);
    } catch (error) {
      console.error('Error loading AI recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTradeStock = (symbol: string) => {
    onStockSelect(symbol);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-bold text-gray-900">
            🤖 Today&apos;s AI Recommendations
          </h2>
          {recommendations.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">by</span>
              {recommendations[0].aiProvider === 'gemini' ? (
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-xs">G</span>
                  </div>
                  <span className="text-xs font-medium text-blue-700">Gemini</span>
                </div>
              ) : recommendations[0].aiProvider === 'groq' ? (
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-gradient-to-br from-orange-500 to-red-600 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-xs">Q</span>
                  </div>
                  <span className="text-xs font-medium text-orange-700">GROQ</span>
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
          )}
        </div>
        <button
          onClick={() => window.location.href = '/suggestions'}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          View All →
        </button>
      </div>

      {/* Featured Recommendation */}
      {recommendations.length > 0 && (
        <div className={`rounded-lg border-2 p-4 mb-4 ${getRecommendationBg(recommendations[0].recommendation)}`}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">⭐</div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">{recommendations[0].symbol}</h3>
                <div className={`text-sm font-semibold ${getRecommendationColor(recommendations[0].recommendation)}`}>
                  {recommendations[0].recommendation} • {recommendations[0].confidence}% Confidence
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">{formatCurrency(recommendations[0].currentPrice)}</p>
              <p className={`text-sm ${recommendations[0].changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {recommendations[0].changePercent >= 0 ? '+' : ''}{recommendations[0].change.toFixed(2)} 
                ({recommendations[0].changePercent.toFixed(2)}%)
              </p>
            </div>
          </div>

          <p className="text-gray-700 text-sm mb-3">{recommendations[0].reasoning}</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-xs">
              <span className={`px-2 py-1 rounded ${
                recommendations[0].riskLevel === 'LOW' ? 'bg-green-100 text-green-800' :
                recommendations[0].riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
              }`}>
                {recommendations[0].riskLevel} Risk
              </span>
              {recommendations[0].targetPrice && (
                <span className="text-gray-600">
                  Target: {formatCurrency(recommendations[0].targetPrice)}
                </span>
              )}
            </div>
            <button
              onClick={() => handleTradeStock(recommendations[0].symbol)}
              className={`px-4 py-2 rounded-lg font-medium ${
                recommendations[0].recommendation === 'BUY' 
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : recommendations[0].recommendation === 'SELL'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              {recommendations[0].recommendation === 'BUY' ? '🚀 Trade Now' : 
               recommendations[0].recommendation === 'SELL' ? '📉 Review Position' : '📊 Analyze'}
            </button>
          </div>
        </div>
      )}

      {/* Quick Picks */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Quick Picks</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recommendations.slice(1, 3).map((rec) => (
            <div
              key={rec.id}
              className={`border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow ${
                currentSymbol === rec.symbol ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => handleTradeStock(rec.symbol)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-gray-900">{rec.symbol}</span>
                  <span className={`text-xs px-2 py-1 rounded ${getRecommendationColor(rec.recommendation).replace('text-', 'bg-').replace('-600', '-100')} ${getRecommendationColor(rec.recommendation)}`}>
                    {rec.recommendation}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{formatCurrency(rec.currentPrice)}</p>
                  <p className={`text-xs ${rec.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {rec.changePercent >= 0 ? '+' : ''}{rec.changePercent.toFixed(2)}%
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">{rec.reasoning}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">{rec.confidence}% confidence</span>
                <span className="text-xs text-blue-600 font-medium">Click to trade →</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">💡 Want more AI insights?</p>
            <p className="text-xs text-blue-700">View detailed analysis and historical performance</p>
          </div>
          <button
            onClick={() => window.location.href = '/suggestions'}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            View All Tips
          </button>
        </div>
      </div>
    </div>
  );
}