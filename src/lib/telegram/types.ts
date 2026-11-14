import { TerminalStyle } from '../engine/server-terminal-renderer';
import { ParsedQuestion } from '../solver/question-parser';
import { StudentSubmissionHeader } from '../docx/docx-generator';

export type BotStep =
  | 'idle' // Waiting for questions/file
  | 'confirm_questions' // Questions extracted, waiting for OK or corrections
  | 'step1_answer_type' // Theory (A) or Code + Screenshot (B)
  | 'step2_terminal_choice' // Include terminal output? Yes/No
  | 'step2_language' // C, C++, Java, Python, JS, SQL, Other
  | 'step2_terminal_style' // VS Code, PowerShell, CMD, Ubuntu, macOS
  | 'step2_prompt_location' // Custom prompt location text
  | 'step2_sql_db_name' // SQL database name
  | 'step2_sql_schema' // SQL table setup statements (optional)
  | 'step3_filename' // Document filename
  | 'step4_header_name' // Student Name
  | 'step4_header_roll' // Roll number
  | 'step4_header_course' // Course / Branch
  | 'step4_header_subject' // Subject
  | 'step4_header_title' // Assignment title
  | 'step5_summary' // Review & Generate
  | 'generating' // Background solving and rendering
  | 'completed'; // Document sent, waiting for follow-ups

export type AnswerType = 'theory' | 'code_screenshot';

export interface UserPreferences {
  name?: string;
  rollNo?: string;
  course?: string;
  subject?: string;
  assignmentTitle?: string;
  defaultTerminalStyle?: TerminalStyle;
  defaultPromptLocation?: string;
  preferredLanguage?: 'en' | 'hi';
  lastQuestions?: ParsedQuestion[];
  lastRawText?: string;
}

export interface BotSession {
  chatId: number;
  userId: number;
  currentStep: BotStep;
  previousStep?: BotStep;
  lastActive: number; // Unix timestamp for 24h expiry
  questions: ParsedQuestion[];
  rawText: string;
  answerType: AnswerType;
  includeTerminal: boolean;
  language: string; // "sql", "python", "c", "cpp", "java", "javascript", "auto", etc.
  terminalStyle: TerminalStyle;
  promptLocation: string; // e.g. "PS D:\ajeet\program\DBMS>"
  sqlDatabaseName: string;
  sqlSchema?: string;
  filename: string;
  header: StudentSubmissionHeader;
  isHindi: boolean;
  generatedDocxBuffer?: Buffer;
  generatedPdfBuffer?: Buffer;
  screenshots: { label: string; buffer: Buffer; dataUrl: string }[];
  inputAwaitingQuestionId?: string;
}

export interface RateLimitEntry {
  count: number;
  windowStart: number;
}
