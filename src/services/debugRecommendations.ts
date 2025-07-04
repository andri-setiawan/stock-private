// Debug service to test AI recommendations step by step
import { finnhubService } from './finnhub';
import { aiService, getUserPreferredProvider } from './aiService';

export async function debugRecommendationGeneration() {
  console.log('🔍 DEBUG: Starting recommendation generation test...');
  
  try {
    // Test 1: Check AI provider
    const preferredProvider = getUserPreferredProvider();
    console.log('📋 Step 1: AI Provider:', preferredProvider);
    aiService.setProvider(preferredProvider);
    
    // Test 2: Test Finnhub API
    console.log('📋 Step 2: Testing Finnhub API...');
    const testStock = 'AAPL';
    const stockData = await finnhubService.getStockData(testStock);
    console.log('✅ Finnhub data for AAPL:', {
      symbol: stockData.symbol,
      name: stockData.name,
      currentPrice: stockData.currentPrice,
      change: stockData.change,
      changePercent: stockData.changePercent
    });
    
    // Test 3: Test AI recommendation
    console.log('📋 Step 3: Testing AI recommendation...');
    const mockPortfolio = {
      cashBalance: 10000,
      totalValue: 15000,
      holdings: {}
    };
    
    const aiRecommendation = await aiService.getTradeRecommendation(stockData, mockPortfolio);
    console.log('✅ AI recommendation:', {
      recommendation: aiRecommendation?.recommendation,
      confidence: aiRecommendation?.confidence,
      reasoning: aiRecommendation?.reasoning?.substring(0, 100) + '...',
      riskLevel: aiRecommendation?.riskLevel
    });
    
    if (aiRecommendation) {
      console.log('🎉 SUCCESS: Full recommendation pipeline working!');
      return {
        success: true,
        stockData,
        aiRecommendation,
        provider: preferredProvider
      };
    } else {
      console.log('❌ FAILED: AI recommendation returned null');
      return {
        success: false,
        error: 'AI recommendation returned null',
        stockData,
        provider: preferredProvider
      };
    }
    
  } catch (error) {
    console.error('❌ DEBUG ERROR:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// Test multiple stocks
export async function debugMultipleStocks() {
  const stocks = ['AAPL', 'MSFT', 'GOOGL'];
  const results = [];
  
  for (const symbol of stocks) {
    console.log(`\n🔍 Testing ${symbol}...`);
    try {
      const stockData = await finnhubService.getStockData(symbol);
      console.log(`✅ ${symbol} stock data:`, stockData.currentPrice);
      
      const mockPortfolio = {
        cashBalance: 10000,
        totalValue: 15000,
        holdings: {}
      };
      
      const aiRec = await aiService.getTradeRecommendation(stockData, mockPortfolio);
      console.log(`✅ ${symbol} AI rec:`, aiRec?.recommendation, aiRec?.confidence);
      
      results.push({
        symbol,
        success: !!aiRec,
        recommendation: aiRec?.recommendation,
        confidence: aiRec?.confidence
      });
    } catch (error) {
      console.error(`❌ ${symbol} failed:`, error.message);
      results.push({
        symbol,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}