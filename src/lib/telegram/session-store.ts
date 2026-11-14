import { BotSession, BotStep, UserPreferences, RateLimitEntry } from './types';
import { DEFAULT_STUDENT_HEADER } from '../docx/docx-generator';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_DOCS_PER_HOUR = 5;

// Global in-memory persistence store with 24h TTL
// (Preserved across requests in Node process)
const sessions = new Map<number, BotSession>();
const userPreferences = new Map<number, UserPreferences>();
const rateLimits = new Map<number, RateLimitEntry>();

function createDefaultSession(chatId: number, userId: number = chatId): BotSession {
  const prefs = userPreferences.get(chatId) || {};
  const today = new Date().toISOString().slice(0, 10);

  return {
    chatId,
    userId,
    currentStep: 'idle',
    lastActive: Date.now(),
    questions: [],
    rawText: '',
    answerType: 'code_screenshot',
    includeTerminal: true,
    language: 'auto',
    terminalStyle: prefs.defaultTerminalStyle || 'vscode',
    promptLocation: prefs.defaultPromptLocation || 'PS D:\\ajeet\\program\\DBMS>',
    sqlDatabaseName: 'ASSIGNMENT_DB',
    filename: `Assignment_${today}.docx`,
    header: {
      studentName: prefs.name || DEFAULT_STUDENT_HEADER.studentName,
      rollNo: prefs.rollNo || DEFAULT_STUDENT_HEADER.rollNo,
      className: prefs.course || DEFAULT_STUDENT_HEADER.className,
      subject: prefs.subject || DEFAULT_STUDENT_HEADER.subject,
      assignmentTitle: prefs.assignmentTitle || DEFAULT_STUDENT_HEADER.assignmentTitle,
    },
    isHindi: prefs.preferredLanguage === 'hi',
    screenshots: [],
  };
}

/**
 * Gets or creates the active session for a Telegram chat
 */
export function getSession(chatId: number, userId?: number): BotSession {
  cleanupExpiredSessions();
  let session = sessions.get(chatId);
  if (!session) {
    session = createDefaultSession(chatId, userId);
    sessions.set(chatId, session);
  } else {
    session.lastActive = Date.now();
  }
  return session;
}

/**
 * Updates properties of an active session
 */
export function updateSession(chatId: number, updates: Partial<BotSession>): BotSession {
  const session = getSession(chatId);
  Object.assign(session, updates, { lastActive: Date.now() });
  sessions.set(chatId, session);
  return session;
}

/**
 * Resets a chat session back to idle
 */
export function resetSession(chatId: number): BotSession {
  const fresh = createDefaultSession(chatId);
  sessions.set(chatId, fresh);
  return fresh;
}

/**
 * Steps back to the previous wizard stage
 */
export function stepBack(chatId: number): BotStep {
  const session = getSession(chatId);
  const stepHierarchy: Record<BotStep, BotStep> = {
    idle: 'idle',
    confirm_questions: 'idle',
    step1_answer_type: 'confirm_questions',
    step2_terminal_choice: 'step1_answer_type',
    step2_language: 'step2_terminal_choice',
    step2_terminal_style: 'step2_language',
    step2_prompt_location: 'step2_terminal_style',
    step2_sql_db_name: 'step2_prompt_location',
    step2_sql_schema: 'step2_sql_db_name',
    step3_filename: session.includeTerminal ? 'step2_prompt_location' : 'step1_answer_type',
    step4_header_name: 'step3_filename',
    step4_header_roll: 'step4_header_name',
    step4_header_course: 'step4_header_roll',
    step4_header_subject: 'step4_header_course',
    step4_header_title: 'step4_header_subject',
    step5_summary: 'step4_header_title',
    generating: 'step5_summary',
    completed: 'idle',
  };

  const targetStep = stepHierarchy[session.currentStep] || 'idle';
  session.currentStep = targetStep;
  session.lastActive = Date.now();
  return targetStep;
}

/**
 * Gets saved preferences for a user
 */
export function getUserPreferences(chatId: number): UserPreferences {
  return userPreferences.get(chatId) || {};
}

/**
 * Saves preferences for a user (persisted across sessions)
 */
export function saveUserPreferences(chatId: number, prefs: Partial<UserPreferences>): UserPreferences {
  const existing = userPreferences.get(chatId) || {};
  const updated = { ...existing, ...prefs };
  userPreferences.set(chatId, updated);
  return updated;
}

/**
 * Checks rate limits (5 documents per hour)
 */
export function checkRateLimit(chatId: number): { allowed: boolean; remaining: number; resetMinutes: number } {
  const now = Date.now();
  let entry = rateLimits.get(chatId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry = { count: 0, windowStart: now };
    rateLimits.set(chatId, entry);
  }

  const remaining = Math.max(0, MAX_DOCS_PER_HOUR - entry.count);
  const resetMinutes = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 60000);

  return {
    allowed: entry.count < MAX_DOCS_PER_HOUR,
    remaining,
    resetMinutes,
  };
}

/**
 * Increments the document generation rate limit counter
 */
export function incrementRateLimit(chatId: number): void {
  const now = Date.now();
  let entry = rateLimits.get(chatId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry = { count: 1, windowStart: now };
  } else {
    entry.count += 1;
  }
  rateLimits.set(chatId, entry);
}

/**
 * Automatically purges sessions older than 24 hours
 */
function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [chatId, session] of sessions.entries()) {
    if (now - session.lastActive > SESSION_TTL_MS) {
      sessions.delete(chatId);
    }
  }
}
