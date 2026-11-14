import { describe, it, expect } from 'vitest';
import { getCapabilities } from '../lib/capabilities';
import { parseQuestionsFromText } from '../lib/solver/question-parser';
import { runJavaScriptInBrowser } from '../lib/code/browser-runner';

describe('Zero-Config Mode Requirements', () => {
  it('getCapabilities returns booleans only and never throws on empty env', () => {
    const caps = getCapabilities();

    expect(typeof caps.database).toBe('boolean');
    expect(typeof caps.auth).toBe('boolean');
    expect(typeof caps.ai).toBe('boolean');
    expect(typeof caps.codeExecution).toBe('boolean');
    expect(typeof caps.payments).toBe('boolean');

    // Without remote production keys configured, all should cleanly evaluate to boolean false
    expect(caps.database).toBe(false);
    expect(caps.auth).toBe(false);
  });

  it('In-browser question parser extracts questions using regex patterns', () => {
    const rawAssignment = `
Q1. Explain the difference between stack and heap memory in C++. [5 marks]

Q2. What is the time complexity of quicksort in the worst case?

3) Given an array of integers, write an algorithm to find the maximum subarray sum.
`;

    const questions = parseQuestionsFromText(rawAssignment);

    expect(questions.length).toBe(3);
    expect(questions[0].numberLabel).toBe('Q1.');
    expect(questions[0].marks).toBe(5);
    expect(questions[1].numberLabel).toBe('Q2.');
    expect(questions[2].numberLabel).toBe('3)');
  });

  it('Manual question parser handles unformatted free text by paragraph splitting', () => {
    const unformattedText = `This is the first problem statement asking for a detailed mathematical proof of Cauchy-Schwarz inequality.

This is the second problem asking for an evaluation of thermodynamic entropy in an isolated system.`;

    const questions = parseQuestionsFromText(unformattedText);

    expect(questions.length).toBe(2);
    expect(questions[0].numberLabel).toBe('Q1');
    expect(questions[1].numberLabel).toBe('Q2');
  });
});
