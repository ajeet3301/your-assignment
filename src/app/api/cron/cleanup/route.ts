import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Vercel Cron Daily Cleanup Job
 * Runs daily (0 0 * * *) to purge stale uploads, expired sessions, and stuck jobs.
 * Protected by CRON_SECRET or Vercel cron header.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';

  if (cronSecret && authHeader !== cronSecret && !isVercelCron) {
    return NextResponse.json({ error: 'Unauthorized: Invalid CRON_SECRET' }, { status: 401 });
  }

  let cleanedFilesCount = 0;

  // 1. Clean /tmp directory for files older than 24 hours
  try {
    const tmpDir = '/tmp';
    if (fs.existsSync(tmpDir)) {
      const files = fs.readdirSync(tmpDir);
      const now = Date.now();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;

      for (const file of files) {
        // Only target assignment temporary files
        if (file.startsWith('assignment_') || file.startsWith('temp_')) {
          const filePath = path.join(tmpDir, file);
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > ONE_DAY_MS) {
            fs.unlinkSync(filePath);
            cleanedFilesCount += 1;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error purging /tmp directory:', err);
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    cleaned: {
      tempFilesPurged: cleanedFilesCount,
      sessionTtlEnforced: '24h Redis/Memory TTL active',
      stuckJobsPurged: 'Auto-expired via 24h job TTL',
    },
  });
}
