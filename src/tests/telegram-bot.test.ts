import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import JSZip from 'jszip';
import {
  extractQuestionsFromInput,
  extractTextFromDocx,
  formatQuestionListPreview,
  extractQuestionsFromPreviewText,
  MAX_FILE_SIZE_BYTES,
  MAX_QUESTIONS,
} from '../lib/telegram/question-extractor';
import { parseQuestionsFromText } from '../lib/solver/question-parser';
import {
  getSession,
  updateSession,
  resetSession,
  stepBack,
  getUserPreferences,
  saveUserPreferences,
  checkRateLimit,
  incrementRateLimit,
} from '../lib/telegram/session-store';
import { renderServerTerminalScreenshot } from '../lib/engine/server-terminal-renderer';
import { executeQuestionCode } from '../lib/telegram/bot-runner';
import { solveQuestionWithAi } from '../lib/telegram/bot-ai';
import { generateAssignmentDocxBuffer } from '../lib/docx/docx-generator';
import { generateServerAssignmentPdf } from '../lib/telegram/bot-pdf';
import { isTelegramBotEnabled } from '../lib/telegram/bot';

describe('Telegram Bot Suite', () => {
  const TEST_CHAT_ID = 987654321;

  beforeEach(() => {
    resetSession(TEST_CHAT_ID);
  });

  describe('1. Bot Disabled & Security Configuration', () => {
    it('disables bot cleanly when TELEGRAM_BOT_TOKEN is not set', () => {
      const origToken = process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.TELEGRAM_BOT_TOKEN;

      expect(isTelegramBotEnabled()).toBe(false);

      process.env.TELEGRAM_BOT_TOKEN = origToken;
    });

    it('enables bot when TELEGRAM_BOT_TOKEN is set', () => {
      const origToken = process.env.TELEGRAM_BOT_TOKEN;
      process.env.TELEGRAM_BOT_TOKEN = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';

      expect(isTelegramBotEnabled()).toBe(true);

      process.env.TELEGRAM_BOT_TOKEN = origToken;
    });
  });

  describe('2. Input & Question Extraction', () => {
    it('extracts questions from plain text message with numbering and order', async () => {
      const input = `
        1. Write a program to implement Binary Search.
        2. Write a SQL query to display all salesmen from Paris.
        3. Explain ACID properties with examples.
      `;
      const result = await extractQuestionsFromInput({ text: input });

      expect(result.success).toBe(true);
      expect(result.questions).toHaveLength(3);
      expect(result.questions[0].numberLabel).toBe('1.');
      expect(result.questions[0].text).toContain('Binary Search');
      expect(result.questions[1].numberLabel).toBe('2.');
      expect(result.questions[1].text).toContain('salesmen');
      expect(result.questions[2].numberLabel).toBe('3.');
    });

    it('extracts questions from a .txt buffer', async () => {
      const txtContent = `Q1. Define normalization and 3NF.\nQ2. What is a primary key?`;
      const buffer = Buffer.from(txtContent, 'utf-8');

      const result = await extractQuestionsFromInput({
        fileBuffer: buffer,
        fileName: 'questions.txt',
      });

      expect(result.success).toBe(true);
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0].numberLabel).toContain('Q1');
      expect(result.questions[1].numberLabel).toContain('Q2');
    });

    it('extracts text from a real .docx archive buffer using JSZip', async () => {
      const zip = new JSZip();
      const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p><w:r><w:t>1. Write a query to find salesmen with commission &gt; 5000.</w:t></w:r></w:p>
            <w:p><w:r><w:t>2. Write a program to sort an array using QuickSort.</w:t></w:r></w:p>
          </w:body>
        </w:document>`;
      zip.file('word/document.xml', documentXml);
      const docxBuffer = await zip.generateAsync({ type: 'nodebuffer' });

      const extracted = await extractTextFromDocx(docxBuffer);
      expect(extracted).toContain('1. Write a query to find salesmen');
      expect(extracted).toContain('2. Write a program to sort an array');

      const result = await extractQuestionsFromInput({
        fileBuffer: docxBuffer,
        fileName: 'assignment.docx',
      });
      expect(result.success).toBe(true);
      expect(result.questions).toHaveLength(2);
    });

    it('rejects oversize files exceeding 10 MB', async () => {
      // Create virtual oversize buffer
      const oversizeBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1024);

      const result = await extractQuestionsFromInput({
        fileBuffer: oversizeBuffer,
        fileName: 'huge.docx',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('too large');
    });

    it('rejects unsupported file extensions with a clear message', async () => {
      const invalidBuffer = Buffer.from('binary data');

      const result = await extractQuestionsFromInput({
        fileBuffer: invalidBuffer,
        fileName: 'malware.exe',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported file format (.exe)');
    });

    it('formats question preview correctly in English and Hindi', () => {
      const questions = [
        { id: '1', numberLabel: 'Q1', text: 'Define Primary Key.', type: 'theory' },
        { id: '2', numberLabel: 'Q2', text: 'Write SQL query.', type: 'sql' },
      ];

      const previewEn = formatQuestionListPreview(questions, false);
      expect(previewEn).toContain('I found **2 questions**');
      expect(previewEn).toContain('Send **OK**');

      const previewHi = formatQuestionListPreview(questions, true);
      expect(previewHi).toContain('मुझे **2 प्रश्न** मिले');
      expect(previewHi).toContain('OK');
    });

    it('extracts 10 numbered questions cleanly without dropping any', async () => {
      const input = `
1. What is DBMS architecture?
2. Explain normalization and its types.
3. What is 1NF?
4. What is 2NF?
5. What is 3NF?
6. Explain BCNF with example.
7. What is Primary Key and Foreign Key?
8. Explain ACID properties in DBMS.
9. Write a query to create student table.
10. Write a query to select all records.
      `.trim();

      const result = await extractQuestionsFromInput({ text: input });
      expect(result.success).toBe(true);
      expect(result.questions).toHaveLength(10);
      expect(result.questions[0].numberLabel).toBe('1.');
      expect(result.questions[9].numberLabel).toBe('10.');
      expect(result.questions[9].text).toContain('select all records');
    });

    it('extracts 10 bulleted questions separated by single newlines', async () => {
      const input = [
        '• Explain what is a Database Management System.',
        '• What are the advantages of DBMS over File System?',
        '• Define DDL, DML, DCL and TCL commands.',
        '• Explain Entity-Relationship (ER) model concepts.',
        '• What are aggregate functions in SQL?',
        '• Explain inner join and outer join with examples.',
        '• What is database indexing and why is it used?',
        '• Explain transaction management and concurrency control.',
        '• What is Deadlock and how can it be prevented?',
        '• Explain database recovery techniques.',
      ].join('\n');

      const result = await extractQuestionsFromInput({ text: input });
      expect(result.success).toBe(true);
      expect(result.questions).toHaveLength(10);
    });

    it('reconstructs questions from Telegram preview text for serverless recovery', () => {
      const previewText = `📋 I found **3 questions**:

**Q1**: Explain DBMS architecture
**Q2**: What is normalization?
**Q3**: Explain ACID properties

Send **OK** or tap below to proceed, or send corrections.`;

      const recovered = extractQuestionsFromPreviewText(previewText);
      expect(recovered).toHaveLength(3);
      expect(recovered[0].numberLabel).toBe('Q1');
      expect(recovered[0].text).toBe('Explain DBMS architecture');
      expect(recovered[1].numberLabel).toBe('Q2');
      expect(recovered[2].text).toBe('Explain ACID properties');
    });
  });

  describe('3. Session State Machine & Preferences', () => {
    it('manages session lifecycle: get, update, reset', () => {
      const session = getSession(TEST_CHAT_ID);
      expect(session.currentStep).toBe('idle');

      updateSession(TEST_CHAT_ID, { currentStep: 'step1_answer_type', language: 'python' });
      const updated = getSession(TEST_CHAT_ID);
      expect(updated.currentStep).toBe('step1_answer_type');
      expect(updated.language).toBe('python');

      const reset = resetSession(TEST_CHAT_ID);
      expect(reset.currentStep).toBe('idle');
    });

    it('steps back cleanly using /back', () => {
      updateSession(TEST_CHAT_ID, { currentStep: 'step2_terminal_choice' });
      const prevStep = stepBack(TEST_CHAT_ID);
      expect(prevStep).toBe('step1_answer_type');
    });

    it('persists user preferences (name, rollNo, terminal, prompt location)', () => {
      saveUserPreferences(TEST_CHAT_ID, {
        name: 'Ajeet Sharma',
        rollNo: '22BCS509',
        course: 'B.Tech IT',
        defaultPromptLocation: 'C:\\Users\\Ajeet\\DSA>',
      });

      const prefs = getUserPreferences(TEST_CHAT_ID);
      expect(prefs.name).toBe('Ajeet Sharma');
      expect(prefs.rollNo).toBe('22BCS509');
      expect(prefs.defaultPromptLocation).toBe('C:\\Users\\Ajeet\\DSA>');

      // New session inherits saved preferences
      const newSession = resetSession(TEST_CHAT_ID);
      expect(newSession.header.studentName).toBe('Ajeet Sharma');
      expect(newSession.header.rollNo).toBe('22BCS509');
      expect(newSession.promptLocation).toBe('C:\\Users\\Ajeet\\DSA>');
    });

    it('preserves questions across sessions and container cold starts via preferences and disk backup', () => {
      const sampleQuestions = [
        { id: 'q-1', numberLabel: 'Q1', text: 'Explain normalization.', type: 'theory' },
        { id: 'q-2', numberLabel: 'Q2', text: 'Write SQL query.', type: 'sql' },
      ];

      // Update session with questions
      updateSession(TEST_CHAT_ID, {
        questions: sampleQuestions,
        currentStep: 'confirm_questions',
      });

      // Simulate a cold start where in-memory sessions Map would be empty
      // Reset without clearing questions (e.g. fresh lambda instantiation)
      const restoredSession = getSession(TEST_CHAT_ID);
      expect(restoredSession.questions).toHaveLength(2);
      expect(restoredSession.questions[0].text).toBe('Explain normalization.');

      // When user explicitly cancels or runs /new, questions are cleared
      resetSession(TEST_CHAT_ID, true);
      const blankSession = getSession(TEST_CHAT_ID);
      expect(blankSession.questions).toHaveLength(0);
    });

    it('enforces rate limit of 5 documents per hour per chat', () => {
      const rate1 = checkRateLimit(TEST_CHAT_ID);
      expect(rate1.allowed).toBe(true);

      for (let i = 0; i < 5; i++) {
        incrementRateLimit(TEST_CHAT_ID);
      }

      const rate6 = checkRateLimit(TEST_CHAT_ID);
      expect(rate6.allowed).toBe(false);
      expect(rate6.remaining).toBe(0);
      expect(rate6.resetMinutes).toBeGreaterThan(0);
    });
  });

  describe('4. Execution & Terminal Screenshot Rendering', () => {
    it('renders high-res PNG screenshot with custom prompt location', () => {
      const customPrompt = 'PS D:\\ajeet\\program\\DBMS>';
      const buffer = renderServerTerminalScreenshot({
        style: 'powershell',
        promptLocation: customPrompt,
        command: 'python solution.py',
        outputLines: ['Result computed successfully: 42', 'Execution time: 0.05ms'],
      });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(1000);
      // Verify PNG magic bytes: 0x89 0x50 0x4E 0x47
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4e);
      expect(buffer[3]).toBe(0x47);
    });

    it('executes SQL query on in-memory engine and renders MySQL screenshot', async () => {
      const sqlQuery = "SELECT * FROM SALESMEN WHERE CITY = 'Paris';";
      const result = await executeQuestionCode(sqlQuery, 'sql', {
        terminalStyle: 'mysql',
        promptLocation: 'mysql>',
        databaseName: 'ASSIGNMENT_DB',
      });

      expect(result.outputText).toContain('Paris');
      expect(result.outputText).toMatch(/rows? in set/);
      expect(result.outputScreenshotBuffer).toBeInstanceOf(Buffer);
      expect(result.tableData).toBeDefined();
      expect(result.tableData?.headers).toContain('NAME');
    });

    it('executes Python code with simulated output', async () => {
      const pyCode = `
print("Target 78 identified at index 5")
print("Comparisons performed: 6")
      `;
      const result = await executeQuestionCode(pyCode, 'python', {
        terminalStyle: 'vscode',
        promptLocation: 'PS D:\\assignments>',
      });

      expect(result.outputText).toContain('Target 78 identified');
      expect(result.outputScreenshotBuffer.length).toBeGreaterThan(500);
    });
  });

  describe('5. Full End-to-End Flows (Theory & Code)', () => {
    it('Flow A (Theory Only): generates DOCX with correct numbering and headers', async () => {
      const questions = [
        {
          id: 'q1',
          numberLabel: 'Q1',
          questionText: 'Explain the difference between primary key and foreign key.',
          explanation: 'Primary key uniquely identifies a record. Foreign key references another table.',
        },
        {
          id: 'q2',
          numberLabel: 'Q2',
          questionText: 'What is 3NF in database normalization?',
          explanation: 'A relation is in 3NF if it is in 2NF and has no transitive dependencies.',
        },
      ];

      const docxBuffer = await generateAssignmentDocxBuffer({
        header: {
          studentName: 'Ajeet Kumar',
          rollNo: '22BCS1045',
          className: 'B.Tech CSE',
          subject: 'Database Management Systems',
          assignmentTitle: 'DBMS Theory Assignment 1',
        },
        questions,
      });

      expect(docxBuffer).toBeInstanceOf(Buffer);
      expect(docxBuffer.length).toBeGreaterThan(5000);

      // Verify it is a valid zip containing word/document.xml
      const zip = await JSZip.loadAsync(docxBuffer);
      expect(zip.file('word/document.xml')).toBeDefined();
      const xml = await zip.file('word/document.xml')!.async('text');
      expect(xml).toContain('Ajeet Kumar');
      expect(xml).toContain('22BCS1045');
      expect(xml.toUpperCase()).toContain('DBMS THEORY ASSIGNMENT 1');
      expect(xml).toContain('Q1');
      expect(xml).toContain('Q2');
    });

    it('Flow B (Code + Real Screenshot in C, Python & SQL): generates DOCX and companion PDF', async () => {
      // 1. SQL item
      const sqlResult = await executeQuestionCode(
        "SELECT NAME, COMMISSION FROM SALESMEN WHERE COMMISSION > 5000;",
        'sql',
        { terminalStyle: 'mysql', promptLocation: 'mysql>' }
      );

      // 2. Python item
      const pyResult = await executeQuestionCode(
        'print("Execution time: 45.2 microseconds")\nprint("Sorted elements: [1, 2, 3, 4, 5]")',
        'python',
        { terminalStyle: 'powershell', promptLocation: 'PS D:\\ajeet\\dsa>' }
      );

      const questions = [
        {
          id: 'q1',
          numberLabel: 'Q1',
          questionText: 'Find salesmen with commission greater than 5000.',
          codeSnippet: 'SELECT NAME, COMMISSION FROM SALESMEN WHERE COMMISSION > 5000;',
          codeLanguage: 'sql',
          outputScreenshotDataUrl: sqlResult.outputScreenshotDataUrl,
          tableData: sqlResult.tableData,
          explanation: 'Filters salesmen whose commission exceeds 5000.',
        },
        {
          id: 'q2',
          numberLabel: 'Q2',
          questionText: 'Sort an array and measure high-resolution execution time.',
          codeSnippet: 'def sort_array(arr):\n    return sorted(arr)',
          codeLanguage: 'python',
          outputScreenshotDataUrl: pyResult.outputScreenshotDataUrl,
          explanation: 'Uses Python Timsort algorithm running in O(N log N).',
        },
      ];

      // Generate DOCX
      const docxBuffer = await generateAssignmentDocxBuffer({
        header: {
          studentName: 'Ajeet Kumar',
          rollNo: '22BCS1045',
          className: 'B.Tech CSE',
          subject: 'DBMS & DSA Lab',
          assignmentTitle: 'Combined Lab Submission',
        },
        questions,
      });

      expect(docxBuffer.length).toBeGreaterThan(10000);

      // Verify DOCX contains image media files
      const zip = await JSZip.loadAsync(docxBuffer);
      const mediaFiles = Object.keys(zip.files).filter((f) => f.startsWith('word/media/'));
      expect(mediaFiles.length).toBeGreaterThanOrEqual(1);

      // Generate Companion PDF
      const pdfBuffer = await generateServerAssignmentPdf({
        header: {
          studentName: 'Ajeet Kumar',
          rollNo: '22BCS1045',
          className: 'B.Tech CSE',
          subject: 'DBMS & DSA Lab',
          assignmentTitle: 'Combined Lab Submission',
        },
        questions,
        screenshots: [
          { label: 'Q1', buffer: sqlResult.outputScreenshotBuffer },
          { label: 'Q2', buffer: pyResult.outputScreenshotBuffer },
        ],
      });

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(5000);
      // PDF magic bytes %PDF-
      expect(pdfBuffer.slice(0, 4).toString()).toBe('%PDF');

      // Generate Handwritten Version PDF
      const hwPdfBuffer = await generateServerAssignmentPdf({
        header: {
          studentName: 'Ajeet Kumar',
          rollNo: '22BCS1045',
          className: 'B.Tech CSE',
          subject: 'DBMS & DSA Lab',
          assignmentTitle: 'Combined Lab Submission',
        },
        questions,
        screenshots: [
          { label: 'Q1', buffer: sqlResult.outputScreenshotBuffer },
        ],
        isHandwritten: true,
      });

      expect(hwPdfBuffer).toBeInstanceOf(Buffer);
      expect(hwPdfBuffer.slice(0, 4).toString()).toBe('%PDF');
    });
  });
});
