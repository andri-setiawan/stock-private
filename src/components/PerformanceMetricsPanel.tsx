'use client';

import React, { useState, useEffect } from 'react';
import { usePortfolioStore } from '@/store/portfolio';
import { analyticsEngine, AnalyticsMetrics } from '@/services/analyticsEngine';
import { performanceMetricsService, RiskMetrics, ReturnMetrics } from '@/services/performanceMetrics';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  format?: 'currency' | 'percentage' | 'number' | 'ratio';
  precision?: number;
  icon?: string;
  tooltip?: string;
  size?: 'sm' | 'md' | 'lg';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend = 'neutral',
  format = 'number',
  precision = 2,
  icon,
  tooltip,
  size = 'md'
}) => {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD',
          minimumFractionDigits: precision,
          maximumFractionDigits: precision 
        }).format(val);
      case 'percentage':
        return `${val.toFixed(precision)}%`;
      case 'ratio':
        return val.toFixed(precision);
      default:
        return val.toLocaleString('en-US', { 
          minimumFractionDigits: precision,
          maximumFractionDigits: precision 
        });
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-900';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      default: return '';
    }
  };

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const titleSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm', 
    lg: 'text-base'
  };

  const valueSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl'
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow ${sizeClasses[size]}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`font-medium text-gray-500 ${titleSizeClasses[size]}`} title={tooltip}>
          {title}
        </h3>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      
      <div className={`font-bold ${getTrendColor()} ${valueSizeClasses[size]} mb-1 flex items-center`}>
        {formatValue(value)}
        {trend !== 'neutral' && <span className="ml-1 text-sm">{getTrendIcon()}</span>}
      </div>
      
      {subtitle && (
        <div className="text-xs text-gray-500">
          {subtitle}
        </div>
      )}
    </div>
  );
};

interface MetricsSectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  isLoading?: boolean;
}

const MetricsSection: React.FC<MetricsSectionProps> = ({ title, icon, children, isLoading = false }) => (
  <div className="bg-gray-50 rounded-lg p-4 mb-6">
    <div className="flex items-center mb-4">
      <span className="text-xl mr-2">{icon}</span>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {isLoading && (
        <div className="ml-auto">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      )}
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {children}
    </div>
  </div>
);

