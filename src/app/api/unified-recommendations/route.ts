// Unified API endpoint for consistent AI recommendations across all pages
import { NextRequest, NextResponse } from 'next/server';
import { unifiedRecommendations } from '@/services/unifiedRecommendations';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');
    const symbol = searchParams.get('symbol');
    const refresh = searchParams.get('refresh') === 'true';

    // Clear cache if refresh requested
    if (refresh) {
      unifiedRecommendations.clearCache();
    }

    let recommendations;

    if (symbol) {
      // Get recommendation for specific stock
      const stockRec = await unifiedRecommendations.getStockRecommendation(symbol.toUpperCase());
      recommendations = stockRec ? [stockRec] : [];
    } else {
      // Get daily recommendations
      recommendations = await unifiedRecommendations.getDailyRecommendations(limit);
    }

    const response = {
      success: true,
      data: {
        recommendations,
        count: recommendations.length,
        source: 'unified-service',
        cached: !refresh,
        timestamp: new Date().toISOString(),
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in unified recommendations API:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch recommendations',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'refresh') {
      // Force refresh daily recommendations
      const recommendations = await unifiedRecommendations.refreshDailyRecommendations();
      
      return NextResponse.json({
        success: true,
        data: {
          recommendations,
          count: recommendations.length,
          message: 'Recommendations refreshed successfully',
          timestamp: new Date().toISOString(),
        }
      });
    }

    if (action === 'cache-status') {
      // Get cache status for debugging
      const cacheStatus = unifiedRecommendations.getCacheStatus();
      
      return NextResponse.json({
        success: true,
        data: {
          cacheStatus,
          timestamp: new Date().toISOString(),
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action',
      timestamp: new Date().toISOString(),
    }, { status: 400 });
  } catch (error) {
    console.error('Error in unified recommendations POST:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process request',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}