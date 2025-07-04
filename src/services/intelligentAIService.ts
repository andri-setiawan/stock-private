import { aiService, type AIProvider, type TradeRecommendation, type StockAnalysis, type PortfolioInsights } from './aiService';
import { quotaManager } from '@/utils/quotaManager';

interface AIRequestOptions {
  preferredProvider?: AIProvider;
  enableFallback?: boolean;
  retryAttempts?: number;
}

interface AIResponse<T> {
  data: T | null;
  provider: AIProvider | null;
  error: string | null;
  quotaInfo: {
    usedQuota: boolean;
    remainingQuota: number;
    fallbackUsed: boolean;
  };
}

class IntelligentAIService {
  private readonly DEFAULT_OPTIONS: Required<AIRequestOptions> = {
    preferredProvider: 'gemini',
    enableFallback: true,
    retryAttempts: 3
  };

  private async makeRequest<T>(
    requestFn: (provider: AIProvider) => Promise<T>,
    options: AIRequestOptions = {}
  ): Promise<AIResponse<T>> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const originalProvider = aiService.getCurrentProvider();
    let attemptedProviders: AIProvider[] = [];
    let lastError: string | null = null;
    let fallbackUsed = false;

    try {
      // Get the best available provider
      const targetProvider = quotaManager.getBestAvailableProvider(opts.preferredProvider);
      
      if (!targetProvider) {
        return {
          data: null,
          provider: null,
          error: 'All AI providers have exceeded their quotas. Please try again later.',
          quotaInfo: {
            usedQuota: true,
            remainingQuota: 0,
            fallbackUsed: false
          }
        };
      }

      // If we're not using the preferred provider, it's a fallback
      if (opts.preferredProvider && targetProvider !== opts.preferredProvider) {
        fallbackUsed = true;
        console.log(`🔄 Using fallback provider: ${targetProvider.toUpperCase()} (preferred: ${opts.preferredProvider.toUpperCase()})`);
      }

      // Set the provider and make the request
      aiService.setProvider(targetProvider);
      
      for (let attempt = 1; attempt <= opts.retryAttempts; attempt++) {
        try {
          // Check quota before making request
          if (!quotaManager.canMakeRequest(targetProvider)) {
            if (opts.enableFallback && attemptedProviders.length < 3) {
              // Try next available provider
              const fallbackProvider = this.getNextAvailableProvider(attemptedProviders);
              if (fallbackProvider) {
                attemptedProviders.push(targetProvider);
                aiService.setProvider(fallbackProvider);
                fallbackUsed = true;
                console.log(`🔄 Quota exceeded for ${targetProvider.toUpperCase()}, trying ${fallbackProvider.toUpperCase()}`);
                continue;
              }
            }
            
            throw new Error(`Quota exceeded for ${targetProvider.toUpperCase()}`);
          }

          // Record the quota usage
          if (!quotaManager.recordRequest(targetProvider)) {
            throw new Error(`Failed to record quota usage for ${targetProvider.toUpperCase()}`);
          }

          // Make the actual AI request
          const result = await requestFn(targetProvider);
          const quotaInfo = quotaManager.getUsageInfo(targetProvider);
          
          console.log(`✅ AI request successful with ${targetProvider.toUpperCase()} (${quotaInfo.usage}/${quotaInfo.limit} used)`);
          
          return {
            data: result,
            provider: targetProvider,
            error: null,
            quotaInfo: {
              usedQuota: true,
              remainingQuota: quotaInfo.remaining,
              fallbackUsed
            }
          };

        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Unknown error';
          console.warn(`⚠️ AI request attempt ${attempt} failed with ${targetProvider.toUpperCase()}: ${lastError}`);
          
          if (attempt === opts.retryAttempts) {
            // Try fallback provider if available
            if (opts.enableFallback && attemptedProviders.length < 3) {
              const fallbackProvider = this.getNextAvailableProvider([...attemptedProviders, targetProvider]);
              if (fallbackProvider) {
                attemptedProviders.push(targetProvider);
                console.log(`🔄 Switching to fallback provider: ${fallbackProvider.toUpperCase()}`);
                return this.makeRequest(requestFn, {
                  ...opts,
                  preferredProvider: fallbackProvider,
                  retryAttempts: 2 // Fewer retries for fallback
                });
              }
            }
          }
          
          // Wait before retry (exponential backoff)
          if (attempt < opts.retryAttempts) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            await this.sleep(delay);
          }
        }
      }

