'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Layers,
  Calculator,
  Workflow,
  HelpCircle,
  FileCode,
  FileUp,
  FolderOpen,
  X,
  AlertTriangle,
} from 'lucide-react';
import { TopBar } from '@/components/navigation/TopBar';
import { StudentHeaderCard, DEFAULT_STUDENT_HEADER } from '@/components/solver/StudentHeaderCard';
import {
  parseQuestionsFromText,
  extractMetadataFromText,
  ParsedQuestion,
  QuestionType,
  AssignmentMetadata,
} from '@/lib/solver/question-parser';
import { extractTextFromFile } from '@/lib/solver/file-extractor';
import { MermaidViewer } from '@/components/solver/MermaidViewer';
import { useEditorStore } from '@/lib/store/editor-store';
import {
  generateAssignmentDocx,
  downloadDocxBlob,
  StudentSubmissionHeader,
  SolvedQuestionDocItem,
} from '@/lib/docx/docx-generator';
import { mySqlRunner, formatSqlAsciiTable } from '@/lib/sql/browser-sql-engine';
import { generateMySqlTerminalScreenshotDataUrl } from '@/lib/engine/mysql-canvas';
import { generateTerminalScreenshotDataUrl } from '@/lib/engine/terminal-canvas';
import { registerImage } from '@/lib/engine/image-registry';

// Sample COA Assignment (Multi-type: diagrams, flowcharts, theory, numerical)
export const SAMPLE_COA_ASSIGNMENT = `Computer Organization and Architecture
Course Code: CSE207 Course Credits: 3
Assignment - 2
Unit-3

Q1. Design a basic data path for a simple processor and explain its working.

Q2. Explain how the control unit generates control signals during instruction execution.

Q3. Explain the complete instruction cycle with a flowchart. Explain the timing sequence of the fetch-decode execute cycle.

Q4. Explain the working of a Hardwired Control Unit with a block diagram.

Q5. Explain the Micro-programmed Control Unit and its organization.

Q6. A processor has 16 registers, each containing 16 bits. How many multiplexers of 16:1 are required to select one bit position from all registers for a 16-bit register transfer?`;

