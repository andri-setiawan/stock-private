// Performance monitoring and optimization utilities

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

interface PerformanceStats {
  averageTime: number;
  minTime: number;
  maxTime: number;
  totalCalls: number;
  errorCount: number;
  lastCall: number;
}

class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric[]>();
  private activeTimers = new Map<string, number>();

  startTimer(name: string, metadata?: Record<string, unknown>): string {
    const id = `${name}_${Date.now()}_${Math.random().toString(36)}`;
    const startTime = performance.now();
    
    this.activeTimers.set(id, startTime);
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const metric: PerformanceMetric = {
      name,
      startTime,
      metadata,
    };
    
    this.metrics.get(name)!.push(metric);
    
    return id;
  }

  endTimer(id: string): number {
    const startTime = this.activeTimers.get(id);
    if (!startTime) {
      console.warn(`Timer ${id} not found`);
      return 0;
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    this.activeTimers.delete(id);
    
    // Find and update the corresponding metric
    for (const metrics of this.metrics.values()) {
      const metric = metrics.find(m => m.startTime === startTime);
      if (metric) {
        metric.endTime = endTime;
        metric.duration = duration;
        break;
      }
    }
    
    return duration;
  }

  measure<T>(name: string, fn: () => T, metadata?: Record<string, unknown>): T {
    const id = this.startTimer(name, metadata);
    try {
      const result = fn();
      this.endTimer(id);
      return result;
    } catch (error) {
      this.endTimer(id);
      this.recordError(name, error);
      throw error;
    }
  }

  async measureAsync<T>(
    name: string, 
    fn: () => Promise<T>, 
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const id = this.startTimer(name, metadata);
    try {
      const result = await fn();
      this.endTimer(id);
      return result;
    } catch (error) {
      this.endTimer(id);
      this.recordError(name, error);
      throw error;
    }
  }

  recordError(name: string, error: unknown): void {
    if (!this.metrics.has(`${name}_errors`)) {
      this.metrics.set(`${name}_errors`, []);
    }
    
    const errorMetric: PerformanceMetric = {
      name: `${name}_errors`,
      startTime: performance.now(),
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
    };
    
    this.metrics.get(`${name}_errors`)!.push(errorMetric);
  }

  getStats(name: string): PerformanceStats | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) {
      return null;
    }
    
    const completedMetrics = metrics.filter(m => m.duration !== undefined);
    if (completedMetrics.length === 0) {
      return null;
    }
    
    const durations = completedMetrics.map(m => m.duration!);
    const errorMetrics = this.metrics.get(`${name}_errors`) || [];
    
    return {
      averageTime: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minTime: Math.min(...durations),
      maxTime: Math.max(...durations),
      totalCalls: completedMetrics.length,
      errorCount: errorMetrics.length,
      lastCall: Math.max(...completedMetrics.map(m => m.startTime)),
    };
  }

  getAllStats(): Record<string, PerformanceStats> {
    const stats: Record<string, PerformanceStats> = {};
    
    for (const name of this.metrics.keys()) {
      if (!name.endsWith('_errors')) {
        const stat = this.getStats(name);
        if (stat) {
          stats[name] = stat;
        }
      }
    }
    
    return stats;
  }

  clearMetrics(name?: string): void {
    if (name) {
      this.metrics.delete(name);
      this.metrics.delete(`${name}_errors`);
    } else {
      this.metrics.clear();
      this.activeTimers.clear();
    }
  }

  // Keep only recent metrics to prevent memory leaks
  cleanup(maxAge: number = 5 * 60 * 1000): void {
    const cutoff = performance.now() - maxAge;
    
    for (const [name, metrics] of this.metrics.entries()) {
      const recentMetrics = metrics.filter(m => m.startTime > cutoff);
      this.metrics.set(name, recentMetrics);
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Decorator for automatic performance monitoring
export function monitored(name?: string) {
  return function <T extends (...args: unknown[]) => unknown>(
    target: unknown,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;
    const methodName = name || `${(target as Record<string, unknown>).constructor.name}.${propertyKey}`;
    
    descriptor.value = function (this: any, ...args: Parameters<T>) {
      return performanceMonitor.measure(methodName, () => originalMethod.apply(this, args));
    } as T;
    
    return descriptor;
  };
}

// Hook for React components
export function usePerformanceMonitor() {
  const measureRender = React.useCallback((componentName: string) => {
    return performanceMonitor.startTimer(`render_${componentName}`);
  }, []);
  
  const endMeasure = React.useCallback((id: string) => {
    return performanceMonitor.endTimer(id);
  }, []);
  
  return { measureRender, endMeasure };
}

// Web Vitals monitoring
export function initWebVitals(): void {
  if (typeof window === 'undefined') return;
  
  // Largest Contentful Paint
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            performanceMonitor.measure('web_vitals_lcp', () => {
              console.log('LCP:', entry.startTime);
              return entry.startTime;
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.warn('Failed to observe LCP:', error);
    }
  }
  
  // First Input Delay
  if ('addEventListener' in window) {
    const measureFID = () => {
      performanceMonitor.startTimer('web_vitals_fid');
    };
    
    ['keydown', 'click'].forEach(type => {
      addEventListener(type, measureFID, { once: true, passive: true });
    });
  }
}

// Memory usage monitoring
export function getMemoryUsage(): {
  used: number;
  total: number;
  percentage: number;
} | null {
  if (typeof window === 'undefined' || !('memory' in performance)) {
    return null;
  }
  
  const memory = (performance as unknown as { memory: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
  return {
    used: memory.usedJSHeapSize,
    total: memory.totalJSHeapSize,
    percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
  };
}

// Network monitoring
export function measureNetworkCall<T>(
  name: string,
  promise: Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  return performanceMonitor.measureAsync(name, () => promise, metadata);
}

// Debounced and throttled utilities
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function (...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Bundle size analyzer (development only)
export function analyzeBundleSize(): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  const scripts = document.querySelectorAll('script[src]');
  let totalSize = 0;
  
  scripts.forEach(async (script) => {
    const src = (script as HTMLScriptElement).src;
    if (src.includes('_next') || src.includes('webpack')) {
      try {
        const response = await fetch(src, { method: 'HEAD' });
        const size = parseInt(response.headers.get('content-length') || '0');
        totalSize += size;
        console.log(`Bundle: ${src.split('/').pop()} - ${(size / 1024).toFixed(2)}KB`);
      } catch (error) {
        console.warn(`Failed to analyze bundle size for ${src}:`, error);
      }
    }
  });
  
  setTimeout(() => {
    console.log(`Total bundle size: ${(totalSize / 1024).toFixed(2)}KB`);
  }, 1000);
}

// Performance recommendations
export function getPerformanceRecommendations(): string[] {
  const recommendations: string[] = [];
  const stats = performanceMonitor.getAllStats();
  
  // Check for slow operations
  Object.entries(stats).forEach(([name, stat]) => {
    if (stat.averageTime > 1000) {
      recommendations.push(`${name} is slow (avg: ${stat.averageTime.toFixed(2)}ms)`);
    }
    
    if (stat.errorCount > stat.totalCalls * 0.1) {
      recommendations.push(`${name} has high error rate (${stat.errorCount}/${stat.totalCalls})`);
    }
  });
  
  // Check memory usage
  const memory = getMemoryUsage();
  if (memory && memory.percentage > 80) {
    recommendations.push(`High memory usage: ${memory.percentage.toFixed(1)}%`);
  }
  
  return recommendations;
}

// Auto-cleanup and monitoring
if (typeof window !== 'undefined') {
  // Initialize web vitals monitoring
  initWebVitals();
  
  // Clean up old metrics every 5 minutes
  setInterval(() => {
    performanceMonitor.cleanup();
  }, 5 * 60 * 1000);
  
  // Log performance stats in development
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      const stats = performanceMonitor.getAllStats();
      if (Object.keys(stats).length > 0) {
        console.group('Performance Stats');
        Object.entries(stats).forEach(([name, stat]) => {
          console.log(`${name}:`, {
            avg: `${stat.averageTime.toFixed(2)}ms`,
            min: `${stat.minTime.toFixed(2)}ms`,
            max: `${stat.maxTime.toFixed(2)}ms`,
            calls: stat.totalCalls,
            errors: stat.errorCount,
          });
        });
        console.groupEnd();
        
        const recommendations = getPerformanceRecommendations();
        if (recommendations.length > 0) {
          console.warn('Performance Recommendations:', recommendations);
        }
      }
    }, 30 * 1000); // Every 30 seconds in development
  }
}

// React import (conditional)
let React: typeof import('react') | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  React = require('react') as typeof import('react');
} catch {
  // React not available, usePerformanceMonitor won't work
}