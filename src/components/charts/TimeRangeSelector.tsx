'use client';

import React from 'react';

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface TimeRangeSelectorProps {
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  selectedRange,
  onRangeChange,
  className = '',
  size = 'md'
}) => {
  const timeRanges: { value: TimeRange; label: string; description: string }[] = [
    { value: '1D', label: '1D', description: 'Last 24 hours' },
    { value: '1W', label: '1W', description: 'Last 7 days' },
    { value: '1M', label: '1M', description: 'Last 30 days' },
    { value: '3M', label: '3M', description: 'Last 3 months' },
    { value: '6M', label: '6M', description: 'Last 6 months' },
    { value: '1Y', label: '1Y', description: 'Last 12 months' },
    { value: 'ALL', label: 'ALL', description: 'All time' }
  ];

  const sizeClasses = {
    sm: {
      container: 'p-0.5',
      button: 'px-2 py-1 text-xs',
      text: 'text-xs'
    },
    md: {
      container: 'p-1',
      button: 'px-3 py-1.5 text-sm',
      text: 'text-sm'
    },
    lg: {
      container: 'p-1.5',
      button: 'px-4 py-2 text-base',
      text: 'text-base'
    }
  };

  return (
    <div className={`inline-flex bg-gray-100 rounded-lg ${sizeClasses[size].container} ${className}`}>
      {timeRanges.map((range) => (
        <button
          key={range.value}
          onClick={() => onRangeChange(range.value)}
          title={range.description}
          className={`
            ${sizeClasses[size].button}
            font-medium rounded-md transition-all duration-200
            ${selectedRange === range.value
              ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
};

export default TimeRangeSelector;