import { NextRequest, NextResponse } from 'next/server';
import { serverlessRateLimit } from '@/lib/storage/redis-client';

// Cache for dynamically verified Groq models (10 minutes)
let cachedGroqModels: { models: string[]; timestamp: number } | null = null;

async function fetchLiveGroqModels(apiKey: string): Promise<string[]> {
  const now = Date.now();
  if (cachedGroqModels && now - cachedGroqModels.timestamp < 10 * 60 * 1000) {
    return cachedGroqModels.models;
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.data)) {
        // Filter for chat completion models only (no audio, guard, or decommissioned models)
        const valid = data.data
          .map((m: any) => String(m.id || ''))
          .filter(
            (id: string) =>
              Boolean(id) &&
              !id.includes('whisper') &&
              !id.includes('guard') &&
              !id.includes('orpheus') &&
              !id.includes('vision') &&
              !id.includes('gemma2') &&
              !id.includes('mixtral')
          );
        if (valid.length > 0) {
          cachedGroqModels = { models: valid, timestamp: now };
          return valid;
        }
      }
    }
  } catch {
    // ignore
  }

  // Fallback to active verified production models
  return ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b'];
}

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

    // Determine target URL and active candidate models
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
      ].filter(Boolean) as string[];
    } else {
      targetUrl = 'https://api.groq.com/openai/v1/chat/completions';
      const liveModels = await fetchLiveGroqModels(activeKey);
      candidateModels = [
        requestedModel,
        envModel,
        'llama-3.1-8b-instant',
        ...liveModels,
        'llama-3.3-70b-versatile',
      ].filter(Boolean) as string[];
    }

    // Filter out any decommissioned models
    const uniqueCandidates = Array.from(new Set(candidateModels)).filter(
      (m) => !m.includes('gemma2') && !m.includes('mixtral')
    );

    let lastError: any = null;

    // Retry loop through verified live models
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

        // If rate limited, return clear message
        if (errMsg.toLowerCase().includes('rate limit')) {
          return NextResponse.json(
            { error: 'Groq free tier rate limit reached. Please wait a few seconds and try again.' },
            { status: 429 }
          );
        }

        // If error is about model not existing or decommissioned, try next live candidate
        if (
          errMsg.includes('does not exist') ||
          errMsg.includes('access') ||
          errMsg.includes('not found') ||
          errMsg.includes('decommissioned')
        ) {
          console.warn(`Model ${modelToTry} unavailable (${errMsg}), trying next candidate...`);
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
          'All candidate AI models were unavailable. Please check GROQ_API_KEY in .env.',
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
