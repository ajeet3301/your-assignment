import { persistSessionData, retrieveSessionData } from '../storage/redis-client';
import { solveQuestionWithAi } from '../telegram/bot-ai';
import { executeQuestionCode } from '../telegram/bot-runner';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface SolvedStepItem {
  id: string;
  numberLabel: string;
  questionText: string;
  codeSnippet?: string;
  codeLanguage?: string;
  outputScreenshotDataUrl?: string;
  outputText?: string;
  tableData?: any;
  explanation: string;
}

export interface AssignmentJob {
  id: string;
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  totalQuestions: number;
  currentStepIndex: number;
  questions: any[];
  solvedItems: SolvedStepItem[];
  options: {
    language?: string;
    terminalStyle?: string;
    promptLocation?: string;
    answerType?: 'theory' | 'code_screenshot';
  };
  error?: string;
}

/**
 * Creates a new asynchronous assignment job
 */
export async function createAssignmentJob(
  questions: any[],
  options: AssignmentJob['options'] = {}
): Promise<AssignmentJob> {
  const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const job: AssignmentJob = {
    id,
    status: 'queued',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    totalQuestions: questions.length,
    currentStepIndex: 0,
    questions,
    solvedItems: [],
    options,
  };

  await persistSessionData(`job:${id}`, job, 86400); // 24 hours TTL
  return job;
}

/**
 * Retrieves job status and progress
 */
export async function getAssignmentJob(id: string): Promise<AssignmentJob | null> {
  return await retrieveSessionData<AssignmentJob>(`job:${id}`);
}

/**
 * Solves exactly ONE question step per invocation (idempotent & timeout-safe)
 */
export async function processNextJobStep(id: string): Promise<AssignmentJob | null> {
  const job = await getAssignmentJob(id);
  if (!job) return null;

  if (job.status === 'completed' || job.currentStepIndex >= job.totalQuestions) {
    job.status = 'completed';
    job.updatedAt = Date.now();
    await persistSessionData(`job:${id}`, job, 86400);
    return job;
  }

  job.status = 'running';
  const q = job.questions[job.currentStepIndex];

  try {
    const solvedAi = await solveQuestionWithAi(
      q,
      job.options.answerType || 'code_screenshot',
      job.options.language || 'auto'
    );

    let screenshotDataUrl: string | undefined = undefined;
    let outputText = '';
    let tableData: any = undefined;

    if (job.options.answerType !== 'theory' && solvedAi.codeSnippet) {
      const execResult = await executeQuestionCode(
        solvedAi.codeSnippet,
        solvedAi.codeLanguage || job.options.language || 'auto',
        {
          terminalStyle: (job.options.terminalStyle as any) || 'vscode',
          promptLocation: job.options.promptLocation || 'PS D:\\assignments>',
          questionLabel: q.numberLabel,
        }
      );
      screenshotDataUrl = execResult.outputScreenshotDataUrl;
      outputText = execResult.outputText;
      tableData = execResult.tableData;
    }

    job.solvedItems.push({
      id: q.id,
      numberLabel: q.numberLabel,
      questionText: q.text,
      codeSnippet: solvedAi.codeSnippet,
      codeLanguage: solvedAi.codeLanguage,
      outputScreenshotDataUrl: screenshotDataUrl,
      outputText,
      tableData,
      explanation: solvedAi.explanation,
    });

    job.currentStepIndex += 1;
    if (job.currentStepIndex >= job.totalQuestions) {
      job.status = 'completed';
    }
  } catch (err: any) {
    job.status = 'failed';
    job.error = err.message || 'Error executing question step';
  }

  job.updatedAt = Date.now();
  await persistSessionData(`job:${id}`, job, 86400);
  return job;
}
