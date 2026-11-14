import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side AI Proxy
 * Uses server-side API keys defined in .env (GROQ_API_KEY or OPENROUTER_API_KEY).
 * The user no longer needs to enter any API keys in the browser UI.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model, messages, temperature = 0.3 } = body;

    // 1. Read API keys from server environment (.env)
    const groqKey = process.env.GROQ_API_KEY?.trim() || '';
    const openRouterKey = process.env.OPENROUTER_API_KEY?.trim() || '';
    const authHeader = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || '';

    let activeKey = '';
    let targetProvider = 'groq';

    if (groqKey && !groqKey.includes('your_groq_api_key')) {
      activeKey = groqKey;
      targetProvider = 'groq';
    } else if (openRouterKey && !openRouterKey.includes('your_openrouter_key')) {
      activeKey = openRouterKey;
      targetProvider = 'openrouter';
    } else if (authHeader) {
      activeKey = authHeader;
      targetProvider = authHeader.startsWith('gsk_') ? 'groq' : 'openrouter';
    }

    if (!activeKey) {
      return NextResponse.json(
        {
          error:
            'AI API Key missing in .env. Please set GROQ_API_KEY=gsk_... or OPENROUTER_API_KEY=sk-or-... in your .env file.',
        },
        { status: 400 }
      );
    }

    let targetUrl = 'https://api.groq.com/openai/v1/chat/completions';
    let defaultModel = 'llama-3.3-70b-versatile';

    if (targetProvider === 'openrouter') {
      targetUrl = 'https://openrouter.ai/api/v1/chat/completions';
      defaultModel = 'google/gemini-2.0-flash-exp:free';
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeKey}`,
        ...(targetProvider === 'openrouter' ? { 'HTTP-Referer': 'https://yourassignment.app' } : {}),
      },
      body: JSON.stringify({
        model: model || defaultModel,
        messages,
        temperature,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Upstream AI provider error' },
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
