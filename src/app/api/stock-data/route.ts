import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { finnhubService } from '@/services/finnhub';
import { stockDataRateLimiter, withRateLimit } from '@/middleware/rateLimiter';
import { validateInput, stockSymbolSchema, createApiResponse } from '@/utils/validation';

export async function GET(request: NextRequest) {
  return withRateLimit(request, stockDataRateLimiter, async () => {
    try {
      // Check authentication
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json(
          createApiResponse(false, null, 'Unauthorized'),
          { status: 401 }
        );
      }

      // Get and validate stock symbol
      const { searchParams } = new URL(request.url);
      const symbol = searchParams.get('symbol');

      if (!symbol) {
        return NextResponse.json(
          createApiResponse(false, null, 'Stock symbol is required'),
          { status: 400 }
        );
      }

      // Validate stock symbol
      const validation = validateInput(stockSymbolSchema, symbol);
      if (!validation.success) {
        return NextResponse.json(
          createApiResponse(false, null, `Invalid stock symbol: ${validation.error}`),
          { status: 400 }
        );
      }

      // Fetch stock data with error handling
      const stockData = await finnhubService.getStockData(validation.data);
      
      if (!stockData) {
        return NextResponse.json(
          createApiResponse(false, null, 'Stock data not found'),
          { status: 404 }
        );
      }

      return NextResponse.json(
        createApiResponse(true, stockData),
        { status: 200 }
      );

    } catch (error) {
      console.error('Stock data API error:', error);
      
      return NextResponse.json(
        createApiResponse(false, null, 'Failed to fetch stock data'),
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return withRateLimit(request, stockDataRateLimiter, async () => {
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
      const validation = validateInput(stockSymbolSchema, body.symbol);
      
      if (!validation.success) {
        return NextResponse.json(
          createApiResponse(false, null, `Invalid request: ${validation.error}`),
          { status: 400 }
        );
      }

      // Search stocks with error handling
      const searchResults = await finnhubService.searchStocks(validation.data);
      
      return NextResponse.json(
        createApiResponse(true, searchResults),
        { status: 200 }
      );

    } catch (error) {
      console.error('Stock search API error:', error);
      
      return NextResponse.json(
        createApiResponse(false, null, 'Failed to search stocks'),
        { status: 500 }
      );
    }
  });
}