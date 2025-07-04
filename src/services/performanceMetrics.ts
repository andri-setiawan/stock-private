// Performance metrics calculations for portfolio analytics
export interface PerformanceData {
  returns: number[];
  values: number[];
  timestamps: Date[];
}

export interface RiskMetrics {
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  valueAtRisk: number; // 95% VaR
  conditionalVaR: number; // Expected Shortfall
  beta: number;
  alpha: number;
  calmarRatio: number;
  informationRatio: number;
  treynorRatio: number;
}

export interface ReturnMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  compoundAnnualGrowthRate: number;
  periodReturns: {
    daily: number;
    weekly: number;
    monthly: number;
    quarterly: number;
    ytd: number;
  };
  rollingReturns: {
    returns30d: number;
    returns90d: number;
    returns1y: number;
  };
}

export interface BenchmarkMetrics {
  correlation: number;
  beta: number;
  alpha: number;
  trackingError: number;
  informationRatio: number;
  upCapture: number;
  downCapture: number;
  relativePerformance: number;
}

class PerformanceMetricsService {
  private readonly RISK_FREE_RATE = 0.02; // 2% annual
  private readonly TRADING_DAYS_PER_YEAR = 252;
  private readonly CONFIDENCE_LEVEL = 0.05; // 95% confidence for VaR

  /**
   * Calculate comprehensive return metrics
   */
  calculateReturnMetrics(
    initialValue: number,
    currentValue: number,
    historicalValues: number[],
    timestamps: Date[]
  ): ReturnMetrics {
    const totalReturn = currentValue - initialValue;
    const totalReturnPercent = (totalReturn / initialValue) * 100;
    
    // Calculate time period
    const startDate = timestamps[0];
    const endDate = timestamps[timestamps.length - 1];
    const daysDiff = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const yearsDiff = daysDiff / 365.25;
    
    // Annualized return
    const annualizedReturn = yearsDiff > 0 ? 
      (Math.pow(currentValue / initialValue, 1 / yearsDiff) - 1) * 100 : 0;
    
    // CAGR (same as annualized for this case)
    const compoundAnnualGrowthRate = annualizedReturn;
    
    // Period returns
    const periodReturns = this.calculatePeriodReturns(historicalValues, timestamps);
    
    // Rolling returns
    const rollingReturns = this.calculateRollingReturns(historicalValues, timestamps);
    
    return {
      totalReturn,
      totalReturnPercent,
      annualizedReturn,
      compoundAnnualGrowthRate,
      periodReturns,
      rollingReturns
    };
  }

  /**
   * Calculate comprehensive risk metrics
   */
  calculateRiskMetrics(
    returns: number[],
    portfolioReturns: number[],
    benchmarkReturns?: number[]
  ): RiskMetrics {
    if (returns.length === 0) {
      return this.getDefaultRiskMetrics();
    }

    // Basic volatility
    const volatility = this.calculateVolatility(returns);
    
    // Sharpe ratio
    const avgReturn = this.calculateAnnualizedReturn(returns);
    const sharpeRatio = volatility > 0 ? (avgReturn - this.RISK_FREE_RATE) / volatility : 0;
    
    // Sortino ratio (downside deviation)
    const sortinoRatio = this.calculateSortinoRatio(returns, avgReturn);
    
    // Maximum drawdown
    const { maxDrawdown, maxDrawdownPercent } = this.calculateMaxDrawdown(portfolioReturns);
    
    // Calmar ratio
    const calmarRatio = maxDrawdownPercent > 0 ? avgReturn / Math.abs(maxDrawdownPercent) : 0;
    
    // Value at Risk (VaR)
    const valueAtRisk = this.calculateVaR(returns, this.CONFIDENCE_LEVEL);
    
    // Conditional VaR (Expected Shortfall)
    const conditionalVaR = this.calculateConditionalVaR(returns, this.CONFIDENCE_LEVEL);
    
    // Beta and Alpha (vs benchmark)
    let beta = 1.0;
    let alpha = avgReturn - this.RISK_FREE_RATE;
    let informationRatio = 0;
    let treynorRatio = 0;
    
    if (benchmarkReturns && benchmarkReturns.length === returns.length) {
      beta = this.calculateBeta(returns, benchmarkReturns);
      const benchmarkReturn = this.calculateAnnualizedReturn(benchmarkReturns);
      alpha = avgReturn - (this.RISK_FREE_RATE + beta * (benchmarkReturn - this.RISK_FREE_RATE));
      
      const trackingError = this.calculateTrackingError(returns, benchmarkReturns);
      informationRatio = trackingError > 0 ? alpha / trackingError : 0;
      treynorRatio = beta > 0 ? (avgReturn - this.RISK_FREE_RATE) / beta : 0;
    }
    
    return {
      volatility,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      maxDrawdownPercent,
      valueAtRisk,
      conditionalVaR,
      beta,
      alpha,
      calmarRatio,
      informationRatio,
      treynorRatio
    };
  }

