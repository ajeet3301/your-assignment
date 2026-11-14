import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getServerEnv } from '../lib/env';
import { serverlessRateLimit, persistSessionData, retrieveSessionData } from '../lib/storage/redis-client';
import { createAssignmentJob, getAssignmentJob, processNextJobStep } from '../lib/jobs/job-store';

describe('Vercel-Ready Deployment Suite', () => {
  describe('1. Configuration & vercel.json', () => {
    it('contains valid vercel.json configured with bom1 region and crons', () => {
      const vercelJsonPath = path.resolve(process.cwd(), 'vercel.json');
      expect(fs.existsSync(vercelJsonPath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
      expect(content.regions).toContain('bom1');
      expect(content.crons).toBeDefined();
      expect(content.crons[0].path).toBe('/api/cron/cleanup');
      expect(content.functions).toBeDefined();
    });

    it('validates environment lazily and builds with ZERO environment variables set', () => {
      const env = getServerEnv();
      expect(env).toBeDefined();
      expect(env.AI_PRIMARY_MODEL).toBe('llama-3.3-70b-versatile');
      expect(env.NEXT_PUBLIC_APP_URL).toBeDefined();
    });

    it('ensures package.json specifies Node engines >=20.0.0', () => {
      const pkgPath = path.resolve(process.cwd(), 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      expect(pkg.engines?.node).toMatch(/>=\s*20/);
      expect(pkg.scripts['telegram:set-webhook']).toBeDefined();
    });
  });

  describe('2. Serverless Rate Limiting & Storage Fallback', () => {
    it('provides distributed rate limiting with memory fallback', async () => {
      const id = `test-ip-${Date.now()}`;
      const r1 = await serverlessRateLimit(id, 2, 60);
      expect(r1.success).toBe(true);
      expect(r1.remaining).toBe(1);

      const r2 = await serverlessRateLimit(id, 2, 60);
      expect(r2.success).toBe(true);
      expect(r2.remaining).toBe(0);

      const r3 = await serverlessRateLimit(id, 2, 60);
      expect(r3.success).toBe(false);
    });

    it('persists and retrieves session data with TTL', async () => {
      const key = `test:sess:${Date.now()}`;
      const payload = { userId: 12345, course: 'B.Tech CSE' };

      await persistSessionData(key, payload, 3600);
      const retrieved = await retrieveSessionData(key);

      expect(retrieved).toEqual(payload);
    });
  });

  describe('3. Asynchronous Job Step Queue', () => {
    it('creates job, executes one question step per invocation, and completes safely', async () => {
      const questions = [
        {
          id: 'q1',
          numberLabel: 'Q1',
          text: 'SELECT * FROM SALESMEN WHERE CITY = "Paris";',
          type: 'sql',
        },
        {
          id: 'q2',
          numberLabel: 'Q2',
          text: 'Explain primary key constraint.',
          type: 'theory',
        },
      ];

      const job = await createAssignmentJob(questions, {
        language: 'sql',
        answerType: 'code_screenshot',
      });

      expect(job.status).toBe('queued');
      expect(job.totalQuestions).toBe(2);
      expect(job.currentStepIndex).toBe(0);

      // Process Step 1
      const step1 = await processNextJobStep(job.id);
      expect(step1).not.toBeNull();
      expect(step1?.currentStepIndex).toBe(1);
      expect(step1?.solvedItems).toHaveLength(1);
      expect(step1?.solvedItems[0].numberLabel).toBe('Q1');

      // Process Step 2
      const step2 = await processNextJobStep(job.id);
      expect(step2).not.toBeNull();
      expect(step2?.currentStepIndex).toBe(2);
      expect(step2?.status).toBe('completed');
      expect(step2?.solvedItems).toHaveLength(2);
      expect(step2?.solvedItems[1].numberLabel).toBe('Q2');

      // Verify persisted state matches
      const fetched = await getAssignmentJob(job.id);
      expect(fetched?.status).toBe('completed');
    });
  });
});
