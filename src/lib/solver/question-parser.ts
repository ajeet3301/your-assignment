/**
 * Deterministic In-Browser Multi-Subject Question Extractor
 * Automatically extracts metadata, parses multi-line questions, and detects question types:
 * Theory, Numerical, Diagram, Code, SQL, MCQ.
 */

export type QuestionType = 'theory' | 'numerical' | 'diagram' | 'code' | 'sql' | 'mcq' | (string & {});

export interface ParsedQuestion {
  id: string;
  numberLabel: string;
  sectionTitle?: string;
  text: string;
  type: QuestionType;
  marks?: number; // 2, 5, 10
  answer?: string; // Main answer text (theory, numerical steps, MCQ explanation)
  codeSnippet?: string; // For SQL or programming code
  codeLanguage?: string; // "sql", "python", "cpp", "c", "java", "javascript"
  diagramSource?: string; // Mermaid diagram code
  diagramSvg?: string; // Rendered SVG preview
  outputScreenshotDataUrl?: string; // Real terminal / SQL screenshot
  outputText?: string;
  tableData?: {
    headers: string[];
    rows: (string | number)[][];
    caption?: string;
  };
  explanation?: string; // Multi-line notes / DOCX explanation
  timeComplexity?: string;
  spaceComplexity?: string;
  isExecuted?: boolean;
  mcqOptions?: string[];
  correctOption?: string;
  numericalWorking?: {
    given?: string;
    formula?: string;
    steps?: string;
    finalAnswer?: string;
  };
}

export interface AssignmentMetadata {
  subject: string;
  courseCode: string;
  assignmentTitle: string;
  assignmentNumber: string;
  unit: string;
  credits: string;
  studentName?: string;
  rollNo?: string;
  className?: string;
}

/**
 * Extracts metadata header block (Subject, Course Code, Assignment Number, Unit)
 * and returns the remaining question body text with preamble stripped.
 */
export function extractMetadataFromText(rawText: string): {
  metadata: AssignmentMetadata;
  questionsText: string;
} {
  const metadata: AssignmentMetadata = {
    subject: '',
    courseCode: '',
    assignmentTitle: '',
    assignmentNumber: '',
    unit: '',
    credits: '',
  };

  if (!rawText.trim()) {
    return { metadata, questionsText: rawText };
  }

  // Find index where Question 1 starts
  const firstQuestionRegex = /(?:^|\n)\s*(?:Q(?:uestion)?\s*\.?\s*1[\.:\)\-]|Problem\s*1[\.:\)\-]|1[\.:\)])\s+/i;
  const match = firstQuestionRegex.exec(rawText);

  let preamble = '';
  let questionsText = rawText;

  if (match) {
    preamble = rawText.slice(0, match.index).trim();
    questionsText = rawText.slice(match.index).trim();
  } else {
    // If no numbered Q1 detected, check if first few lines look like headers
    const lines = rawText.split(/\r?\n/);
    const headerLines: string[] = [];
    const questionLines: string[] = [];
    let passedHeader = false;

    for (const line of lines) {
      const trimmed = line.trim();
      // If line starts with a bullet, number, or Q, it is a question, not a header!
      if (/^[•\-\*—]|\bQ\d|\b\d+[\.:\)]/i.test(trimmed)) {
        passedHeader = true;
      }

      if (!passedHeader && (
        /^(?:course|subject|unit|assignment|credit|department|semester|faculty)/i.test(trimmed) ||
        (headerLines.length < 4 && trimmed.length > 0 && !/[?]$/.test(trimmed) && trimmed.length < 60 && !/^[•\-\*—]|\b\d+[\.:\)]/i.test(trimmed))
      )) {
        headerLines.push(trimmed);
      } else {
        passedHeader = true;
        questionLines.push(line);
      }
    }

    if (headerLines.length > 0) {
      preamble = headerLines.join('\n');
      questionsText = questionLines.join('\n').trim();
    }
  }

  // 1. Extract Course Code (e.g. CSE207, CS101, IT304, etc.)
  const courseCodeMatch = preamble.match(/(?:Course\s*Code|Course|Sub(?:ject)?\s*Code)[\s\:\-]+([A-Za-z0-9\-]+)/i);
  if (courseCodeMatch) {
    metadata.courseCode = courseCodeMatch[1].trim();
  }

  // 2. Extract Credits
  const creditsMatch = preamble.match(/(?:Course\s*Credits|Credits)[\s\:\-]+(\d+)/i);
  if (creditsMatch) {
    metadata.credits = creditsMatch[1].trim();
  }

  // 3. Extract Assignment Number (e.g. Assignment - 2, Assignment 2, Assignment: 3)
  const assignNumMatch = preamble.match(/(?:Assignment|Assgt|Lab\s*Assignment|HW)[\s\:\-\#]*(\d+)/i);
  if (assignNumMatch) {
    metadata.assignmentNumber = assignNumMatch[1].trim();
  }

  // 4. Extract Unit (e.g. Unit-3, Unit 3, Module 2)
  const unitMatch = preamble.match(/(?:Unit|Module)[\s\:\-]+(\d+)/i);
  if (unitMatch) {
    metadata.unit = `Unit-${unitMatch[1].trim()}`;
  }

  // 5. Extract Subject Name
  // Heuristic: First substantive line in preamble that isn't Course Code, Unit, or Assignment
  const preambleLines = preamble.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of preambleLines) {
    if (
      !/^(?:course\s*code|course\s*credits|credits|assignment|unit|module|department|semester|date|max\s*marks)/i.test(line) &&
      line.length > 3
    ) {
      metadata.subject = line;
      break;
    }
  }

  // Fallbacks if not detected in preamble
  if (!metadata.subject) {
    if (/computer\s*organization/i.test(rawText)) {
      metadata.subject = 'Computer Organization and Architecture';
    } else if (/database|sql|dbms/i.test(rawText)) {
      metadata.subject = 'Database Management Systems';
    } else if (/operating\s*system/i.test(rawText)) {
      metadata.subject = 'Operating Systems';
    } else if (/data\s*structure/i.test(rawText)) {
      metadata.subject = 'Data Structures and Algorithms';
    } else {
      metadata.subject = 'General Assignment';
    }
  }

  // Construct Assignment Title
  const subjectPrefix = metadata.subject.toUpperCase();
  if (metadata.assignmentNumber) {
    metadata.assignmentTitle = `${subjectPrefix} ASSIGNMENT ${metadata.assignmentNumber}`;
  } else if (/assignment\s*[-–—]?\s*\d+/i.test(preamble)) {
    const rawAssign = preamble.match(/assignment\s*[-–—]?\s*\d+/i)?.[0] || 'ASSIGNMENT';
    metadata.assignmentTitle = `${subjectPrefix} ${rawAssign.toUpperCase()}`;
  } else {
    metadata.assignmentTitle = `${subjectPrefix} ASSIGNMENT`;
  }

  return { metadata, questionsText: questionsText || rawText };
}

/**
 * Intelligent question type detector
 */
