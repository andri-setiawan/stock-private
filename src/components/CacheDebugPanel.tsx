'use client';

import React, { useState, useEffect } from 'react';

interface CacheDebugProps {
  isVisible?: boolean;
}

const CacheDebugPanel: React.FC<CacheDebugProps> = ({ isVisible = false }) => {
  const [cacheData, setCacheData] = useState<Record<string, unknown> | null>(null);
  const [isOpen, setIsOpen] = useState(isVisible);

  const fetchCacheStatus = async () => {
    try {
      const response = await fetch('/api/daily-suggestions/status');
      const result = await response.json();
      if (result.success) {
        setCacheData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch cache status:', error);
    }
  };

  const clearCache = async () => {
    try {
      const response = await fetch('/api/daily-suggestions/status?action=clear');
      const result = await response.json();
      if (result.success) {
        alert('Cache cleared successfully!');
        fetchCacheStatus();
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCacheStatus();
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 bg-gray-800 text-white p-2 rounded-full shadow-lg z-50 text-xs"
        title="Open Cache Debug Panel"
      >
        🔧
      </button>
    );
  }

  const statusData = cacheData?.status as Record<string, unknown>;
  const infoData = cacheData?.info as Record<string, unknown>;

  return (
    <div className="fixed bottom-20 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-gray-800">Cache Debug</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      {cacheData && (
        <div className="space-y-2 text-xs">
          <div>
            <strong>Has Cache:</strong> {statusData?.hasCachedData ? '✅' : '❌'}
          </div>
          {Boolean(statusData?.hasCachedData) && (
            <>
              <div>
                <strong>Cache Date:</strong> {String(statusData?.cacheDate || 'N/A')}
              </div>
              <div>
                <strong>Hours Old:</strong> {String(statusData?.hoursOld || 0)}h
              </div>
              <div>
                <strong>Is Today:</strong> {statusData?.isToday ? '✅' : '❌'}
              </div>
              <div>
                <strong>Recommendations:</strong> {String(infoData?.recommendationCount || 0)}
              </div>
              <div>
                <strong>Size:</strong> {Math.round(Number(infoData?.cacheSize || 0) / 1024)}KB
              </div>
            </>
          )}
          
          <div className="pt-2 space-y-1">
            <button
              onClick={fetchCacheStatus}
              className="w-full bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
            >
              🔄 Refresh Status
            </button>
            <button
              onClick={clearCache}
              className="w-full bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
            >
              🗑️ Clear Cache
            </button>
          </div>
          
          <div className="pt-2 border-t text-gray-600">
            <div><strong>Should Auto Refresh:</strong> {cacheData?.shouldAutoRefresh ? '✅' : '❌'}</div>
            <div><strong>Scheduled Refresh:</strong> {cacheData?.isScheduledRefreshTime ? '⏰' : '⏳'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CacheDebugPanel;