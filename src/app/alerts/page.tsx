'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { alertService, TradingAlert, AlertSummary } from '@/services/alertService';
import AppHeader from '@/components/AppHeader';
import MobileNav from '@/components/MobileNav';

export default function AlertsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [alerts, setAlerts] = useState<TradingAlert[]>([]);
  const [summary, setSummary] = useState<AlertSummary>({ totalActive: 0, totalUnread: 0, highPriorityCount: 0, todayCount: 0 });
  const [filter, setFilter] = useState<'all' | 'active' | 'unread' | 'high-priority'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }

    loadAlerts();
  }, [session, status, router, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAlerts = () => {
    setIsLoading(true);
    
    // Apply filters
    const filterParams: Record<string, boolean> = {};
    switch (filter) {
      case 'active':
        filterParams.isActive = true;
        break;
      case 'unread':
        filterParams.isRead = false;
        break;
      case 'high-priority':
        filterParams.isActive = true;
        // We'll filter high priority in the component
        break;
    }

    let filteredAlerts = alertService.getAlerts(filterParams);
    
    if (filter === 'high-priority') {
      filteredAlerts = filteredAlerts.filter(alert => 
        alert.priority === 'HIGH' || alert.priority === 'URGENT'
      );
    }

    setAlerts(filteredAlerts);
    setSummary(alertService.getAlertSummary());
    setIsLoading(false);
  };

  const handleAlertClick = (alert: TradingAlert) => {
    alertService.markAsRead(alert.id);
    router.push(`/trade?symbol=${alert.symbol}`);
  };

  const handleDismissAlert = (alertId: string) => {
    alertService.dismissAlert(alertId);
    loadAlerts();
  };

  const getPriorityColor = (priority: TradingAlert['priority']) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'LOW': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFilterCount = (filterType: typeof filter): number => {
    switch (filterType) {
      case 'all': return alertService.getAlerts().length;
      case 'active': return summary.totalActive;
      case 'unread': return summary.totalUnread;
      case 'high-priority': return summary.highPriorityCount;
      default: return 0;
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <AppHeader 
        title="Trading Alerts" 
        subtitle={`${summary.totalActive} active alerts, ${summary.totalUnread} unread`}
      />

      <div className="p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-blue-600">{summary.totalActive}</div>
            <div className="text-sm text-gray-600">Active Alerts</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-green-600">{summary.totalUnread}</div>
            <div className="text-sm text-gray-600">Unread</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-orange-600">{summary.highPriorityCount}</div>
            <div className="text-sm text-gray-600">High Priority</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-purple-600">{summary.todayCount}</div>
            <div className="text-sm text-gray-600">Today</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex overflow-x-auto">
            {[
              { key: 'all', label: 'All Alerts' },
              { key: 'active', label: 'Active' },
              { key: 'unread', label: 'Unread' },
              { key: 'high-priority', label: 'High Priority' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as typeof filter)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  filter === key
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {label} ({getFilterCount(key as typeof filter)})
              </button>
            ))}
          </div>
        </div>

        {/* Alerts List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600">Loading alerts...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">🔕</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts found</h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? "We&apos;ll notify you when high-confidence trading opportunities arise"
                  : `No ${filter.replace('-', ' ')} alerts at the moment`
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !alert.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => handleAlertClick(alert)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Alert Header */}
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-2xl">{getAlertIcon(alert.type)}</span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-900">{alert.symbol}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(alert.priority)}`}>
                              {alert.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{alert.name}</p>
                        </div>
                      </div>

                      {/* Alert Message */}
                      <p className="text-gray-700 mb-3">{alert.message}</p>

                      {/* Alert Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Action:</span>
                          <span className={`ml-1 font-medium ${
                            alert.recommendation.action === 'BUY' ? 'text-green-600' : 
                            alert.recommendation.action === 'SELL' ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            {alert.recommendation.action}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Price:</span>
                          <span className="ml-1 font-medium">${alert.currentPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Confidence:</span>
                          <span className="ml-1 font-medium">{alert.recommendation.confidence}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Created:</span>
                          <span className="ml-1 font-medium">{formatDateTime(alert.createdAt)}</span>
                        </div>
                      </div>

                      {/* AI Reasoning */}
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{alert.recommendation.reasoning}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="ml-4 flex flex-col space-y-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismissAlert(alert.id);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                        title="Dismiss alert"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <MobileNav />
    </div>
  );
}