'use client';

import React from 'react';

export interface PerformanceMetric {
  label: string;
  value: string | number;
  change?: number;
  changePercent?: number;
  format: 'currency' | 'percentage' | 'ratio' | 'number';
  description?: string;
  isPositiveGood?: boolean;
}

interface PerformanceMetricsProps {
  metrics: PerformanceMetric[];
  title?: string;
  columns?: 2 | 3 | 4;
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  metrics,
  title = "Performance Metrics",
  columns = 3
}) => {
  const formatValue = (value: string | number, format: PerformanceMetric['format']): string => {
    if (typeof value === 'string') return value;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      case 'percentage':
        return `${value.toFixed(2)}%`;
      case 'ratio':
        return value.toFixed(2);
      case 'number':
        return value.toLocaleString();
      default:
        return String(value);
    }
  };

  const getChangeColor = (change: number, isPositiveGood: boolean = true): string => {
    if (change === 0) return 'text-gray-600';
    
    const isPositive = change > 0;
    if (isPositiveGood) {
      return isPositive ? 'text-green-600' : 'text-red-600';
    } else {
      return isPositive ? 'text-red-600' : 'text-green-600';
    }
  };

  const getChangeIcon = (change: number): string => {
    if (change > 0) return '↗️';
    if (change < 0) return '↘️';
    return '→';
  };

  const getGridCols = (cols: number): string => {
    switch (cols) {
      case 2: return 'grid-cols-1 sm:grid-cols-2';
      case 3: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 4: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
      default: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    }
  };

  if (!metrics.length) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center text-gray-500 py-8">
          <div className="text-2xl mb-2">📊</div>
          <p className="text-sm">No performance metrics available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="text-xs text-gray-500">
          Updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className={`grid ${getGridCols(columns)} gap-6`}>
        {metrics.map((metric, index) => (
          <div 
            key={index} 
            className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            {/* Metric Label */}
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-600 leading-tight">
                {metric.label}
              </h4>
              {metric.description && (
                <div className="group relative">
                  <div className="w-4 h-4 rounded-full bg-gray-200 text-xs flex items-center justify-center cursor-help text-gray-600">
                    ?
                  </div>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    {metric.description}
                  </div>
                </div>
              )}
            </div>

            {/* Metric Value */}
            <div className="mb-2">
              <p className="text-2xl font-bold text-gray-900">
                {formatValue(metric.value, metric.format)}
              </p>
            </div>

            {/* Change Indicator */}
            {metric.change !== undefined && metric.changePercent !== undefined && (
              <div className="flex items-center space-x-1">
                <span className={`text-sm font-medium ${getChangeColor(metric.change, metric.isPositiveGood)}`}>
                  {getChangeIcon(metric.change)} 
                  {metric.change >= 0 ? '+' : ''}{formatValue(metric.change, metric.format)}
                </span>
                <span className={`text-xs ${getChangeColor(metric.changePercent, metric.isPositiveGood)}`}>
                  ({metric.changePercent >= 0 ? '+' : ''}{metric.changePercent.toFixed(2)}%)
                </span>
              </div>
            )}

            {/* Performance Indicator Bar */}
            {metric.format === 'percentage' && typeof metric.value === 'number' && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      metric.value >= 0 ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{ 
                      width: `${Math.min(Math.abs(metric.value), 100)}%` 
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Note */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-start space-x-2 text-xs text-gray-500">
          <span>ℹ️</span>
          <p className="leading-relaxed">
            Performance metrics are calculated based on your portfolio data and market conditions. 
            These metrics provide insights into risk, return, and efficiency of your investment strategy.
            {metrics.some(m => m.format === 'ratio') && ' Ratios above 1.0 generally indicate better performance.'}
          </p>
        </div>
      </div>

      {/* Key Insights */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Best Performer */}
        {(() => {
          const bestMetric = metrics
            .filter(m => typeof m.value === 'number' && m.isPositiveGood !== false)
            .sort((a, b) => (b.value as number) - (a.value as number))[0];
          
          return bestMetric && (
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-green-600 font-medium">Best Metric</p>
              <p className="text-sm font-semibold text-green-800">{bestMetric.label}</p>
              <p className="text-xs text-green-600">
                {formatValue(bestMetric.value, bestMetric.format)}
              </p>
            </div>
          );
        })()}

        {/* Needs Attention */}
        {(() => {
          const worstMetric = metrics
            .filter(m => typeof m.value === 'number' && m.value < 0)
            .sort((a, b) => (a.value as number) - (b.value as number))[0];
          
          return worstMetric && (
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-red-600 font-medium">Needs Attention</p>
              <p className="text-sm font-semibold text-red-800">{worstMetric.label}</p>
              <p className="text-xs text-red-600">
                {formatValue(worstMetric.value, worstMetric.format)}
              </p>
            </div>
          );
        })()}

        {/* Total Metrics */}
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-600 font-medium">Total Metrics</p>
          <p className="text-sm font-semibold text-blue-800">{metrics.length} indicators</p>
          <p className="text-xs text-blue-600">Performance tracking</p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;