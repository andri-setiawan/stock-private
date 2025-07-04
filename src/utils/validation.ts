// Input validation and sanitization utilities
import { z } from 'zod';

// Stock symbol validation
export const stockSymbolSchema = z.string()
  .min(1, 'Stock symbol is required')
  .max(10, 'Stock symbol too long')
  .regex(/^[A-Z0-9.-]+$/, 'Invalid stock symbol format')
  .transform((val) => val.toUpperCase().trim());

// Trade validation
export const tradeSchema = z.object({
  symbol: stockSymbolSchema,
  type: z.enum(['BUY', 'SELL'], {
    errorMap: () => ({ message: 'Trade type must be BUY or SELL' })
  }),
  quantity: z.number()
    .positive('Quantity must be positive')
    .int('Quantity must be a whole number')
    .max(10000, 'Quantity too large'),
  price: z.number()
    .positive('Price must be positive')
    .max(100000, 'Price too high'),
});

// Alert settings validation
export const alertSettingsSchema = z.object({
  enabled: z.boolean(),
  confidenceThreshold: z.number()
    .min(0, 'Confidence threshold must be at least 0')
    .max(100, 'Confidence threshold must be at most 100'),
  riskLevelsEnabled: z.array(z.enum(['LOW', 'MEDIUM', 'HIGH'])),
  alertTypes: z.object({
    highConfidenceBuy: z.boolean(),
    highConfidenceSell: z.boolean(),
    priceTargetHit: z.boolean(),
    volatilitySpike: z.boolean(),
    portfolioRebalance: z.boolean(),
  }),
  notificationSettings: z.object({
    browser: z.boolean(),
    sound: z.boolean(),
    email: z.boolean(),
  }),
  monitoringInterval: z.number()
    .min(5, 'Monitoring interval must be at least 5 minutes')
    .max(1440, 'Monitoring interval must be at most 24 hours'),
  maxAlertsPerDay: z.number()
    .min(1, 'Must allow at least 1 alert per day')
    .max(1000, 'Too many alerts per day'),
  quietHours: z.object({
    enabled: z.boolean(),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  }),
});

// User authentication validation
export const loginSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid username format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
});

// Portfolio data validation
export const portfolioDataSchema = z.object({
  cashBalance: z.number()
    .nonnegative('Cash balance cannot be negative')
    .max(10000000, 'Cash balance too high'),
  totalValue: z.number()
    .nonnegative('Total value cannot be negative')
    .max(10000000, 'Total value too high'),
  initialValue: z.number()
    .positive('Initial value must be positive')
    .max(10000000, 'Initial value too high'),
});

// Sanitization functions
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

export function sanitizeNumber(input: unknown): number | null {
  const num = Number(input);
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }
  return num;
}

export function sanitizeStockSymbol(input: string): string {
  return input
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9.-]/g, '') // Only allow valid stock symbol characters
    .substring(0, 10); // Limit length
}

// Validation wrapper with error handling
export function validateInput<T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      return { success: false, error: errorMessage };
    }
    return { success: false, error: 'Validation failed' };
  }
}

// API response validation
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  timestamp: z.string().optional(),
});

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
};

// Create standardized API response
export function createApiResponse<T>(
  success: boolean,
  data?: T,
  error?: string
): ApiResponse<T> {
  return {
    success,
    ...(data !== undefined && { data }),
    ...(error && { error }),
    timestamp: new Date().toISOString(),
  };
}

// Error message sanitization
export function sanitizeErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return sanitizeString(error);
  }
  
  if (error instanceof Error) {
    return sanitizeString(error.message);
  }
  
  return 'An unexpected error occurred';
}