'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { tradingBotService, TradingBotConfig } from '@/services/tradingBot';
// import { riskManagerService } from '@/services/riskManager';
import MobileNav from '@/components/MobileNav';

const BotSettingsPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [config, setConfig] = useState<TradingBotConfig | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }

    // Load current configuration
    setConfig(tradingBotService.getConfig());
  }, [session, status, router]);

  const handleConfigChange = (section: keyof TradingBotConfig, field: string, value: any) => {
    if (!config) return;

    const newConfig = {
      ...config,
      [section]: {
        ...config[section],
        [field]: value
      }
    };

    setConfig(newConfig);
    setUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      tradingBotService.updateConfig(config);
      setUnsavedChanges(false);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setShowResetDialog(true);
  };

  const confirmReset = () => {
    // Reset to default configuration
    const defaultConfig = {
      enabled: false,
      intervals: {
        scanning: 30,
        execution: 60,
      },
      aiThresholds: {
        minimumConfidence: 80,
        riskLevelsEnabled: ['LOW', 'MEDIUM'] as ('LOW' | 'MEDIUM' | 'HIGH')[],
      },
      riskManagement: {
        maxPositionSize: 10,
        maxDailyTrades: 5,
        maxDailyAmount: 1000,
        stopLossPercent: 15,
        takeProfitPercent: 25,
        maxPortfolioDrawdown: 20,
      },
      marketConditions: {
        tradingHoursOnly: true,
        avoidHighVolatility: true,
        minimumLiquidity: 100000,
      },
      preferences: {
        diversificationTarget: 8,
        cashReservePercent: 15,
        rebalancingEnabled: true,
      },
    };

    setConfig(defaultConfig);
    setUnsavedChanges(true);
    setShowResetDialog(false);
  };

  if (status === 'loading' || !config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🤖 Bot Settings</h1>
              <p className="mt-2 text-gray-600">Configure your automated trading bot parameters</p>
            </div>
            <button
              onClick={() => router.push('/bot')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* Save/Reset Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSave}
                disabled={!unsavedChanges || saving}
                className={`px-6 py-2 rounded-lg font-medium ${
                  unsavedChanges && !saving
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {unsavedChanges && (
                <span className="text-yellow-600 text-sm">● You have unsaved changes</span>
              )}
            </div>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* Main Bot Enable/Disable */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Bot Status</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600">Enable automated trading</p>
              <p className="text-sm text-gray-500">When enabled, the bot will automatically execute trades based on AI recommendations</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => handleConfigChange('enabled' as any, '', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Intervals Configuration */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">⏰ Timing Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scanning Interval (minutes)
              </label>
              <select
                value={config.intervals.scanning}
                onChange={(e) => handleConfigChange('intervals', 'scanning', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={360}>6 hours</option>
                <option value={1440}>24 hours</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">How often the bot scans for trading opportunities</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Execution Delay (seconds)
              </label>
              <input
                type="number"
                min="30"
                max="300"
                value={config.intervals.execution}
                onChange={(e) => handleConfigChange('intervals', 'execution', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum time between trade executions</p>
            </div>
          </div>
        </div>

        {/* AI Thresholds */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">🧠 AI Decision Thresholds</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Confidence ({config.aiThresholds.minimumConfidence}%)
              </label>
              <input
                type="range"
                min="50"
                max="95"
                value={config.aiThresholds.minimumConfidence}
                onChange={(e) => handleConfigChange('aiThresholds', 'minimumConfidence', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>50%</span>
                <span>95%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Only execute trades with AI confidence above this level</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed Risk Levels
              </label>
              <div className="space-y-2">
                {['LOW', 'MEDIUM', 'HIGH'].map((level) => (
                  <label key={level} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.aiThresholds.riskLevelsEnabled.includes(level as any)}
                      onChange={(e) => {
                        const current = config.aiThresholds.riskLevelsEnabled;
                        const updated = e.target.checked
                          ? [...current, level as any]
                          : current.filter(l => l !== level);
                        handleConfigChange('aiThresholds', 'riskLevelsEnabled', updated);
                      }}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className={`text-sm ${
                      level === 'LOW' ? 'text-green-600' :
                      level === 'MEDIUM' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {level} Risk
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Bot will only trade recommendations with these risk levels</p>
            </div>
          </div>
        </div>

        {/* Risk Management */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">⚖️ Risk Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Position Size (%)
              </label>
              <input
                type="number"
                min="1"
                max="25"
                value={config.riskManagement.maxPositionSize}
                onChange={(e) => handleConfigChange('riskManagement', 'maxPositionSize', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum % of portfolio in any single stock</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Daily Trades
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={config.riskManagement.maxDailyTrades}
                onChange={(e) => handleConfigChange('riskManagement', 'maxDailyTrades', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum number of trades per day</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Daily Amount ($)
              </label>
              <input
                type="number"
                min="100"
                max="10000"
                step="100"
                value={config.riskManagement.maxDailyAmount}
                onChange={(e) => handleConfigChange('riskManagement', 'maxDailyAmount', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum dollar amount to trade per day</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stop Loss (%)
              </label>
              <input
                type="number"
                min="5"
                max="30"
                value={config.riskManagement.stopLossPercent}
                onChange={(e) => handleConfigChange('riskManagement', 'stopLossPercent', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Automatically sell if position drops this much</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Take Profit (%)
              </label>
              <input
                type="number"
                min="10"
                max="50"
                value={config.riskManagement.takeProfitPercent}
                onChange={(e) => handleConfigChange('riskManagement', 'takeProfitPercent', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Automatically sell if position gains this much</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Portfolio Drawdown (%)
              </label>
              <input
                type="number"
                min="10"
                max="40"
                value={config.riskManagement.maxPortfolioDrawdown}
                onChange={(e) => handleConfigChange('riskManagement', 'maxPortfolioDrawdown', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Pause trading if total portfolio drops this much</p>
            </div>
          </div>
        </div>

        {/* Market Conditions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">📈 Market Conditions</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">Trading Hours Only</p>
                <p className="text-sm text-gray-500">Only trade during NYSE/NASDAQ market hours (9:30 AM - 4:00 PM ET)</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.marketConditions.tradingHoursOnly}
                  onChange={(e) => handleConfigChange('marketConditions', 'tradingHoursOnly', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">Avoid High Volatility</p>
                <p className="text-sm text-gray-500">Skip trading during periods of extreme market volatility</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.marketConditions.avoidHighVolatility}
                  onChange={(e) => handleConfigChange('marketConditions', 'avoidHighVolatility', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Daily Volume ($)
              </label>
              <input
                type="number"
                min="10000"
                max="1000000"
                step="10000"
                value={config.marketConditions.minimumLiquidity}
                onChange={(e) => handleConfigChange('marketConditions', 'minimumLiquidity', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Only trade stocks with at least this much daily volume</p>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">⚙️ Preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Diversification Target
              </label>
              <input
                type="number"
                min="3"
                max="15"
                value={config.preferences.diversificationTarget}
                onChange={(e) => handleConfigChange('preferences', 'diversificationTarget', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Target number of different stocks to hold</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cash Reserve (%)
              </label>
              <input
                type="number"
                min="5"
                max="50"
                value={config.preferences.cashReservePercent}
                onChange={(e) => handleConfigChange('preferences', 'cashReservePercent', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum percentage of portfolio to keep as cash</p>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700">Portfolio Rebalancing</p>
                  <p className="text-sm text-gray-500">Automatically rebalance portfolio based on AI recommendations</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.preferences.rebalancingEnabled}
                    onChange={(e) => handleConfigChange('preferences', 'rebalancingEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Warning Box */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Important Notice</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  This is automated trading with real market simulations. The bot will make autonomous decisions based on AI recommendations. 
                  Always monitor the bot&apos;s performance and be prepared to intervene if necessary. Past performance does not guarantee future results.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Reset Confirmation Dialog */}
        {showResetDialog && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Reset to Defaults</h3>
              <p className="text-gray-600 mb-6">
                This will reset all settings to their default values. Any unsaved changes will be lost.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowResetDialog(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReset}
                  className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Reset
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

export default BotSettingsPage;