  /**
   * Calculate benchmark comparison metrics
   */
  calculateBenchmarkMetrics(
    portfolioReturns: number[],
    benchmarkReturns: number[]
  ): BenchmarkMetrics {
    if (portfolioReturns.length !== benchmarkReturns.length || portfolioReturns.length === 0) {
      return this.getDefaultBenchmarkMetrics();
    }

    // Correlation
    const correlation = this.calculateCorrelation(portfolioReturns, benchmarkReturns);
    
    // Beta
    const beta = this.calculateBeta(portfolioReturns, benchmarkReturns);
    
    // Alpha
    const portfolioReturn = this.calculateAnnualizedReturn(portfolioReturns);
    const benchmarkReturn = this.calculateAnnualizedReturn(benchmarkReturns);
    const alpha = portfolioReturn - (this.RISK_FREE_RATE + beta * (benchmarkReturn - this.RISK_FREE_RATE));
    
    // Tracking error
    const trackingError = this.calculateTrackingError(portfolioReturns, benchmarkReturns);
    
    // Information ratio
    const informationRatio = trackingError > 0 ? alpha / trackingError : 0;
    
    // Up/Down capture ratios
    const { upCapture, downCapture } = this.calculateCaptureRatios(portfolioReturns, benchmarkReturns);
    
    // Relative performance
    const relativePerformance = portfolioReturn - benchmarkReturn;
    
    return {
      correlation,
      beta,
      alpha,
      trackingError,
      informationRatio,
      upCapture,
      downCapture,
      relativePerformance
    };
  }

  /**
   * Calculate rolling performance metrics
   */
  calculateRollingMetrics(
    returns: number[],
    windowSize: number
  ): {
    rollingReturns: number[];
    rollingVolatility: number[];
    rollingSharpe: number[];
    timestamps: Date[];
  } {
    const rollingReturns: number[] = [];
    const rollingVolatility: number[] = [];
    const rollingSharpe: number[] = [];
    const timestamps: Date[] = [];
    
    for (let i = windowSize; i <= returns.length; i++) {
      const window = returns.slice(i - windowSize, i);
      
      // Rolling return (cumulative)
      const cumulativeReturn = window.reduce((acc, ret) => (1 + acc) * (1 + ret) - 1, 0);
      rollingReturns.push(cumulativeReturn * 100);
      
      // Rolling volatility
      const volatility = this.calculateVolatility(window);
      rollingVolatility.push(volatility * 100);
      
      // Rolling Sharpe ratio
      const avgReturn = this.calculateAnnualizedReturn(window);
      const sharpe = volatility > 0 ? (avgReturn - this.RISK_FREE_RATE) / volatility : 0;
      rollingSharpe.push(sharpe);
      
      // Timestamp (assuming daily data)
      const date = new Date();
      date.setDate(date.getDate() - (returns.length - i));
      timestamps.push(date);
    }
    
    return {
      rollingReturns,
      rollingVolatility,
      rollingSharpe,
      timestamps
    };
  }

