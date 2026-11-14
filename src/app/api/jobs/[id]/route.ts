import { NextRequest, NextResponse } from 'next/server';
import { getAssignmentJob } from '@/lib/jobs/job-store';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const job = await getAssignmentJob(id);

    if (!job) {
      return NextResponse.json({ error: 'Job not found or expired' }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to poll job' }, { status: 500 });
  }
}
