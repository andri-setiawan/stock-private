'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { alertService, TradingAlert, AlertSummary } from '@/services/alertService';

interface AlertNotificationsProps {
  className?: string;
}

const AlertNotifications: React.FC<AlertNotificationsProps> = ({ className = '' }) => {
  const router = useRouter();
  const [summary, setSummary] = useState<AlertSummary>({ totalActive: 0, totalUnread: 0, highPriorityCount: 0, todayCount: 0 });
  const [recentAlerts, setRecentAlerts] = useState<TradingAlert[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Initial load
    updateAlertData();
    
    // Set up periodic updates
    const interval = setInterval(updateAlertData, 30 * 1000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateAlertData = () => {
    const newSummary = alertService.getAlertSummary();
    const alerts = alertService.getAlerts({ isActive: true }).slice(0, 5); // Get latest 5 active alerts
    
    // Trigger animation if new unread alerts
    if (newSummary.totalUnread > summary.totalUnread) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 2000);
    }
    
    setSummary(newSummary);
    setRecentAlerts(alerts);
  };

  const handleAlertClick = (alert: TradingAlert) => {
    alertService.markAsRead(alert.id);
    setShowDropdown(false);
    updateAlertData();
    
    // Navigate to trading page with the symbol
    router.push(`/trade?symbol=${alert.symbol}`);
  };

  const handleDismissAlert = (alertId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    alertService.dismissAlert(alertId);
    updateAlertData();
  };

  const getPriorityColor = (priority: TradingAlert['priority']) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600 bg-red-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'MEDIUM': return 'text-blue-600 bg-blue-100';
      case 'LOW': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAlertIcon = (type: TradingAlert['type']) => {
    switch (type) {
      case 'HIGH_CONFIDENCE_BUY': return '📈';
      case 'HIGH_CONFIDENCE_SELL': return '📉';
      case 'PRICE_TARGET_HIT': return '🎯';
      case 'VOLATILITY_SPIKE': return '⚡';
      case 'PORTFOLIO_REBALANCE': return '⚖️';
      default: return '🔔';
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const alertTime = new Date(dateString);
    const diffMs = now.getTime() - alertTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Alert Bell Icon */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`relative p-2 rounded-full hover:bg-gray-100 transition-colors ${
          isAnimating ? 'animate-bounce' : ''
        }`}
        aria-label="Trading Alerts"
      >
        {/* Bell Icon */}
        <svg
          className="w-6 h-6 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-3.5-3.5-1.5-1.5A7 7 0 105 12H3l2 2"
          />
        </svg>
        
        {/* Notification Badges */}
        {summary.totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {summary.totalUnread > 9 ? '9+' : summary.totalUnread}
          </span>
        )}
        
        {summary.highPriorityCount > 0 && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-orange-500 rounded-full animate-pulse"></span>
        )}
      </button>

      {/* Dropdown Panel */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-20 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Trading Alerts
                </h3>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  {summary.highPriorityCount > 0 && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                      {summary.highPriorityCount} High Priority
                    </span>
                  )}
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {summary.totalActive} Active
                  </span>
                </div>
              </div>
            </div>

            {/* Alert List */}
            <div className="max-h-80 overflow-y-auto">
              {recentAlerts.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <div className="text-4xl mb-2">🔕</div>
                  <p className="font-medium">No active alerts</p>
                  <p className="text-sm">We&apos;ll notify you when high-confidence trading opportunities arise</p>
                </div>
              ) : (
                recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !alert.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => handleAlertClick(alert)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Alert Type & Symbol */}
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-lg">{getAlertIcon(alert.type)}</span>
                          <span className="font-semibold text-gray-900">{alert.symbol}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(alert.priority)}`}>
                            {alert.priority}
                          </span>
                        </div>
                        
                        {/* Alert Message */}
                        <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                        
                        {/* Price & Confidence */}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Price: ${alert.currentPrice.toFixed(2)}</span>
                          <span>Confidence: {alert.recommendation.confidence}%</span>
                          <span>{formatTimeAgo(alert.createdAt)}</span>
                        </div>
                      </div>
                      
                      {/* Dismiss Button */}
                      <button
                        onClick={(e) => handleDismissAlert(alert.id, e)}
                        className="ml-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                        aria-label="Dismiss alert"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => {
                    setShowDropdown(false);
                    router.push('/alerts');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View All Alerts
                </button>
                <button 
                  onClick={() => {
                    setShowDropdown(false);
                    router.push('/settings#alerts');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Settings
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AlertNotifications;