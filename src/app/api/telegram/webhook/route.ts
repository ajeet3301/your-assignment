import { NextRequest, NextResponse } from 'next/server';
import { getTelegramBot, isTelegramBotEnabled } from '@/lib/telegram/bot';

/**
 * Telegram Webhook Route Handler
 * POST /api/telegram/webhook
 */
export async function POST(req: NextRequest) {
  // 1. If Telegram Bot Token is missing, bot is cleanly disabled
  if (!isTelegramBotEnabled()) {
    return NextResponse.json(
      {
        ok: true,
        status: 'disabled',
        message: 'Telegram bot is disabled. TELEGRAM_BOT_TOKEN is not set in environment.',
      },
      { status: 200 }
    );
  }

  // 2. Verify secret token header if TELEGRAM_WEBHOOK_SECRET is configured
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (webhookSecret) {
    const headerSecret = req.headers.get('x-telegram-bot-api-secret-token');
    if (headerSecret !== webhookSecret) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized: Invalid secret header' },
        { status: 401 }
      );
    }
  }

  // 3. Process Telegram update
  try {
    const bot = getTelegramBot();
    if (!bot) {
      return NextResponse.json(
        { ok: true, status: 'disabled' },
        { status: 200 }
      );
    }

    const update = await req.json();

    // Process update asynchronously without blocking webhook acknowledgement
    // This ensures Telegram gets response in < 3 seconds even during long AI generation
    bot.handleUpdate(update).catch((err) => {
      console.error('Error handling Telegram update:', err);
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Telegram webhook handler exception:', err);
    return NextResponse.json(
      { ok: false, error: err.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Health check & setup info for Telegram webhook
 * GET /api/telegram/webhook
 */
export async function GET() {
  const enabled = isTelegramBotEnabled();
  return NextResponse.json({
    ok: true,
    enabled,
    status: enabled ? 'active' : 'disabled (TELEGRAM_BOT_TOKEN not configured)',
    webhookEndpoint: '/api/telegram/webhook',
  });
}
