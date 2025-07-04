'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { tradingBotService, BotStatus, QueuedTrade, BotDecision, BotPerformance } from '@/services/tradingBot';
import { riskManagerService, PortfolioRisk, StopLossTarget } from '@/services/riskManager';
import MobileNav from '@/components/MobileNav';

const TradingBotDashboard = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [performance, setPerformance] = useState<BotPerformance | null>(null);
  const [queuedTrades, setQueuedTrades] = useState<QueuedTrade[]>([]);
  const [recentDecisions, setRecentDecisions] = useState<BotDecision[]>([]);
  const [portfolioRisk, setPortfolioRisk] = useState<PortfolioRisk | null>(null);
  const [stopLossTargets, setStopLossTargets] = useState<StopLossTarget[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState<{ action: string; callback: () => void } | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }

    // Initial data load
    updateDashboardData();

    // Set up periodic updates
    const interval = setInterval(updateDashboardData, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [session, status, router]);

  const updateDashboardData = () => {
    setBotStatus(tradingBotService.getStatus());
    setPerformance(tradingBotService.getPerformance());
    setQueuedTrades(tradingBotService.getExecutionQueue().slice(0, 10)); // Latest 10 trades
    setRecentDecisions(tradingBotService.getDecisions(10)); // Latest 10 decisions
    setPortfolioRisk(riskManagerService.assessPortfolioRisk());
    setStopLossTargets(riskManagerService.checkStopLossTargets(tradingBotService.getConfig()));
  };

  const handleStartBot = async () => {
    const success = await tradingBotService.startBot();
    if (success) {
      updateDashboardData();
    } else {
      alert('Failed to start trading bot. Check configuration and try again.');
    }
  };

  const handleStopBot = () => {
    tradingBotService.stopBot();
    updateDashboardData();
  };

  const handlePauseBot = () => {
    tradingBotService.pauseBot();
    updateDashboardData();
  };

  const handleEmergencyStop = () => {
    tradingBotService.emergencyStop();
    updateDashboardData();
    alert('EMERGENCY STOP ACTIVATED - All trading has been halted');
  };

  const confirmAction = (action: string, callback: () => void) => {
    setShowConfirmDialog({ action, callback });
  };

  const executeConfirmedAction = () => {
    if (showConfirmDialog) {
      showConfirmDialog.callback();
      setShowConfirmDialog(null);
    }
  };

  const getStatusColor = (status: BotStatus['status']) => {
    switch (status) {
      case 'RUNNING': return 'text-green-600 bg-green-100';
      case 'PAUSED': return 'text-yellow-600 bg-yellow-100';
      case 'STOPPED': return 'text-gray-600 bg-gray-100';
      case 'ERROR': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-green-600 bg-green-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!botStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Initializing trading bot...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🤖 Automated Trading Bot</h1>
              <p className="mt-2 text-gray-600">Monitor and control your AI-powered automated trading system</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2"
            >
              <span>←</span>
              <span>Home</span>
            </button>
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Bot Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Bot Status</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(botStatus.status)}`}>
                {botStatus.status}
              </span>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              {botStatus.isMonitoring && (
                <p>⚡ Monitoring: Active</p>
              )}
              {botStatus.uptime > 0 && (
                <p>⏱️ Uptime: {formatUptime(botStatus.uptime)}</p>
              )}
              {botStatus.lastScan && (
                <p>🔍 Last Scan: {new Date(botStatus.lastScan).toLocaleTimeString()}</p>
              )}
              {botStatus.nextScan && (
                <p>⏰ Next Scan: {new Date(botStatus.nextScan).toLocaleTimeString()}</p>
              )}
            </div>
          </div>

          {/* Today's Activity */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Today&apos;s Activity</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Trades:</span>
                <span className="font-medium">{botStatus.currentActivity.todayTradesCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">{formatCurrency(botStatus.currentActivity.todayTradeAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pending:</span>
                <span className="font-medium">{botStatus.currentActivity.pendingTrades}</span>
              </div>
            </div>
          </div>

          {/* Performance */}
          {performance && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Performance</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Trades:</span>
                  <span className="font-medium">{performance.totalAutomatedTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Success Rate:</span>
                  <span className="font-medium">{performance.successRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">P&L:</span>
                  <span className={`font-medium ${performance.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(performance.totalProfitLoss)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Portfolio Risk */}
          {portfolioRisk && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Portfolio Risk</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Overall:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(portfolioRisk.overallRisk)}`}>
                    {portfolioRisk.overallRisk}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Diversification:</span>
                  <span className="font-medium">{portfolioRisk.diversificationScore}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Concentration:</span>
                  <span className="font-medium">{portfolioRisk.concentrationRisk}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Bot Controls</h3>
          <div className="flex flex-wrap gap-4">
            {botStatus.status === 'STOPPED' && (
              <button
                onClick={() => confirmAction('start the trading bot', handleStartBot)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                ▶️ Start Bot
              </button>
            )}
            
            {botStatus.status === 'RUNNING' && (
              <>
                <button
                  onClick={() => confirmAction('pause the trading bot', handlePauseBot)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  ⏸️ Pause Bot
                </button>
                <button
                  onClick={() => confirmAction('stop the trading bot', handleStopBot)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  ⏹️ Stop Bot
                </button>
              </>
            )}

            {botStatus.status === 'PAUSED' && (
              <>
                <button
                  onClick={() => confirmAction('resume the trading bot', handleStartBot)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  ▶️ Resume Bot
                </button>
                <button
                  onClick={() => confirmAction('stop the trading bot', handleStopBot)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  ⏹️ Stop Bot
                </button>
              </>
            )}

            <button
              onClick={() => confirmAction('EMERGENCY STOP all trading', handleEmergencyStop)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              🚨 Emergency Stop
            </button>

            <button
              onClick={() => router.push('/settings/bot')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>

        {/* Error Message */}
        {botStatus.errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Bot Error</h3>
                <p className="mt-1 text-sm text-red-700">{botStatus.errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stop Loss Targets */}
        {stopLossTargets.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">🎯 Stop Loss/Take Profit Targets</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stopLossTargets.map((target, index) => (
                    <tr key={index} className={target.type === 'STOP_LOSS' ? 'bg-red-50' : 'bg-green-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{target.symbol}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          target.type === 'STOP_LOSS' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {target.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(target.currentPrice)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(target.type === 'STOP_LOSS' ? target.stopLossPrice : target.takeProfitPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{target.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Queued Trades */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">📋 Queued Trades</h3>
            {queuedTrades.length === 0 ? (
              <p className="text-gray-500">No trades in queue</p>
            ) : (
              <div className="space-y-4">
                {queuedTrades.map((trade) => (
                  <div key={trade.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-medium">{trade.symbol}</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                          trade.action === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {trade.action}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        trade.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        trade.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        trade.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {trade.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Quantity: {trade.quantity} @ {formatCurrency(trade.targetPrice)}</p>
                      <p>Confidence: {trade.recommendation.confidence}%</p>
                      <p>Scheduled: {new Date(trade.scheduledFor).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Decisions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">🧠 Recent Decisions</h3>
            {recentDecisions.length === 0 ? (
              <p className="text-gray-500">No recent decisions</p>
            ) : (
              <div className="space-y-4">
                {recentDecisions.map((decision) => (
                  <div key={decision.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">{decision.symbol}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        decision.decision === 'EXECUTE_TRADE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {decision.decision.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Confidence: {decision.recommendation.confidence}%</p>
                      <p>Reason: {decision.reason}</p>
                      <p>{new Date(decision.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Action</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to {showConfirmDialog.action}?
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowConfirmDialog(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={executeConfirmedAction}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
};

export default TradingBotDashboard;