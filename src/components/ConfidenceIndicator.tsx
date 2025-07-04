'use client';

import React from 'react';

interface ConfidenceIndicatorProps {
  confidence: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  showPercentage?: boolean;
  variant?: 'circular' | 'linear' | 'badge';
}

const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  confidence,
  size = 'medium',
  showLabel = true,
  showPercentage = true,
  variant = 'circular'
}) => {
  // Clamp confidence between 0 and 100
  const clampedConfidence = Math.max(0, Math.min(100, confidence));
  
  const getConfidenceLevel = (conf: number) => {
    if (conf >= 80) return { level: 'HIGH', color: 'green', label: 'High Confidence' };
    if (conf >= 60) return { level: 'MEDIUM', color: 'yellow', label: 'Medium Confidence' };
    if (conf >= 40) return { level: 'LOW', color: 'orange', label: 'Low Confidence' };
    return { level: 'VERY_LOW', color: 'red', label: 'Very Low Confidence' };
  };

  const { level, color, label } = getConfidenceLevel(clampedConfidence);
  
  const getSizeClasses = () => {
    switch (size) {
      case 'small': return { container: 'w-8 h-8', text: 'text-xs' };
      case 'large': return { container: 'w-16 h-16', text: 'text-lg' };
      default: return { container: 'w-12 h-12', text: 'text-sm' };
    }
  };

  const sizeClasses = getSizeClasses();

  if (variant === 'circular') {
    return (
      <div className="flex flex-col items-center">
        <div className={`relative ${sizeClasses.container}`}>
          {/* Background circle */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="2"
            />
            {/* Progress circle */}
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={getStrokeColor(color)}
              strokeWidth="2"
              strokeDasharray={`${clampedConfidence}, 100`}
              strokeLinecap="round"
            />
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-bold ${sizeClasses.text} ${getTextColor(color)}`}>
              {showPercentage ? `${Math.round(clampedConfidence)}%` : Math.round(clampedConfidence)}
            </span>
          </div>
        </div>
        
        {showLabel && (
          <span className={`mt-1 text-xs text-center ${getTextColor(color)}`}>
            {label}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'linear') {
    return (
      <div className="w-full">
        <div className="flex justify-between items-center mb-1">
          {showLabel && (
            <span className={`text-xs font-medium ${getTextColor(color)}`}>
              {label}
            </span>
          )}
          {showPercentage && (
            <span className={`text-xs ${getTextColor(color)}`}>
              {Math.round(clampedConfidence)}%
            </span>
          )}
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getBackgroundColor(color)}`}
            style={{ width: `${clampedConfidence}%` }}
          />
        </div>
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(color)}`}>
        {showPercentage ? `${Math.round(clampedConfidence)}%` : level}
        {showLabel && showPercentage && ` ${label.split(' ')[0]}`}
      </span>
    );
  }

  return null;
};

// Helper functions for color mapping
const getStrokeColor = (color: string) => {
  switch (color) {
    case 'green': return '#10b981';
    case 'yellow': return '#f59e0b';
    case 'orange': return '#f97316';
    case 'red': return '#ef4444';
    default: return '#6b7280';
  }
};

const getTextColor = (color: string) => {
  switch (color) {
    case 'green': return 'text-green-600';
    case 'yellow': return 'text-yellow-600';
    case 'orange': return 'text-orange-600';
    case 'red': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

const getBackgroundColor = (color: string) => {
  switch (color) {
    case 'green': return 'bg-green-500';
    case 'yellow': return 'bg-yellow-500';
    case 'orange': return 'bg-orange-500';
    case 'red': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getBadgeColor = (color: string) => {
  switch (color) {
    case 'green': return 'bg-green-100 text-green-800';
    case 'yellow': return 'bg-yellow-100 text-yellow-800';
    case 'orange': return 'bg-orange-100 text-orange-800';
    case 'red': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default ConfidenceIndicator;

// Additional helper component for displaying multiple confidence scores
interface ConfidenceComparisonProps {
  scores: Array<{
    label: string;
    confidence: number;
    description?: string;
  }>;
}

export const ConfidenceComparison: React.FC<ConfidenceComparisonProps> = ({ scores }) => {
  return (
    <div className="space-y-3">
      {scores.map((score, index) => (
        <div key={index} className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">{score.label}</div>
            {score.description && (
              <div className="text-xs text-gray-500">{score.description}</div>
            )}
          </div>
          <div className="ml-4">
            <ConfidenceIndicator
              confidence={score.confidence}
              size="small"
              variant="badge"
              showLabel={false}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// Animated confidence indicator for loading states
interface AnimatedConfidenceProps {
  targetConfidence: number;
  duration?: number;
  size?: 'small' | 'medium' | 'large';
}

export const AnimatedConfidence: React.FC<AnimatedConfidenceProps> = ({
  targetConfidence,
  duration = 2000,
  size = 'medium'
}) => {
  const [currentConfidence, setCurrentConfidence] = React.useState(0);

  React.useEffect(() => {
    const startTime = Date.now();
    const startConfidence = 0;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const newConfidence = startConfidence + (targetConfidence - startConfidence) * easeOut;
      
      setCurrentConfidence(newConfidence);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [targetConfidence, duration]);

  return (
    <ConfidenceIndicator
      confidence={currentConfidence}
      size={size}
      variant="circular"
    />
  );
};