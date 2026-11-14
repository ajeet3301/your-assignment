import { NextRequest, NextResponse } from 'next/server';
import { getTelegramBot, isTelegramBotEnabled } from '@/lib/telegram/bot';
import { waitUntil } from '@vercel/functions';

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

    // Process update in background using Vercel waitUntil without blocking the 3s response
    waitUntil(
      bot.handleUpdate(update).catch((err) => {
        console.error('Error handling Telegram update:', err);
      })
    );

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
 * Health check, diagnostic info & 1-Click Setup for Telegram Webhook
 * GET /api/telegram/webhook
 * GET /api/telegram/webhook?setup=true
 */
export async function GET(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const enabled = Boolean(token);

  if (!enabled) {
    return NextResponse.json({
      ok: false,
      enabled: false,
      status: 'disabled',
      reason: 'TELEGRAM_BOT_TOKEN is not set in Vercel Environment Variables. (Remember to Redeploy after adding it).',
    });
  }

  const url = new URL(req.url);
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host;
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const autoWebhookUrl = `${proto}://${host}/api/telegram/webhook`;

  // 1-Click Auto Setup: /api/telegram/webhook?setup=true
  if (url.searchParams.get('setup') === 'true') {
    try {
      const setParams = new URLSearchParams({ url: autoWebhookUrl });
      if (secret) {
        setParams.append('secret_token', secret);
      }

      const setRes = await fetch(
        `https://api.telegram.org/bot${token}/setWebhook?${setParams.toString()}`
      );
      const setData = await setRes.json();

      return NextResponse.json({
        ok: setData.ok,
        action: 'setWebhook',
        webhookUrl: autoWebhookUrl,
        secretProtected: Boolean(secret),
        telegramResponse: setData,
        message: setData.ok
          ? '🎉 Webhook registered successfully with Telegram! Your bot will now reply to messages.'
          : `❌ Telegram error: ${setData.description}`,
      });
    } catch (err: any) {
      return NextResponse.json(
        { ok: false, error: 'Failed to contact Telegram API: ' + err.message },
        { status: 500 }
      );
    }
  }

  // Diagnostic Status Check via getWebhookInfo
  let webhookInfo: any = null;
  try {
    const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    if (infoRes.ok) {
      webhookInfo = await infoRes.json();
    }
  } catch (err: any) {
    webhookInfo = { error: err.message };
  }

  const isConfigured = webhookInfo?.result?.url === autoWebhookUrl;

  return NextResponse.json({
    ok: true,
    enabled: true,
    botConfigured: isConfigured,
    currentHostWebhookUrl: autoWebhookUrl,
    telegramRegisteredUrl: webhookInfo?.result?.url || 'None (Webhook not linked yet)',
    lastErrorMessage: webhookInfo?.result?.last_error_message || null,
    pendingUpdateCount: webhookInfo?.result?.pending_update_count || 0,
    quickSetupUrl: `${proto}://${host}/api/telegram/webhook?setup=true`,
    help: !isConfigured
      ? `Click or open '${proto}://${host}/api/telegram/webhook?setup=true' in your browser to automatically register the webhook!`
      : 'Webhook is active and connected to Telegram!',
  });
}
