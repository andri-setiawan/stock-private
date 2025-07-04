// Rate limiting middleware to prevent API abuse
import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitStore>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 60) {
    this.windowMs = windowMs; // 1 minute default
    this.maxRequests = maxRequests; // 60 requests per minute default
  }

  private getKey(request: NextRequest): string {
    // Use IP address and user agent for rate limiting key
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded ? forwarded.split(',')[0] : realIp || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    return `${ip}:${userAgent}`;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.store.entries()) {
      if (now > data.resetTime) {
        this.store.delete(key);
      }
    }
  }

  async isAllowed(request: NextRequest): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    this.cleanup();
    
    const key = this.getKey(request);
    const now = Date.now();
    const resetTime = now + this.windowMs;
    
    let data = this.store.get(key);
    
    if (!data || now > data.resetTime) {
      // Reset or create new entry
      data = { count: 0, resetTime };
      this.store.set(key, data);
    }
    
    data.count++;
    
    const allowed = data.count <= this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - data.count);
    
    return { allowed, remaining, resetTime: data.resetTime };
  }
}

// Create different rate limiters for different endpoints
export const apiRateLimiter = new RateLimiter(60000, 60); // 60 requests per minute for API calls
export const stockDataRateLimiter = new RateLimiter(60000, 30); // 30 requests per minute for stock data
export const aiRateLimiter = new RateLimiter(60000, 10); // 10 requests per minute for AI calls

export async function withRateLimit(
  request: NextRequest,
  rateLimiter: RateLimiter,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const { allowed, remaining, resetTime } = await rateLimiter.isAllowed(request);
    
    if (!allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded', 
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString(),
            'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }
    
    const response = await handler();
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', resetTime.toString());
    
    return response;
  } catch (error) {
    console.error('Rate limiter error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}