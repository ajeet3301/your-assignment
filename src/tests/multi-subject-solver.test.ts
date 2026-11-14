import { describe, it, expect } from 'vitest';
import {
  parseQuestionsFromText,
  extractMetadataFromText,
  detectQuestionType,
} from '../lib/solver/question-parser';

describe('Multi-Subject Assignment Solver Suite', () => {
  const SAMPLE_COA_SHEET = `
Computer Organization and Architecture
Course Code: CSE207 Course Credits: 3
Assignment - 2
Unit-3
Q1. Design a basic data path for a simple processor and explain its working.
Q2. Explain how the control unit generates control signals during instruction execution.
Q3. Explain the complete instruction cycle with a flowchart. Explain the timing sequence of the fetch-decode execute cycle.
Q4. Explain the working of a Hardwired Control Unit with a block diagram.
Q5. Explain the Micro-programmed Control Unit and its organization.
Q6. A processor has 16 registers, each containing 16 bits. How many multiplexers of 16:1 are required to select one bit position from all registers for a 16-bit register transfer?
  `.trim();

  it('correctly extracts metadata (subject, courseCode, assignmentNumber) from sheet preamble', () => {
    const { metadata, questionsText } = extractMetadataFromText(SAMPLE_COA_SHEET);

    expect(metadata.subject).toBe('Computer Organization and Architecture');
    expect(metadata.courseCode).toBe('CSE207');
    expect(metadata.credits).toBe('3');
    expect(metadata.assignmentNumber).toBe('2');
    expect(metadata.unit).toBe('Unit-3');
    expect(metadata.assignmentTitle).toContain('COMPUTER ORGANIZATION AND ARCHITECTURE ASSIGNMENT 2');
    expect(questionsText.startsWith('Q1.')).toBe(true);
  });

  it('parses all 6 questions from COA sheet and keeps multi-line text attached to Q6', () => {
    const questions = parseQuestionsFromText(SAMPLE_COA_SHEET);

    expect(questions).toHaveLength(6);
    expect(questions[0].numberLabel).toBe('Q1.');
    expect(questions[0].text).toBe('Design a basic data path for a simple processor and explain its working.');

    expect(questions[5].numberLabel).toBe('Q6.');
    expect(questions[5].text).toContain('16 registers, each containing 16 bits');
    expect(questions[5].text).toContain('multiplexers of 16:1');
    expect(questions[5].text).toContain('16-bit register transfer?');
  });

  it('detects correct question types for COA assignments without any SQL false-positives', () => {
    const questions = parseQuestionsFromText(SAMPLE_COA_SHEET);

    // Q1: data path -> diagram
    expect(questions[0].type).toBe('diagram');
    expect(questions[0].diagramSource).toBeDefined();

    // Q2: control unit signals -> theory
    expect(questions[1].type).toBe('theory');

    // Q3: flowchart -> diagram
    expect(questions[2].type).toBe('diagram');
    expect(questions[2].diagramSource).toContain('flowchart TD');

    // Q4: block diagram -> diagram
    expect(questions[3].type).toBe('diagram');

    // Q5: micro-programmed control unit -> theory
    expect(questions[4].type).toBe('theory');

    // Q6: multiplexer calculation -> numerical
    expect(questions[5].type).toBe('numerical');

    // None should be SQL
    questions.forEach((q) => {
      expect(q.type).not.toBe('sql');
      expect(q.codeSnippet).toBeUndefined();
    });
  });

  it('detects SQL questions correctly for DBMS sheets and does not flag non-SQL', () => {
    const dbmsSheet = `
1. Create table SALESMEN with SID as primary key.
2. SELECT * FROM SALESMEN WHERE CITY = 'Paris';
3. Explain 3NF normalization with an example.
    `.trim();

    const questions = parseQuestionsFromText(dbmsSheet);
    expect(questions).toHaveLength(3);
    expect(questions[0].type).toBe('sql');
    expect(questions[1].type).toBe('sql');
    expect(questions[2].type).toBe('theory');
  });

  it('detects MCQ questions with options', () => {
    const mcqSheet = `
Q1. Which of the following registers holds the address of the next instruction?
(A) Program Counter
(B) Instruction Register
(C) Memory Buffer Register
(D) Accumulator
    `.trim();

    const questions = parseQuestionsFromText(mcqSheet);
    expect(questions).toHaveLength(1);
    expect(questions[0].type).toBe('mcq');
  });
});
