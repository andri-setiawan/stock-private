import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { geminiService } from '@/services/gemini';
import { aiRateLimiter, withRateLimit } from '@/middleware/rateLimiter';
import { validateInput, stockSymbolSchema, createApiResponse } from '@/utils/validation';
import { z } from 'zod';

// Validation schema for AI recommendation request
const aiRecommendationRequestSchema = z.object({
  symbol: stockSymbolSchema,
  stockData: z.object({
    symbol: z.string(),
    name: z.string(),
    currentPrice: z.number().positive(),
    changePercent: z.number(),
    high52: z.number().positive(),
    low52: z.number().positive(),
    marketCap: z.number().positive().optional(),
    peRatio: z.number().positive().optional(),
    industry: z.string().optional(),
  }),
  portfolio: z.object({
    cashBalance: z.number().nonnegative(),
    totalValue: z.number().nonnegative(),
    holdings: z.record(z.object({
      quantity: z.number().nonnegative(),
      averagePrice: z.number().positive(),
      currentPrice: z.number().positive(),
      totalValue: z.number().nonnegative(),
      profitLoss: z.number(),
      profitLossPercent: z.number(),
    })),
  }),
});

export async function POST(request: NextRequest) {
  return withRateLimit(request, aiRateLimiter, async () => {
    try {
      // Check authentication
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json(
          createApiResponse(false, null, 'Unauthorized'),
          { status: 401 }
        );
      }

      // Parse and validate request body
      const body = await request.json();
      const validation = validateInput(aiRecommendationRequestSchema, body);
      
      if (!validation.success) {
        return NextResponse.json(
          createApiResponse(false, null, `Invalid request: ${validation.error}`),
          { status: 400 }
        );
      }

      const { stockData, portfolio } = validation.data;

      // Additional security checks
      if (stockData.currentPrice <= 0 || stockData.currentPrice > 100000) {
        return NextResponse.json(
          createApiResponse(false, null, 'Invalid stock price'),
          { status: 400 }
        );
      }

      if (portfolio.totalValue > 10000000) {
        return NextResponse.json(
          createApiResponse(false, null, 'Portfolio value too high'),
          { status: 400 }
        );
      }

      // Get AI recommendation with timeout and error handling
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI request timeout')), 30000)
      );

      // Ensure all required fields are present with defaults
      const normalizedStockData = {
        ...stockData,
        marketCap: stockData.marketCap || 0,
        peRatio: stockData.peRatio || 0
      };

      const recommendationPromise = geminiService.getTradeRecommendation(normalizedStockData, portfolio);
      
      const recommendation = await Promise.race([
        recommendationPromise,
        timeoutPromise
      ]) as Awaited<typeof recommendationPromise>;

      if (!recommendation) {
        return NextResponse.json(
          createApiResponse(false, null, 'Failed to generate AI recommendation'),
          { status: 500 }
        );
      }

      // Validate AI response
      if (recommendation.confidence < 0 || recommendation.confidence > 100) {
        console.warn('Invalid AI confidence score:', recommendation.confidence);
        recommendation.confidence = Math.max(0, Math.min(100, recommendation.confidence));
      }

      if (!['BUY', 'SELL', 'HOLD'].includes(recommendation.recommendation)) {
        console.warn('Invalid AI recommendation:', recommendation.recommendation);
        recommendation.recommendation = 'HOLD';
      }

      return NextResponse.json(
        createApiResponse(true, recommendation),
        { status: 200 }
      );

    } catch (error) {
      console.error('AI recommendation API error:', error);
      
      // Don't expose internal error details to client
      const errorMessage = error instanceof Error && error.message === 'AI request timeout'
        ? 'AI service is currently unavailable. Please try again later.'
        : 'Failed to generate recommendation';
      
      return NextResponse.json(
        createApiResponse(false, null, errorMessage),
        { status: 500 }
      );
    }
  });
}

// Health check endpoint
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        createApiResponse(false, null, 'Unauthorized'),
        { status: 401 }
      );
    }

    return NextResponse.json(
      createApiResponse(true, { 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'ai-recommendation'
      }),
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      createApiResponse(false, null, 'Service unavailable'),
      { status: 503 }
    );
  }
}