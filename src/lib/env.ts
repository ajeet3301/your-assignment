import { z } from 'zod';

/**
 * Lazy Server Environment Schema
 * All environment variables are optional so Next.js build passes with NO env vars.
 * Only variables prefixed with NEXT_PUBLIC_ reach the browser.
 */
const envSchema = z.object({
  // AI Keys & Models
  GROQ_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  AI_PRIMARY_MODEL: z.string().default('llama-3.1-8b-instant'),
  AI_VISION_MODEL: z.string().default('google/gemini-2.0-flash-exp:free'),
  AI_FALLBACK_MODELS: z.string().default('meta-llama/llama-3.3-70b-instruct:free'),

  // Code Execution Sandbox
  JUDGE0_URL: z.string().url().optional(),
  JUDGE0_API_KEY: z.string().optional(),
  SQL_SANDBOX_URL: z.string().url().optional(),

  // Vercel Blob Storage & Supabase
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  DATABASE_URL: z.string().optional(),

  // Upstash Serverless Redis & QStash
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  QSTASH_TOKEN: z.string().optional(),

  // Telegram Bot Integration
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),

  // Security & Cron
  CRON_SECRET: z.string().optional(),
  APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
});

export type ServerEnv = z.infer<typeof envSchema>;

let parsedEnv: ServerEnv | null = null;

/**
 * Lazily parses and validates environment variables
 */
export function getServerEnv(): ServerEnv {
  if (parsedEnv) return parsedEnv;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.warn('⚠️ Environment validation warning:', result.error.format());
    // Fallback to raw process.env values to never crash on boot
    return process.env as unknown as ServerEnv;
  }

  parsedEnv = result.data;
  return parsedEnv;
}
