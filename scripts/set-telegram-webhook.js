#!/usr/bin/env node
/**
 * Sets the Telegram Webhook for the deployed YourAssignment instance.
 * Usage:
 *   node scripts/set-telegram-webhook.js
 * Or with custom URL:
 *   APP_URL=https://your-assignment.vercel.app npm run telegram:set-webhook
 */

const fs = require('fs');
const path = require('path');

// Try loading .env if running locally
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        if (!process.env[k.trim()]) {
          process.env[k.trim()] = v.join('=').trim();
        }
      }
    }
  }
} catch (e) {}

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

if (!token) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN is not defined in environment or .env.');
  console.error('   Please set TELEGRAM_BOT_TOKEN before running this script.');
  process.exit(1);
}

if (!appUrl || appUrl.includes('localhost')) {
  console.error('❌ Error: APP_URL must be set to your public HTTPS production domain (e.g. https://your-assignment.vercel.app).');
  console.error('   Usage: APP_URL=https://your-domain.vercel.app npm run telegram:set-webhook');
  process.exit(1);
}

const webhookUrl = `${appUrl}/api/telegram/webhook`;

console.log('🤖 Registering Telegram Webhook:');
console.log(`   • Target URL: ${webhookUrl}`);
console.log(`   • Secret Protected: ${secret ? 'Yes (configured)' : 'No (optional)'}`);

async function registerWebhook() {
  const params = new URLSearchParams({ url: webhookUrl });
  if (secret) {
    params.append('secret_token', secret);
  }

  const endpoint = `https://api.telegram.org/bot${token}/setWebhook?${params.toString()}`;

  try {
    const res = await fetch(endpoint);
    const data = await res.json();

    if (data.ok) {
      console.log('✅ Webhook registered successfully with Telegram Bot API!');
      console.log('   Response:', data.description || 'Webhook was set');
    } else {
      console.error('❌ Telegram Bot API Error:', data.description);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Network request to Telegram API failed:', err.message);
    process.exit(1);
  }
}

registerWebhook();
