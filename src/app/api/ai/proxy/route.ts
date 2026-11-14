import { NextRequest, NextResponse } from 'next/server';
import { serverlessRateLimit } from '@/lib/storage/redis-client';

/**
 * Server-side AI Proxy
 * Uses server-side API keys defined in .env (GROQ_API_KEY or OPENROUTER_API_KEY).
 * The user no longer needs to enter any API keys in the browser UI.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local';
    const rate = await serverlessRateLimit(`ai:${ip}`, 30, 60);
    if (!rate.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a minute before making more requests.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { model: requestedModel, messages, temperature = 0.3 } = body;

    // 1. Read API keys from server environment (.env)
    const groqKey = process.env.GROQ_API_KEY?.trim() || '';
    const openRouterKey = process.env.OPENROUTER_API_KEY?.trim() || '';
    const authHeader = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || '';

    let activeKey = '';
    let targetProvider: 'groq' | 'openrouter' = 'groq';

    // Smart key auto-detection
    if (groqKey.startsWith('sk-or-') || openRouterKey.startsWith('sk-or-')) {
      activeKey = groqKey.startsWith('sk-or-') ? groqKey : openRouterKey;
      targetProvider = 'openrouter';
    } else if (groqKey.startsWith('gsk_') || openRouterKey.startsWith('gsk_')) {
      activeKey = groqKey.startsWith('gsk_') ? groqKey : openRouterKey;
      targetProvider = 'groq';
    } else if (groqKey && !groqKey.includes('your_groq_api_key')) {
      activeKey = groqKey;
      targetProvider = 'groq';
    } else if (openRouterKey && !openRouterKey.includes('your_openrouter_key')) {
      activeKey = openRouterKey;
      targetProvider = 'openrouter';
    } else if (authHeader) {
      activeKey = authHeader;
      targetProvider = authHeader.startsWith('sk-or-') ? 'openrouter' : 'groq';
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

    // Determine target URL and fallback candidate models
    let targetUrl = 'https://api.groq.com/openai/v1/chat/completions';
    let candidateModels: string[] = [];

    const envModel = process.env.AI_PRIMARY_MODEL?.trim();

    if (targetProvider === 'openrouter') {
      targetUrl = 'https://openrouter.ai/api/v1/chat/completions';
      candidateModels = [
        requestedModel,
        envModel,
        'google/gemini-2.0-flash-exp:free',
        'meta-llama/llama-3.3-70b-instruct:free',
        'meta-llama/llama-3.1-8b-instruct:free',
        'mistralai/mistral-7b-instruct:free',
      ].filter(Boolean) as string[];
    } else {
      targetUrl = 'https://api.groq.com/openai/v1/chat/completions';
      // Groq candidates: try llama-3.1-8b-instant first as it is universally available on all free keys
      candidateModels = [
        requestedModel,
        envModel,
        'llama-3.1-8b-instant',
        'llama-3.3-70b-versatile',
        'mixtral-8x7b-32768',
        'gemma2-9b-it',
      ].filter(Boolean) as string[];
    }

    // Deduplicate candidate models
    const uniqueCandidates = Array.from(new Set(candidateModels));
    let lastError: any = null;

    // Retry loop through candidate models if one fails with "model does not exist" or access error
    for (const modelToTry of uniqueCandidates) {
      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeKey}`,
            ...(targetProvider === 'openrouter' ? { 'HTTP-Referer': 'https://yourassignment.app' } : {}),
          },
          body: JSON.stringify({
            model: modelToTry,
            messages,
            temperature,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          return NextResponse.json(data);
        }

        const errMsg: string = data.error?.message || '';
        lastError = data;

        // If error is about model not existing or access restriction, try the next model
        if (
          errMsg.includes('does not exist') ||
          errMsg.includes('access') ||
          errMsg.includes('not found') ||
          errMsg.includes('decommissioned') ||
          errMsg.includes('rate limit')
        ) {
          console.warn(`Model ${modelToTry} unavailable (${errMsg}), falling back to next candidate...`);
          continue;
        }

        // For other fatal errors (e.g. invalid API key), return immediately
        return NextResponse.json(
          { error: errMsg || 'Upstream AI provider error' },
          { status: response.status }
        );
      } catch (networkErr: any) {
        lastError = { error: { message: networkErr.message } };
      }
    }

    return NextResponse.json(
      {
        error:
          lastError?.error?.message ||
          'All candidate AI models were unavailable. Check GROQ_API_KEY in .env.',
      },
      { status: 502 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal proxy failure' },
      { status: 500 }
    );
  }
}
