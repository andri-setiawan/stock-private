'use client';

import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

export interface PortfolioDataPoint {
  date: Date;
  totalValue: number;
  dailyChange: number;
  dailyChangePercent: number;
  cashBalance: number;
  investedAmount: number;
}

interface PortfolioChartProps {
  data: PortfolioDataPoint[];
  height?: number;
  timeRange?: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';
}

const PortfolioChart: React.FC<PortfolioChartProps> = ({
  data,
  height = 400,
  timeRange = '1M'
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'value' | 'return' | 'change'>('value');

  // Filter data based on time range
  const filteredData = useMemo(() => {
    if (!data.length) return [];
    
    const now = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '1D':
        startDate.setDate(now.getDate() - 1);
        break;
      case '1W':
        startDate.setDate(now.getDate() - 7);
        break;
      case '1M':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6M':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1Y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return data;
    }
    
    return data.filter(point => point.date >= startDate);
  }, [data, timeRange]);

  // Calculate chart data based on selected metric
  const chartData = useMemo(() => {
    if (!filteredData.length) return null;

    const initialValue = filteredData[0]?.totalValue || 10000;
    
    let chartPoints: number[] = [];
    let label = '';
    let borderColor = '#3B82F6';
    let backgroundColor = 'rgba(59, 130, 246, 0.1)';

    switch (selectedMetric) {
      case 'value':
        chartPoints = filteredData.map(point => point.totalValue);
        label = 'Portfolio Value';
        break;
      case 'return':
        chartPoints = filteredData.map(point => 
          ((point.totalValue - initialValue) / initialValue) * 100
        );
        label = 'Total Return (%)';
        borderColor = '#10B981';
        backgroundColor = 'rgba(16, 185, 129, 0.1)';
        break;
      case 'change':
        chartPoints = filteredData.map(point => point.dailyChange);
        label = 'Daily Change ($)';
        borderColor = '#F59E0B';
        backgroundColor = 'rgba(245, 158, 11, 0.1)';
        break;
    }

    return {
      labels: filteredData.map(point => point.date),
      datasets: [
        {
          label,
          data: chartPoints,
          borderColor,
          backgroundColor,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: true,
          tension: 0.4,
        }
      ]
    };
  }, [filteredData, selectedMetric]);

  // Chart options
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1F2937',
        bodyColor: '#4B5563',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          title: (context: any) => {
            const date = new Date(context[0].label);
            return date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: timeRange === '1D' ? 'numeric' : undefined,
              minute: timeRange === '1D' ? '2-digit' : undefined,
            });
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (context: any) => {
            const value = context.parsed.y;
            if (selectedMetric === 'value' || selectedMetric === 'change') {
              return `${context.dataset.label}: $${value.toLocaleString()}`;
            } else {
              return `${context.dataset.label}: ${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
            }
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: timeRange === '1D' ? 'hour' : timeRange === '1W' ? 'day' : 'day',
          displayFormats: {
            hour: 'HH:mm',
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy'
          }
        },
        grid: {
          display: false,
        },
        ticks: {
          color: '#9CA3AF',
          maxTicksLimit: 6,
        }
      },
      y: {
        grid: {
          color: 'rgba(156, 163, 175, 0.2)',
        },
        ticks: {
          color: '#9CA3AF',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callback: function(value: any) {
            if (selectedMetric === 'value' || selectedMetric === 'change') {
              return '$' + Number(value).toLocaleString();
            } else {
              return Number(value).toFixed(1) + '%';
            }
          }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    elements: {
      point: {
        hoverBackgroundColor: '#FFFFFF',
        hoverBorderWidth: 2,
      }
    }
  };

  if (!chartData || !filteredData.length) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200"
        style={{ height }}
      >
        <div className="text-center text-gray-500">
          <div className="text-2xl mb-2">📈</div>
          <p className="text-sm">No data available for selected period</p>
        </div>
      </div>
    );
  }

  const latestPoint = filteredData[filteredData.length - 1];
  const previousPoint = filteredData[filteredData.length - 2];
  const isPositive = latestPoint && previousPoint ? 
    latestPoint.totalValue >= previousPoint.totalValue : true;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Portfolio Performance
          </h3>
          {latestPoint && (
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-gray-900">
                {selectedMetric === 'value' 
                  ? `$${latestPoint.totalValue.toLocaleString()}`
                  : selectedMetric === 'return'
                  ? `${((latestPoint.totalValue - (filteredData[0]?.totalValue || 10000)) / (filteredData[0]?.totalValue || 10000) * 100).toFixed(2)}%`
                  : `$${latestPoint.dailyChange.toFixed(2)}`
                }
              </span>
              <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '↗️' : '↘️'} 
                {latestPoint.dailyChangePercent >= 0 ? '+' : ''}{latestPoint.dailyChangePercent.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* Metric Selector */}
        <div className="flex bg-gray-100 rounded-lg p-1 mt-4 sm:mt-0">
          {[
            { key: 'value', label: 'Value' },
            { key: 'return', label: 'Return' },
            { key: 'change', label: 'Change' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedMetric(key as 'value' | 'return' | 'change')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedMetric === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height }}>
        <Line data={chartData} options={options} />
      </div>

      {/* Stats */}
      {latestPoint && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Cash Balance</p>
            <p className="text-sm font-semibold text-gray-900">
              ${latestPoint.cashBalance.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Invested</p>
            <p className="text-sm font-semibold text-gray-900">
              ${latestPoint.investedAmount.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Daily Change</p>
            <p className={`text-sm font-semibold ${latestPoint.dailyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {latestPoint.dailyChange >= 0 ? '+' : ''}${latestPoint.dailyChange.toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Allocation</p>
            <p className="text-sm font-semibold text-gray-900">
              {latestPoint.totalValue > 0 ? ((latestPoint.investedAmount / latestPoint.totalValue) * 100).toFixed(1) : '0.0'}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioChart;