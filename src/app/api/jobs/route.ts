import { NextRequest, NextResponse } from 'next/server';
import { createAssignmentJob } from '@/lib/jobs/job-store';
import { serverlessRateLimit } from '@/lib/storage/redis-client';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local';
    const rate = await serverlessRateLimit(`jobs:${ip}`, 30, 60);
    if (!rate.success) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
    }

    const body = await req.json();
    const { questions, options } = body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'questions array is required and cannot be empty' }, { status: 400 });
    }

    const job = await createAssignmentJob(questions, options);
    return NextResponse.json(job, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create job' }, { status: 500 });
  }
}
