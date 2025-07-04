'use client';

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export interface AllocationData {
  symbol: string;
  name: string;
  value: number;
  percentage: number;
  sector?: string;
  color?: string;
}

interface AllocationChartProps {
  data: AllocationData[];
  type: 'holdings' | 'sectors';
  showLegend?: boolean;
  height?: number;
  maxItems?: number;
}

const AllocationChart: React.FC<AllocationChartProps> = ({
  data,
  type,
  showLegend = true,
  height = 300,
  maxItems = 8
}) => {
  // Generate colors for chart segments
  const generateColors = (count: number): string[] => {
    const baseColors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Yellow
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#F97316', // Orange
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#EC4899', // Pink
      '#6B7280', // Gray
    ];
    
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
  };

  // Process and sort data
  const processedData = useMemo(() => {
    if (!data.length) return { chartData: [], others: 0 };

    // Sort by value descending
    const sorted = [...data].sort((a, b) => b.value - a.value);
    
    // Take top N items, group the rest as "Others"
    const chartData = sorted.slice(0, maxItems);
    const others = sorted.slice(maxItems);
    
    let othersValue = 0;
    let othersPercentage = 0;
    
    const finalChartData = [...chartData];
    if (others.length > 0) {
      othersValue = others.reduce((sum, item) => sum + item.value, 0);
      othersPercentage = others.reduce((sum, item) => sum + item.percentage, 0);
      
      finalChartData.push({
        symbol: 'OTHERS',
        name: `Others (${others.length} items)`,
        value: othersValue,
        percentage: othersPercentage,
        sector: 'Mixed'
      });
    }

    return { chartData: finalChartData, others: others.length };
  }, [data, maxItems]);

  // Chart data configuration
  const chartDataConfig = useMemo(() => {
    const { chartData: processedChartData } = processedData;
    const colors = generateColors(processedChartData.length);

    return {
      labels: processedChartData.map(item => 
        type === 'holdings' ? item.symbol : item.sector || item.name
      ),
      datasets: [
        {
          data: processedChartData.map(item => item.percentage),
          backgroundColor: colors,
          borderColor: colors.map(color => color),
          borderWidth: 2,
          hoverBorderWidth: 3,
          hoverOffset: 4
        }
      ]
    };
  }, [processedData, type]);

  // Chart options
  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12
          },
          generateLabels: () => {
            const { chartData: processedChartData } = processedData;
            return processedChartData.map((item, index) => ({
              text: `${type === 'holdings' ? item.symbol : item.sector || item.name} (${item.percentage.toFixed(1)}%)`,
              fillStyle: chartDataConfig.datasets[0].backgroundColor![index] as string,
              strokeStyle: chartDataConfig.datasets[0].borderColor![index] as string,
              lineWidth: 2,
              hidden: false,
              index
            }));
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1F2937',
        bodyColor: '#4B5563',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          title: (context) => {
            const index = context[0].dataIndex;
            const item = processedData.chartData[index];
            return type === 'holdings' ? item.symbol : item.sector || item.name;
          },
          label: (context) => {
            const index = context.dataIndex;
            const item = processedData.chartData[index];
            return [
              `Value: $${item.value.toLocaleString()}`,
              `Percentage: ${item.percentage.toFixed(2)}%`,
              ...(type === 'holdings' && item.name ? [`Name: ${item.name}`] : []),
              ...(type === 'holdings' && item.sector ? [`Sector: ${item.sector}`] : [])
            ];
          }
        }
      }
    },
    cutout: '60%',
    radius: '90%',
    animation: {
      animateRotate: true,
      animateScale: false
    }
  };

  if (!data.length) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200"
        style={{ height }}
      >
        <div className="text-center text-gray-500">
          <div className="text-2xl mb-2">📊</div>
          <p className="text-sm">No {type} data available</p>
        </div>
      </div>
    );
  }

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);
  const topHolding = processedData.chartData[0];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {type === 'holdings' ? 'Portfolio Allocation' : 'Sector Allocation'}
          </h3>
          <p className="text-sm text-gray-600">
            Total Value: ${totalValue.toLocaleString()}
          </p>
        </div>
        {topHolding && (
          <div className="text-right">
            <p className="text-sm text-gray-600">Largest Position</p>
            <p className="font-semibold text-gray-900">
              {type === 'holdings' ? topHolding.symbol : topHolding.sector || topHolding.name}
            </p>
            <p className="text-sm text-gray-600">
              {topHolding.percentage.toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="relative" style={{ height }}>
        <Doughnut data={chartDataConfig} options={options} />
        
        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {data.length}
            </p>
            <p className="text-sm text-gray-600">
              {type === 'holdings' ? 'Holdings' : 'Sectors'}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Total Positions</p>
          <p className="text-sm font-semibold text-gray-900">{data.length}</p>
        </div>
        
        {topHolding && (
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Top Position</p>
            <p className="text-sm font-semibold text-gray-900">
              {topHolding.percentage.toFixed(1)}%
            </p>
          </div>
        )}
        
        <div className="text-center lg:col-span-1 col-span-2">
          <p className="text-xs text-gray-500 mb-1">Diversification</p>
          <p className="text-sm font-semibold text-gray-900">
            {data.length >= 10 ? 'High' : data.length >= 5 ? 'Medium' : 'Low'}
          </p>
        </div>
      </div>

      {/* Detailed breakdown for mobile */}
      {!showLegend && (
        <div className="mt-6 pt-6 border-t border-gray-100 space-y-2">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Breakdown</h4>
          {processedData.chartData.slice(0, 5).map((item, index) => (
            <div key={index} className="flex items-center justify-between py-1">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: chartDataConfig.datasets[0].backgroundColor![index] }}
                />
                <span className="text-sm text-gray-700">
                  {type === 'holdings' ? item.symbol : item.sector || item.name}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {item.percentage.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  ${item.value.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          
          {processedData.others > 0 && (
            <div className="text-center pt-2">
              <p className="text-xs text-gray-500">
                +{processedData.others} more positions
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AllocationChart;