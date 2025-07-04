'use client';

import React, { useState, useEffect } from 'react';
import { usePortfolioStore } from '@/store/portfolio';
import PerformanceMetricsPanel from '@/components/PerformanceMetricsPanel';
import { analyticsEngine, PortfolioAttribution, AIPerformanceMetrics } from '@/services/analyticsEngine';
import MobileNav from '@/components/MobileNav';

interface TabProps {
  id: string;
  label: string;
  icon: string;
  isActive: boolean;
  onClick: (id: string) => void;
  badge?: number;
}

const Tab: React.FC<TabProps> = ({ id, label, icon, isActive, onClick, badge }) => (
  <button
    onClick={() => onClick(id)}
    className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${
      isActive
        ? 'bg-blue-600 text-white shadow-md'
        : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-gray-200'
    }`}
  >
    <span className="mr-2">{icon}</span>
    <span className="font-medium">{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
        isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
      }`}>
        {badge}
      </span>
    )}
  </button>
);

interface QuickStatsCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: string;
}

const QuickStatsCard: React.FC<QuickStatsCardProps> = ({ 
  title, 
  value, 
  change, 
  trend = 'neutral', 
  icon 
}) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      default: return '📊';
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm">{getTrendIcon()}</span>
      </div>
      <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      {change && (
        <div className={`text-sm ${getTrendColor()}`}>
          {change}
        </div>
      )}
    </div>
  );
};

