import fs from 'fs';
import path from 'path';
import os from 'os';
import { Redis } from '@upstash/redis';
import { BotSession, BotStep, UserPreferences, RateLimitEntry } from './types';
import { DEFAULT_STUDENT_HEADER } from '../docx/docx-generator';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_DOCS_PER_HOUR = 5;

// Multi-Tier Persistence Store
// Layer 1: In-Memory Map (Instant access)
// Layer 2: Disk JSON in os.tmpdir() (Survives warm serverless container invocations)
// Layer 3: Upstash Redis (Optional: if configured on Vercel, survives cold multi-container runs)
const sessions = new Map<number, BotSession>();
const userPreferences = new Map<number, UserPreferences>();
const rateLimits = new Map<number, RateLimitEntry>();

const TMP_DIR = os.tmpdir();
const SESSIONS_DISK_FILE = path.join(TMP_DIR, 'ya_tg_sessions_v1.json');
const PREFS_DISK_FILE = path.join(TMP_DIR, 'ya_tg_prefs_v1.json');

let redisClient: Redis | null = null;
let redisInitialized = false;

function getRedis(): Redis | null {
  if (redisInitialized) return redisClient;
  redisInitialized = true;

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url && token && !url.includes('your-') && url.startsWith('http')) {
    try {
      redisClient = new Redis({ url, token });
    } catch {
      redisClient = null;
    }
  }
  return redisClient;
}

// ----------------------------------------------------------------------------
// Disk Storage Sync (Safely isolated with try/catch)
// ----------------------------------------------------------------------------

function loadDiskCache(): void {
  try {
    if (fs.existsSync(PREFS_DISK_FILE)) {
      const raw = fs.readFileSync(PREFS_DISK_FILE, 'utf-8');
      const data = JSON.parse(raw);
      for (const [k, v] of Object.entries(data)) {
        userPreferences.set(Number(k), v as UserPreferences);
      }
    }
  } catch {
    // Ignore read errors
  }

  try {
    if (fs.existsSync(SESSIONS_DISK_FILE)) {
      const raw = fs.readFileSync(SESSIONS_DISK_FILE, 'utf-8');
      const data = JSON.parse(raw);
      for (const [k, v] of Object.entries(data)) {
        sessions.set(Number(k), v as BotSession);
      }
    }
  } catch {
    // Ignore read errors
  }
}

function persistDiskPrefs(): void {
  try {
    const obj: Record<number, UserPreferences> = {};
    for (const [k, v] of userPreferences.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(PREFS_DISK_FILE, JSON.stringify(obj), 'utf-8');
  } catch {
    // Ignore disk write failure in locked serverless environments
  }
}

function persistDiskSessions(): void {
  try {
    const obj: Record<number, any> = {};
    for (const [k, v] of sessions.entries()) {
      // Strip large binary buffers before saving to disk JSON
      const { generatedDocxBuffer, generatedPdfBuffer, ...cleanSession } = v;
      obj[k] = cleanSession;
    }
    fs.writeFileSync(SESSIONS_DISK_FILE, JSON.stringify(obj), 'utf-8');
  } catch {
    // Ignore write errors
  }
}

// Initial bootstrap from disk
loadDiskCache();

// ----------------------------------------------------------------------------
// Session & Preference Management
// ----------------------------------------------------------------------------

function createDefaultSession(chatId: number, userId: number = chatId): BotSession {
  const prefs = getUserPreferences(chatId);
  const today = new Date().toISOString().slice(0, 10);

  return {
    chatId,
    userId,
    currentStep: 'idle',
    lastActive: Date.now(),
    // Preserve recent questions across container restarts if user was in a flow
    questions: prefs.lastQuestions && prefs.lastQuestions.length > 0 ? [...prefs.lastQuestions] : [],
    rawText: prefs.lastRawText || '',
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
    // If not in RAM, try loading from disk
    loadDiskCache();
    session = sessions.get(chatId);
  }

  if (!session) {
    session = createDefaultSession(chatId, userId);
    sessions.set(chatId, session);
    persistDiskSessions();
  } else {
    session.lastActive = Date.now();
  }

  return session;
}

/**
 * Updates properties of an active session and keeps persistent stores in sync
 */
export function updateSession(chatId: number, updates: Partial<BotSession>): BotSession {
  const session = getSession(chatId);
  Object.assign(session, updates, { lastActive: Date.now() });
  sessions.set(chatId, session);

  // If questions are present, always mirror to user preferences & disk
  if (updates.questions && updates.questions.length > 0) {
    saveUserPreferences(chatId, {
      lastQuestions: updates.questions,
      lastRawText: updates.rawText || session.rawText,
    });
  }

  persistDiskSessions();

  // Async Redis sync if available
  const redis = getRedis();
  if (redis) {
    const { generatedDocxBuffer, generatedPdfBuffer, ...clean } = session;
    redis.set(`ya_sess:${chatId}`, JSON.stringify(clean), { ex: 86400 }).catch(() => {});
  }

  return session;
}

/**
 * Resets a chat session back to idle
 */
export function resetSession(chatId: number, clearQuestions: boolean = false): BotSession {
  if (clearQuestions) {
    saveUserPreferences(chatId, { lastQuestions: [], lastRawText: '' });
  }

  const fresh = createDefaultSession(chatId);
  if (clearQuestions) {
    fresh.questions = [];
    fresh.rawText = '';
  }

  sessions.set(chatId, fresh);
  persistDiskSessions();

  const redis = getRedis();
  if (redis) {
    const { generatedDocxBuffer, generatedPdfBuffer, ...clean } = fresh;
    redis.set(`ya_sess:${chatId}`, JSON.stringify(clean), { ex: 86400 }).catch(() => {});
  }

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
  persistDiskSessions();
  return targetStep;
}

/**
 * Gets saved preferences for a user
 */
export function getUserPreferences(chatId: number): UserPreferences {
  let prefs = userPreferences.get(chatId);
  if (!prefs) {
    loadDiskCache();
    prefs = userPreferences.get(chatId);
  }
  return prefs || {};
}

/**
 * Saves preferences for a user (persisted across sessions and container instances)
 */
export function saveUserPreferences(chatId: number, prefs: Partial<UserPreferences>): UserPreferences {
  const existing = getUserPreferences(chatId);
  const updated = { ...existing, ...prefs };
  userPreferences.set(chatId, updated);
  persistDiskPrefs();

  const redis = getRedis();
  if (redis) {
    redis.set(`ya_pref:${chatId}`, JSON.stringify(updated), { ex: 86400 * 30 }).catch(() => {});
  }

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
