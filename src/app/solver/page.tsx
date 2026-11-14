'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Upload,
  Cpu,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Trash2,
  Plus,
  Loader2,
  Settings,
  Code2,
  Download,
  Play,
  Database,
  Terminal as TerminalIcon,
  BookOpen,
  Image as ImageIcon,
  Check,
  ChevronDown,
} from 'lucide-react';
import { TopBar } from '@/components/navigation/TopBar';
import { SolverSetupCard } from '@/components/solver/SolverSetupCard';
import { StudentHeaderCard, DEFAULT_STUDENT_HEADER } from '@/components/solver/StudentHeaderCard';
import { parseQuestionsFromText, ParsedQuestion } from '@/lib/solver/question-parser';
import { useEditorStore } from '@/lib/store/editor-store';
import {
  generateAssignmentDocx,
  downloadDocxBlob,
  StudentSubmissionHeader,
} from '@/lib/docx/docx-generator';
import { mySqlRunner, formatSqlAsciiTable } from '@/lib/sql/browser-sql-engine';
import { generateMySqlTerminalScreenshotDataUrl } from '@/lib/engine/mysql-canvas';
import { generateTerminalScreenshotDataUrl } from '@/lib/engine/terminal-canvas';
import { registerImage } from '@/lib/engine/image-registry';

// Sample DBMS Assignment matching user's exact uploaded photos
const SAMPLE_DBMS_ASSIGNMENT = `DBMS ASSIGNMENT 2 - DATABASE MANAGEMENT LAB

Q1. Show all existing databases available on the MySQL server.

Q2. Create database OfficeDB and switch into it using the USE statement.

Q3. Create table SALESMEN with SID as PRIMARY KEY, SNAME, CITY, SALARY, PRODUCT, TGTTOGET, and COMM.

Q4. Create table CUSTOMERS with CID as PRIMARY KEY, CNAME, CITY, STATE, PINCODE, PRODUCT, and CLASS.

Q5. Insert records into table SALESMEN and verify with SELECT * FROM SALESMEN.

Q6. Insert records into table CUSTOMERS and verify with SELECT * FROM CUSTOMERS.

Q7. Display details of all salesmen whose name starts with 'A' using the LIKE keyword.

Q8. Display all customers residing in Baroda city.

Q9. Display details of all salesmen having salary greater than 2500.

Q10. Display customer names in UPPERCASE along with their product and city.`;

const DEFAULT_DBMS_QUERIES: Record<string, string> = {
  'q-1': 'SHOW DATABASES;',
  'q-2': 'CREATE DATABASE OfficeDB;\nUSE OfficeDB;\nSHOW DATABASES;',
  'q-3': 'CREATE TABLE SALESMEN (SID VARCHAR(5) PRIMARY KEY, SNAME VARCHAR(10) NOT NULL, CITY VARCHAR(15) NOT NULL, SALARY INT, PRODUCT VARCHAR(20), TGTTOGET INT, COMM INT);',
  'q-4': "CREATE TABLE CUSTOMERS (CID VARCHAR(5) PRIMARY KEY, CNAME VARCHAR(20) NOT NULL, CITY VARCHAR(15) NOT NULL, STATE VARCHAR(15), PINCODE INT, PRODUCT VARCHAR(20), CLASS CHAR(1) DEFAULT 'A');",
  'q-5': "INSERT INTO SALESMEN VALUES ('S101','Ajay Patel','Ahmedabad',2500,'Laptop',5000,1200),('S102','Chintan','Baroda',3000,'Monitor',6000,1500),('S103','Vinay Mehra','Pune',2200,'Keyboard',4500,1200),('S104','Jay Pandey','Surat',2800,'Mouse',4000,800),('S105','Jimit Dave','Mumbai',3500,'Printer',7000,300),('S106','Manam Gandhi','Ahmedabad',2700,'CPU',5500,1200);\n\nSELECT * FROM SALESMEN;",
  'q-6': "INSERT INTO CUSTOMERS VALUES ('C301','Nirav Patel','Nadiad','Gujarat',387001,'Laptop','B'),('C302','Kiran Dave','Delhi','Delhi',110001,'Monitor','A'),('C303','Sapan Shah','Bangalore','Karnataka',560001,'Keyboard','B'),('C304','Saurabh Mehta','Baroda','Gujarat',390001,'Mouse','C'),('C305','Smriti Mishra','Ahmedabad','Gujarat',380001,'Printer','B'),('C306','Harshal Pandya','Mumbai','Maharashtra',400001,'CPU','A'),('C307','Sunil Gandhi','Baroda','Gujarat',390002,'Laptop','B');\n\nSELECT * FROM CUSTOMERS;",
  'q-7': "SELECT * FROM SALESMEN WHERE SNAME LIKE 'A%';",
  'q-8': "SELECT * FROM CUSTOMERS WHERE CITY = 'Baroda';",
  'q-9': 'SELECT SNAME, CITY, SALARY FROM SALESMEN WHERE SALARY > 2500;',
  'q-10': 'SELECT UPPER(CNAME) AS CNAME_UPPER, PRODUCT, CITY FROM CUSTOMERS;',
};

