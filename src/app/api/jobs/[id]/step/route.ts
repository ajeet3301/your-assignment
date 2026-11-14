import { NextRequest, NextResponse } from 'next/server';
import { processNextJobStep, getAssignmentJob } from '@/lib/jobs/job-store';
import { waitUntil } from '@vercel/functions';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const url = new URL(req.url);
    const autoContinue = url.searchParams.get('autoContinue') === 'true';

    const job = await processNextJobStep(id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // If autoContinue is enabled and work remains, execute remaining steps in background via waitUntil
    if (autoContinue && job.status === 'running') {
      waitUntil(
        (async () => {
          let current = await getAssignmentJob(id);
          while (current && current.status === 'running' && current.currentStepIndex < current.totalQuestions) {
            current = await processNextJobStep(id);
          }
        })()
      );
    }

    return NextResponse.json(job);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error processing job step' }, { status: 500 });
  }
}
