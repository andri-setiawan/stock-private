'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { alertService, AlertSettings } from '@/services/alertService';
import { aiService, AIProvider, getUserPreferredProvider, saveUserPreferredProvider } from '@/services/aiService';
import { unifiedRecommendations } from '@/services/unifiedRecommendations';
import AppHeader from '@/components/AppHeader';
import MobileNav from '@/components/MobileNav';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  const [aiProvider, setAiProvider] = useState<AIProvider>('gemini');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }

    loadSettings();
  }, [session, status, router]);

  const loadSettings = () => {
    setIsLoading(true);
    const currentSettings = alertService.getSettings();
    setSettings(currentSettings);
    
    // Load AI provider preference
    const savedProvider = getUserPreferredProvider();
    setAiProvider(savedProvider);
    aiService.setProvider(savedProvider);
    
    setIsLoading(false);
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      alertService.updateSettings(settings);
      saveUserPreferredProvider(aiProvider);
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch {
      setSaveMessage('Error saving settings. Please try again.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiProviderChange = (provider: AIProvider) => {
    console.log(`🔄 Settings: Changing AI provider to ${provider.toUpperCase()}`);
    setAiProvider(provider);
    aiService.setProvider(provider);
    
    // Clear cache to force fresh recommendations with new provider
    unifiedRecommendations.clearCache();
    console.log(`🗑️ Settings: Cleared recommendations cache for provider change`);
  };

  const updateSetting = (key: keyof AlertSettings, value: unknown) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const updateNestedSetting = (parentKey: keyof AlertSettings, childKey: string, value: unknown) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [parentKey]: {
        ...(settings[parentKey] as Record<string, unknown>),
        [childKey]: value
      }
    });
  };

  const toggleRiskLevel = (riskLevel: 'LOW' | 'MEDIUM' | 'HIGH') => {
    if (!settings) return;
    const current = settings.riskLevelsEnabled;
    const updated = current.includes(riskLevel)
      ? current.filter(level => level !== riskLevel)
      : [...current, riskLevel];
    updateSetting('riskLevelsEnabled', updated);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Error loading settings</p>
          <button onClick={loadSettings} className="mt-2 text-blue-600 hover:text-blue-800">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <AppHeader 
        title="Alert Settings" 
        subtitle="Configure your trading alert preferences"
      />

      <div className="p-4 space-y-6">
        {/* Save Message */}
        {saveMessage && (
          <div className={`p-4 rounded-lg ${
            saveMessage.includes('Error') 
              ? 'bg-red-50 text-red-800 border border-red-200' 
              : 'bg-green-50 text-green-800 border border-green-200'
          }`}>
            {saveMessage}
          </div>
        )}

        {/* General Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
          </div>
          <div className="p-4 space-y-4">
            {/* Enable Alerts */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Enable Alerts</label>
                <p className="text-xs text-gray-600">Turn on/off all trading alerts</p>
              </div>
              <button
                onClick={() => updateSetting('enabled', !settings.enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Confidence Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Confidence Threshold: {settings.confidenceThreshold}%
              </label>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={settings.confidenceThreshold}
                onChange={(e) => updateSetting('confidenceThreshold', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>50% (More alerts)</span>
                <span>95% (Fewer, high-confidence alerts)</span>
              </div>
            </div>

            {/* Monitoring Interval */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Check for alerts every {settings.monitoringInterval} minutes
              </label>
              <select
                value={settings.monitoringInterval}
                onChange={(e) => updateSetting('monitoringInterval', parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </div>

            {/* Max Alerts Per Day */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Maximum alerts per day
              </label>
              <select
                value={settings.maxAlertsPerDay}
                onChange={(e) => updateSetting('maxAlertsPerDay', parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={10}>10 alerts</option>
                <option value={20}>20 alerts</option>
                <option value={50}>50 alerts</option>
                <option value={100}>100 alerts</option>
              </select>
            </div>
          </div>
        </div>

        {/* AI Provider Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">AI Analysis Provider</h3>
            <p className="text-sm text-gray-600">Choose your preferred AI provider for trading recommendations</p>
          </div>
          <div className="p-4 space-y-4">
            {/* Current Provider Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-blue-600 font-medium">Current Provider:</span>
                <span className="font-semibold text-blue-800 capitalize">{aiService.getProviderInfo().provider}</span>
              </div>
              <div className="text-sm text-blue-700">
                <p><strong>Model:</strong> {aiService.getProviderInfo().model}</p>
                <p><strong>Speed:</strong> {aiService.getProviderInfo().speed}</p>
                <p className="mt-1">{aiService.getProviderInfo().description}</p>
              </div>
            </div>

            {/* Provider Selection */}
            <div className="space-y-3">
              {/* Gemini AI Option */}
              <div
                onClick={() => handleAiProviderChange('gemini')}
                className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                  aiProvider === 'gemini'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">G</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Google Gemini AI</h4>
                      <p className="text-sm text-gray-600">Gemini 1.5 Flash - Fast & Efficient</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {aiProvider === 'gemini' && (
                      <span className="text-blue-600 font-medium">✓ Selected</span>
                    )}
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      aiProvider === 'gemini' ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    }`}>
                      {aiProvider === 'gemini' && (
                        <div className="w-full h-full rounded-full bg-white scale-50"></div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white bg-opacity-50 rounded px-2 py-1">
                    <span className="text-gray-600">Speed: </span>
                    <span className="font-medium">Fast</span>
                  </div>
                  <div className="bg-white bg-opacity-50 rounded px-2 py-1">
                    <span className="text-gray-600">Accuracy: </span>
                    <span className="font-medium">High</span>
                  </div>
                  <div className="bg-white bg-opacity-50 rounded px-2 py-1">
                    <span className="text-gray-600">Cost: </span>
                    <span className="font-medium">Free</span>
                  </div>
                </div>
              </div>

              {/* GROQ AI Option */}
              <div
                onClick={() => handleAiProviderChange('groq')}
                className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                  aiProvider === 'groq'
                    ? 'border-orange-500 bg-orange-50 shadow-md'
                    : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">Q</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">GROQ AI</h4>
                      <p className="text-sm text-gray-600">Llama 3.1 70B - Ultra Fast Inference</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {aiProvider === 'groq' && (
                      <span className="text-orange-600 font-medium">✓ Selected</span>
                    )}
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      aiProvider === 'groq' ? 'bg-orange-600 border-orange-600' : 'border-gray-300'
                    }`}>
                      {aiProvider === 'groq' && (
                        <div className="w-full h-full rounded-full bg-white scale-50"></div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white bg-opacity-50 rounded px-2 py-1">
                    <span className="text-gray-600">Speed: </span>
                    <span className="font-medium">Ultra Fast</span>
                  </div>
                  <div className="bg-white bg-opacity-50 rounded px-2 py-1">
                    <span className="text-gray-600">Accuracy: </span>
                    <span className="font-medium">High</span>
                  </div>
                  <div className="bg-white bg-opacity-50 rounded px-2 py-1">
                    <span className="text-gray-600">Cost: </span>
                    <span className="font-medium">Free</span>
                  </div>
                </div>
              </div>

              {/* OpenAI Option */}
              <div
                onClick={() => handleAiProviderChange('openai')}
                className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                  aiProvider === 'openai'
                    ? 'border-green-500 bg-green-50 shadow-md'
                    : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">AI</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">OpenAI</h4>
                      <p className="text-sm text-gray-600">GPT-4o Mini - Smart & Efficient</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {aiProvider === 'openai' && (
                      <span className="text-green-600 font-medium">✓ Selected</span>
                    )}
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      aiProvider === 'openai' ? 'bg-green-600 border-green-600' : 'border-gray-300'
                    }`}>
                      {aiProvider === 'openai' && (
                        <div className="w-full h-full rounded-full bg-white scale-50"></div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white bg-opacity-50 rounded px-2 py-1">
                    <span className="text-gray-600">Speed: </span>
                    <span className="font-medium">Very Fast</span>
                  </div>
                  <div className="bg-white bg-opacity-50 rounded px-2 py-1">
                    <span className="text-gray-600">Accuracy: </span>
                    <span className="font-medium">High</span>
                  </div>
                  <div className="bg-white bg-opacity-50 rounded px-2 py-1">
                    <span className="text-gray-600">Cost: </span>
                    <span className="font-medium">Free</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Provider Comparison Note */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h5 className="font-medium text-gray-900 mb-2">💡 Provider Comparison</h5>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Gemini:</strong> Google's advanced model with excellent reasoning and market analysis</p>
                <p><strong>GROQ:</strong> Meta's powerful model with ultra-fast inference speed via GROQ hardware</p>
                <p><strong>OpenAI:</strong> GPT-4o Mini with strong analytical capabilities and efficient performance</p>
                <p className="mt-2 text-xs text-gray-500">
                  💡 Tip: You can switch providers anytime to compare recommendations for the same stock
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Alert Types */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Alert Types</h3>
            <p className="text-sm text-gray-600">Choose which types of alerts you want to receive</p>
          </div>
          <div className="p-4 space-y-4">
            {[
              { key: 'highConfidenceBuy', label: 'High Confidence Buy Signals', icon: '📈' },
              { key: 'highConfidenceSell', label: 'High Confidence Sell Signals', icon: '📉' },
              { key: 'priceTargetHit', label: 'Price Target Hit', icon: '🎯' },
              { key: 'volatilitySpike', label: 'Volatility Spikes', icon: '⚡' },
              { key: 'portfolioRebalance', label: 'Portfolio Rebalancing', icon: '⚖️' },
            ].map(({ key, label, icon }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{icon}</span>
                  <span className="text-sm font-medium text-gray-900">{label}</span>
                </div>
                <button
                  onClick={() => updateNestedSetting('alertTypes', key, !settings.alertTypes[key as keyof typeof settings.alertTypes])}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.alertTypes[key as keyof typeof settings.alertTypes] ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.alertTypes[key as keyof typeof settings.alertTypes] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Levels */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Risk Levels</h3>
            <p className="text-sm text-gray-600">Select which risk levels to receive alerts for</p>
          </div>
          <div className="p-4 space-y-4">
            {[
              { level: 'LOW' as const, label: 'Low Risk', description: 'Conservative, stable opportunities', color: 'green' },
              { level: 'MEDIUM' as const, label: 'Medium Risk', description: 'Balanced risk/reward opportunities', color: 'blue' },
              { level: 'HIGH' as const, label: 'High Risk', description: 'Aggressive, high-potential opportunities', color: 'red' },
            ].map(({ level, label, description, color }) => (
              <div
                key={level}
                onClick={() => toggleRiskLevel(level)}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  settings.riskLevelsEnabled.includes(level)
                    ? `border-${color}-300 bg-${color}-50`
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{label}</span>
                      {settings.riskLevelsEnabled.includes(level) && (
                        <span className="text-green-600">✓</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            <p className="text-sm text-gray-600">Choose how you want to be notified</p>
          </div>
          <div className="p-4 space-y-4">
            {[
              { key: 'browser', label: 'Browser Notifications', icon: '🔔' },
              { key: 'sound', label: 'Sound Alerts', icon: '🔊' },
              { key: 'email', label: 'Email Notifications', icon: '📧' },
            ].map(({ key, label, icon }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{icon}</span>
                  <span className="text-sm font-medium text-gray-900">{label}</span>
                </div>
                <button
                  onClick={() => updateNestedSetting('notificationSettings', key, !settings.notificationSettings[key as keyof typeof settings.notificationSettings])}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.notificationSettings[key as keyof typeof settings.notificationSettings] ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.notificationSettings[key as keyof typeof settings.notificationSettings] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Quiet Hours</h3>
            <p className="text-sm text-gray-600">Set times when you don&apos;t want to receive alerts</p>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">Enable Quiet Hours</span>
              <button
                onClick={() => updateNestedSetting('quietHours', 'enabled', !settings.quietHours.enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.quietHours.enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.quietHours.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {settings.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={settings.quietHours.startTime}
                    onChange={(e) => updateNestedSetting('quietHours', 'startTime', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">End Time</label>
                  <input
                    type="time"
                    value={settings.quietHours.endTime}
                    onChange={(e) => updateNestedSetting('quietHours', 'endTime', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}