export default function SolverPage() {
  const router = useRouter();
  const { setContent, setTitle } = useEditorStore();

  const [studentHeader, setStudentHeader] = useState<StudentSubmissionHeader>(DEFAULT_STUDENT_HEADER);
  const [hasKey, setHasKey] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [rawText, setRawText] = useState(SAMPLE_DBMS_ASSIGNMENT);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [isExecutingAll, setIsExecutingAll] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('yourassignment_user_ai_key');
      if (savedKey) setHasKey(true);
    }
    // Auto-extract on initial load
    handleExtractWithText(SAMPLE_DBMS_ASSIGNMENT);
  }, []);

  const handleExtractWithText = (text: string) => {
    setIsExtracting(true);
    setTimeout(() => {
      const parsed = parseQuestionsFromText(text);
      // Pre-fill SQL queries for standard DBMS assignment
      const enhanced = parsed.map((q) => {
        const query = DEFAULT_DBMS_QUERIES[q.id] || q.codeSnippet || '';
        return {
          ...q,
          codeLanguage: q.codeLanguage || 'sql',
          codeSnippet: query,
        };
      });
      setQuestions(enhanced);
      setIsExtracting(false);
    }, 100);
  };

  const handleExtract = () => {
    handleExtractWithText(rawText);
  };

  const handleCodeChange = (id: string, codeSnippet: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, codeSnippet } : q))
    );
  };

  const handleExplanationChange = (id: string, explanation: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, explanation } : q))
    );
  };

  // Run a single question's SQL or code and generate real screenshot
  const handleExecuteQuestion = async (q: ParsedQuestion) => {
    const code = q.codeSnippet?.trim() || '';
    if (!code) {
      alert('Please enter a query or code snippet to execute.');
      return;
    }

    if (q.codeLanguage === 'sql' || q.type === 'sql' || code.toUpperCase().includes('SELECT') || code.toUpperCase().includes('SHOW')) {
      // Execute in in-memory MySQL engine
      const subQueries = code.split(';').map((s) => s.trim()).filter(Boolean);
      const promptActions: any[] = [];
      let lastResult: any = null;

      subQueries.forEach((sq) => {
        const res = mySqlRunner.execute(sq);
        lastResult = res;
        promptActions.push({
          query: sq + ';',
          outputRows: res.asciiLines,
          executionTimeSec: res.executionTimeSec,
          rowsCount: res.rowsCount,
          isQueryOk: res.isQueryOk,
          rowsAffected: res.rowsAffected,
          isError: res.isError,
          errorMessage: res.errorMessage,
        });
      });

      // Generate authentic MySQL console screenshot PNG
      const screenshotDataUrl = generateMySqlTerminalScreenshotDataUrl({
        theme: 'windows-dark',
        windowTitle: 'Administrator: MySQL 8.4 Command Line Client',
        databaseName: 'OfficeDB',
        includeBanner: q.id === 'q-1',
        actions: promptActions,
      });

      // Update question state
      setQuestions((prev) =>
        prev.map((item) =>
          item.id === q.id
            ? {
                ...item,
                outputScreenshotDataUrl: screenshotDataUrl,
                outputText: lastResult?.asciiLines?.join('\n') || '',
                tableData:
                  lastResult && lastResult.columns.length > 0 && lastResult.rows.length > 0
                    ? {
                        headers: lastResult.columns,
                        rows: lastResult.rows,
                        caption: `Query Result (${lastResult.rowsCount} rows in set)`,
                      }
                    : undefined,
                isExecuted: true,
              }
            : item
        )
      );
    }
  };

  // Run all queries sequentially and generate screenshots
  const handleExecuteAll = async () => {
    setIsExecutingAll(true);
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (q.codeSnippet) {
        await handleExecuteQuestion(q);
      }
    }
    setIsExecutingAll(false);
    setToastMessage('All queries executed! Real screenshots generated.');
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Export complete DOCX answer document
  const handleDownloadDocx = async () => {
    setIsExportingDocx(true);
    try {
      const docItems = questions.map((q) => ({
        id: q.id,
        numberLabel: q.numberLabel,
        sectionTitle: q.sectionTitle,
        questionText: q.text,
        codeSnippet: q.codeSnippet,
        codeLanguage: q.codeLanguage,
        outputScreenshotDataUrl: q.outputScreenshotDataUrl,
        outputText: q.outputText,
        tableData: q.tableData,
        explanation:
          q.explanation ||
          `The above query executes in MySQL to fulfill question ${q.numberLabel}. The real execution result is captured in the console screenshot.`,
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(1)',
      }));

      const blob = await generateAssignmentDocx({
        header: studentHeader,
        questions: docItems,
        fontFamily: 'Times New Roman',
        includeExplanations: true,
      });

      const safeTitle = (studentHeader.assignmentTitle || 'Assignment').replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadDocxBlob(blob, `${safeTitle}_Submission.docx`);

      setToastMessage('DOCX Answer Document downloaded successfully!');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      console.error('DOCX Export error:', err);
      alert('Error generating DOCX document: ' + err.message);
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Send assignment to handwriting editor
  const handleSendToHandwriting = () => {
    // Register images and construct markdown
    let fullMarkdown = `# ${studentHeader.assignmentTitle}\n\n`;
    fullMarkdown += `**Name:** ${studentHeader.studentName} | **Roll No:** ${studentHeader.rollNo}\n`;
    fullMarkdown += `**Subject:** ${studentHeader.subject} | **Class:** ${studentHeader.className}\n\n---\n\n`;

    questions.forEach((q) => {
      fullMarkdown += `## ${q.numberLabel}. ${q.text}\n\n`;

      if (q.codeSnippet) {
        fullMarkdown += `**Query / Source Code:**\n\`\`\`${q.codeLanguage || 'sql'}\n${q.codeSnippet}\n\`\`\`\n\n`;
      }

      if (q.outputScreenshotDataUrl) {
        const imgId = registerImage(q.outputScreenshotDataUrl, `${q.numberLabel} Execution`);
        fullMarkdown += `**Execution Output Screenshot (Real):**\n\n![${q.numberLabel} Output|medium](attachment:${imgId})\n\n`;
      }

      if (q.explanation) {
        fullMarkdown += `**Explanation:** ${q.explanation}\n\n`;
      }

      fullMarkdown += `\n`;
    });

    setTitle(studentHeader.assignmentTitle);
    setContent(fullMarkdown);
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF7EE] text-[#14213D] select-none relative">
      <TopBar />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 bg-[#1F3A8A] text-white text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-5">
        {/* Student Submission Header Card (Printed on DOCX) */}
        <StudentHeaderCard onHeaderChange={setStudentHeader} />

        {/* Action Header Banner */}
        <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-4 rounded-2xl border border-[#E2D8C3] shadow-xs">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#EEF2FF] text-[#1F3A8A] rounded-xl font-bold text-xs flex items-center gap-1.5">
              <Database className="w-4 h-4" />
              <span>SQL / DBMS Lab Solver</span>
            </span>
            <span className="text-xs font-semibold text-[#6B7280]">
              {questions.length} Questions Loaded
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExecuteAll}
              disabled={isExecutingAll || questions.length === 0}
              className="px-3.5 py-2 font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              title="Run all queries on in-browser MySQL engine and capture real terminal screenshots"
            >
              {isExecutingAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Running All Queries...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Run All & Capture Screenshots</span>
                </>
              )}
            </button>

            {/* DOCX Download Button */}
            <button
              onClick={handleDownloadDocx}
              disabled={isExportingDocx || questions.length === 0}
              className="px-4 py-2 font-bold text-xs text-white bg-[#1F3A8A] hover:bg-[#1A3175] disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              title="Download professional Word document (.docx) with student header, code, screenshots and tables"
            >
              {isExportingDocx ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Building DOCX...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download DOCX</span>
                </>
              )}
            </button>

            {/* Send to Handwriting Editor */}
            <button
              onClick={handleSendToHandwriting}
              disabled={questions.length === 0}
              className="px-3.5 py-2 font-bold text-xs text-[#1F3A8A] bg-[#EEF2FF] hover:bg-[#E0E7FF] border border-[#C7D2FE] rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              title="Send full assignment to handwriting generator with queries written by hand and embedded screenshots"
            >
              <span>Send to Handwriting</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Solver Workspace (Split Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Input Prompt / Raw Text (4 Cols) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E2D8C3] p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#14213D] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#1F3A8A]" />
                  <span>Assignment Sheet</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setRawText(SAMPLE_DBMS_ASSIGNMENT);
                      handleExtractWithText(SAMPLE_DBMS_ASSIGNMENT);
                    }}
                    className="text-[11px] text-[#1F3A8A] font-semibold hover:underline"
                  >
                    DBMS Lab 2
                  </button>
                </div>
              </div>

              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={18}
                placeholder="Paste your assignment text, question sheet, or SQL problem set here..."
                className="w-full p-3 font-mono text-xs text-[#14213D] border border-[#E2D8C3] rounded-xl bg-[#FAF8F5] outline-none focus:ring-1 focus:ring-[#1F3A8A] resize-none leading-relaxed"
                spellCheck={false}
              />
            </div>

            <button
              onClick={handleExtract}
              disabled={isExtracting}
              className="w-full py-2.5 font-bold text-white bg-[#1F3A8A] hover:bg-[#1A3175] rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting Questions...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Extract & Parse Questions ({questions.length})</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Interactive Solution Cards with Real Terminal Screenshots (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#14213D]">
                Structured Questions & Execution Review
              </h3>
              <span className="text-[11px] text-[#6B7280]">
                All outputs generated from real in-browser execution
              </span>
            </div>

            <div className="space-y-4 max-h-[780px] overflow-y-auto pr-1">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="p-4 bg-white rounded-2xl border border-[#E2D8C3] shadow-xs space-y-3 transition-all"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs bg-[#1F3A8A] text-white px-2 py-0.5 rounded-md">
                        {q.numberLabel}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                        {q.codeLanguage?.toUpperCase() || 'SQL'}
                      </span>
                      {q.isExecuted && (
                        <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Executed & Captured</span>
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleExecuteQuestion(q)}
                      className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
                      title="Run query and capture authentic MySQL console screenshot"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>Run Query</span>
                    </button>
                  </div>

                  {/* Question Prompt */}
                  <p className="text-xs font-bold text-[#14213D] leading-relaxed">
                    {q.text}
                  </p>

                  {/* Editable SQL Query / Code Block */}
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">
                      SQL Query / Code:
                    </label>
                    <textarea
                      value={q.codeSnippet || ''}
                      onChange={(e) => handleCodeChange(q.id, e.target.value)}
                      rows={3}
                      className="w-full p-2.5 font-mono text-xs text-[#14213D] border border-[#E2D8C3] rounded-xl bg-[#FAF8F5] outline-none focus:ring-1 focus:ring-[#1F3A8A] resize-none leading-relaxed"
                      placeholder="Enter query here (e.g. SELECT * FROM SALESMEN;)..."
                      spellCheck={false}
                    />
                  </div>

                  {/* Real MySQL Terminal Screenshot Viewport */}
                  {q.outputScreenshotDataUrl ? (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                        <span className="font-semibold text-emerald-800 flex items-center gap-1">
                          <TerminalIcon className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Real Output Screenshot (Embedded in DOCX & Handwriting):</span>
                        </span>
                        <a
                          href={q.outputScreenshotDataUrl}
                          download={`mysql-output-${q.numberLabel}.png`}
                          className="text-[#1F3A8A] font-bold hover:underline flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>Save PNG</span>
                        </a>
                      </div>

                      <div className="rounded-xl overflow-hidden border border-black/20 shadow-md">
                        <img
                          src={q.outputScreenshotDataUrl}
                          alt={`${q.numberLabel} Execution Output`}
                          className="w-full object-contain"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-[#FAF8F5] border border-dashed border-[#E2D8C3] rounded-xl flex items-center justify-between text-xs text-[#6B7280]">
                      <span>Click <strong>&quot;Run Query&quot;</strong> to execute and capture authentic MySQL screenshot</span>
                      <button
                        onClick={() => handleExecuteQuestion(q)}
                        className="text-[#1F3A8A] font-bold hover:underline"
                      >
                        Run Now
                      </button>
                    </div>
                  )}

                  {/* Explanation Field */}
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">
                      Explanation (Included in DOCX):
                    </label>
                    <input
                      type="text"
                      value={q.explanation || ''}
                      onChange={(e) => handleExplanationChange(q.id, e.target.value)}
                      placeholder="e.g. Uses LIKE 'A%' pattern matching to filter salesmen names starting with A."
                      className="w-full p-2 border border-[#E2D8C3] rounded-lg text-xs bg-[#FAF8F5] outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
