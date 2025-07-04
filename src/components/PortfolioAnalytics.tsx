'use client';

import React, { useState, useMemo } from 'react';
import { usePortfolioStore } from '@/store/portfolio';
import { portfolioAnalyticsService } from '@/services/portfolioAnalytics';
import PortfolioChart, { PortfolioDataPoint } from './charts/PortfolioChart';
import AllocationChart, { AllocationData } from './charts/AllocationChart';
import PerformanceMetrics, { PerformanceMetric } from './charts/PerformanceMetrics';
import TimeRangeSelector, { TimeRange } from './charts/TimeRangeSelector';

// Mock sector data - in a real app, this would come from your API
const SECTOR_MAPPING: Record<string, string> = {
  'AAPL': 'Technology',
  'MSFT': 'Technology',
  'GOOGL': 'Technology',
  'AMZN': 'Consumer Discretionary',
  'TSLA': 'Consumer Discretionary',
  'META': 'Technology',
  'NFLX': 'Communication Services',
  'NVDA': 'Technology',
  'AMD': 'Technology',
  'INTC': 'Technology',
  'JPM': 'Financial Services',
  'BAC': 'Financial Services',
  'WMT': 'Consumer Staples',
  'PG': 'Consumer Staples',
  'JNJ': 'Healthcare',
  'PFE': 'Healthcare',
  'KO': 'Consumer Staples',
  'DIS': 'Communication Services',
  'V': 'Financial Services',
  'MA': 'Financial Services'
};

interface AnalyticsTabProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const AnalyticsTabs: React.FC<AnalyticsTabProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📈' },
    { id: 'allocation', label: 'Allocation', icon: '📊' },
    { id: 'performance', label: 'Performance', icon: '🎯' }
  ];

  return (
    <div className="flex border-b border-gray-200 mt-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
            activeTab === tab.id
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          title={`View ${tab.label.toLowerCase()} analytics`}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>
  );
};


