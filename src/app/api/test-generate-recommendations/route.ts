import { NextResponse } from 'next/server';
import { aiService } from '@/services/aiService';
import { finnhubService } from '@/services/finnhub';

export async function GET() {
  try {
    console.log('🔬 Testing generateRecommendations logic...');
    
    // Force GROQ provider
    aiService.setProvider('groq');
    
    const testSymbols = ['AAPL', 'MSFT'];
    const recommendations = [];
    
    const mockPortfolio = {
      cashBalance: 10000,
      totalValue: 15000,
      holdings: {}
    };

    console.log(`🔬 Processing ${testSymbols.length} symbols...`);

    for (const symbol of testSymbols) {
      try {
        console.log(`🔬 Processing ${symbol}...`);
        
        // Get current stock data
        const stockData = await finnhubService.getStockData(symbol);
        console.log(`🔬 Got ${symbol} data: $${stockData.currentPrice}`);
        
        // Get AI recommendation
        const aiRecommendation = await aiService.getTradeRecommendation(stockData, mockPortfolio);
        
        if (aiRecommendation) {
          console.log(`🔬 ${symbol} AI rec: ${aiRecommendation.recommendation} (${aiRecommendation.confidence}%)`);
          
          const recommendation = {
            id: `${symbol}-${Date.now()}-test`,
            symbol: symbol,
            name: stockData.name || symbol,
            recommendation: aiRecommendation.recommendation,
            confidence: aiRecommendation.confidence,
            reasoning: aiRecommendation.reasoning,
            riskLevel: aiRecommendation.riskLevel,
            targetPrice: aiRecommendation.targetPrice,
            currentPrice: stockData.currentPrice,
            change: stockData.change || 0,
            changePercent: stockData.changePercent || 0,
            timestamp: new Date(),
            aiProvider: aiService.getCurrentProvider(),
            keyFactors: aiRecommendation.keyFactors,
            marketContext: aiRecommendation.marketContext,
            sentiment: aiRecommendation.sentiment,
            timeHorizon: aiRecommendation.timeHorizon,
          };
          
          recommendations.push(recommendation);
        } else {
          console.log(`🔬 ${symbol}: AI recommendation was null`);
        }
      } catch (error) {
        console.error(`🔬 Error with ${symbol}:`, error.message);
      }
    }

    console.log(`🔬 Generated ${recommendations.length} recommendations`);

    return NextResponse.json({
      success: true,
      provider: aiService.getCurrentProvider(),
      processedSymbols: testSymbols.length,
      generatedRecommendations: recommendations.length,
      recommendations: recommendations.map(rec => ({
        symbol: rec.symbol,
        recommendation: rec.recommendation,
        confidence: rec.confidence,
        riskLevel: rec.riskLevel,
        reasoning: rec.reasoning.substring(0, 100) + '...'
      }))
    });

  } catch (error) {
    console.error('🔬 Test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}