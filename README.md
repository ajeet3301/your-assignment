# YourAssignment

> **Realistic Handwriting Generator, AI Assignment Solver & Telegram Bot**  
> Turn assignment problems into realistic handwritten notebook pages or formatted Word submission documents (`.docx` & PDF) with authentic terminal/MySQL output screenshots.

---

## 🚀 Vercel Deployment (Quick & Exact Steps)

Follow these steps to deploy directly to Vercel with zero code changes:

### Step 1: Push the repo to GitHub
```bash
git remote add origin https://github.com/ajeet3301/your-assignment.git
git branch -M main
git push -u origin main
```

### Step 2: Import into Vercel
1. Go to [vercel.com/new](https://vercel.com/new).
2. Select and import `ajeet3301/your-assignment`.
3. Framework Preset: **Next.js**.
4. Build Command: `next build` (default).
5. Output Directory: `.next` (default).

### Step 3: Add Environment Variables (All Optional)
Add these in **Project Settings > Environment Variables** (the site works in Zero-Config mode even without them):

| Variable | Description | Where to get it |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | Fast AI solver (Free 30 req/min) | [Groq Console](https://console.groq.com/keys) |
| `OPENROUTER_API_KEY` | Alternative free vision & reasoning models | [OpenRouter Keys](https://openrouter.ai/keys) |
| `TELEGRAM_BOT_TOKEN` | Optional Telegram Bot Token | [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_WEBHOOK_SECRET` | Secret random string to verify Telegram webhooks | Any random 32-char string |
| `BLOB_READ_WRITE_TOKEN` | Direct client-to-storage file uploads (25MB+) | Vercel Storage tab > Blob |
| `UPSTASH_REDIS_REST_URL` | Distributed rate limiting & session state | [Upstash Console](https://console.upstash.com) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST access token | [Upstash Console](https://console.upstash.com) |
| `CRON_SECRET` | Protects daily cleanup cron endpoint | Any random string |
| `APP_URL` | Your production Vercel domain | e.g. `https://your-assignment.vercel.app` |

### Step 4: Deploy & Verify
Click **Deploy**. When finished, visit your deployment URL:
- Check `/setup` to view active capabilities and system status.
- Open `/` for the live handwriting generator.
- Open `/solver` for SQL/DBMS assignment solver & DOCX generator.
- Open `/terminal` for custom terminal screenshots.

### Step 5 (Optional): Connect Storage & Database
- In Vercel Project Dashboard, open the **Storage** tab:
  - Add **Vercel Blob** (automatically sets `BLOB_READ_WRITE_TOKEN`).
  - Add **Neon / Vercel Postgres** or **Upstash Redis**.
- Daily cleanup Cron is automatically configured via `vercel.json` (`0 0 * * *`).

### Step 6 (Optional): Activate Telegram Bot Webhook
After setting `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, and `APP_URL`:
```bash
APP_URL=https://your-assignment.vercel.app npm run telegram:set-webhook
```
This registers `https://<domain>/api/telegram/webhook` with the secret header on Telegram's API.

---

## ⚡ Serverless & Vercel Architecture

1. **Zero-Config Default Mode**:
   - `next build` passes with zero environment variables set.
   - Core handwriting rendering, PRNG physics, and canvas exports run client-side in the browser.
   - In-memory relational MySQL engine handles SQL lab assignments without an external database.

2. **Serverless Limits & Direct Upload**:
   - Large assignment files (.txt, .docx, .pdf, images) are uploaded directly to Vercel Blob from the browser via `/api/upload/blob`. Large request payloads never block serverless memory.

3. **Background Job Queue & Resuming**:
   - Long solving jobs run question-by-question via `/api/jobs` and `/api/jobs/:id/step`.
   - Each step finishes within Vercel's `maxDuration` and is safe to retry (idempotent).
   - Long tasks continue in the background using `@vercel/functions` `waitUntil()`.

4. **Telegram Bot on Vercel**:
   - Webhook responds in under 3 seconds to avoid Telegram duplicate delivery.
   - Long AI generation continues in the background via `waitUntil`.
   - Session state and rate limits persist in Upstash Redis (or in-memory fallback) with 24-hour TTL.

5. **Daily Cleanup Cron**:
   - Runs daily at midnight UTC (`/api/cron/cleanup`) protected by `CRON_SECRET` to purge stale temporary files, expired sessions, and stuck jobs.

---

## 🧪 Testing & Verification

```bash
# Run unit & integration test suites
npm test

# Run production build (Turbopack + Fonts Manifest Validator)
npm run build
```

- **45/45 Vitest tests** covering:
  - Zero-config mode and deterministic handwriting physics.
  - Word (.docx) generation with student headers, code blocks, and embedded screenshots.
  - In-browser relational MySQL engine and ASCII box tables.
  - Telegram bot question extraction, session state machine, and custom prompt screenshots.
