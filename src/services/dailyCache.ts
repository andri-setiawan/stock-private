// Daily recommendations cache service - stores AI recommendations for 24 hours
import { AIRecommendation, MarketAnalysis } from './aiAnalyzer';

export interface DailyRecommendationsCache {
  date: string; // YYYY-MM-DD format
  generatedAt: string; // ISO timestamp
  recommendations: AIRecommendation[];
  marketAnalysis: MarketAnalysis;
  topOpportunities: AIRecommendation[];
  stats: {
    totalAnalyzed: number;
    buySignals: number;
    sellSignals: number;
    holdSignals: number;
    averageConfidence: number;
  };
  version: number; // For cache versioning
}

export interface CacheMetadata {
  lastGenerated: string;
  nextScheduledUpdate: string;
  manualRefreshCount: number;
  autoRefreshCount: number;
}

class DailyCacheService {
  private readonly CACHE_KEY = 'daily_recommendations_cache';
  private readonly METADATA_KEY = 'daily_cache_metadata';
  private readonly CACHE_VERSION = 1;

  /**
   * Get today's date in YYYY-MM-DD format
   */
  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Check if cached data is from today
   */
  private isCacheValidForToday(cache: DailyRecommendationsCache): boolean {
    const today = this.getTodayDateString();
    return cache.date === today && cache.version === this.CACHE_VERSION;
  }

  /**
   * Get cached recommendations for today, if available
   */
  getCachedRecommendations(): DailyRecommendationsCache | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const cache: DailyRecommendationsCache = JSON.parse(cached);
      
      if (this.isCacheValidForToday(cache)) {
        return cache;
      }

      // Cache is outdated, remove it
      this.clearCache();
      return null;
    } catch (error) {
      console.error('Error reading cached recommendations:', error);
      this.clearCache();
      return null;
    }
  }

  /**
   * Store recommendations for today
   */
  storeRecommendations(
    recommendations: AIRecommendation[],
    marketAnalysis: MarketAnalysis,
    topOpportunities: AIRecommendation[],
    stats: DailyRecommendationsCache['stats']
  ): void {
    try {
      const cache: DailyRecommendationsCache = {
        date: this.getTodayDateString(),
        generatedAt: new Date().toISOString(),
        recommendations,
        marketAnalysis,
        topOpportunities,
        stats,
        version: this.CACHE_VERSION
      };

      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
      
      // Update metadata
      this.updateMetadata('auto');
      
      console.log(`Cached ${recommendations.length} recommendations for ${cache.date}`);
    } catch (error) {
      console.error('Error storing recommendations cache:', error);
    }
  }

  /**
   * Force refresh recommendations (manual user action)
   */
  markManualRefresh(): void {
    this.updateMetadata('manual');
  }

  /**
   * Update cache metadata
   */
  private updateMetadata(refreshType: 'auto' | 'manual'): void {
    try {
      const existing = this.getMetadata();
      const now = new Date().toISOString();
      
      // Calculate next scheduled update (6 AM next day)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(6, 0, 0, 0);
      
      const metadata: CacheMetadata = {
        lastGenerated: now,
        nextScheduledUpdate: tomorrow.toISOString(),
        manualRefreshCount: refreshType === 'manual' ? existing.manualRefreshCount + 1 : existing.manualRefreshCount,
        autoRefreshCount: refreshType === 'auto' ? existing.autoRefreshCount + 1 : existing.autoRefreshCount
      };

      localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('Error updating cache metadata:', error);
    }
  }

  /**
   * Get cache metadata
   */
  getMetadata(): CacheMetadata {
    try {
      const metadata = localStorage.getItem(this.METADATA_KEY);
      if (metadata) {
        return JSON.parse(metadata);
      }
    } catch (error) {
      console.error('Error reading cache metadata:', error);
    }

    // Return default metadata
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(6, 0, 0, 0);

    return {
      lastGenerated: new Date().toISOString(),
      nextScheduledUpdate: tomorrow.toISOString(),
      manualRefreshCount: 0,
      autoRefreshCount: 0
    };
  }

  /**
   * Check if we should auto-refresh (new day)
   */
  shouldAutoRefresh(): boolean {
    const cached = this.getCachedRecommendations();
    return cached === null; // No valid cache = should refresh
  }

  /**
   * Get cache status for UI display
   */
  getCacheStatus(): {
    hasCachedData: boolean;
    cacheDate: string | null;
    generatedAt: string | null;
    isToday: boolean;
    hoursOld: number | null;
    metadata: CacheMetadata;
  } {
    const cached = this.getCachedRecommendations();
    const metadata = this.getMetadata();
    
    if (!cached) {
      return {
        hasCachedData: false,
        cacheDate: null,
        generatedAt: null,
        isToday: false,
        hoursOld: null,
        metadata
      };
    }

    const generatedTime = new Date(cached.generatedAt);
    const now = new Date();
    const hoursOld = (now.getTime() - generatedTime.getTime()) / (1000 * 60 * 60);

    return {
      hasCachedData: true,
      cacheDate: cached.date,
      generatedAt: cached.generatedAt,
      isToday: this.isCacheValidForToday(cached),
      hoursOld: Math.round(hoursOld * 10) / 10,
      metadata
    };
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem(this.METADATA_KEY);
      console.log('Daily recommendations cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache size info
   */
  getCacheInfo(): {
    cacheSize: number; // in bytes
    recommendationCount: number;
    lastUpdated: string | null;
  } {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      const cacheSize = cached ? new Blob([cached]).size : 0;
      
      const parsedCache = cached ? JSON.parse(cached) : null;
      const recommendationCount = parsedCache?.recommendations?.length || 0;
      const lastUpdated = parsedCache?.generatedAt || null;

      return {
        cacheSize,
        recommendationCount,
        lastUpdated
      };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return {
        cacheSize: 0,
        recommendationCount: 0,
        lastUpdated: null
      };
    }
  }

  /**
   * Export cache data for debugging
   */
  exportCacheData() {
    return {
      cache: this.getCachedRecommendations(),
      metadata: this.getMetadata(),
      status: this.getCacheStatus(),
      info: this.getCacheInfo()
    };
  }

  /**
   * Check if it's time for scheduled auto-refresh
   */
  isScheduledRefreshTime(): boolean {
    const metadata = this.getMetadata();
    const now = new Date();
    const scheduledTime = new Date(metadata.nextScheduledUpdate);
    
    return now >= scheduledTime;
  }

  /**
   * Get human-readable cache status
   */
  getCacheStatusMessage(): string {
    const status = this.getCacheStatus();
    
    if (!status.hasCachedData) {
      return 'No recommendations cached. Click "Generate AI Recommendations" to get today\'s suggestions.';
    }

    if (!status.isToday) {
      return 'Recommendations are from a previous day. Click "Refresh Recommendations" to get today\'s suggestions.';
    }

    const hours = status.hoursOld || 0;
    if (hours < 1) {
      return 'Fresh AI recommendations (generated recently)';
    } else if (hours < 6) {
      return `AI recommendations from ${Math.floor(hours)} hour${Math.floor(hours) !== 1 ? 's' : ''} ago`;
    } else {
      return `AI recommendations from this morning (${Math.floor(hours)} hours ago)`;
    }
  }
}

export const dailyCacheService = new DailyCacheService();