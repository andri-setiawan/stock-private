import { NextResponse } from 'next/server';
import { unifiedRecommendations } from '@/services/unifiedRecommendations';
import { aiService } from '@/services/aiService';

export async function GET() {
  try {
    console.log('🧪 Testing unified recommendations with GROQ...');
    
    // Force GROQ provider for this test
    aiService.setProvider('groq');
    
    // Clear cache to force fresh data
    unifiedRecommendations.clearCache();
    
    // Get recommendations
    console.log('🧪 About to call getDailyRecommendations...');
    const recommendations = await unifiedRecommendations.getDailyRecommendations(3);
    
    console.log('🧪 Got recommendations:', recommendations.length);
    console.log('🧪 First recommendation ID:', recommendations[0]?.id);
    console.log('🧪 Is fallback data?:', recommendations[0]?.id?.startsWith('fallback'));
    
    return NextResponse.json({
      success: true,
      provider: 'groq',
      recommendationCount: recommendations.length,
      recommendations: recommendations.map(rec => ({
        symbol: rec.symbol,
        name: rec.name,
        recommendation: rec.recommendation,
        confidence: rec.confidence,
        riskLevel: rec.riskLevel,
        currentPrice: rec.currentPrice,
        changePercent: rec.changePercent,
        reasoning: rec.reasoning.substring(0, 100) + '...'
      }))
    });

  } catch (error) {
    console.error('🧪 Test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
    }, { status: 500 });
  }
}