// Automated Trading Alert Service for monitoring high-confidence AI recommendations
import { AIRecommendation } from './aiAnalyzer';
import { indicesService } from './indices';
import { intelligentAI } from './intelligentAIService';
import { quotaManager } from '@/utils/quotaManager';

export interface TradingAlert {
  id: string;
  symbol: string;
  name: string;
  type: 'HIGH_CONFIDENCE_BUY' | 'HIGH_CONFIDENCE_SELL' | 'PRICE_TARGET_HIT' | 'VOLATILITY_SPIKE' | 'PORTFOLIO_REBALANCE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  recommendation: AIRecommendation;
  triggerPrice?: number;
  currentPrice: number;
  message: string;
  createdAt: string;
  triggeredAt?: string;
  isActive: boolean;
  isDismissed: boolean;
  isRead: boolean;
  actions: AlertAction[];
}

export interface AlertAction {
  type: 'BUY' | 'SELL' | 'VIEW_ANALYSIS' | 'DISMISS' | 'SNOOZE';
  label: string;
  data?: Record<string, unknown>;
}

export interface AlertSettings {
  enabled: boolean;
  confidenceThreshold: number; // 0-100
  riskLevelsEnabled: ('LOW' | 'MEDIUM' | 'HIGH')[];
  alertTypes: {
    highConfidenceBuy: boolean;
    highConfidenceSell: boolean;
    priceTargetHit: boolean;
    volatilitySpike: boolean;
    portfolioRebalance: boolean;
  };
  notificationSettings: {
    browser: boolean;
    sound: boolean;
    email: boolean;
  };
  monitoringInterval: number; // minutes
  maxAlertsPerDay: number;
  quietHours: {
    enabled: boolean;
    startTime: string; // "22:00"
    endTime: string; // "08:00"
  };
}

export interface AlertSummary {
  totalActive: number;
  totalUnread: number;
  highPriorityCount: number;
  todayCount: number;
}

class AlertService {
  private alerts: TradingAlert[] = [];
  private settings: AlertSettings;
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private alertCounter = 0;

  constructor() {
    this.settings = this.getDefaultSettings();
    this.loadAlertsFromStorage();
    this.loadSettingsFromStorage();
  }