const PortfolioAttributionTab: React.FC = () => {
  const portfolioStore = usePortfolioStore();
  const [attribution, setAttribution] = useState<PortfolioAttribution | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const calculateAttribution = async () => {
      try {
        const transactions = portfolioStore.getTransactionHistory();
        const attributionData = analyticsEngine.calculatePortfolioAttribution(
          portfolioStore,
          transactions
        );
        setAttribution(attributionData);
      } catch (error) {
        console.error('Error calculating attribution:', error);
      } finally {
        setIsLoading(false);
      }
    };

    calculateAttribution();
  }, [portfolioStore.holdings]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">Calculating attribution analysis...</p>
        </div>
      </div>
    );
  }

  if (!attribution) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No attribution data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Asset Allocation */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          🥧 Asset Allocation
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {attribution.assetAllocation.stocks.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">Stocks</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {attribution.assetAllocation.cash.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">Cash</div>
          </div>
        </div>
      </div>

      {/* Stock Contributions */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          📈 Individual Stock Contributions
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-medium text-gray-500">Symbol</th>
                <th className="text-right py-2 font-medium text-gray-500">Weight</th>
                <th className="text-right py-2 font-medium text-gray-500">Return</th>
                <th className="text-right py-2 font-medium text-gray-500">Contribution</th>
                <th className="text-right py-2 font-medium text-gray-500">P&L</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(attribution.stockContributions)
                .sort((a, b) => Math.abs(b[1].contribution) - Math.abs(a[1].contribution))
                .map(([symbol, data]) => (
                <tr key={symbol} className="border-b border-gray-100">
                  <td className="py-3 font-medium">{symbol}</td>
                  <td className="text-right py-3">{data.weight.toFixed(1)}%</td>
                  <td className={`text-right py-3 ${data.return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.return >= 0 ? '+' : ''}{data.return.toFixed(2)}%
                  </td>
                  <td className={`text-right py-3 ${data.contribution >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.contribution >= 0 ? '+' : ''}{data.contribution.toFixed(2)}%
                  </td>
                  <td className={`text-right py-3 font-medium ${data.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.profitLoss >= 0 ? '+' : ''}${data.profitLoss.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sector Contributions */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          🏭 Sector Contributions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(attribution.sectorContributions).map(([sector, data]) => (
            <div key={sector} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{data.sector}</span>
                <span className="text-sm text-gray-500">{data.weight.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Return:</span>
                <span className={`font-medium ${data.return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.return >= 0 ? '+' : ''}{data.return.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Contribution:</span>
                <span className={`font-medium ${data.contribution >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.contribution >= 0 ? '+' : ''}{data.contribution.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time-Weighted Return */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          ⏱️ Time-Weighted Return
        </h3>
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-600 mb-2">
            {attribution.timeWeightedReturn >= 0 ? '+' : ''}{attribution.timeWeightedReturn.toFixed(2)}%
          </div>
          <p className="text-gray-500">
            Accounts for the timing of cash flows and investments
          </p>
        </div>
      </div>
    </div>
  );
};

const AIPerformanceTab: React.FC = () => {
  const portfolioStore = usePortfolioStore();
  const [aiMetrics, setAiMetrics] = useState<AIPerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const calculateAIMetrics = async () => {
      try {
        const transactions = portfolioStore.getTransactionHistory();
        const aiData = analyticsEngine.analyzeAIPerformance(transactions);
        setAiMetrics(aiData);
      } catch (error) {
        console.error('Error calculating AI metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    calculateAIMetrics();
  }, [portfolioStore.transactions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">Analyzing AI performance...</p>
        </div>
      </div>
    );
  }

  if (!aiMetrics || aiMetrics.totalRecommendations === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🤖</div>
        <h3 className="text-lg font-semibold mb-2">No AI Recommendations Yet</h3>
        <p className="text-gray-500">
          Start trading with AI recommendations to see performance analytics
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <QuickStatsCard
          title="Total Recommendations"
          value={aiMetrics.totalRecommendations.toString()}
          icon="🎯"
        />
        <QuickStatsCard
          title="Success Rate"
          value={`${aiMetrics.overallSuccessRate.toFixed(1)}%`}
          trend={aiMetrics.overallSuccessRate > 70 ? 'up' : aiMetrics.overallSuccessRate < 50 ? 'down' : 'neutral'}
          icon="✅"
        />
        <QuickStatsCard
          title="Successful Trades"
          value={aiMetrics.successfulRecommendations.toString()}
          icon="📈"
        />
        <QuickStatsCard
          title="Risk-Adjusted Performance"
          value={aiMetrics.riskAdjustedPerformance.toFixed(2)}
          trend={aiMetrics.riskAdjustedPerformance > 1 ? 'up' : 'down'}
          icon="⚖️"
        />
      </div>

      {/* Confidence Analysis */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          🎯 Confidence Level Analysis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(aiMetrics.confidenceAccuracy).map(([level, data]) => (
            <div key={level} className="p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-semibold mb-2 capitalize">{level} Confidence</div>
                <div className="text-sm text-gray-500 mb-2">{data.range}</div>
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {data.successRate.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">
                  {data.recommendations} recommendations
                </div>
                <div className="text-sm text-green-600 mt-2">
                  Avg Return: +{data.avgReturn.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Best Performing Actions */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          🏆 Best Performing Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(aiMetrics.bestPerformingActions).map(([action, data]) => (
            <div key={action} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-lg">{data.action} Signals</span>
                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {data.count} trades
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Success Rate:</span>
                  <span className="font-medium">{data.successRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Avg Return:</span>
                  <span className="font-medium text-green-600">+{data.avgReturn.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sector Performance */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          🏭 Sector Performance
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(aiMetrics.sectorPerformance).map(([sector, data]) => (
            <div key={sector} className="p-4 border border-gray-200 rounded-lg">
              <div className="text-center">
                <div className="font-medium mb-2">{data.sector}</div>
                <div className="text-xl font-bold text-blue-600 mb-1">
                  {data.successRate.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {data.count} recommendations
                </div>
                <div className="text-sm text-green-600">
                  Avg: +{data.avgReturn.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time to Target */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          ⏱️ Time to Target Analysis
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{aiMetrics.timeToTarget.average}</div>
            <div className="text-sm text-gray-500">Avg Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{aiMetrics.timeToTarget.median}</div>
            <div className="text-sm text-gray-500">Median Days</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(aiMetrics.timeToTarget.distribution).map(([period, percentage]) => (
            <div key={period} className="text-center p-2 bg-gray-50 rounded">
              <div className="font-medium">{percentage}%</div>
              <div className="text-xs text-gray-500">{period}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const BenchmarkTab: React.FC = () => (
  <div className="space-y-6">
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-lg font-semibold mb-2">Benchmark Comparison</h3>
        <p className="text-gray-500 mb-4">
          Compare your portfolio performance against market indices
        </p>
        <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
          🚧 Coming Soon: Real-time benchmark comparison with S&P 500, NASDAQ, and sector indices
        </div>
      </div>
    </div>
  </div>
);

const AdvancedAnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('performance');
  const portfolioStore = usePortfolioStore();
  
  const tabs = [
    { id: 'performance', label: 'Performance', icon: '📊' },
    { id: 'attribution', label: 'Attribution', icon: '🥧' },
    { id: 'ai-performance', label: 'AI Analysis', icon: '🤖', badge: portfolioStore.getTransactionHistory().filter(t => t.aiRecommendation).length },
    { id: 'benchmarks', label: 'Benchmarks', icon: '📈' }
  ];

  const portfolioSummary = portfolioStore.getPortfolioSummary();
  const hasHoldings = Object.keys(portfolioStore.holdings).length > 0;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'performance':
        return <PerformanceMetricsPanel />;
      case 'attribution':
        return <PortfolioAttributionTab />;
      case 'ai-performance':
        return <AIPerformanceTab />;
      case 'benchmarks':
        return <BenchmarkTab />;
      default:
        return <PerformanceMetricsPanel />;
    }
  };

  if (!hasHoldings) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Advanced Analytics</h1>
            <p className="text-gray-600 mb-6">
              Start trading to unlock comprehensive portfolio analytics and performance insights
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-blue-800">
                💡 Once you have trades, you&apos;ll see:
              </p>
              <ul className="text-blue-700 text-sm mt-2 space-y-1">
                <li>• Risk-adjusted performance metrics (Sharpe, Sortino ratios)</li>
                <li>• Portfolio attribution analysis</li>
                <li>• AI recommendation performance tracking</li>
                <li>• Benchmark comparisons</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 Advanced Analytics</h1>
              <p className="text-gray-600">
                Deep insights into your portfolio performance, risk metrics, and AI recommendation effectiveness
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 lg:w-80">
              <QuickStatsCard
                title="Total Value"
                value={`$${portfolioSummary.totalValue.toLocaleString()}`}
                icon="💼"
              />
              <QuickStatsCard
                title="Total P&L"
                value={`${portfolioSummary.totalProfitLoss >= 0 ? '+' : ''}$${portfolioSummary.totalProfitLoss.toFixed(2)}`}
                trend={portfolioSummary.totalProfitLoss > 0 ? 'up' : portfolioSummary.totalProfitLoss < 0 ? 'down' : 'neutral'}
                icon="📈"
              />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <Tab
                key={tab.id}
                id={tab.id}
                label={tab.label}
                icon={tab.icon}
                isActive={activeTab === tab.id}
                onClick={setActiveTab}
                badge={tab.badge}
              />
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mb-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
};

export default AdvancedAnalyticsPage;