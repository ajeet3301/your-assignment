import { NextRequest, NextResponse } from 'next/server';

/**
 * Stateless AI Proxy for Zero-Config BYOK (Bring Your Own Key)
 * Forwards requests to Groq or OpenRouter when browser CORS blocks direct calls.
 * STORES NOTHING, LOGS NOTHING, CACHES NOTHING.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing Authorization header with client API key' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { provider = 'groq', model, messages, temperature = 0.3 } = body;

    let targetUrl = 'https://api.groq.com/openai/v1/chat/completions';
    if (provider === 'openrouter') {
      targetUrl = 'https://openrouter.ai/api/v1/chat/completions';
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
        ...(provider === 'openrouter' ? { 'HTTP-Referer': 'https://yourassignment.app' } : {}),
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Upstream provider error' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal proxy failure' },
      { status: 500 }
    );
  }
}