const PortfolioAnalytics: React.FC = () => {
  const portfolioStore = usePortfolioStore();
  const { holdings, getPortfolioSummary, getTransactionHistory } = portfolioStore;
  
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('1M');
  const [activeTab, setActiveTab] = useState<'overview' | 'allocation' | 'performance'>('overview');

  const portfolioSummary = getPortfolioSummary();
  const transactions = getTransactionHistory();

  // Generate mock historical data for portfolio chart
  const historicalData = useMemo((): PortfolioDataPoint[] => {
    const data: PortfolioDataPoint[] = [];
    const now = new Date();
    const daysToGenerate = selectedTimeRange === '1D' ? 24 : 
                          selectedTimeRange === '1W' ? 7 :
                          selectedTimeRange === '1M' ? 30 :
                          selectedTimeRange === '3M' ? 90 :
                          selectedTimeRange === '6M' ? 180 :
                          selectedTimeRange === '1Y' ? 365 : 90;

    const startingValue = 10000;
    const currentValue = portfolioSummary.totalValue;
    
    for (let i = daysToGenerate; i >= 0; i--) {
      const date = new Date(now);
      if (selectedTimeRange === '1D') {
        date.setHours(date.getHours() - i);
      } else {
        date.setDate(date.getDate() - i);
      }
      
      // Generate some realistic-looking data
      const variance = 0.02; // 2% daily variance
      const trend = (daysToGenerate - i) / daysToGenerate * 0.1; // 10% overall trend
      const randomFactor = (Math.random() - 0.5) * variance;
      const dayValue = startingValue * (1 + trend + randomFactor);
      
      // Calculate daily change
      const previousValue = i === daysToGenerate ? startingValue : data[data.length - 1]?.totalValue || startingValue;
      const dailyChange = dayValue - previousValue;
      const dailyChangePercent = previousValue > 0 ? (dailyChange / previousValue) * 100 : 0;
      
      data.push({
        date,
        totalValue: i === 0 ? currentValue : dayValue,
        dailyChange,
        dailyChangePercent,
        cashBalance: portfolioSummary.cashBalance,
        investedAmount: portfolioSummary.investedAmount
      });
    }
    
    return data;
  }, [selectedTimeRange, portfolioSummary]);

  // Generate allocation data for holdings
  const holdingsAllocation = useMemo((): AllocationData[] => {
    return Object.entries(holdings).map(([symbol, holding]) => ({
      symbol,
      name: symbol, // In a real app, get company name from API
      value: holding.totalValue,
      percentage: portfolioSummary.totalValue > 0 ? 
        (holding.totalValue / portfolioSummary.totalValue) * 100 : 0,
      sector: SECTOR_MAPPING[symbol] || 'Other'
    }));
  }, [holdings, portfolioSummary.totalValue]);

  // Generate sector allocation data
  const sectorAllocation = useMemo((): AllocationData[] => {
    const sectorTotals: Record<string, { value: number; symbols: string[] }> = {};
    
    Object.entries(holdings).forEach(([symbol, holding]) => {
      const sector = SECTOR_MAPPING[symbol] || 'Other';
      if (!sectorTotals[sector]) {
        sectorTotals[sector] = { value: 0, symbols: [] };
      }
      sectorTotals[sector].value += holding.totalValue;
      sectorTotals[sector].symbols.push(symbol);
    });

    return Object.entries(sectorTotals).map(([sector, data]) => ({
      symbol: sector,
      name: sector,
      value: data.value,
      percentage: portfolioSummary.totalValue > 0 ? 
        (data.value / portfolioSummary.totalValue) * 100 : 0,
      sector
    }));
  }, [holdings, portfolioSummary.totalValue]);

  // Calculate performance metrics
  const performanceMetrics = useMemo((): PerformanceMetric[] => {
    const analytics = portfolioAnalyticsService.calculatePerformanceMetrics(
      {
        holdings: portfolioStore.holdings,
        transactions: portfolioStore.transactions,
        cashBalance: portfolioStore.cashBalance,
        totalValue: portfolioStore.totalValue,
        initialValue: 10000, // Starting value
        lastUpdated: new Date()
      },
      {}, // Mock price history
      SECTOR_MAPPING
    );

    return [
      {
        label: 'Total Return',
        value: analytics.totalReturn,
        format: 'percentage',
        description: 'Total percentage return on investment',
        isPositiveGood: true
      },
      {
        label: 'Annualized Return',
        value: analytics.annualizedReturn,
        format: 'percentage',
        description: 'Expected yearly return based on current performance',
        isPositiveGood: true
      },
      {
        label: 'Sharpe Ratio',
        value: analytics.sharpeRatio,
        format: 'ratio',
        description: 'Risk-adjusted return measure (higher is better)',
        isPositiveGood: true
      },
      {
        label: 'Portfolio Volatility',
        value: analytics.volatility,
        format: 'percentage',
        description: 'Measure of price fluctuation risk',
        isPositiveGood: false
      },
      {
        label: 'Max Drawdown',
        value: analytics.maxDrawdown,
        format: 'percentage',
        description: 'Largest peak-to-trough decline',
        isPositiveGood: false
      },
      {
        label: 'Win Rate',
        value: analytics.winRate,
        format: 'percentage',
        description: 'Percentage of profitable positions',
        isPositiveGood: true
      },
      {
        label: 'Avg Win',
        value: analytics.avgWinAmount,
        format: 'currency',
        description: 'Average profit per winning trade',
        isPositiveGood: true
      },
      {
        label: 'Avg Loss',
        value: Math.abs(analytics.avgLossAmount),
        format: 'currency',
        description: 'Average loss per losing trade',
        isPositiveGood: false
      },
      {
        label: 'Concentration Risk',
        value: analytics.concentrationRisk,
        format: 'percentage',
        description: 'Portfolio concentration measure (lower is better)',
        isPositiveGood: false
      }
    ];
  }, [portfolioStore]);

  const hasHoldings = Object.keys(holdings).length > 0;

  if (!hasHoldings) {
    return (
      <div className="p-4 space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-gray-500">
            <h3 className="text-lg font-medium mb-2">📊 Portfolio Analytics</h3>
            <p>Start trading to see comprehensive portfolio analytics and performance charts</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Portfolio Analytics</h2>
            <p className="text-gray-600">
              Comprehensive performance analysis and insights
            </p>
          </div>
          
          {/* Time Range Selector */}
          <div className="mt-4 sm:mt-0">
            <TimeRangeSelector
              selectedRange={selectedTimeRange}
              onRangeChange={setSelectedTimeRange}
              size="md"
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <AnalyticsTabs activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as 'overview' | 'allocation' | 'performance')} />
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Portfolio Chart */}
          <PortfolioChart
            data={historicalData}
            height={400}
            timeRange={selectedTimeRange}
          />

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {Object.keys(holdings).length}
              </div>
              <div className="text-sm text-gray-600">Active Positions</div>
              <div className="text-xs text-gray-500 mt-1">
                Across {new Set(Object.values(SECTOR_MAPPING)).size} sectors
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <div className={`text-2xl font-bold mb-1 ${
                portfolioSummary.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {portfolioSummary.totalProfitLoss >= 0 ? '+' : ''}
                {portfolioSummary.totalProfitLossPercent.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Total Return</div>
              <div className="text-xs text-gray-500 mt-1">
                ${portfolioSummary.totalProfitLoss.toFixed(2)} P&L
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                ${portfolioSummary.totalValue.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Portfolio Value</div>
              <div className="text-xs text-gray-500 mt-1">
                {((portfolioSummary.investedAmount / portfolioSummary.totalValue) * 100).toFixed(1)}% invested
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'allocation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Holdings Allocation */}
            <AllocationChart
              data={holdingsAllocation}
              type="holdings"
              height={350}
              maxItems={8}
            />

            {/* Sector Allocation */}
            <AllocationChart
              data={sectorAllocation}
              type="sectors"
              height={350}
              maxItems={6}
            />
          </div>

          {/* Detailed Holdings Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Detailed Holdings</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Symbol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sector
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Allocation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      P&L
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {holdingsAllocation
                    .sort((a, b) => b.value - a.value)
                    .map((holding) => {
                      const holdingData = holdings[holding.symbol];
                      return (
                        <tr key={holding.symbol}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {holding.symbol}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {holding.sector}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {holdingData.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${holding.value.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {holding.percentage.toFixed(2)}%
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            holdingData.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {holdingData.profitLoss >= 0 ? '+' : ''}${holdingData.profitLoss.toFixed(2)}
                            <br />
                            <span className="text-xs">
                              ({holdingData.profitLoss >= 0 ? '+' : ''}{holdingData.profitLossPercent.toFixed(2)}%)
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Performance Metrics */}
          <PerformanceMetrics
            metrics={performanceMetrics}
            title="Advanced Performance Analysis"
            columns={3}
          />

          {/* Additional Performance Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Risk Analysis */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Analysis</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Concentration Risk</span>
                  <span className="text-sm font-medium text-gray-900">
                    {holdingsAllocation.length > 0 && holdingsAllocation[0].percentage > 30 ? 'High' : 
                     holdingsAllocation.length > 0 && holdingsAllocation[0].percentage > 20 ? 'Medium' : 'Low'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Sector Diversification</span>
                  <span className="text-sm font-medium text-gray-900">
                    {sectorAllocation.length >= 5 ? 'Good' : sectorAllocation.length >= 3 ? 'Fair' : 'Poor'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Position Size Risk</span>
                  <span className="text-sm font-medium text-gray-900">
                    {holdingsAllocation.every(h => h.percentage < 25) ? 'Low' : 'Medium'}
                  </span>
                </div>
              </div>
            </div>

            {/* Trading Activity */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Trading Activity</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Trades</span>
                  <span className="text-sm font-medium text-gray-900">{transactions.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Buy Orders</span>
                  <span className="text-sm font-medium text-gray-900">
                    {transactions.filter(t => t.type === 'BUY').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Sell Orders</span>
                  <span className="text-sm font-medium text-gray-900">
                    {transactions.filter(t => t.type === 'SELL').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Trade Size</span>
                  <span className="text-sm font-medium text-gray-900">
                    ${transactions.length > 0 ? 
                      (transactions.reduce((sum, t) => sum + (t.quantity * t.price), 0) / transactions.length).toFixed(0) : 
                      '0'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioAnalytics;