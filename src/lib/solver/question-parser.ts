/**
 * Deterministic In-Browser Question Extractor
 * Extracts questions using regex patterns (e.g. Q1., 1., Question 1:, (a), (i))
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

export function parseQuestionsFromText(rawText: string): ParsedQuestion[] {
  if (!rawText.trim()) return [];

  // Question regex patterns matching:
  // "Q1.", "Q1:", "Question 1:", "Problem 1:", "1.", "1)", "[1]"
  const questionHeaderRegex =
    /(?:^|\n)\s*(Q(?:uestion)?\s*\d+[a-z]?[\.:\)]?|Problem\s*\d+[\.:\)]?|\d+[\.:\)])\s+/gi;

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

  // If no numbered headers detected, split by double newlines into distinct items
  if (matches.length === 0) {
    const paragraphs = rawText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 10);

    return paragraphs.map((para, idx) => ({
      id: `q-${idx + 1}`,
      numberLabel: `Q${idx + 1}`,
      text: para,
      type: 'theory',
      answer: '',
    }));
  }

  const questions: ParsedQuestion[] = [];

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const startIndex = current.index;
    const endIndex = i < matches.length - 1 ? matches[i + 1].index : rawText.length;

    let fullChunk = rawText.slice(startIndex, endIndex).trim();
    // Strip header from text
    const textWithoutLabel = fullChunk.replace(current.label, '').trim();

    // Marks detection e.g. [5 marks], (10 pts)
    const marksMatch = fullChunk.match(/\[(\d+)\s*(?:marks?|pts?|points?)\]|\((\d+)\s*(?:marks?|pts?)\)/i);
    const marks = marksMatch ? parseInt(marksMatch[1] || marksMatch[2], 10) : undefined;

    // Type detection heuristic
    let detectedType = 'theory';
    let codeLanguage: string | undefined = undefined;
    let codeSnippet: string | undefined = undefined;
    const lower = fullChunk.toLowerCase();

    if (
      lower.includes('select ') ||
      lower.includes('create table') ||
      lower.includes('insert into') ||
      lower.includes('database') ||
      lower.includes('sql') ||
      lower.includes('mysql')
    ) {
      detectedType = 'sql';
      codeLanguage = 'sql';
      const sqlMatch = fullChunk.match(
        /(SELECT\s+[\s\S]+?;|CREATE\s+TABLE[\s\S]+?;|INSERT\s+INTO[\s\S]+?;|SHOW\s+DATABASES;|USE\s+[a-zA-Z0-9_]+;)/i
      );
      if (sqlMatch) {
        codeSnippet = sqlMatch[1].trim();
      }
    } else if (
      lower.includes('code') ||
      lower.includes('program') ||
      lower.includes('algorithm') ||
      lower.includes('function')
    ) {
      detectedType = 'programming';
      codeLanguage = lower.includes('python') ? 'python' : 'javascript';
    } else if (
      lower.includes('calculate') ||
      lower.includes('derive') ||
      lower.includes('prove') ||
      lower.includes('solve for')
    ) {
      detectedType = 'numerical';
    }

    questions.push({
      id: `q-${i + 1}`,
      numberLabel: current.label,
      text: textWithoutLabel || fullChunk,
      type: detectedType,
      marks,
      answer: '',
      codeLanguage,
      codeSnippet,
    });
  }

  return questions;
}
