'use client';

import React, { useMemo } from 'react';
import { usePortfolioStore } from '@/store/portfolio';

interface AIAnalyticsMetrics {
  totalRecommendations: number;
  averageConfidence: number;
  successfulRecommendations: number;
  successRate: number;
  highConfidenceSuccessRate: number;
  mediumConfidenceSuccessRate: number;
  lowConfidenceSuccessRate: number;
  confidenceDistribution: {
    high: number; // 80-100%
    medium: number; // 60-79%
    low: number; // 0-59%
  };
  typeDistribution: {
    buy: number;
    sell: number;
  };
  averageConfidenceByOutcome: {
    successful: number;
    unsuccessful: number;
  };
}

const AIRecommendationAnalytics: React.FC = () => {
  const { getTransactionHistory, holdings } = usePortfolioStore();
  const transactions = getTransactionHistory();

  const aiMetrics = useMemo((): AIAnalyticsMetrics => {
    const aiTransactions = transactions.filter(t => t.aiRecommendation);
    
    if (aiTransactions.length === 0) {
      return {
        totalRecommendations: 0,
        averageConfidence: 0,
        successfulRecommendations: 0,
        successRate: 0,
        highConfidenceSuccessRate: 0,
        mediumConfidenceSuccessRate: 0,
        lowConfidenceSuccessRate: 0,
        confidenceDistribution: { high: 0, medium: 0, low: 0 },
        typeDistribution: { buy: 0, sell: 0 },
        averageConfidenceByOutcome: { successful: 0, unsuccessful: 0 }
      };
    }

    // Calculate success for each transaction
    const successfulTransactions = aiTransactions.filter(t => {
      const holding = holdings[t.symbol];
      return holding && holding.profitLoss > 0;
    });

    // Confidence level categorization
    const highConfidenceTransactions = aiTransactions.filter(t => (t.aiRecommendation?.confidence || 0) >= 80);
    const mediumConfidenceTransactions = aiTransactions.filter(t => {
      const conf = t.aiRecommendation?.confidence || 0;
      return conf >= 60 && conf < 80;
    });
    const lowConfidenceTransactions = aiTransactions.filter(t => (t.aiRecommendation?.confidence || 0) < 60);

    // Success rates by confidence level
    const highConfidenceSuccessful = highConfidenceTransactions.filter(t => {
      const holding = holdings[t.symbol];
      return holding && holding.profitLoss > 0;
    });
    const mediumConfidenceSuccessful = mediumConfidenceTransactions.filter(t => {
      const holding = holdings[t.symbol];
      return holding && holding.profitLoss > 0;
    });
    const lowConfidenceSuccessful = lowConfidenceTransactions.filter(t => {
      const holding = holdings[t.symbol];
      return holding && holding.profitLoss > 0;
    });

    // Type distribution
    const buyTransactions = aiTransactions.filter(t => t.type === 'BUY');
    const sellTransactions = aiTransactions.filter(t => t.type === 'SELL');

    // Average confidence by outcome
    const successfulConfidences = successfulTransactions.map(t => t.aiRecommendation?.confidence || 0);
    const unsuccessfulTransactions = aiTransactions.filter(t => {
      const holding = holdings[t.symbol];
      return !holding || holding.profitLoss <= 0;
    });
    const unsuccessfulConfidences = unsuccessfulTransactions.map(t => t.aiRecommendation?.confidence || 0);

    const avgSuccessfulConfidence = successfulConfidences.length > 0
      ? successfulConfidences.reduce((sum, conf) => sum + conf, 0) / successfulConfidences.length
      : 0;

    const avgUnsuccessfulConfidence = unsuccessfulConfidences.length > 0
      ? unsuccessfulConfidences.reduce((sum, conf) => sum + conf, 0) / unsuccessfulConfidences.length
      : 0;

    return {
      totalRecommendations: aiTransactions.length,
      averageConfidence: aiTransactions.reduce((sum, t) => sum + (t.aiRecommendation?.confidence || 0), 0) / aiTransactions.length,
      successfulRecommendations: successfulTransactions.length,
      successRate: (successfulTransactions.length / aiTransactions.length) * 100,
      highConfidenceSuccessRate: highConfidenceTransactions.length > 0 
        ? (highConfidenceSuccessful.length / highConfidenceTransactions.length) * 100 
        : 0,
      mediumConfidenceSuccessRate: mediumConfidenceTransactions.length > 0 
        ? (mediumConfidenceSuccessful.length / mediumConfidenceTransactions.length) * 100 
        : 0,
      lowConfidenceSuccessRate: lowConfidenceTransactions.length > 0 
        ? (lowConfidenceSuccessful.length / lowConfidenceTransactions.length) * 100 
        : 0,
      confidenceDistribution: {
        high: highConfidenceTransactions.length,
        medium: mediumConfidenceTransactions.length,
        low: lowConfidenceTransactions.length
      },
      typeDistribution: {
        buy: buyTransactions.length,
        sell: sellTransactions.length
      },
      averageConfidenceByOutcome: {
        successful: avgSuccessfulConfidence,
        unsuccessful: avgUnsuccessfulConfidence
      }
    };
  }, [transactions, holdings]);

  const getInsights = (): string[] => {
    const insights: string[] = [];

    if (aiMetrics.totalRecommendations === 0) {
      return ['No AI recommendations yet. Start using AI suggestions to see analytics.'];
    }

    // Success rate insights
    if (aiMetrics.successRate > 70) {
      insights.push('🟢 Excellent AI performance! Success rate above 70%');
    } else if (aiMetrics.successRate > 50) {
      insights.push('🟡 Good AI performance with room for improvement');
    } else if (aiMetrics.successRate > 0) {
      insights.push('🔴 AI recommendations need review - consider adjusting strategy');
    }

    // Confidence correlation insights
    if (aiMetrics.averageConfidenceByOutcome.successful > aiMetrics.averageConfidenceByOutcome.unsuccessful + 10) {
      insights.push('✅ Higher confidence recommendations tend to be more successful');
    } else if (aiMetrics.averageConfidenceByOutcome.unsuccessful > aiMetrics.averageConfidenceByOutcome.successful + 10) {
      insights.push('⚠️ Lower confidence recommendations are performing better - review AI calibration');
    }

    // High confidence performance
    if (aiMetrics.highConfidenceSuccessRate > 80 && aiMetrics.confidenceDistribution.high > 2) {
      insights.push('🎯 High confidence recommendations (80%+) are very reliable');
    }

    // Distribution insights
    if (aiMetrics.confidenceDistribution.low > aiMetrics.totalRecommendations * 0.5) {
      insights.push('📊 Most recommendations are low confidence - consider increasing thresholds');
    }

    return insights.length > 0 ? insights : ['Continue trading to generate more insights.'];
  };

  if (aiMetrics.totalRecommendations === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">🤖 AI Recommendation Analytics</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🤖</div>
          <p className="text-gray-500 mb-2">No AI recommendations yet</p>
          <p className="text-sm text-gray-400">Start using AI suggestions in your trades to see performance analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6">🤖 AI Recommendation Analytics</h3>

      {/* Overall Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">{aiMetrics.totalRecommendations}</p>
          <p className="text-sm text-blue-800">Total AI Trades</p>
        </div>
        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
          <p className="text-2xl font-bold text-green-600">{aiMetrics.successRate.toFixed(1)}%</p>
          <p className="text-sm text-green-800">Success Rate</p>
        </div>
        <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
          <p className="text-2xl font-bold text-purple-600">{aiMetrics.averageConfidence.toFixed(0)}%</p>
          <p className="text-sm text-purple-800">Avg Confidence</p>
        </div>
        <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
          <p className="text-2xl font-bold text-orange-600">{aiMetrics.successfulRecommendations}</p>
          <p className="text-sm text-orange-800">Successful Trades</p>
        </div>
      </div>

      {/* Confidence Level Performance */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Performance by Confidence Level</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* High Confidence */}
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h5 className="font-medium text-green-800">High (80-100%)</h5>
              <span className="text-sm text-green-600">{aiMetrics.confidenceDistribution.high} trades</span>
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-sm">
                <span>Success Rate</span>
                <span>{aiMetrics.highConfidenceSuccessRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${aiMetrics.highConfidenceSuccessRate}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-green-700">
              {aiMetrics.highConfidenceSuccessRate > 75 ? 'Excellent performance' : 
               aiMetrics.highConfidenceSuccessRate > 50 ? 'Good performance' : 'Needs improvement'}
            </p>
          </div>

          {/* Medium Confidence */}
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h5 className="font-medium text-yellow-800">Medium (60-79%)</h5>
              <span className="text-sm text-yellow-600">{aiMetrics.confidenceDistribution.medium} trades</span>
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-sm">
                <span>Success Rate</span>
                <span>{aiMetrics.mediumConfidenceSuccessRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-yellow-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{ width: `${aiMetrics.mediumConfidenceSuccessRate}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-yellow-700">
              {aiMetrics.mediumConfidenceSuccessRate > 60 ? 'Good performance' : 
               aiMetrics.mediumConfidenceSuccessRate > 40 ? 'Fair performance' : 'Needs improvement'}
            </p>
          </div>

          {/* Low Confidence */}
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h5 className="font-medium text-red-800">Low (0-59%)</h5>
              <span className="text-sm text-red-600">{aiMetrics.confidenceDistribution.low} trades</span>
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-sm">
                <span>Success Rate</span>
                <span>{aiMetrics.lowConfidenceSuccessRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-red-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${aiMetrics.lowConfidenceSuccessRate}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-red-700">
              {aiMetrics.lowConfidenceSuccessRate > 40 ? 'Surprising good performance' : 'As expected for low confidence'}
            </p>
          </div>
        </div>
      </div>

      {/* Confidence vs Outcome Analysis */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Confidence vs Outcome Analysis</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="font-medium text-gray-800 mb-3">Average Confidence by Outcome</h5>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-green-600">Successful Trades</span>
                  <span className="text-sm font-medium">{aiMetrics.averageConfidenceByOutcome.successful.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${aiMetrics.averageConfidenceByOutcome.successful}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-red-600">Unsuccessful Trades</span>
                  <span className="text-sm font-medium">{aiMetrics.averageConfidenceByOutcome.unsuccessful.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${aiMetrics.averageConfidenceByOutcome.unsuccessful}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="font-medium text-gray-800 mb-3">Trade Type Distribution</h5>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-blue-600">Buy Orders</span>
                  <span className="text-sm font-medium">{aiMetrics.typeDistribution.buy} trades</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(aiMetrics.typeDistribution.buy / aiMetrics.totalRecommendations) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-purple-600">Sell Orders</span>
                  <span className="text-sm font-medium">{aiMetrics.typeDistribution.sell} trades</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: `${(aiMetrics.typeDistribution.sell / aiMetrics.totalRecommendations) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">💡 AI Performance Insights</h4>
        <div className="space-y-2">
          {getInsights().map((insight, index) => (
            <div key={index} className="flex items-start space-x-2">
              <span className="text-blue-500 mt-1 text-sm">•</span>
              <p className="text-sm text-gray-700">{insight}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIRecommendationAnalytics;