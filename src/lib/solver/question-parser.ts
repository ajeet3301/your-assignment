/**
 * Deterministic In-Browser Question Extractor
 * Extracts questions using regex patterns (e.g. Q1., 1., Question 1:, (a), (i), bullets, newlines)
 */

export interface ParsedQuestion {
  id: string;
  numberLabel: string;
  sectionTitle?: string;
  text: string;
  type: string;
  marks?: number;
  answer?: string;
  codeSnippet?: string;
  codeLanguage?: string;
  outputScreenshotDataUrl?: string;
  outputText?: string;
  tableData?: {
    headers: string[];
    rows: (string | number)[][];
    caption?: string;
  };
  explanation?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  isExecuted?: boolean;
}

export function detectQuestionType(chunk: string): {
  type: string;
  codeLanguage?: string;
  codeSnippet?: string;
  marks?: number;
} {
  const lower = chunk.toLowerCase();
  const marksMatch = chunk.match(/\[(\d+)\s*(?:marks?|pts?|points?)\]|\((\d+)\s*(?:marks?|pts?)\)/i);
  const marks = marksMatch ? parseInt(marksMatch[1] || marksMatch[2], 10) : undefined;

  let type = 'theory';
  let codeLanguage: string | undefined = undefined;
  let codeSnippet: string | undefined = undefined;

  if (
    lower.includes('select ') ||
    lower.includes('create table') ||
    lower.includes('insert into') ||
    lower.includes('database') ||
    lower.includes('sql') ||
    lower.includes('mysql') ||
    lower.includes('dbms')
  ) {
    type = 'sql';
    codeLanguage = 'sql';
    const sqlMatch = chunk.match(
      /(SELECT\s+[\s\S]+?;|CREATE\s+TABLE[\s\S]+?;|INSERT\s+INTO[\s\S]+?;|SHOW\s+DATABASES;|USE\s+[a-zA-Z0-9_]+;)/i
    );
    if (sqlMatch) {
      codeSnippet = sqlMatch[1].trim();
    }
  } else if (
    lower.includes('code') ||
    lower.includes('program') ||
    lower.includes('algorithm') ||
    lower.includes('function') ||
    lower.includes('class') ||
    lower.includes('implement')
  ) {
    type = 'programming';
    if (lower.includes('python')) codeLanguage = 'python';
    else if (lower.includes('c++') || lower.includes('cpp')) codeLanguage = 'cpp';
    else if (lower.includes('java ') || lower.includes('java\n') || lower.includes('in java')) codeLanguage = 'java';
    else if (lower.includes(' c ') || lower.includes('in c\n') || lower.includes('in c.')) codeLanguage = 'c';
    else codeLanguage = 'python';
  } else if (
    lower.includes('calculate') ||
    lower.includes('derive') ||
    lower.includes('prove') ||
    lower.includes('solve for')
  ) {
    type = 'numerical';
  }

  return { type, codeLanguage, codeSnippet, marks };
}

export function parseQuestionsFromText(rawText: string): ParsedQuestion[] {
  if (!rawText.trim()) return [];

  // Question regex patterns matching:
  // "Q1.", "Q1:", "Question 1:", "Problem 1:", "1.", "1)", "[1]", "1-", "• ", "- "
  const questionHeaderRegex =
    /(?:^|\n)\s*(Q(?:uestion)?\s*\d+[a-z]?[\.:\)\-]?|Problem\s*\d+[\.:\)\-]?|\[\s*\d+\s*\]|\d+[\.:\)\-]|[•\-\*—]\s*Q?\d*|[•\-\*—]|\(\d+\))\s+/gi;

  const matches: { index: number; label: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = questionHeaderRegex.exec(rawText)) !== null) {
    const label = match[1].trim();
    const labelPos = match.index + match[0].indexOf(match[1]);
    matches.push({
      index: labelPos,
      label,
    });
  }

  // If no numbered headers detected, split by newlines or paragraphs into distinct items
  if (matches.length === 0) {
    const lines = rawText
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
          answer: '',
        };
      });
    }

    const paragraphs = rawText
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
        answer: '',
      };
    });
  }

  const questions: ParsedQuestion[] = [];

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const startIndex = current.index;
    const endIndex = i < matches.length - 1 ? matches[i + 1].index : rawText.length;

    let fullChunk = rawText.slice(startIndex, endIndex).trim();
    // Strip header from text
    let textWithoutLabel = fullChunk;
    if (fullChunk.startsWith(current.label)) {
      textWithoutLabel = fullChunk.slice(current.label.length).trim();
    } else {
      textWithoutLabel = fullChunk.replace(current.label, '').trim();
    }

    const meta = detectQuestionType(fullChunk);

    questions.push({
      id: `q-${i + 1}`,
      numberLabel: current.label,
      text: textWithoutLabel || fullChunk,
      type: meta.type,
      marks: meta.marks,
      answer: '',
      codeLanguage: meta.codeLanguage,
      codeSnippet: meta.codeSnippet,
    });
  }

  return questions;
}