  // Private calculation methods

  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const squaredDeviations = returns.map(ret => Math.pow(ret - mean, 2));
    const variance = squaredDeviations.reduce((sum, dev) => sum + dev, 0) / (returns.length - 1);
    
    // Annualize the volatility
    return Math.sqrt(variance * this.TRADING_DAYS_PER_YEAR);
  }

  private calculateAnnualizedReturn(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const totalReturn = returns.reduce((acc, ret) => (1 + acc) * (1 + ret) - 1, 0);
    const periodsPerYear = this.TRADING_DAYS_PER_YEAR / returns.length;
    
    return Math.pow(1 + totalReturn, periodsPerYear) - 1;
  }

  private calculateSortinoRatio(returns: number[], avgReturn: number): number {
    const negativeReturns = returns.filter(ret => ret < 0);
    
    if (negativeReturns.length === 0) {
      return avgReturn > this.RISK_FREE_RATE ? 10 : 0; // Very high ratio if no negative returns
    }
    
    const downsideVariance = negativeReturns.reduce((sum, ret) => sum + Math.pow(ret, 2), 0) / negativeReturns.length;
    const downsideDeviation = Math.sqrt(downsideVariance * this.TRADING_DAYS_PER_YEAR);
    
    return downsideDeviation > 0 ? (avgReturn - this.RISK_FREE_RATE) / downsideDeviation : 0;
  }

  private calculateMaxDrawdown(values: number[]): { maxDrawdown: number; maxDrawdownPercent: number } {
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let peak = values[0] || 0;
    
    for (const value of values) {
      if (value > peak) {
        peak = value;
      }
      
      const drawdown = peak - value;
      const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;
      
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPercent = drawdownPercent;
      }
    }
    
    return { maxDrawdown, maxDrawdownPercent };
  }

  private calculateVaR(returns: number[], confidenceLevel: number): number {
    if (returns.length === 0) return 0;
    
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor(returns.length * confidenceLevel);
    
    return Math.abs(sortedReturns[index] || 0) * 100;
  }

  private calculateConditionalVaR(returns: number[], confidenceLevel: number): number {
    if (returns.length === 0) return 0;
    
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const cutoffIndex = Math.floor(returns.length * confidenceLevel);
    const tailReturns = sortedReturns.slice(0, cutoffIndex);
    
    if (tailReturns.length === 0) return 0;
    
    const averageTailReturn = tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length;
    return Math.abs(averageTailReturn) * 100;
  }

  private calculateBeta(portfolioReturns: number[], benchmarkReturns: number[]): number {
    if (portfolioReturns.length !== benchmarkReturns.length || portfolioReturns.length === 0) {
      return 1.0;
    }
    
    const portfolioMean = portfolioReturns.reduce((sum, ret) => sum + ret, 0) / portfolioReturns.length;
    const benchmarkMean = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length;
    
    let covariance = 0;
    let benchmarkVariance = 0;
    
    for (let i = 0; i < portfolioReturns.length; i++) {
      const portfolioDev = portfolioReturns[i] - portfolioMean;
      const benchmarkDev = benchmarkReturns[i] - benchmarkMean;
      
      covariance += portfolioDev * benchmarkDev;
      benchmarkVariance += benchmarkDev * benchmarkDev;
    }
    
    return benchmarkVariance > 0 ? covariance / benchmarkVariance : 1.0;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const xMean = x.reduce((sum, val) => sum + val, 0) / x.length;
    const yMean = y.reduce((sum, val) => sum + val, 0) / y.length;
    
    let numerator = 0;
    let xVariance = 0;
    let yVariance = 0;
    
    for (let i = 0; i < x.length; i++) {
      const xDev = x[i] - xMean;
      const yDev = y[i] - yMean;
      
      numerator += xDev * yDev;
      xVariance += xDev * xDev;
      yVariance += yDev * yDev;
    }
    
    const denominator = Math.sqrt(xVariance * yVariance);
    return denominator > 0 ? numerator / denominator : 0;
  }

  private calculateTrackingError(portfolioReturns: number[], benchmarkReturns: number[]): number {
    if (portfolioReturns.length !== benchmarkReturns.length) return 0;
    
    const differences = portfolioReturns.map((ret, i) => ret - benchmarkReturns[i]);
    return this.calculateVolatility(differences);
  }

  private calculateCaptureRatios(portfolioReturns: number[], benchmarkReturns: number[]): {
    upCapture: number;
    downCapture: number;
  } {
    if (portfolioReturns.length !== benchmarkReturns.length) {
      return { upCapture: 1, downCapture: 1 };
    }
    
    const upPeriods = [];
    const downPeriods = [];
    
    for (let i = 0; i < benchmarkReturns.length; i++) {
      if (benchmarkReturns[i] > 0) {
        upPeriods.push({ portfolio: portfolioReturns[i], benchmark: benchmarkReturns[i] });
      } else if (benchmarkReturns[i] < 0) {
        downPeriods.push({ portfolio: portfolioReturns[i], benchmark: benchmarkReturns[i] });
      }
    }
    
    const upCapture = upPeriods.length > 0 ?
      (upPeriods.reduce((sum, p) => sum + p.portfolio, 0) / upPeriods.length) /
      (upPeriods.reduce((sum, p) => sum + p.benchmark, 0) / upPeriods.length) : 1;
    
    const downCapture = downPeriods.length > 0 ?
      (downPeriods.reduce((sum, p) => sum + p.portfolio, 0) / downPeriods.length) /
      (downPeriods.reduce((sum, p) => sum + p.benchmark, 0) / downPeriods.length) : 1;
    
    return { upCapture, downCapture };
  }

  private calculatePeriodReturns(values: number[], timestamps: Date[]): any {
    if (values.length < 2) {
      return {
        daily: 0, weekly: 0, monthly: 0, quarterly: 0, ytd: 0
      };
    }
    
    const current = values[values.length - 1];
    const previous = values[values.length - 2];
    const daily = ((current - previous) / previous) * 100;
    
    // For weekly, monthly, etc., we'd need more sophisticated logic
    // For now, using simplified calculations
    return {
      daily,
      weekly: daily * 7, // Simplified
      monthly: daily * 30, // Simplified
      quarterly: daily * 90, // Simplified
      ytd: ((current - values[0]) / values[0]) * 100 // Simplified
    };
  }

  private calculateRollingReturns(values: number[], timestamps: Date[]): any {
    if (values.length < 30) {
      return { returns30d: 0, returns90d: 0, returns1y: 0 };
    }
    
    const current = values[values.length - 1];
    
    return {
      returns30d: values.length >= 30 ? 
        ((current - values[values.length - 30]) / values[values.length - 30]) * 100 : 0,
      returns90d: values.length >= 90 ? 
        ((current - values[values.length - 90]) / values[values.length - 90]) * 100 : 0,
      returns1y: values.length >= 252 ? 
        ((current - values[values.length - 252]) / values[values.length - 252]) * 100 : 0
    };
  }

  private getDefaultRiskMetrics(): RiskMetrics {
    return {
      volatility: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      valueAtRisk: 0,
      conditionalVaR: 0,
      beta: 1,
      alpha: 0,
      calmarRatio: 0,
      informationRatio: 0,
      treynorRatio: 0
    };
  }

  private getDefaultBenchmarkMetrics(): BenchmarkMetrics {
    return {
      correlation: 0,
      beta: 1,
      alpha: 0,
      trackingError: 0,
      informationRatio: 0,
      upCapture: 1,
      downCapture: 1,
      relativePerformance: 0
    };
  }
}

export const performanceMetricsService = new PerformanceMetricsService();