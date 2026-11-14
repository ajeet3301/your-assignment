import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { getRulingMetrics } from '../lib/engine/paper-ruling';
import { PEN_PROFILES } from '../lib/engine/pen-effects';
import { A4_WIDTH_PREVIEW, A4_HEIGHT_PREVIEW } from '../lib/engine/types';
import { parseQuestionsFromText } from '../lib/solver/question-parser';

describe('Integration & Engine Tests', () => {
  it('Paper ruling metrics snap correctly across styles', () => {
    const margins = { top: 20, bottom: 20, left: 25, right: 20 };

    const mediumMetrics = getRulingMetrics(A4_WIDTH_PREVIEW, A4_HEIGHT_PREVIEW, 'ruled-medium', margins);
    const narrowMetrics = getRulingMetrics(A4_WIDTH_PREVIEW, A4_HEIGHT_PREVIEW, 'ruled-narrow', margins);
    const wideMetrics = getRulingMetrics(A4_WIDTH_PREVIEW, A4_HEIGHT_PREVIEW, 'ruled-wide', margins);

    // Narrow ruling spacing < Medium spacing < Wide spacing
    expect(narrowMetrics.lineSpacingPx).toBeLessThan(mediumMetrics.lineSpacingPx);
    expect(mediumMetrics.lineSpacingPx).toBeLessThan(wideMetrics.lineSpacingPx);
    expect(mediumMetrics.marginLineX).toBeGreaterThan(0);
  });

  it('All pen profiles define valid stroke, opacity and blend modes', () => {
    const penTypes = ['ballpoint', 'gel', 'fountain', 'pencil', 'marker'] as const;

    for (const type of penTypes) {
      const pen = PEN_PROFILES[type];
      expect(pen).toBeDefined();
      expect(pen.baseOpacity).toBeGreaterThan(0);
      expect(pen.baseOpacity).toBeLessThanOrEqual(1);
      expect(pen.blur).toBeGreaterThanOrEqual(0);
      expect(['multiply', 'source-over']).toContain(pen.blendMode);
    }
  });

  it('PDF generation creates valid A4 PDF documents', async () => {
    const doc = await PDFDocument.create();
    doc.setTitle('Test Assignment');
    const page = doc.addPage([595.28, 841.89]); // A4 points
    expect(page.getWidth()).toBeCloseTo(595.28, 1);
    expect(page.getHeight()).toBeCloseTo(841.89, 1);

    const pdfBytes = await doc.save();
    // Validate PDF magic header '%PDF'
    const header = String.fromCharCode(...pdfBytes.slice(0, 4));
    expect(header).toBe('%PDF');
  });

  it('Question extractor accurately captures sub-questions and marks', () => {
    const complexAssignment = `
    Question 1. Discuss the Heisenberg uncertainty principle ΔxΔp ≥ ℏ/2. [10 marks]
    
    Problem 2: Given f(x) = 3x^2 + 2x - 5, evaluate:
    (a) f'(x)
    (b) The local extrema on interval [-2, 2] [15 points]
    `;

    const questions = parseQuestionsFromText(complexAssignment);
    expect(questions.length).toBe(2);
    expect(questions[0].marks).toBe(10);
    expect(questions[1].marks).toBe(15);
  });
});