export function detectQuestionType(chunk: string): {
  type: QuestionType;
  codeLanguage?: string;
  codeSnippet?: string;
  marks?: number;
  diagramSource?: string;
} {
  const lower = chunk.toLowerCase();

  // Marks detection: [5 marks], (10 pts), [10], (5)
  const marksMatch = chunk.match(/\[(\d+)\s*(?:marks?|pts?|points?)\]|\((\d+)\s*(?:marks?|pts?)\)/i);
  let marks = marksMatch ? parseInt(marksMatch[1] || marksMatch[2], 10) : 5;
  if (!marks || marks <= 0) marks = 5;

  let type: QuestionType = 'theory';
  let codeLanguage: string | undefined = undefined;
  let codeSnippet: string | undefined = undefined;
  let diagramSource: string | undefined = undefined;

  // 1. Multiple Choice Question (MCQ) Detection
  const hasMcqOptions =
    /(?:\([A-D]\)|[A-D]\)|\b[A-D]\.)\s+[^\n]+(?:\([B-D]\)|[B-D]\)|\b[B-D]\.)/i.test(chunk) ||
    (lower.includes('which of the following') && /[A-D][\.\)]/i.test(chunk));

  if (hasMcqOptions) {
    return { type: 'mcq', marks: 1 };
  }

  // 2. Diagram / Flowchart / Datapath Detection
  const isDiagram =
    lower.includes('data path') ||
    lower.includes('datapath') ||
    lower.includes('block diagram') ||
    lower.includes('flowchart') ||
    lower.includes('flow chart') ||
    lower.includes('timing diagram') ||
    lower.includes('draw a') ||
    lower.includes('sketch a') ||
    lower.includes('schematic') ||
    lower.includes('state diagram') ||
    lower.includes('state machine') ||
    lower.includes('architecture diagram') ||
    lower.includes('control unit with a block diagram') ||
    lower.includes('circuit diagram') ||
    lower.includes('er diagram') ||
    lower.includes('with a flowchart');

  if (isDiagram) {
    type = 'diagram';
    // Provide sample default template based on keywords
    if (lower.includes('flowchart') || lower.includes('instruction cycle')) {
      diagramSource = `flowchart TD\n  Start([Start Instruction Cycle]) --> Fetch[Fetch: AR <- PC, IR <- M[AR]]\n  Fetch --> Decode[Decode: Opcode in IR]\n  Decode --> Execute[Execute: ALU operation / Data Transfer]\n  Execute --> CheckInt{Interrupt?}\n  CheckInt -- Yes --> HandleInt[Save PC & Jump to ISR]\n  CheckInt -- No --> IncPC[PC <- PC + 1]\n  HandleInt --> Fetch\n  IncPC --> Fetch`;
    } else if (lower.includes('data path') || lower.includes('datapath')) {
      diagramSource = `flowchart LR\n  PC[Program Counter PC] --> MAR[Memory Address Reg MAR]\n  MAR --> Mem[(Main Memory)]\n  Mem --> MDR[Memory Buffer Reg MDR]\n  MDR --> IR[Instruction Reg IR]\n  IR --> CU[Control Unit]\n  MDR --> ALU[ALU Engine]\n  Reg[Register File R0-R15] <--> ALU\n  ALU --> Accum[Accumulator AC]`;
    } else if (lower.includes('hardwired') || lower.includes('control unit')) {
      diagramSource = `flowchart TD\n  IR[Instruction Register] --> Decoder[3x8 Opcode Decoder]\n  SeqCount[4-bit Step Counter] --> TimingDec[Timing Decoder T0-T15]\n  Flags[Status Flags AC/Z/C] --> LogicGates[Control Logic Gates Matrix]\n  Decoder --> LogicGates\n  TimingDec --> LogicGates\n  LogicGates --> ControlSignals[Control Signals: Read, Write, ALU_Add, LD_PC]`;
    } else {
      diagramSource = `graph TD\n  Input[Input / Instruction] --> Process[Processing Unit]\n  Process --> Control[Control Unit]\n  Control --> Output[Output / Register]`;
    }

    return { type: 'diagram', marks, diagramSource };
  }

  // 3. Numerical / Quantitative / Multiplexer calculation detection
  const isNumerical =
    lower.includes('how many') ||
    lower.includes('calculate') ||
    lower.includes('find the value') ||
    lower.includes('determine the') ||
    lower.includes('multiplexers of 16:1') ||
    lower.includes('multiplexers') ||
    lower.includes('registers, each containing') ||
    lower.includes('clock frequency') ||
    lower.includes('cpi') ||
    lower.includes('mips') ||
    lower.includes('address lines') ||
    lower.includes('memory capacity') ||
    lower.includes('solve for') ||
    lower.includes('bandwidth');

  if (isNumerical) {
    return { type: 'numerical', marks };
  }

  // 4. SQL / Database Query Detection
  const isSql =
    lower.includes('select ') ||
    lower.includes('create table') ||
    lower.includes('insert into') ||
    lower.includes('from salesmen') ||
    lower.includes('from customers') ||
    lower.includes('from employee') ||
    lower.includes('show databases') ||
    lower.includes('use statement') ||
    lower.includes('primary key') && (lower.includes('table') || lower.includes('foreign key')) ||
    lower.includes('like keyword') ||
    (lower.includes('sql') && (lower.includes('query') || lower.includes('queries')));

  if (isSql) {
    type = 'sql';
    codeLanguage = 'sql';
    const sqlMatch = chunk.match(
      /(SELECT\s+[\s\S]+?;|CREATE\s+TABLE[\s\S]+?;|INSERT\s+INTO[\s\S]+?;|SHOW\s+DATABASES;|USE\s+[a-zA-Z0-9_]+;)/i
    );
    if (sqlMatch) {
      codeSnippet = sqlMatch[1].trim();
    }
    return { type: 'sql', codeLanguage: 'sql', codeSnippet, marks };
  }

  // 5. General Code / Programming Detection
  const isCode =
    lower.includes('write a program') ||
    lower.includes('write code') ||
    lower.includes('write a c ') ||
    lower.includes('write a python') ||
    lower.includes('implement in') ||
    lower.includes('write a function') ||
    lower.includes('algorithm for') ||
    lower.includes('binary search') ||
    lower.includes('quicksort') ||
    lower.includes('linked list');

  if (isCode) {
    type = 'code';
    if (lower.includes('python')) codeLanguage = 'python';
    else if (lower.includes('c++') || lower.includes('cpp')) codeLanguage = 'cpp';
    else if (lower.includes('java ') || lower.includes('java\n') || lower.includes('in java')) codeLanguage = 'java';
    else if (lower.includes(' c ') || lower.includes('in c\n') || lower.includes('in c.')) codeLanguage = 'c';
    else codeLanguage = 'python';

    return { type: 'code', codeLanguage, marks };
  }

  // 6. Default: Theory
  return { type: 'theory', marks };
}