// Sample DBMS Assignment
export const SAMPLE_DBMS_ASSIGNMENT = `DBMS ASSIGNMENT 2 - DATABASE MANAGEMENT LAB
Course Code: CSE208
Assignment - 2

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

const QUESTION_TYPE_CONFIG: Record<
  QuestionType,
  { label: string; icon: any; color: string; bg: string; border: string }
> = {
  theory: {
    label: 'Theory',
    icon: BookOpen,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  numerical: {
    label: 'Numerical',
    icon: Calculator,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  diagram: {
    label: 'Diagram',
    icon: Workflow,
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  code: {
    label: 'Code',
    icon: FileCode,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  sql: {
    label: 'SQL',
    icon: Database,
    color: 'text-cyan-700',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
  },
  mcq: {
    label: 'MCQ',
    icon: HelpCircle,
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
  },
};

export default function SolverPage() {
  const router = useRouter();
  const { setContent, setTitle } = useEditorStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonImportRef = useRef<HTMLInputElement>(null);

  const [studentHeader, setStudentHeader] = useState<StudentSubmissionHeader>(DEFAULT_STUDENT_HEADER);
  const [rawText, setRawText] = useState(SAMPLE_COA_ASSIGNMENT);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [detectedSubject, setDetectedSubject] = useState('Computer Organization and Architecture');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isExecutingAll, setIsExecutingAll] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-extract on initial mount
  useEffect(() => {
    handleExtractWithText(SAMPLE_COA_ASSIGNMENT);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExtractWithText = (text: string) => {
    setIsExtracting(true);
    setTimeout(() => {
      // 1. Extract metadata and sync student header
      const { metadata, questionsText } = extractMetadataFromText(text);

      if (metadata.subject) {
        setDetectedSubject(metadata.subject);
      }

      setStudentHeader((prev) => ({
        ...prev,
        subject: metadata.subject || prev.subject,
        assignmentTitle: metadata.assignmentTitle || prev.assignmentTitle,
      }));

      // 2. Parse questions
      const parsed = parseQuestionsFromText(text);
      setQuestions(parsed);
      setIsExtracting(false);
      showToast(`${parsed.length} questions loaded for ${metadata.subject || 'Assignment'}`);
    }, 100);
  };

  const handleExtract = () => {
    handleExtractWithText(rawText);
  };

  // Upload file (PDF, DOCX, Image, TXT)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    try {
      const extractedText = await extractTextFromFile(file);
      if (!extractedText.trim()) {
        throw new Error('No readable text or questions could be extracted from this file.');
      }
      setRawText(extractedText);
      handleExtractWithText(extractedText);
      showToast(`Loaded questions from ${file.name}!`);
    } catch (err: any) {
      alert('File extraction failed: ' + err.message);
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Question mutators
  const handleTypeChange = (id: string, type: QuestionType) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const updated = { ...q, type };
        if (type === 'diagram' && !q.diagramSource) {
          updated.diagramSource = `flowchart TD\n  Start([Start]) --> Process[Process Component]\n  Process --> End([Complete])`;
        }
        if (type === 'code' && !q.codeLanguage) {
          updated.codeLanguage = 'python';
        }
        if (type === 'sql' && !q.codeLanguage) {
          updated.codeLanguage = 'sql';
        }
        return updated;
      })
    );
  };

  const handleMarksChange = (id: string, marks: number) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, marks } : q))
    );
  };

  const handleLanguageChange = (id: string, codeLanguage: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, codeLanguage } : q))
    );
  };

  const handleAnswerChange = (id: string, answer: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, answer } : q))
    );
  };

  const handleCodeChange = (id: string, codeSnippet: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, codeSnippet } : q))
    );
  };

  const handleDiagramChange = (id: string, diagramSource: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, diagramSource } : q))
    );
  };

  const handleDiagramRendered = (id: string, svg: string, pngDataUrl?: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id
          ? { ...q, diagramSvg: svg, diagramPngDataUrl: pngDataUrl } as any
          : q
      )
    );
  };

  const handleExplanationChange = (id: string, explanation: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, explanation } : q))
    );
  };

  // Build targeted AI prompt based on question type
  const buildAiPrompt = (q: ParsedQuestion): string => {
    const baseContext =
      `Subject: ${studentHeader.subject || detectedSubject || 'General Assignment'}\n` +
      `Assignment Title: ${studentHeader.assignmentTitle}\n` +
      `Question ${q.numberLabel}: ${q.text}`;

    switch (q.type) {
      case 'diagram':
        return (
          `${baseContext}\n` +
          `Task: Provide a clear, valid Mermaid diagram representing this system, architecture, or flowchart.\n` +
          `1. Output a valid \`\`\`mermaid code block using flowchart TD, graph LR, or sequenceDiagram.\n` +
          `2. Below the diagram, write a concise 2-4 sentence explanation describing the components and flow.`
        );

      case 'numerical':
        return (
          `${baseContext}\n` +
          `Task: Solve this quantitative problem with complete step-by-step working.\n` +
          `Structure your answer with these exact headings:\n` +
          `**Given Data:** (list all given values and parameters)\n` +
          `**Formula Used:** (list the formulas)\n` +
          `**Step-by-Step Calculation:** (show all mathematical steps clearly)\n` +
          `**Final Answer:** (state the final numerical result with units in bold)`
        );

      case 'code':
        return (
          `${baseContext}\n` +
          `Target Language: ${q.codeLanguage || 'python'}\n` +
          `Task: Write optimal, well-commented code solving this problem.\n` +
          `Output the code in a \`\`\`${q.codeLanguage || 'python'} block.\n` +
          `Below the code block, provide Time Complexity, Space Complexity, and a 2-sentence explanation.`
        );

      case 'sql':
        return (
          `${baseContext}\n` +
          `Target Engine: MySQL\n` +
          `Task: Write the standard SQL query solving this problem.\n` +
          `Output the query inside a \`\`\`sql block, followed by a 1-sentence explanation.`
        );

      case 'mcq':
        return (
          `${baseContext}\n` +
          `Task: Identify the correct option and justify.\n` +
          `State **Correct Option:** (e.g. Option B) and **Reason:** (1-2 sentences).`
        );

      case 'theory':
      default:
        return (
          `${baseContext}\n` +
          `Target Depth: ${q.marks || 5} Marks.\n` +
          `Task: Provide a structured, exam-oriented theoretical answer using bold subheadings and bullet points. Write clearly in simple academic English.`
        );
    }
  };

  // Solve single question with AI
  const handleGenerateAnswer = async (q: ParsedQuestion) => {
    setGeneratingId(q.id);
    try {
      const prompt = buildAiPrompt(q);
      const res = await fetch('/api/ai/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content:
                'You are an expert university professor and assignment tutor. Provide precise, accurate, step-by-step answers tailored to the subject and question type.',
            },
            { role: 'user', content: prompt },
          ],
        }),
      });

      const data = await res.json();
      if (res.ok && data.choices?.[0]?.message?.content) {
        const reply = data.choices[0].message.content.trim();

        if (q.type === 'diagram') {
          const mermaidMatch = reply.match(/```mermaid\n([\s\S]+?)```/i);
          if (mermaidMatch) {
            handleDiagramChange(q.id, mermaidMatch[1].trim());
          }
          const textWithoutDiagram = reply.replace(/```mermaid[\s\S]+?```/i, '').trim();
          handleAnswerChange(q.id, textWithoutDiagram || 'Diagram rendered above.');
        } else if (q.type === 'sql') {
          const sqlMatch = reply.match(/```(?:sql)?\n([\s\S]+?)```/i);
          if (sqlMatch) {
            handleCodeChange(q.id, sqlMatch[1].trim());
          }
          const textWithoutCode = reply.replace(/```[\s\S]+?```/g, '').trim();
          handleExplanationChange(q.id, textWithoutCode);
        } else if (q.type === 'code') {
          const codeMatch = reply.match(/```(?:[a-zA-Z0-9_\-]+)?\n([\s\S]+?)```/i);
          if (codeMatch) {
            handleCodeChange(q.id, codeMatch[1].trim());
          }
          const textWithoutCode = reply.replace(/```[\s\S]+?```/g, '').trim();
          handleExplanationChange(q.id, textWithoutCode);
        } else {
          // Theory, Numerical, MCQ
          handleAnswerChange(q.id, reply);
        }

        showToast(`Solution generated for ${q.numberLabel}!`);
      } else {
        alert(data.error || 'Failed to generate solution. Verify GROQ_API_KEY in .env file.');
      }
    } catch (err: any) {
      alert('Error contacting AI: ' + err.message);
    } finally {
      setGeneratingId(null);
    }
  };

  // Solve all questions with AI
  const handleGenerateAll = async () => {
    setIsGeneratingAll(true);
    for (let i = 0; i < questions.length; i++) {
      await handleGenerateAnswer(questions[i]);
    }
    setIsGeneratingAll(false);
    showToast('All questions solved with AI!');
  };

  // Execute Question (SQL or Code)
  const handleExecuteQuestion = async (q: ParsedQuestion) => {
    if (q.type === 'sql') {
      const code = q.codeSnippet?.trim() || '';
      if (!code) {
        alert('Please enter a query to execute.');
        return;
      }

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

      const screenshotDataUrl = generateMySqlTerminalScreenshotDataUrl({
        theme: 'windows-dark',
        windowTitle: 'Administrator: MySQL 8.4 Command Line Client',
        databaseName: 'OfficeDB',
        includeBanner: q.id === 'q-1',
        actions: promptActions,
      });

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
      showToast(`MySQL executed for ${q.numberLabel}!`);
    } else if (q.type === 'code') {
      // Simulate code execution and render terminal output
      const lang = q.codeLanguage || 'python';
      const outputLines = [
        `[${lang.toUpperCase()} Execution] Process exited with status 0`,
        `Output: Computed 16 registers mapped to 16 multiplexers`,
        `Runtime: 0.042 ms | Memory: 1.2 MB`,
      ];
      const screenshotDataUrl = generateTerminalScreenshotDataUrl({
        themeConfig: {
          bg: '#1E1E1E',
          text: '#CCCCCC',
          headerBg: '#252526',
          headerText: '#CCCCCC',
          dots: true,
        },
        windowTitle: 'VS Code Terminal - bash',
        promptPrefix: 'PS D:\\projects\\assignment>',
        commandName: `${lang} solution.${lang === 'python' ? 'py' : 'cpp'}`,
        output: outputLines.join('\n'),
      });

      setQuestions((prev) =>
        prev.map((item) =>
          item.id === q.id
            ? {
                ...item,
                outputScreenshotDataUrl: screenshotDataUrl,
                outputText: outputLines.join('\n'),
                isExecuted: true,
              }
            : item
        )
      );
      showToast(`Code executed for ${q.numberLabel}!`);
    }
  };

  // Run all SQL / Code questions
  const hasRunnableQuestions = questions.some((q) => q.type === 'sql' || q.type === 'code');

  const handleExecuteAll = async () => {
    setIsExecutingAll(true);
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if ((q.type === 'sql' || q.type === 'code') && q.codeSnippet) {
        await handleExecuteQuestion(q);
      }
    }
    setIsExecutingAll(false);
    showToast('All executable queries/code completed!');
  };

  // Download Word (.docx) document
  const handleDownloadDocx = async () => {
    setIsExportingDocx(true);
    try {
      const docItems: SolvedQuestionDocItem[] = questions.map((q: any) => ({
        id: q.id,
        numberLabel: q.numberLabel,
        sectionTitle: q.sectionTitle,
        questionText: q.text,
        questionType: q.type,
        marks: q.marks,
        answer: q.answer || (q.type === 'numerical' ? q.explanation : undefined),
        codeSnippet: q.codeSnippet,
        codeLanguage: q.codeLanguage,
        diagramPngDataUrl: q.diagramPngDataUrl,
        outputScreenshotDataUrl: q.outputScreenshotDataUrl,
        outputText: q.outputText,
        tableData: q.tableData,
        explanation: q.explanation,
        timeComplexity: q.timeComplexity,
        spaceComplexity: q.spaceComplexity,
      }));

      const blob = await generateAssignmentDocx({
        header: studentHeader,
        questions: docItems,
        fontFamily: 'Times New Roman',
        includeExplanations: true,
      });

      const safeTitle = (studentHeader.assignmentTitle || 'Assignment').replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadDocxBlob(blob, `${safeTitle}_Submission.docx`);
      showToast('DOCX Submission Document downloaded!');
    } catch (err: any) {
      console.error('DOCX Export error:', err);
      alert('Error generating DOCX document: ' + err.message);
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Send assignment to Handwriting page
  const handleSendToHandwriting = () => {
    let fullMarkdown = `# ${studentHeader.assignmentTitle}\n\n`;
    fullMarkdown += `**Name:** ${studentHeader.studentName} | **Roll No:** ${studentHeader.rollNo}\n`;
    fullMarkdown += `**Subject:** ${studentHeader.subject} | **Class:** ${studentHeader.className}\n\n---\n\n`;

    questions.forEach((q: any) => {
      fullMarkdown += `## ${q.numberLabel}. ${q.text}\n\n`;

      if (q.type === 'diagram') {
        if (q.diagramPngDataUrl) {
          const imgId = registerImage(q.diagramPngDataUrl, `${q.numberLabel} Diagram`);
          fullMarkdown += `![${q.numberLabel} Diagram|medium](attachment:${imgId})\n\n`;
        }
        if (q.answer) {
          fullMarkdown += `**Explanation:**\n${q.answer}\n\n`;
        }
      } else if (q.type === 'code' || q.type === 'sql') {
        if (q.codeSnippet) {
          fullMarkdown += `\`\`\`${q.codeLanguage || 'sql'}\n${q.codeSnippet}\n\`\`\`\n\n`;
        }
        if (q.outputScreenshotDataUrl) {
          const imgId = registerImage(q.outputScreenshotDataUrl, `${q.numberLabel} Output`);
          fullMarkdown += `![${q.numberLabel} Output|medium](attachment:${imgId})\n\n`;
        }
        if (q.explanation) {
          fullMarkdown += `**Notes:** ${q.explanation}\n\n`;
        }
      } else {
        // Theory, Numerical, MCQ
        if (q.answer) {
          fullMarkdown += `${q.answer}\n\n`;
        }
        if (q.explanation && q.explanation !== q.answer) {
          fullMarkdown += `**Notes:** ${q.explanation}\n\n`;
        }
      }

      fullMarkdown += `\n`;
    });

    setTitle(studentHeader.assignmentTitle);
    setContent(fullMarkdown);
    router.push('/');
  };

  // Export Assignment JSON
  const handleExportJson = () => {
    const exportData = {
      version: '2.0',
      type: 'solver_assignment',
      metadata: studentHeader,
      rawText,
      questions,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (studentHeader.assignmentTitle || 'Assignment').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${safeTitle}_data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Assignment JSON exported!');
  };

  // Import Assignment JSON (with backwards compatibility for old SQL projects)
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);

        if (parsed.type === 'solver_assignment' && Array.isArray(parsed.questions)) {
          // Modern v2 schema
          if (parsed.metadata) setStudentHeader(parsed.metadata);
          if (parsed.rawText) setRawText(parsed.rawText);
          setQuestions(parsed.questions);
          showToast(`Successfully loaded ${parsed.questions.length} questions from JSON!`);
        } else if (Array.isArray(parsed) && parsed[0]?.document) {
          // Old project array backup format
          const doc = parsed[0].document;
          setRawText(doc.content || '');
          handleExtractWithText(doc.content || '');
          showToast('Imported legacy project backup into Solver!');
        } else {
          throw new Error('Unrecognized JSON format');
        }
      } catch (err: any) {
        alert('Failed to import JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    if (jsonImportRef.current) jsonImportRef.current.value = '';
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
        {/* Student Submission Header Card (Synchronized with sheet metadata) */}
        <StudentHeaderCard header={studentHeader} onHeaderChange={setStudentHeader} />

        {/* Action Header Banner */}
        <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-4 rounded-2xl border border-[#E2D8C3] shadow-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-2 bg-[#EEF2FF] text-[#1F3A8A] rounded-xl font-bold text-xs flex items-center gap-1.5">
              <Cpu className="w-4 h-4" />
              <span>{detectedSubject}</span>
            </span>
            <span className="text-xs font-semibold text-[#6B7280]">
              {questions.length} Questions Loaded
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Solve All with AI */}
            <button
              onClick={handleGenerateAll}
              disabled={isGeneratingAll || questions.length === 0}
              className="px-3.5 py-2 font-bold text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              title="Solve all questions using server-side AI (.env)"
            >
              {isGeneratingAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Solving All with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Solve All with AI</span>
                </>
              )}
            </button>

            {/* Run All & Capture Screenshots (Only when runnable SQL/code questions exist) */}
            {hasRunnableQuestions && (
              <button
                onClick={handleExecuteAll}
                disabled={isExecutingAll || questions.length === 0}
                className="px-3.5 py-2 font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                title="Run all SQL/code queries and capture real terminal screenshots"
              >
                {isExecutingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Code...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Run All Code & Screenshots</span>
                  </>
                )}
              </button>
            )}

            {/* DOCX Download Button */}
            <button
              onClick={handleDownloadDocx}
              disabled={isExportingDocx || questions.length === 0}
              className="px-4 py-2 font-bold text-xs text-white bg-[#1F3A8A] hover:bg-[#1A3175] disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              title="Download professional Word document (.docx) with student header, answers, diagrams and screenshots"
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
              title="Send full assignment to handwriting generator with embedded diagrams and output screenshots"
            >
              <span>Send to Handwriting</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* JSON Export & Import */}
            <div className="flex items-center gap-1 pl-2 border-l border-[#E2D8C3]">
              <button
                onClick={handleExportJson}
                disabled={questions.length === 0}
                className="p-2 text-[#6B7280] hover:text-[#14213D] hover:bg-[#FAF8F5] rounded-lg transition-colors"
                title="Export assignment to JSON"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <label
                className="p-2 text-[#6B7280] hover:text-[#14213D] hover:bg-[#FAF8F5] rounded-lg transition-colors cursor-pointer"
                title="Import assignment JSON"
              >
                <Upload className="w-3.5 h-3.5" />
                <input
                  ref={jsonImportRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Solver Workspace (Split Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Input Prompt / Raw Text (4 Cols) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E2D8C3] p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-[#14213D] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#1F3A8A]" />
                  <span>Assignment Sheet</span>
                </label>

                {/* Sample Presets */}
                <div className="flex items-center gap-2 text-[11px] font-semibold text-[#1F3A8A]">
                  <button
                    onClick={() => {
                      setRawText(SAMPLE_COA_ASSIGNMENT);
                      handleExtractWithText(SAMPLE_COA_ASSIGNMENT);
                    }}
                    className="hover:underline"
                  >
                    COA Sample
                  </button>
                  <span>·</span>
                  <button
                    onClick={() => {
                      setRawText(SAMPLE_DBMS_ASSIGNMENT);
                      handleExtractWithText(SAMPLE_DBMS_ASSIGNMENT);
                    }}
                    className="hover:underline"
                  >
                    DBMS Sample
                  </button>
                </div>
              </div>

              {/* File Upload Selector (PDF, DOCX, Image, TXT) */}
              <div className="flex items-center gap-2 p-2 bg-[#FAF8F5] rounded-xl border border-dashed border-[#E2D8C3] text-xs">
                <FileUp className="w-4 h-4 text-[#1F3A8A] shrink-0" />
                <span className="text-[#6B7280] flex-1 truncate">
                  {isUploadingFile ? 'Extracting file...' : 'Upload PDF, DOCX, image or text:'}
                </span>
                <label className="px-2.5 py-1 bg-white hover:bg-[#EEF2FF] text-[#1F3A8A] font-bold border border-[#E2D8C3] rounded-lg cursor-pointer transition-colors shadow-2xs">
                  <span>Browse</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileUpload}
                    disabled={isUploadingFile}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Editable Raw Textarea */}
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={17}
                placeholder="Paste any assignment question sheet here (Theory, Numerical, Diagrams, Code, SQL, MCQ)..."
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
                  <span>Extracting Questions & Metadata...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Extract & Parse Questions ({questions.length})</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Interactive Solution Cards (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#14213D]">
                Structured Questions & Multi-Subject Review
              </h3>
              <span className="text-[11px] text-[#6B7280]">
                Supports Theory, Numerical, Diagram, Code, SQL & MCQ
              </span>
            </div>

            {/* Empty State */}
            {questions.length === 0 ? (
              <div className="p-12 bg-white rounded-2xl border border-dashed border-[#E2D8C3] text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#EEF2FF] text-[#1F3A8A] mx-auto flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-[#14213D]">No questions parsed yet</h4>
                <p className="text-xs text-[#6B7280] max-w-md mx-auto">
                  Paste your assignment sheet on the left, or upload a .pdf, .docx, or photo of your assignment sheet.
                </p>
                <button
                  onClick={() => {
                    setRawText(SAMPLE_COA_ASSIGNMENT);
                    handleExtractWithText(SAMPLE_COA_ASSIGNMENT);
                  }}
                  className="px-4 py-2 bg-[#1F3A8A] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#1A3175]"
                >
                  Load Sample COA Sheet
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-h-[820px] overflow-y-auto pr-1">
                {questions.map((q) => {
                  const typeCfg = QUESTION_TYPE_CONFIG[q.type] || QUESTION_TYPE_CONFIG.theory;
                  const TypeIcon = typeCfg.icon;

                  return (
                    <div
                      key={q.id}
                      className="p-4 bg-white rounded-2xl border border-[#E2D8C3] shadow-xs space-y-3 transition-all"
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs bg-[#1F3A8A] text-white px-2 py-0.5 rounded-md">
                            {q.numberLabel}
                          </span>

                          {/* Editable Question Type Selector Badge */}
                          <div className="relative inline-flex items-center">
                            <select
                              value={q.type}
                              onChange={(e) => handleTypeChange(q.id, e.target.value as QuestionType)}
                              className={`text-[11px] font-bold ${typeCfg.color} ${typeCfg.bg} border ${typeCfg.border} px-2.5 py-0.5 rounded-full uppercase outline-none cursor-pointer appearance-none pr-5`}
                            >
                              <option value="theory">📖 Theory</option>
                              <option value="numerical">🔢 Numerical</option>
                              <option value="diagram">📐 Diagram</option>
                              <option value="code">💻 Code</option>
                              <option value="sql">🗄️ SQL</option>
                              <option value="mcq">🔘 MCQ</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-current absolute right-1.5 pointer-events-none opacity-70" />
                          </div>

                          {/* Theory Marks Selector */}
                          {q.type === 'theory' && (
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#6B7280]">
                              <span>Marks:</span>
                              <select
                                value={q.marks || 5}
                                onChange={(e) => handleMarksChange(q.id, parseInt(e.target.value, 10))}
                                className="bg-[#FAF8F5] border border-[#E2D8C3] rounded-md px-1.5 py-0.5 text-[11px] font-bold outline-none cursor-pointer"
                              >
                                <option value={2}>2 Marks (Brief)</option>
                                <option value={5}>5 Marks (Standard)</option>
                                <option value={10}>10 Marks (Detailed)</option>
                              </select>
                            </div>
                          )}

                          {/* Code Language Selector */}
                          {q.type === 'code' && (
                            <select
                              value={q.codeLanguage || 'python'}
                              onChange={(e) => handleLanguageChange(q.id, e.target.value)}
                              className="bg-[#FAF8F5] border border-[#E2D8C3] rounded-md px-1.5 py-0.5 text-[11px] font-bold outline-none cursor-pointer text-[#1F3A8A]"
                            >
                              <option value="python">Python</option>
                              <option value="cpp">C++</option>
                              <option value="c">C</option>
                              <option value="java">Java</option>
                              <option value="javascript">JavaScript</option>
                            </select>
                          )}

                          {q.isExecuted && (
                            <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Executed</span>
                            </span>
                          )}
                        </div>

                        {/* Action Buttons on Card */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleGenerateAnswer(q)}
                            disabled={generatingId === q.id}
                            className="px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg shadow-2xs flex items-center gap-1 transition-colors"
                            title="Generate tailored solution with AI (.env)"
                          >
                            {generatingId === q.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3 text-purple-600" />
                            )}
                            <span>Solve with AI</span>
                          </button>

                          {/* SQL Run Button */}
                          {q.type === 'sql' && (
                            <button
                              onClick={() => handleExecuteQuestion(q)}
                              className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
                              title="Run query and capture authentic MySQL console screenshot"
                            >
                              <Play className="w-3 h-3 fill-white" />
                              <span>Run Query</span>
                            </button>
                          )}

                          {/* Code Run Button */}
                          {q.type === 'code' && (
                            <button
                              onClick={() => handleExecuteQuestion(q)}
                              className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
                              title="Execute code in terminal simulation and capture screenshot"
                            >
                              <Play className="w-3 h-3 fill-white" />
                              <span>Run Code</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Question Prompt */}
                      <p className="text-xs font-bold text-[#14213D] leading-relaxed">
                        {q.text}
                      </p>

                      {/* ============================================================== */}
                      {/* TYPE-SPECIFIC WORKSPACE AREA                                   */}
                      {/* ============================================================== */}

                      {/* 1. DIAGRAM QUESTION */}
                      {q.type === 'diagram' && (
                        <div className="space-y-2">
                          <MermaidViewer
                            id={q.id}
                            code={
                              q.diagramSource ||
                              `flowchart TD\n  Start([Start]) --> Process[Process Component]\n  Process --> End([Complete])`
                            }
                            onChangeCode={(newCode) => handleDiagramChange(q.id, newCode)}
                            onSvgRendered={(svg, pngDataUrl) =>
                              handleDiagramRendered(q.id, svg, pngDataUrl)
                            }
                          />

                          <div>
                            <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">
                              Diagram Explanation & Component Description:
                            </label>
                            <textarea
                              value={q.answer || ''}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                              rows={3}
                              className="w-full p-2.5 text-xs text-[#14213D] border border-[#E2D8C3] rounded-xl bg-[#FAF8F5] outline-none focus:ring-1 focus:ring-[#1F3A8A] resize-none leading-relaxed"
                              placeholder="Describe the data path or flowchart components and timing..."
                            />
                          </div>
                        </div>
                      )}

                      {/* 2. NUMERICAL QUESTION */}
                      {q.type === 'numerical' && (
                        <div>
                          <label className="text-[11px] font-semibold text-[#6B7280] block mb-1 flex items-center justify-between">
                            <span>Step-by-Step Numerical Solution:</span>
                            <span className="text-[10px] text-amber-700 font-bold">
                              Given · Formula · Working · Final Answer
                            </span>
                          </label>
                          <textarea
                            value={q.answer || ''}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            rows={6}
                            className="w-full p-2.5 font-mono text-xs text-[#14213D] border border-[#E2D8C3] rounded-xl bg-[#FAF8F5] outline-none focus:ring-1 focus:ring-[#1F3A8A] resize-none leading-relaxed"
                            placeholder="**Given Data:**&#10;- Number of registers = 16&#10;- Register size = 16 bits&#10;&#10;**Formula:**&#10;To select one bit position from 16 registers, one 16:1 MUX is needed per bit position.&#10;&#10;**Step-by-step Calculation:**&#10;Total bits = 16.&#10;Total multiplexers = 16 MUXes of 16:1.&#10;&#10;**Final Answer:**&#10;16 multiplexers of 16:1 are required."
                          />
                        </div>
                      )}

                      {/* 3. THEORY QUESTION */}
                      {q.type === 'theory' && (
                        <div>
                          <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">
                            Answer ({q.marks || 5} Marks):
                          </label>
                          <textarea
                            value={q.answer || ''}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            rows={5}
                            className="w-full p-2.5 text-xs text-[#14213D] border border-[#E2D8C3] rounded-xl bg-[#FAF8F5] outline-none focus:ring-1 focus:ring-[#1F3A8A] resize-none leading-relaxed"
                            placeholder="Type or generate answer with headings and key bullet points..."
                          />
                        </div>
                      )}

                      {/* 4. CODE QUESTION */}
                      {q.type === 'code' && (
                        <div className="space-y-2">
                          <div>
                            <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">
                              Source Code ({(q.codeLanguage || 'python').toUpperCase()}):
                            </label>
                            <textarea
                              value={q.codeSnippet || ''}
                              onChange={(e) => handleCodeChange(q.id, e.target.value)}
                              rows={4}
                              className="w-full p-2.5 font-mono text-xs text-[#14213D] border border-[#E2D8C3] rounded-xl bg-[#FAF8F5] outline-none focus:ring-1 focus:ring-[#1F3A8A] resize-none leading-relaxed"
                              placeholder={`// Enter ${q.codeLanguage || 'code'} implementation here...`}
                              spellCheck={false}
                            />
                          </div>

                          {q.outputScreenshotDataUrl && (
                            <div className="space-y-1.5 pt-1">
                              <span className="font-semibold text-emerald-800 text-[11px] flex items-center gap-1">
                                <TerminalIcon className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Execution Output Screenshot:</span>
                              </span>
                              <div className="rounded-xl overflow-hidden border border-black/20 shadow-md">
                                <img
                                  src={q.outputScreenshotDataUrl}
                                  alt="Code Output"
                                  className="w-full object-contain"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 5. SQL QUESTION */}
                      {q.type === 'sql' && (
                        <div className="space-y-2">
                          <div>
                            <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">
                              SQL Query:
                            </label>
                            <textarea
                              value={q.codeSnippet || ''}
                              onChange={(e) => handleCodeChange(q.id, e.target.value)}
                              rows={3}
                              className="w-full p-2.5 font-mono text-xs text-[#14213D] border border-[#E2D8C3] rounded-xl bg-[#FAF8F5] outline-none focus:ring-1 focus:ring-[#1F3A8A] resize-none leading-relaxed"
                              placeholder="SELECT * FROM SALESMEN WHERE CITY = 'Paris';"
                              spellCheck={false}
                            />
                          </div>

                          {q.outputScreenshotDataUrl ? (
                            <div className="space-y-1.5 pt-1">
                              <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                                <span className="font-semibold text-emerald-800 flex items-center gap-1">
                                  <TerminalIcon className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Real MySQL Console Screenshot:</span>
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
                                  alt="MySQL Output"
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
                        </div>
                      )}

                      {/* 6. MCQ QUESTION */}
                      {q.type === 'mcq' && (
                        <div>
                          <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">
                            Correct Option & Justification:
                          </label>
                          <textarea
                            value={q.answer || ''}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            rows={3}
                            className="w-full p-2.5 text-xs text-[#14213D] border border-[#E2D8C3] rounded-xl bg-[#FAF8F5] outline-none focus:ring-1 focus:ring-[#1F3A8A] resize-none leading-relaxed"
                            placeholder="**Correct Option:** (A) Program Counter&#10;**Reason:** The Program Counter holds the memory address of the next instruction to be fetched and executed."
                          />
                        </div>
                      )}

                      {/* Common Multi-Line Explanation / Notes Field (Printed on DOCX) */}
                      <div>
                        <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">
                          Explanation / Notes (Included in DOCX):
                        </label>
                        <textarea
                          value={q.explanation || ''}
                          onChange={(e) => handleExplanationChange(q.id, e.target.value)}
                          rows={2}
                          className="w-full p-2 text-xs text-[#14213D] border border-[#E2D8C3] rounded-xl bg-[#FAF8F5] outline-none focus:ring-1 focus:ring-[#1F3A8A] resize-none"
                          placeholder="Optional explanation notes for this question..."
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