      throw new Error(lastError || 'All retry attempts failed');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`❌ AI request failed: ${errorMessage}`);
      
      return {
        data: null,
        provider: null,
        error: errorMessage,
        quotaInfo: {
          usedQuota: false,
          remainingQuota: 0,
          fallbackUsed
        }
      };
    } finally {
      // Restore original provider
      aiService.setProvider(originalProvider);
    }
  }

  private getNextAvailableProvider(excludeProviders: AIProvider[]): AIProvider | null {
    const availableProviders = quotaManager.getAvailableProviders();
    const filtered = availableProviders.filter(p => !excludeProviders.includes(p));
    return filtered.length > 0 ? filtered[0] : null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Enhanced methods with quota management and fallback
  async getTradeRecommendation(
    stockData: any,
    portfolio: any,
    options?: AIRequestOptions
  ): Promise<AIResponse<TradeRecommendation>> {
    return this.makeRequest(
      async (provider) => {
        const service = this.getServiceForProvider(provider);
        return await service.getTradeRecommendation(stockData, portfolio);
      },
      options
    );
  }

  async getStockAnalysis(
    symbol: string,
    options?: AIRequestOptions
  ): Promise<AIResponse<StockAnalysis>> {
    return this.makeRequest(
      async (provider) => {
        const service = this.getServiceForProvider(provider);
        return await service.getStockAnalysis(symbol);
      },
      options
    );
  }

  async getPortfolioInsights(
    portfolio: any,
    options?: AIRequestOptions
  ): Promise<AIResponse<PortfolioInsights>> {
    return this.makeRequest(
      async (provider) => {
        const service = this.getServiceForProvider(provider);
        return await service.getPortfolioInsights(portfolio);
      },
      options
    );
  }

  async getDailyRecommendations(
    symbols: string[],
    options?: AIRequestOptions
  ): Promise<AIResponse<any[]>> {
    return this.makeRequest(
      async (provider) => {
        const service = this.getServiceForProvider(provider);
        // Process in smaller batches to manage quota
        const batchSize = provider === 'gemini' ? 5 : 10; // Smaller batches for Gemini
        const results = [];
        
        for (let i = 0; i < symbols.length; i += batchSize) {
          const batch = symbols.slice(i, i + batchSize);
          
          for (const symbol of batch) {
            // Add delay between requests to avoid rate limiting
            if (results.length > 0) {
              await this.sleep(provider === 'gemini' ? 1000 : 500);
            }
            
            try {
              const analysis = await service.getStockAnalysis(symbol);
              results.push(analysis);
            } catch (error) {
              console.warn(`Failed to analyze ${symbol}:`, error);
            }
          }
        }
        
        return results;
      },
      options
    );
  }

  private getServiceForProvider(provider: AIProvider) {
    // Set the provider temporarily for this request
    const currentProvider = aiService.getCurrentProvider();
    aiService.setProvider(provider);
    const service = aiService;
    aiService.setProvider(currentProvider);
    return service;
  }

  // Quota management methods
  getQuotaStatus(): Record<AIProvider, ReturnType<typeof quotaManager.getUsageInfo>> {
    return quotaManager.getAllUsageInfo();
  }

  getAvailableProviders(): AIProvider[] {
    return quotaManager.getAvailableProviders();
  }

  canMakeRequest(provider?: AIProvider): boolean {
    if (provider) {
      return quotaManager.canMakeRequest(provider);
    }
    return quotaManager.getAvailableProviders().length > 0;
  }

  resetQuotas(): void {
    quotaManager.resetAllQuotas();
  }

  // Rate limiting helper for bulk operations
  async processWithRateLimit<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: {
      batchSize?: number;
      delayBetweenRequests?: number;
      delayBetweenBatches?: number;
    } = {}
  ): Promise<R[]> {
    const {
      batchSize = 5,
      delayBetweenRequests = 1000,
      delayBetweenBatches = 2000
    } = options;

    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      for (let j = 0; j < batch.length; j++) {
        try {
          const result = await processor(batch[j]);
          results.push(result);
        } catch (error) {
          console.error(`Error processing item ${i + j}:`, error);
        }
        
        // Delay between requests within a batch
        if (j < batch.length - 1) {
          await this.sleep(delayBetweenRequests);
        }
      }
      
      // Delay between batches
      if (i + batchSize < items.length) {
        await this.sleep(delayBetweenBatches);
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const intelligentAI = new IntelligentAIService();
export default intelligentAI;