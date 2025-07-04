// Server-side cache using file system (for API routes)
import { promises as fs } from 'fs';
import path from 'path';
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

class ServerCacheService {
  private readonly CACHE_DIR = path.join(process.cwd(), '.cache');
  private readonly CACHE_FILE = path.join(this.CACHE_DIR, 'daily_recommendations.json');
  private readonly METADATA_FILE = path.join(this.CACHE_DIR, 'cache_metadata.json');
  private readonly CACHE_VERSION = 1;

  /**
   * Ensure cache directory exists
   */
  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.access(this.CACHE_DIR);
    } catch {
      await fs.mkdir(this.CACHE_DIR, { recursive: true });
    }
  }

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
  async getCachedRecommendations(): Promise<DailyRecommendationsCache | null> {
    try {
      await this.ensureCacheDir();
      const data = await fs.readFile(this.CACHE_FILE, 'utf-8');
      const cache: DailyRecommendationsCache = JSON.parse(data);
      
      if (this.isCacheValidForToday(cache)) {
        return cache;
      }

      // Cache is outdated, remove it
      await this.clearCache();
      return null;
    } catch {
      // Return null if file doesn't exist or is invalid
      return null;
    }
  }

  /**
   * Store recommendations for today
   */
  async storeRecommendations(
    recommendations: AIRecommendation[],
    marketAnalysis: MarketAnalysis,
    topOpportunities: AIRecommendation[],
    stats: DailyRecommendationsCache['stats']
  ): Promise<void> {
    try {
      await this.ensureCacheDir();
      
      const cache: DailyRecommendationsCache = {
        date: this.getTodayDateString(),
        generatedAt: new Date().toISOString(),
        recommendations,
        marketAnalysis,
        topOpportunities,
        stats,
        version: this.CACHE_VERSION
      };

      await fs.writeFile(this.CACHE_FILE, JSON.stringify(cache, null, 2));
      
      // Update metadata
      await this.updateMetadata('auto');
      
      console.log(`Cached ${recommendations.length} recommendations for ${cache.date}`);
    } catch (error) {
      console.error('Error storing recommendations cache:', error);
    }
  }

  /**
   * Force refresh recommendations (manual user action)
   */
  async markManualRefresh(): Promise<void> {
    await this.updateMetadata('manual');
  }

  /**
   * Update cache metadata
   */
  private async updateMetadata(refreshType: 'auto' | 'manual'): Promise<void> {
    try {
      await this.ensureCacheDir();
      const existing = await this.getMetadata();
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

      await fs.writeFile(this.METADATA_FILE, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error('Error updating cache metadata:', error);
    }
  }

  /**
   * Get cache metadata
   */
  async getMetadata(): Promise<CacheMetadata> {
    try {
      await this.ensureCacheDir();
      const data = await fs.readFile(this.METADATA_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      // Return default metadata if file doesn't exist
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
  }

  /**
   * Check if we should auto-refresh (new day)
   */
  async shouldAutoRefresh(): Promise<boolean> {
    const cached = await this.getCachedRecommendations();
    return cached === null; // No valid cache = should refresh
  }

  /**
   * Get cache status for UI display
   */
  async getCacheStatus(): Promise<{
    hasCachedData: boolean;
    cacheDate: string | null;
    generatedAt: string | null;
    isToday: boolean;
    hoursOld: number | null;
    metadata: CacheMetadata;
  }> {
    const cached = await this.getCachedRecommendations();
    const metadata = await this.getMetadata();
    
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
  async clearCache(): Promise<void> {
    try {
      await fs.unlink(this.CACHE_FILE).catch(() => {}); // Ignore if file doesn't exist
      await fs.unlink(this.METADATA_FILE).catch(() => {}); // Ignore if file doesn't exist
      console.log('Daily recommendations cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache size info
   */
  async getCacheInfo(): Promise<{
    cacheSize: number; // in bytes
    recommendationCount: number;
    lastUpdated: string | null;
  }> {
    try {
      await this.ensureCacheDir();
      const stats = await fs.stat(this.CACHE_FILE);
      const data = await fs.readFile(this.CACHE_FILE, 'utf-8');
      const parsedCache = JSON.parse(data);
      
      return {
        cacheSize: stats.size,
        recommendationCount: parsedCache?.recommendations?.length || 0,
        lastUpdated: parsedCache?.generatedAt || null
      };
    } catch {
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
  async exportCacheData() {
    return {
      cache: await this.getCachedRecommendations(),
      metadata: await this.getMetadata(),
      status: await this.getCacheStatus(),
      info: await this.getCacheInfo()
    };
  }

  /**
   * Check if it's time for scheduled auto-refresh
   */
  async isScheduledRefreshTime(): Promise<boolean> {
    const metadata = await this.getMetadata();
    const now = new Date();
    const scheduledTime = new Date(metadata.nextScheduledUpdate);
    
    return now >= scheduledTime;
  }

  /**
   * Get human-readable cache status
   */
  async getCacheStatusMessage(): Promise<string> {
    const status = await this.getCacheStatus();
    
    if (!status.hasCachedData) {
      return 'No recommendations cached. Generating fresh AI recommendations.';
    }

    if (!status.isToday) {
      return 'Recommendations are from a previous day. Generated fresh suggestions.';
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

export const serverCacheService = new ServerCacheService();