interface TimeframeSelectorProps {
  selected: string;
  onSelect: (timeframe: string) => void;
}

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({ selected, onSelect }) => {
  const timeframes = [
    { value: 'week', label: '1W' },
    { value: 'month', label: '1M' },
    { value: 'quarter', label: '3M' },
    { value: 'year', label: '1Y' },
    { value: 'all', label: 'All' }
  ];

  return (
    <div className="flex bg-gray-100 rounded-lg p-1">
      {timeframes.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onSelect(value)}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            selected === value
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

const PerformanceMetricsPanel: React.FC = () => {
  const portfolioStore = usePortfolioStore();
  const { getPortfolioSummary, getTransactionHistory } = portfolioStore;
  
  const [analytics, setAnalytics] = useState<AnalyticsMetrics | null>(null);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [returnMetrics, setReturnMetrics] = useState<ReturnMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Calculate analytics when portfolio changes or timeframe changes
  useEffect(() => {
    calculateMetrics();
  }, [portfolioStore.holdings, portfolioStore.totalValue, selectedTimeframe]);

  const calculateMetrics = async () => {
    setIsLoading(true);
    
    try {
      const portfolio = portfolioStore;
      const transactions = getTransactionHistory();
      
      // Calculate core analytics
      const analyticsData = analyticsEngine.calculatePortfolioAnalytics(
        portfolio,
        transactions,
        selectedTimeframe as any
      );
      setAnalytics(analyticsData);
      
      // Generate mock historical data for performance calculations
      const historicalValues = generateMockHistoricalData(portfolio, transactions);
      const returns = calculateReturnsFromValues(historicalValues);
      
      // Calculate return metrics
      const returnData = performanceMetricsService.calculateReturnMetrics(
        portfolio.initialValue,
        portfolio.totalValue,
        historicalValues,
        generateMockTimestamps(historicalValues.length)
      );
      setReturnMetrics(returnData);
      
      // Calculate risk metrics
      const riskData = performanceMetricsService.calculateRiskMetrics(
        returns,
        historicalValues
      );
      setRiskMetrics(riskData);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error calculating metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to generate mock historical data
  const generateMockHistoricalData = (portfolio: any, transactions: any[]): number[] => {
    const values = [portfolio.initialValue];
    const numPoints = Math.max(30, transactions.length * 2); // At least 30 data points
    
    let currentValue = portfolio.initialValue;
    for (let i = 1; i < numPoints; i++) {
      // Add some random walk with slight upward bias
      const change = (Math.random() - 0.45) * 0.02; // Slight positive bias
      currentValue *= (1 + change);
      values.push(currentValue);
    }
    
    // Ensure the last value matches current portfolio value
    values[values.length - 1] = portfolio.totalValue;
    
    return values;
  };

  const calculateReturnsFromValues = (values: number[]): number[] => {
    const returns = [];
    for (let i = 1; i < values.length; i++) {
      const dailyReturn = (values[i] - values[i - 1]) / values[i - 1];
      returns.push(dailyReturn);
    }
    return returns;
  };

  const generateMockTimestamps = (length: number): Date[] => {
    const timestamps = [];
    const endDate = new Date();
    
    for (let i = 0; i < length; i++) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - (length - 1 - i));
      timestamps.push(date);
    }
    
    return timestamps;
  };

  const getTrendForValue = (value: number): 'up' | 'down' | 'neutral' => {
    if (value > 0.1) return 'up';
    if (value < -0.1) return 'down';
    return 'neutral';
  };

  const getRiskLevel = (score: number): { label: string; color: string } => {
    if (score < 30) return { label: 'Low Risk', color: 'text-green-600' };
    if (score < 60) return { label: 'Moderate Risk', color: 'text-yellow-600' };
    return { label: 'High Risk', color: 'text-red-600' };
  };

  if (!analytics || !returnMetrics || !riskMetrics) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-500">Calculating performance metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  const portfolioSummary = getPortfolioSummary();
  const riskLevel = getRiskLevel(analytics.riskScore);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">📊 Performance Analytics</h1>
            <p className="text-gray-600">
              Comprehensive analysis of your portfolio performance and risk metrics
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <TimeframeSelector 
              selected={selectedTimeframe} 
              onSelect={setSelectedTimeframe} 
            />
          </div>
        </div>
        
        {lastUpdated && (
          <div className="text-xs text-gray-500">
            Last updated: {lastUpdated.toLocaleString()}
          </div>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Return"
          value={analytics.totalReturn}
          format="currency"
          trend={getTrendForValue(analytics.totalReturn)}
          icon="💰"
          size="lg"
          tooltip="Total profit/loss in dollars"
        />
        <MetricCard
          title="Total Return %"
          value={analytics.totalReturnPercent}
          format="percentage"
          trend={getTrendForValue(analytics.totalReturnPercent)}
          icon="📈"
          size="lg"
          tooltip="Total return as percentage of initial investment"
        />
        <MetricCard
          title="Annualized Return"
          value={analytics.annualizedReturn * 100}
          format="percentage"
          trend={getTrendForValue(analytics.annualizedReturn)}
          icon="📅"
          size="lg"
          tooltip="Average annual return"
        />
        <MetricCard
          title="Risk Score"
          value={`${analytics.riskScore}/100`}
          subtitle={riskLevel.label}
          icon="⚠️"
          size="lg"
          tooltip="Overall risk assessment (lower is safer)"
        />
      </div>

      {/* Return Metrics */}
      <MetricsSection title="Return Analysis" icon="📊" isLoading={isLoading}>
        <MetricCard
          title="Day Return"
          value={analytics.dayReturn}
          format="percentage"
          trend={getTrendForValue(analytics.dayReturn)}
          tooltip="Return for the last trading day"
        />
        <MetricCard
          title="Week Return"
          value={analytics.weekReturn}
          format="percentage"
          trend={getTrendForValue(analytics.weekReturn)}
          tooltip="Return for the last week"
        />
        <MetricCard
          title="Month Return"
          value={analytics.monthReturn}
          format="percentage"
          trend={getTrendForValue(analytics.monthReturn)}
          tooltip="Return for the last month"
        />
        <MetricCard
          title="CAGR"
          value={returnMetrics.compoundAnnualGrowthRate}
          format="percentage"
          tooltip="Compound Annual Growth Rate"
        />
      </MetricsSection>

      {/* Risk Metrics */}
      <MetricsSection title="Risk Analysis" icon="⚡" isLoading={isLoading}>
        <MetricCard
          title="Volatility"
          value={analytics.volatility * 100}
          format="percentage"
          tooltip="Annual volatility (standard deviation of returns)"
        />
        <MetricCard
          title="Max Drawdown"
          value={analytics.maxDrawdownPercent}
          format="percentage"
          trend="down"
          tooltip="Largest peak-to-trough decline"
        />
        <MetricCard
          title="Sharpe Ratio"
          value={analytics.sharpeRatio}
          format="ratio"
          trend={analytics.sharpeRatio > 1 ? 'up' : analytics.sharpeRatio < 0 ? 'down' : 'neutral'}
          tooltip="Risk-adjusted return (higher is better)"
        />
        <MetricCard
          title="Sortino Ratio"
          value={analytics.sortinoRatio}
          format="ratio"
          trend={analytics.sortinoRatio > 1 ? 'up' : analytics.sortinoRatio < 0 ? 'down' : 'neutral'}
          tooltip="Downside risk-adjusted return"
        />
        <MetricCard
          title="Value at Risk"
          value={riskMetrics.valueAtRisk}
          format="percentage"
          tooltip="95% confidence daily loss threshold"
        />
        <MetricCard
          title="Beta"
          value={analytics.beta}
          format="ratio"
          tooltip="Sensitivity to market movements (1.0 = market average)"
        />
        <MetricCard
          title="Alpha"
          value={analytics.alpha * 100}
          format="percentage"
          trend={getTrendForValue(analytics.alpha)}
          tooltip="Excess return over expected market return"
        />
        <MetricCard
          title="Calmar Ratio"
          value={analytics.calmarRatio}
          format="ratio"
          tooltip="Annual return divided by maximum drawdown"
        />
      </MetricsSection>

      {/* Portfolio Health */}
      <MetricsSection title="Portfolio Health" icon="🏥" isLoading={isLoading}>
        <MetricCard
          title="Diversification Score"
          value={`${analytics.diversificationScore}/100`}
          subtitle={analytics.diversificationScore > 70 ? 'Well Diversified' : 
                   analytics.diversificationScore > 40 ? 'Moderately Diversified' : 'Concentrated'}
          tooltip="How well diversified your portfolio is (higher is better)"
        />
        <MetricCard
          title="Total Holdings"
          value={Object.keys(portfolioStore.holdings).length}
          format="number"
          precision={0}
          tooltip="Number of different stocks in portfolio"
        />
        <MetricCard
          title="Cash Allocation"
          value={(portfolioSummary.cashBalance / portfolioSummary.totalValue) * 100}
          format="percentage"
          tooltip="Percentage of portfolio in cash"
        />
        <MetricCard
          title="Data Points"
          value={analytics.dataPointsUsed}
          format="number"
          precision={0}
          tooltip="Number of data points used in calculations"
        />
      </MetricsSection>

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={calculateMetrics}
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              Calculating...
            </>
          ) : (
            <>🔄 Refresh Analytics</>
          )}
        </button>
      </div>
    </div>
  );
};

export default PerformanceMetricsPanel;