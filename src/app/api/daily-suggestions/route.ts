// API endpoint for daily AI-powered trading suggestions with caching
import { NextRequest, NextResponse } from 'next/server';
import { indicesService } from '@/services/indices';
import { aiAnalyzerService } from '@/services/aiAnalyzer';
import { serverCacheService } from '@/services/serverCache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeAnalysis = searchParams.get('analysis') !== 'false';
    const forceRefresh = searchParams.get('refresh') === 'true';
    const maxStocks = parseInt(searchParams.get('maxStocks') || '60'); // Analyze more stocks

    // Check if we have cached data for today (unless force refresh)
    if (!forceRefresh && includeAnalysis) {
      const cachedData = await serverCacheService.getCachedRecommendations();
      if (cachedData) {
        console.log(`Serving cached recommendations from ${cachedData.date}`);
        
        const paginatedRecommendations = cachedData.recommendations.slice(offset, offset + limit);
        
        const response = {
          success: true,
          data: {
            recommendations: paginatedRecommendations,
            marketAnalysis: cachedData.marketAnalysis,
            topOpportunities: cachedData.topOpportunities.slice(0, 5),
            stats: cachedData.stats,
            lastUpdated: cachedData.generatedAt,
            fromCache: true,
            cacheStatus: await serverCacheService.getCacheStatusMessage(),
            pagination: {
              offset,
              limit,
              total: cachedData.recommendations.length,
              hasMore: offset + limit < cachedData.recommendations.length
            }
          },
          timestamp: new Date().toISOString(),
          requestId: generateRequestId()
        };

        return NextResponse.json(response);
      }
    }

    // No cache or force refresh - generate new recommendations
    console.log(forceRefresh ? 'Force refreshing recommendations...' : 'Generating fresh recommendations...');

    // Get top performing stocks from major indices (analyze more stocks)
    const topPerformers = await indicesService.getTopPerformersAcrossIndices(maxStocks);
    
    if (!includeAnalysis) {
      // Return basic stock data without AI analysis
      return NextResponse.json({
        success: true,
        data: {
          stocks: topPerformers.slice(0, limit),
          marketSummary: `${topPerformers.length} stocks analyzed from major indices`,
          lastUpdated: new Date().toISOString(),
          fromCache: false
        },
        timestamp: new Date().toISOString(),
        requestId: generateRequestId()
      });
    }

    // Generate AI recommendations
    const marketAnalysis = await aiAnalyzerService.generateDailyRecommendations(topPerformers);
    
    // Filter recommendations but keep more for pagination
    const filteredRecommendations = marketAnalysis.recommendations
      .filter(rec => rec.confidence > 50) // Only show confident recommendations
      .slice(0, Math.min(maxStocks, 100)); // Cache up to 100 recommendations for pagination

    // Get market movers for additional context
    const marketMovers = await indicesService.getMarketMovers();

    // Calculate stats
    const stats = {
      totalAnalyzed: topPerformers.length,
      buySignals: filteredRecommendations.filter(r => r.action === 'BUY').length,
      sellSignals: filteredRecommendations.filter(r => r.action === 'SELL').length,
      holdSignals: filteredRecommendations.filter(r => r.action === 'HOLD').length,
      averageConfidence: Math.round(
        filteredRecommendations.reduce((sum, r) => sum + r.confidence, 0) / 
        filteredRecommendations.length
      )
    };

    // Store in cache for today
    await serverCacheService.storeRecommendations(
      filteredRecommendations,
      marketAnalysis,
      marketAnalysis.topOpportunities,
      stats
    );

    // Mark manual refresh if requested
    if (forceRefresh) {
      await serverCacheService.markManualRefresh();
    }

    // Apply pagination to final results
    const paginatedRecommendations = filteredRecommendations.slice(offset, offset + limit);
    
    const response = {
      success: true,
      data: {
        recommendations: paginatedRecommendations,
        marketAnalysis: {
          sentiment: marketAnalysis.marketSentiment,
          volatilityIndex: marketAnalysis.volatilityIndex,
          summary: marketAnalysis.marketSummary,
          riskWarnings: marketAnalysis.riskWarnings
        },
        topOpportunities: marketAnalysis.topOpportunities.slice(0, 5),
        marketMovers: {
          gainers: marketMovers.topGainers.slice(0, 5),
          losers: marketMovers.topLosers.slice(0, 5),
          highVolume: marketMovers.highVolume.slice(0, 5)
        },
        stats: {
          ...stats,
          totalAvailable: filteredRecommendations.length // Show total available recommendations
        },
        pagination: {
          offset,
          limit,
          total: filteredRecommendations.length,
          hasMore: offset + limit < filteredRecommendations.length
        },
        lastUpdated: new Date().toISOString(),
        fromCache: false,
        cacheStatus: await serverCacheService.getCacheStatusMessage()
      },
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating daily suggestions:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate daily suggestions. Please try again later.',
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols, riskTolerance = 'MODERATE' } = body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Please provide an array of stock symbols to analyze',
        timestamp: new Date().toISOString(),
        requestId: generateRequestId()
      }, { status: 400 });
    }

    if (symbols.length > 20) {
      return NextResponse.json({
        success: false,
        error: 'Maximum 20 symbols allowed per request',
        timestamp: new Date().toISOString(),
        requestId: generateRequestId()
      }, { status: 400 });
    }

    // Get stock data for provided symbols
    const stocksData = await Promise.all(
      symbols.map(async (symbol: string) => {
        try {
          const indexStocks = await indicesService.getIndexStocks('sp500');
          return indexStocks.find(stock => stock.symbol === symbol.toUpperCase());
        } catch (error) {
          console.warn(`Failed to get data for ${symbol}:`, error);
          return null;
        }
      })
    );

    const validStocks = stocksData.filter((stock): stock is NonNullable<typeof stock> => stock !== null);
    
    if (validStocks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid stock data found for provided symbols',
        timestamp: new Date().toISOString(),
        requestId: generateRequestId()
      }, { status: 404 });
    }

    // Generate AI analysis for specific stocks
    const recommendations = await aiAnalyzerService.analyzeBulkStocks(validStocks);
    
    // Filter based on risk tolerance
    const filteredRecommendations = filterByRiskTolerance(recommendations, riskTolerance);

    return NextResponse.json({
      success: true,
      data: {
        recommendations: filteredRecommendations,
        requestedSymbols: symbols,
        analyzedSymbols: validStocks.map(s => s.symbol),
        riskTolerance,
        analysis: {
          totalRequested: symbols.length,
          successfullyAnalyzed: filteredRecommendations.length,
          averageConfidence: Math.round(
            filteredRecommendations.reduce((sum, r) => sum + r.confidence, 0) / 
            filteredRecommendations.length
          )
        }
      },
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    });
  } catch (error) {
    console.error('Error processing custom analysis request:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process analysis request. Please try again later.',
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    }, { status: 500 });
  }
}

function filterByRiskTolerance(recommendations: any[], riskTolerance: string): any[] { // eslint-disable-line @typescript-eslint/no-explicit-any
  switch (riskTolerance) {
    case 'CONSERVATIVE':
      return recommendations.filter(r => 
        r.riskLevel === 'LOW' && r.confidence > 70
      );
    case 'AGGRESSIVE':
      return recommendations.filter(r => 
        r.confidence > 60 // Allow more risk for aggressive traders
      );
    case 'MODERATE':
    default:
      return recommendations.filter(r => 
        (r.riskLevel === 'LOW' || r.riskLevel === 'MEDIUM') && r.confidence > 65
      );
  }
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}