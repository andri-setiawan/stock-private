import { NextRequest, NextResponse } from 'next/server';

// Security headers configuration
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Note: In production, remove unsafe-inline and unsafe-eval
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://finnhub.io https://generativelanguage.googleapis.com",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ');

  // Set security headers
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // HTTPS enforcement in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return response;
}

// API key validation
export function validateApiKeys(): { valid: boolean; missing: string[] } {
  const requiredKeys = [
    'NEXT_PUBLIC_FINNHUB_API_KEY',
    'NEXT_PUBLIC_GEMINI_API_KEY',
    'NEXTAUTH_SECRET',
    'USER_PASSWORD_HASH'
  ];

  const missing = requiredKeys.filter(key => !process.env[key]);
  
  return {
    valid: missing.length === 0,
    missing
  };
}

// Request sanitization
export function sanitizeRequest(request: NextRequest): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check for suspicious patterns in URL
  const url = request.url.toLowerCase();
  const suspiciousPatterns = [
    'script',
    'javascript:',
    'data:',
    '<script',
    'onload=',
    'onerror=',
    'eval(',
    'expression(',
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (url.includes(pattern)) {
      errors.push(`Suspicious pattern detected: ${pattern}`);
    }
  }
  
  // Check request size
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB limit
    errors.push('Request too large');
  }
  
  // Check User-Agent
  const userAgent = request.headers.get('user-agent');
  if (!userAgent || userAgent.length < 10) {
    errors.push('Invalid or missing User-Agent');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// IP whitelist/blacklist (for production use)
export function checkIPAccess(request: NextRequest): boolean {
  // In development, allow all IPs
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded ? forwarded.split(',')[0] : realIp || '127.0.0.1';
  
  // Add your IP whitelist/blacklist logic here
  const blacklistedIPs = process.env.BLACKLISTED_IPS?.split(',') || [];
  const whitelistedIPs = process.env.WHITELISTED_IPS?.split(',') || [];
  
  if (blacklistedIPs.includes(ip || '')) {
    return false;
  }
  
  if (whitelistedIPs.length > 0 && !whitelistedIPs.includes(ip || '')) {
    return false;
  }
  
  return true;
}

// CORS configuration
export function configureCORS(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get('origin');
  
  // Define allowed origins
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://192.168.110.83:3000',
    'http://192.168.110.83:3001',
    'https://stocks.andrisetiawan.com',
  ];
  
  // Add development origins
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3002', 'http://127.0.0.1:3002');
  }
  
  // Set CORS headers
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  
  return response;
}

// Request logging for security monitoring
export function logSecurityEvent(
  event: 'rate_limit' | 'invalid_request' | 'unauthorized' | 'suspicious_activity',
  request: NextRequest,
  details?: Record<string, unknown>
): void {
  const logData = {
    event,
    timestamp: new Date().toISOString(),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1',
    userAgent: request.headers.get('user-agent'),
    url: request.url,
    method: request.method,
    ...details
  };
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.warn('Security Event:', logData);
  }
  
  // In production, send to security monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Send to your security monitoring service (e.g., Datadog, New Relic, etc.)
    fetch('/api/security-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData),
    }).catch(error => {
      console.error('Failed to log security event:', error);
    });
  }
}