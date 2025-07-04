import { NextResponse } from 'next/server';
import { finnhubService } from '@/services/finnhub';
import { aiService, getUserPreferredProvider } from '@/services/aiService';

export async function GET() {
  const debugResult = {
    timestamp: new Date().toISOString(),
    steps: [] as any[],
    success: false,
    error: null as string | null,
    data: null as any
  };

  try {
    // Step 0: Check environment variables
    debugResult.steps.push({ step: 0, name: 'Check Environment Variables', status: 'starting' });
    const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const groqKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    const finnhubKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    
    debugResult.steps[0].status = 'completed';
    debugResult.steps[0].data = {
      geminiKeyExists: !!geminiKey,
      geminiKeyLength: geminiKey?.length || 0,
      groqKeyExists: !!groqKey,
      groqKeyLength: groqKey?.length || 0,
      finnhubKeyExists: !!finnhubKey,
      finnhubKeyLength: finnhubKey?.length || 0
    };

    // Step 1: Check AI provider
    debugResult.steps.push({ step: 1, name: 'Check AI Provider', status: 'starting' });
    const preferredProvider = getUserPreferredProvider();
    aiService.setProvider(preferredProvider);
    debugResult.steps[1].status = 'completed';
    debugResult.steps[1].data = { provider: preferredProvider };

    // Step 2: Test Finnhub API
    debugResult.steps.push({ step: 2, name: 'Test Finnhub API', status: 'starting' });
    const testStock = 'AAPL';
    const stockData = await finnhubService.getStockData(testStock);
    debugResult.steps[2].status = 'completed';
    debugResult.steps[2].data = {
      symbol: stockData.symbol,
      name: stockData.name,
      currentPrice: stockData.currentPrice,
      change: stockData.change,
      changePercent: stockData.changePercent
    };

    // Step 3: Test AI recommendation
    debugResult.steps.push({ step: 3, name: 'Test AI Recommendation', status: 'starting' });
    const mockPortfolio = {
      cashBalance: 10000,
      totalValue: 15000,
      holdings: {}
    };
    
    // Add detailed logging for AI service
    console.log('🔍 DEBUG: About to call aiService.getTradeRecommendation');
    console.log('🔍 DEBUG: Stock data:', JSON.stringify(stockData, null, 2));
    console.log('🔍 DEBUG: Mock portfolio:', JSON.stringify(mockPortfolio, null, 2));
    
    let aiRecommendation = null;
    let aiError = null;
    
    try {
      aiRecommendation = await aiService.getTradeRecommendation(stockData, mockPortfolio);
      console.log('🔍 DEBUG: AI recommendation result:', aiRecommendation);
    } catch (aiErr) {
      aiError = aiErr instanceof Error ? aiErr.message : 'Unknown AI error';
      console.error('🔍 DEBUG: AI service threw error:', aiError);
    }
    
    debugResult.steps[3].status = aiRecommendation ? 'completed' : 'failed';
    debugResult.steps[3].data = aiRecommendation ? {
      recommendation: aiRecommendation.recommendation,
      confidence: aiRecommendation.confidence,
      reasoning: aiRecommendation.reasoning?.substring(0, 100) + '...',
      riskLevel: aiRecommendation.riskLevel
    } : null;
    
    if (!aiRecommendation) {
      debugResult.steps[3].error = aiError || 'AI service returned null - check console logs for details';
    }

    if (aiRecommendation) {
      debugResult.success = true;
      debugResult.data = {
        stockData: debugResult.steps[2].data,
        aiRecommendation: debugResult.steps[3].data,
        provider: preferredProvider
      };
    } else {
      debugResult.error = 'AI recommendation returned null';
    }

  } catch (error) {
    debugResult.error = error instanceof Error ? error.message : 'Unknown error';
    debugResult.steps.push({
      step: 'error',
      name: 'Error occurred',
      status: 'failed',
      error: debugResult.error
    });
  }

  return NextResponse.json(debugResult, { status: 200 });
}