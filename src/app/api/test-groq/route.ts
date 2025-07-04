import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function GET() {
  const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  
  if (!GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ API key not found' }, { status: 500 });
  }

  try {
    console.log('🔧 Testing GROQ API directly...');
    
    const groq = new Groq({
      apiKey: GROQ_API_KEY,
      dangerouslyAllowBrowser: true
    });

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Respond with valid JSON only.'
        },
        {
          role: 'user',
          content: 'Give me a simple JSON response with {"status": "working", "message": "GROQ API is functioning correctly"}'
        }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_tokens: 200,
    });

    const response = chatCompletion.choices[0]?.message?.content || null;
    
    console.log('🔧 GROQ raw response:', response);
    
    if (response) {
      // Try to parse JSON
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return NextResponse.json({
            success: true,
            rawResponse: response,
            parsedResponse: parsed,
            apiKeyLength: GROQ_API_KEY.length
          });
        } else {
          return NextResponse.json({
            success: false,
            error: 'No JSON found in response',
            rawResponse: response,
            apiKeyLength: GROQ_API_KEY.length
          });
        }
      } catch (parseError) {
        return NextResponse.json({
          success: false,
          error: 'JSON parse error',
          parseError: parseError.message,
          rawResponse: response,
          apiKeyLength: GROQ_API_KEY.length
        });
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'No response from GROQ API',
        apiKeyLength: GROQ_API_KEY.length
      });
    }

  } catch (error) {
    console.error('🔧 GROQ API test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error.constructor.name,
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
    }, { status: 500 });
  }
}