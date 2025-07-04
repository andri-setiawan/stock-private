'use client';

import React, { useState, useEffect } from 'react';
import { quotaManager } from '@/utils/quotaManager';
import { alertService } from '@/services/alertService';
import type { AIProvider } from '@/services/aiService';

interface QuotaInfo {
  usage: number;
  limit: number;
  remaining: number;
  percentage: number;
  resetTime: Date;
}

export default function QuotaStatusDashboard() {
  const [quotaData, setQuotaData] = useState<Record<AIProvider, QuotaInfo> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadQuotaData();
    
    // Refresh quota data every 30 seconds
    const interval = setInterval(loadQuotaData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadQuotaData = () => {
    try {
      const data = quotaManager.getAllUsageInfo();
      setQuotaData(data);
    } catch (error) {
      console.error('Error loading quota data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetQuotas = () => {
    if (confirm('Are you sure you want to reset all AI provider quotas? This should only be done for testing purposes.')) {
      alertService.resetQuotas();
      loadQuotaData();
    }
  };

  const getProviderIcon = (provider: AIProvider) => {
    switch (provider) {
      case 'gemini':
        return (
          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs">G</span>
          </div>
        );
      case 'groq':
        return (
          <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs">Q</span>
          </div>
        );
      case 'openai':
        return (
          <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs">AI</span>
          </div>
        );
    }
  };

  const getProviderName = (provider: AIProvider) => {
    switch (provider) {
      case 'gemini': return 'Google Gemini';
      case 'groq': return 'GROQ AI';
      case 'openai': return 'OpenAI';
    }
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = (percentage: number, remaining: number) => {
    if (remaining === 0) return 'Quota Exceeded';
    if (percentage >= 90) return 'Critical';
    if (percentage >= 75) return 'Warning';
    return 'Good';
  };

  const formatTimeUntilReset = (resetTime: Date) => {
    const now = new Date();
    const diff = resetTime.getTime() - now.getTime();
    
    if (diff <= 0) return 'Resetting...';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!quotaData) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center text-gray-500">
          <p>Unable to load quota information</p>
          <button 
            onClick={loadQuotaData}
            className="mt-2 text-blue-600 hover:text-blue-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const availableProviders = Object.entries(quotaData)
    .filter(([_, info]) => info.remaining > 0)
    .map(([provider]) => provider);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">AI Provider Quota Status</h2>
          <p className="text-sm text-gray-600 mt-1">
            Daily usage limits and availability for AI trading analysis
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            availableProviders.length > 0 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {availableProviders.length > 0 
              ? `${availableProviders.length} Available` 
              : 'All Quotas Exceeded'
            }
          </div>
        </div>
      </div>

      <div className="space-y-4">
{(Object.entries(quotaData) as [AIProvider, QuotaInfo][]).map(([provider, info]) => (
          <div key={provider} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {getProviderIcon(provider)}
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {getProviderName(provider)}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {provider === 'gemini' && 'gemini-1.5-flash • Free Tier'}
                    {provider === 'groq' && 'llama-3.1-8b-instant • Free Tier'}
                    {provider === 'openai' && 'gpt-4o-mini • Paid Tier'}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  info.remaining > 0 
                    ? info.percentage >= 90 
                      ? 'bg-red-100 text-red-800'
                      : info.percentage >= 75
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {getStatusText(info.percentage, info.remaining)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Resets in {formatTimeUntilReset(info.resetTime)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Usage Today</span>
                <span className="font-medium">
                  {info.usage.toLocaleString()} / {info.limit.toLocaleString()} requests
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${getStatusColor(info.percentage)}`}
                  style={{ width: `${Math.min(100, info.percentage)}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between text-xs text-gray-500">
                <span>{info.percentage.toFixed(1)}% used</span>
                <span>{info.remaining.toLocaleString()} remaining</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">🤖 Smart Quota Management</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• Bot automatically switches to available providers when quotas are exceeded</p>
          <p>• Intelligent rate limiting spreads requests throughout the day</p>
          <p>• System pauses scanning when all providers reach their limits</p>
          <p>• Quotas reset daily at midnight UTC</p>
        </div>
      </div>

      {/* Admin Controls */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
          <div className="space-x-2">
            <button
              onClick={loadQuotaData}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              🔄 Refresh
            </button>
            <button
              onClick={handleResetQuotas}
              className="text-sm text-red-600 hover:text-red-800"
            >
              ⚠️ Reset Quotas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}