/**
 * Main parser: Extracts questions from raw text without mixing header metadata.
 * Keeps multi-line questions (such as Q6 multiplexer problems) intact.
 */
export function parseQuestionsFromText(rawText: string): ParsedQuestion[] {
  if (!rawText.trim()) return [];

  // 1. Separate metadata preamble from question body
  const { questionsText } = extractMetadataFromText(rawText);

  // 2. Question Regex Header matching:
  // Q1., Q.1, Q1:, Question 1:, Problem 1:, 1., 1), [1], 1-
  const questionHeaderRegex =
    /(?:^|\n)\s*(Q(?:uestion)?\s*\.?\s*\d+[a-z]?[\.:\)\-]?|Problem\s*\d+[\.:\)\-]?|\[\s*\d+\s*\]|\d+[\.:\)\-]|[•\-\*—]\s*Q?\d*|[•\-\*—]|\(\d+\))\s+/gi;

  const matches: { index: number; label: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = questionHeaderRegex.exec(questionsText)) !== null) {
    const label = match[1].trim();
    const labelPos = match.index + match[0].indexOf(match[1]);
    matches.push({
      index: labelPos,
      label,
    });
  }

  // If no numbered headers detected, fallback to paragraph or clean line splitting
  if (matches.length === 0) {
    const lines = questionsText
      .split(/\r?\n/)
      .map((l) => l.trim().replace(/^[•\-\*—]\s*/, ''))
      .filter((l) => l.length > 5);

    if (lines.length > 1) {
      return lines.map((line, idx) => {
        const meta = detectQuestionType(line);
        return {
          id: `q-${idx + 1}`,
          numberLabel: `Q${idx + 1}`,
          text: line,
          type: meta.type,
          marks: meta.marks,
          codeLanguage: meta.codeLanguage,
          codeSnippet: meta.codeSnippet,
          diagramSource: meta.diagramSource,
          answer: '',
          explanation: '',
        };
      });
    }

    const paragraphs = questionsText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 5);

    return paragraphs.map((para, idx) => {
      const meta = detectQuestionType(para);
      return {
        id: `q-${idx + 1}`,
        numberLabel: `Q${idx + 1}`,
        text: para,
        type: meta.type,
        marks: meta.marks,
        codeLanguage: meta.codeLanguage,
        codeSnippet: meta.codeSnippet,
        diagramSource: meta.diagramSource,
        answer: '',
        explanation: '',
      };
    });
  }

  const questions: ParsedQuestion[] = [];

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const startIndex = current.index;
    const endIndex = i < matches.length - 1 ? matches[i + 1].index : questionsText.length;

    // Full question chunk including multi-line wraps
    let fullChunk = questionsText.slice(startIndex, endIndex).trim();

    // Strip the number header from question text
    let textWithoutLabel = fullChunk;
    if (fullChunk.startsWith(current.label)) {
      textWithoutLabel = fullChunk.slice(current.label.length).trim();
    } else {
      textWithoutLabel = fullChunk.replace(current.label, '').trim();
    }

    // Clean up single internal line breaks in the question text into spaces
    const cleanQuestionText = textWithoutLabel.replace(/\r?\n\s*/g, ' ').trim();

    const meta = detectQuestionType(fullChunk);

    questions.push({
      id: `q-${i + 1}`,
      numberLabel: current.label,
      text: cleanQuestionText || fullChunk,
      type: meta.type,
      marks: meta.marks,
      answer: '',
      codeLanguage: meta.codeLanguage,
      codeSnippet: meta.codeSnippet,
      diagramSource: meta.diagramSource,
      explanation: '',
    });
  }

  return questions;
}
