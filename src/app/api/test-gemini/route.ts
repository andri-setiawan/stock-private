import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET() {
  const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Gemini API key not found' }, { status: 500 });
  }

  try {
    console.log('🔧 Testing Gemini API directly...');
    
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent('Give me a simple JSON response with {"status": "working", "message": "Gemini API is functioning correctly"}');
    const response = await result.response;
    const text = response.text();
    
    console.log('🔧 Gemini raw response:', text);
    
    if (text) {
      // Try to parse JSON
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return NextResponse.json({
            success: true,
            rawResponse: text,
            parsedResponse: parsed,
            apiKeyLength: GEMINI_API_KEY.length
          });
        } else {
          return NextResponse.json({
            success: false,
            error: 'No JSON found in response',
            rawResponse: text,
            apiKeyLength: GEMINI_API_KEY.length
          });
        }
      } catch (parseError) {
        return NextResponse.json({
          success: false,
          error: 'JSON parse error',
          parseError: parseError.message,
          rawResponse: text,
          apiKeyLength: GEMINI_API_KEY.length
        });
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'No response from Gemini API',
        apiKeyLength: GEMINI_API_KEY.length
      });
    }

  } catch (error) {
    console.error('🔧 Gemini API test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error.constructor.name,
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
    }, { status: 500 });
  }
}