  private getDefaultSettings(): AlertSettings {
    return {
      enabled: true,
      confidenceThreshold: 75,
      riskLevelsEnabled: ['LOW', 'MEDIUM'],
      alertTypes: {
        highConfidenceBuy: true,
        highConfidenceSell: true,
        priceTargetHit: true,
        volatilitySpike: false,
        portfolioRebalance: true,
      },
      notificationSettings: {
        browser: true,
        sound: true,
        email: false,
      },
      monitoringInterval: 15, // 15 minutes
      maxAlertsPerDay: 20,
      quietHours: {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
      },
    };
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${++this.alertCounter}`;
  }

  private isInQuietHours(): boolean {
    if (!this.settings.quietHours.enabled) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    const startTime = parseInt(this.settings.quietHours.startTime.replace(':', ''));
    const endTime = parseInt(this.settings.quietHours.endTime.replace(':', ''));
    
    if (startTime > endTime) {
      // Overnight quiet hours (e.g., 22:00 to 08:00)
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      // Same day quiet hours (e.g., 12:00 to 14:00)
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  private getTodayAlertsCount(): number {
    const today = new Date().toDateString();
    return this.alerts.filter(alert => 
      new Date(alert.createdAt).toDateString() === today
    ).length;
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring || !this.settings.enabled) return;
    
    this.isMonitoring = true;
    console.log(`🚨 Alert monitoring started - checking every ${this.settings.monitoringInterval} minutes`);
    
    // Initial scan
    await this.scanForAlerts();
    
    // Set up periodic scanning
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.scanForAlerts();
      } catch (error) {
        console.error('Error during alert scanning:', error);
      }
    }, this.settings.monitoringInterval * 60 * 1000);
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    console.log('🔕 Alert monitoring stopped');
  }

  private async scanForAlerts(): Promise<void> {
    if (this.isInQuietHours()) {
      console.log('⏰ In quiet hours - skipping alert scan');
      return;
    }

    if (this.getTodayAlertsCount() >= this.settings.maxAlertsPerDay) {
      console.log('📊 Daily alert limit reached - skipping scan');
      return;
    }

    try {
      // Check quota availability before scanning
      const availableProviders = quotaManager.getAvailableProviders();
      if (availableProviders.length === 0) {
        console.log('⚠️ All AI providers have exceeded their quotas - skipping alert scan');
        return;
      }

      console.log(`🤖 Available AI providers: ${availableProviders.join(', ')}`);
      
      // Get a smaller number of stocks to manage quota usage
      const stockCount = Math.min(20, availableProviders.length * 5); // Scale with available providers
      const topStocks = await indicesService.getTopPerformersAcrossIndices(stockCount);
      
      console.log(`📊 Scanning ${topStocks.length} stocks with quota-aware AI analysis`);
      
      // Use intelligent AI service with quota management and fallback
      const aiResponse = await intelligentAI.getDailyRecommendations(
        topStocks.map(stock => stock.symbol),
        {
          enableFallback: true,
          retryAttempts: 2
        }
      );

      if (aiResponse.error) {
        console.error('AI analysis failed:', aiResponse.error);
        
        // Display user-friendly error message
        this.showQuotaWarning(aiResponse.error);
        return;
      }

      if (!aiResponse.data) {
        console.log('No AI recommendations received');
        return;
      }

      // Process recommendations for alerts
      let processedCount = 0;
      for (const recommendation of aiResponse.data) {
        if (recommendation) {
          await this.processRecommendationForAlerts(recommendation);
          processedCount++;
        }
      }

      // Log quota usage info
      const quotaInfo = quotaManager.getAllUsageInfo();
      console.log(`🔍 Alert scan completed:`, {
        processed: processedCount,
        provider: aiResponse.provider,
        fallbackUsed: aiResponse.quotaInfo.fallbackUsed,
        remainingQuota: aiResponse.quotaInfo.remainingQuota,
        quotaStatus: Object.entries(quotaInfo).map(([provider, info]) => 
          `${provider}: ${info.usage}/${info.limit} (${info.percentage.toFixed(1)}%)`
        ).join(', ')
      });

    } catch (error) {
      console.error('Error scanning for alerts:', error);
      
      // Check if it's a quota-related error
      if (error instanceof Error && error.message.includes('quota')) {
        this.showQuotaWarning(error.message);
      }
    }
  }

  private async processRecommendationForAlerts(recommendation: AIRecommendation): Promise<void> {
    // Check if this recommendation meets alert criteria
    if (recommendation.confidence < this.settings.confidenceThreshold) return;
    if (!this.settings.riskLevelsEnabled.includes(recommendation.riskLevel)) return;
    
    // Check for duplicate alerts (same symbol, same day)
    const today = new Date().toDateString();
    const existingAlert = this.alerts.find(alert => 
      alert.symbol === recommendation.symbol &&
      new Date(alert.createdAt).toDateString() === today &&
      alert.isActive &&
      !alert.isDismissed
    );
    
    if (existingAlert) return; // Don't create duplicate alerts
    
    // Determine alert type and priority
    let alertType: TradingAlert['type'];
    let priority: TradingAlert['priority'] = 'MEDIUM';
    let message: string;
    
    if (recommendation.action === 'BUY' && this.settings.alertTypes.highConfidenceBuy) {
      alertType = 'HIGH_CONFIDENCE_BUY';
      message = `Strong BUY signal detected for ${recommendation.symbol} with ${recommendation.confidence}% confidence`;
      if (recommendation.confidence >= 90) priority = 'URGENT';
      else if (recommendation.confidence >= 80) priority = 'HIGH';
    } else if (recommendation.action === 'SELL' && this.settings.alertTypes.highConfidenceSell) {
      alertType = 'HIGH_CONFIDENCE_SELL';
      message = `Strong SELL signal detected for ${recommendation.symbol} with ${recommendation.confidence}% confidence`;
      if (recommendation.confidence >= 90) priority = 'URGENT';
      else if (recommendation.confidence >= 80) priority = 'HIGH';
    } else {
      return; // No alert needed for HOLD or disabled alert types
    }

    // Create alert actions
    const actions: AlertAction[] = [
      {
        type: recommendation.action,
        label: `${recommendation.action} ${recommendation.symbol}`,
        data: { symbol: recommendation.symbol, targetPrice: recommendation.targetPrice }
      },
      {
        type: 'VIEW_ANALYSIS',
        label: 'View Analysis',
        data: { symbol: recommendation.symbol }
      },
      {
        type: 'DISMISS',
        label: 'Dismiss',
      }
    ];

    // Create the alert
    const alert: TradingAlert = {
      id: this.generateAlertId(),
      symbol: recommendation.symbol,
      name: recommendation.name,
      type: alertType,
      priority,
      recommendation,
      currentPrice: recommendation.currentPrice,
      message,
      createdAt: new Date().toISOString(),
      isActive: true,
      isDismissed: false,
      isRead: false,
      actions
    };

    this.alerts.unshift(alert); // Add to beginning of array
    this.saveAlertsToStorage();
    
    // Trigger notification
    await this.sendNotification(alert);
    
    console.log(`🚨 Alert created: ${alert.type} for ${alert.symbol} (${alert.priority} priority)`);
  }

  private async sendNotification(alert: TradingAlert): Promise<void> {
    // Browser notification
    if (this.settings.notificationSettings.browser && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const notification = new Notification(`${alert.symbol} Trading Alert`, {
          body: alert.message,
          icon: '/favicon.ico',
          tag: alert.id,
          requireInteraction: alert.priority === 'URGENT',
        });
        
        notification.onclick = () => {
          window.focus();
          // Navigate to trading page or alert details
          notification.close();
        };
      }
    }

    // Sound notification
    if (this.settings.notificationSettings.sound) {
      try {
        const audio = new Audio('/notification-sound.mp3');
        audio.volume = alert.priority === 'URGENT' ? 0.8 : 0.5;
        await audio.play();
      } catch (error) {
        console.warn('Could not play notification sound:', error);
      }
    }
  }

  // Public API methods
  getAlerts(filters?: {
    isActive?: boolean;
    isRead?: boolean;
    priority?: TradingAlert['priority'];
    type?: TradingAlert['type'];
  }): TradingAlert[] {
    let filteredAlerts = [...this.alerts];
    
    if (filters) {
      if (filters.isActive !== undefined) {
        filteredAlerts = filteredAlerts.filter(alert => alert.isActive === filters.isActive);
      }
      if (filters.isRead !== undefined) {
        filteredAlerts = filteredAlerts.filter(alert => alert.isRead === filters.isRead);
      }
      if (filters.priority) {
        filteredAlerts = filteredAlerts.filter(alert => alert.priority === filters.priority);
      }
      if (filters.type) {
        filteredAlerts = filteredAlerts.filter(alert => alert.type === filters.type);
      }
    }
    
    return filteredAlerts.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getAlertSummary(): AlertSummary {
    const today = new Date().toDateString();
    
    return {
      totalActive: this.alerts.filter(alert => alert.isActive && !alert.isDismissed).length,
      totalUnread: this.alerts.filter(alert => !alert.isRead && !alert.isDismissed).length,
      highPriorityCount: this.alerts.filter(alert => 
        (alert.priority === 'HIGH' || alert.priority === 'URGENT') && 
        alert.isActive && 
        !alert.isDismissed
      ).length,
      todayCount: this.alerts.filter(alert => 
        new Date(alert.createdAt).toDateString() === today
      ).length,
    };
  }

  markAsRead(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.isRead = true;
      this.saveAlertsToStorage();
      return true;
    }
    return false;
  }

  dismissAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.isDismissed = true;
      alert.isActive = false;
      this.saveAlertsToStorage();
      return true;
    }
    return false;
  }

  updateSettings(newSettings: Partial<AlertSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettingsToStorage();
    
    // Restart monitoring if needed
    if (this.isMonitoring) {
      this.stopMonitoring();
      if (this.settings.enabled) {
        this.startMonitoring();
      }
    } else if (this.settings.enabled) {
      this.startMonitoring();
    }
  }

  getSettings(): AlertSettings {
    return { ...this.settings };
  }

  // Storage methods
  private saveAlertsToStorage(): void {
    try {
      localStorage.setItem('trading_alerts', JSON.stringify(this.alerts));
    } catch (error) {
      console.error('Error saving alerts to storage:', error);
    }
  }

  private loadAlertsFromStorage(): void {
    try {
      const stored = localStorage.getItem('trading_alerts');
      if (stored) {
        this.alerts = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading alerts from storage:', error);
      this.alerts = [];
    }
  }

  private saveSettingsToStorage(): void {
    try {
      localStorage.setItem('alert_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving settings to storage:', error);
    }
  }

  private loadSettingsFromStorage(): void {
    try {
      const stored = localStorage.getItem('alert_settings');
      if (stored) {
        this.settings = { ...this.getDefaultSettings(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading settings from storage:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  // Cleanup old alerts (keep last 30 days)
  cleanupOldAlerts(): void {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const initialCount = this.alerts.length;
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.createdAt) > thirtyDaysAgo
    );
    
    if (this.alerts.length < initialCount) {
      this.saveAlertsToStorage();
      console.log(`🧹 Cleaned up ${initialCount - this.alerts.length} old alerts`);
    }
  }

  // Get alert statistics
  getAlertStats(days = 7): {
    totalAlerts: number;
    averagePerDay: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    successfulTrades: number;
  } {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentAlerts = this.alerts.filter(alert => 
      new Date(alert.createdAt) > cutoffDate
    );
    
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    
    recentAlerts.forEach(alert => {
      byType[alert.type] = (byType[alert.type] || 0) + 1;
      byPriority[alert.priority] = (byPriority[alert.priority] || 0) + 1;
    });
    
    return {
      totalAlerts: recentAlerts.length,
      averagePerDay: recentAlerts.length / days,
      byType,
      byPriority,
      successfulTrades: 0, // TODO: Track this based on user actions
    };
  }

  private showQuotaWarning(errorMessage: string): void {
    // Create a special quota warning alert
    const quotaAlert: TradingAlert = {
      id: this.generateAlertId(),
      symbol: 'SYSTEM',
      name: 'AI Quota Alert',
      type: 'PORTFOLIO_REBALANCE', // Reuse existing type
      priority: 'HIGH',
      recommendation: {
        symbol: 'SYSTEM',
        action: 'HOLD',
        confidence: 0,
        reasoning: 'AI quota management notification',
        riskLevel: 'LOW',
        targetPrice: 0,
        currentPrice: 0,
        keyFactors: [],
        marketContext: '',
        sentiment: 'NEUTRAL',
        timeHorizon: '1D'
      },
      currentPrice: 0,
      message: `⚠️ AI Quota Alert: ${errorMessage}. Bot will automatically switch to available providers or pause scanning.`,
      createdAt: new Date().toISOString(),
      isActive: true,
      isDismissed: false,
      isRead: false,
      actions: [
        {
          type: 'VIEW_ANALYSIS',
          label: 'View Quota Status'
        },
        {
          type: 'DISMISS',
          label: 'Dismiss'
        }
      ]
    };

    this.alerts.unshift(quotaAlert);
    this.saveAlertsToStorage();
    
    // Send quota notification
    this.sendQuotaNotification(errorMessage);
    
    console.log('⚠️ Quota warning alert created');
  }

  private async sendQuotaNotification(message: string): Promise<void> {
    // Send browser notification for quota issues
    if (this.settings.notificationSettings.browser && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('AI Trading Bot - Quota Alert', {
          body: `Quota limit reached. ${message}`,
          icon: '/favicon.ico',
          tag: 'quota_alert',
          requireInteraction: true,
        });
      }
    }
    
    // Play urgent sound for quota issues
    if (this.settings.notificationSettings.sound) {
      try {
        const audio = new Audio('/notification-sound.mp3');
        audio.volume = 0.7;
        await audio.play();
      } catch (error) {
        console.warn('Could not play quota notification sound:', error);
      }
    }
  }

  // Get quota status for dashboard display
  getQuotaStatus(): Record<string, ReturnType<typeof quotaManager.getUsageInfo>> {
    return quotaManager.getAllUsageInfo();
  }

  // Check if any AI provider is available
  isAIAvailable(): boolean {
    return quotaManager.getAvailableProviders().length > 0;
  }

  // Reset quotas (admin function)
  resetQuotas(): void {
    quotaManager.resetAllQuotas();
    console.log('🔄 AI quotas have been reset');
  }
}

export const alertService = new AlertService();

// Auto-start monitoring when service is imported
if (typeof window !== 'undefined') {
  // Only start in browser environment
  setTimeout(() => {
    alertService.startMonitoring();
  }, 5000); // Start after 5 seconds to avoid blocking initial load
}