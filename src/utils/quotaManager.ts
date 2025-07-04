import type { AIProvider } from '@/services/aiService';

interface QuotaData {
  date: string;
  usage: number;
  resetTime: number;
}

interface ProviderLimits {
  gemini: number;
  groq: number;
  openai: number;
}

class QuotaManager {
  private readonly STORAGE_KEY = 'ai_quota_data';
  private readonly DAILY_LIMITS: ProviderLimits = {
    gemini: 500,    // Free tier: 500 requests/day
    groq: 30,       // Free tier: 30 requests/minute (estimated daily ~5000)
    openai: 1000    // Paid tier estimation
  };

  private quotaData: Record<AIProvider, QuotaData> = this.loadQuotaData();

  private loadQuotaData(): Record<AIProvider, QuotaData> {
    if (typeof window === 'undefined') {
      // Return default data for SSR
      return this.getDefaultQuotaData();
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const today = this.getTodayString();
        
        // Validate and reset if needed
        const validatedData: Record<AIProvider, QuotaData> = {} as Record<AIProvider, QuotaData>;
        
        for (const provider of ['gemini', 'groq', 'openai'] as AIProvider[]) {
          if (data[provider] && data[provider].date === today) {
            validatedData[provider] = data[provider];
          } else {
            validatedData[provider] = this.getDefaultQuotaForProvider(provider);
          }
        }
        
        return validatedData;
      }
    } catch (error) {
      console.error('Error loading quota data:', error);
    }
    
    return this.getDefaultQuotaData();
  }

  private saveQuotaData(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.quotaData));
    } catch (error) {
      console.error('Error saving quota data:', error);
    }
  }

  private getDefaultQuotaData(): Record<AIProvider, QuotaData> {
    return {
      gemini: this.getDefaultQuotaForProvider('gemini'),
      groq: this.getDefaultQuotaForProvider('groq'),
      openai: this.getDefaultQuotaForProvider('openai')
    };
  }

  private getDefaultQuotaForProvider(_provider: AIProvider): QuotaData {
    const today = this.getTodayString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    return {
      date: today,
      usage: 0,
      resetTime: tomorrow.getTime()
    };
  }

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  canMakeRequest(provider: AIProvider): boolean {
    const quota = this.quotaData[provider];
    const limit = this.DAILY_LIMITS[provider];
    
    // Check if we need to reset (new day)
    if (quota.date !== this.getTodayString()) {
      this.resetProviderQuota(provider);
    }
    
    return quota.usage < limit;
  }

  recordRequest(provider: AIProvider): boolean {
    if (!this.canMakeRequest(provider)) {
      return false;
    }

    this.quotaData[provider].usage += 1;
    this.saveQuotaData();
    return true;
  }

  private resetProviderQuota(provider: AIProvider): void {
    this.quotaData[provider] = this.getDefaultQuotaForProvider(provider);
    this.saveQuotaData();
  }

  getUsageInfo(provider: AIProvider): { 
    usage: number; 
    limit: number; 
    remaining: number; 
    percentage: number;
    resetTime: Date;
  } {
    const quota = this.quotaData[provider];
    const limit = this.DAILY_LIMITS[provider];
    const remaining = Math.max(0, limit - quota.usage);
    const percentage = Math.min(100, (quota.usage / limit) * 100);
    
    return {
      usage: quota.usage,
      limit,
      remaining,
      percentage,
      resetTime: new Date(quota.resetTime)
    };
  }

  getAllUsageInfo(): Record<AIProvider, ReturnType<typeof this.getUsageInfo>> {
    return {
      gemini: this.getUsageInfo('gemini'),
      groq: this.getUsageInfo('groq'),
      openai: this.getUsageInfo('openai')
    };
  }

  getAvailableProviders(): AIProvider[] {
    return (['gemini', 'groq', 'openai'] as AIProvider[]).filter(provider => 
      this.canMakeRequest(provider)
    );
  }

  getBestAvailableProvider(preferredProvider?: AIProvider): AIProvider | null {
    const available = this.getAvailableProviders();
    
    if (available.length === 0) {
      return null;
    }
    
    // If preferred provider is available, use it
    if (preferredProvider && available.includes(preferredProvider)) {
      return preferredProvider;
    }
    
    // Priority order: gemini -> groq -> openai
    const priority: AIProvider[] = ['gemini', 'groq', 'openai'];
    for (const provider of priority) {
      if (available.includes(provider)) {
        return provider;
      }
    }
    
    return available[0];
  }

  // Manual reset for testing or emergency situations
  resetAllQuotas(): void {
    this.quotaData = this.getDefaultQuotaData();
    this.saveQuotaData();
  }

  // Set custom limits (useful for paid plans)
  setProviderLimit(provider: AIProvider, limit: number): void {
    this.DAILY_LIMITS[provider] = limit;
  }
}

// Export singleton instance
export const quotaManager = new QuotaManager();
export default quotaManager;