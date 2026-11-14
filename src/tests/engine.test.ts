import { describe, it, expect } from 'vitest';
import { PRNG } from '../lib/engine/prng';
import { calculateDocumentLayout } from '../lib/engine/layout-engine';
import { EngineSettings, A4_WIDTH_PREVIEW, A4_HEIGHT_PREVIEW } from '../lib/engine/types';

describe('Handwriting Engine Unit Tests', () => {
  it('PRNG is strictly deterministic with the same seed', () => {
    const prng1 = new PRNG(42);
    const prng2 = new PRNG(42);

    const sequence1 = Array.from({ length: 100 }, () => prng1.next());
    const sequence2 = Array.from({ length: 100 }, () => prng2.next());

    expect(sequence1).toEqual(sequence2);
  });

  it('PRNG produces different sequences for different seeds', () => {
    const prngA = new PRNG(101);
    const prngB = new PRNG(202);

    expect(prngA.next()).not.toEqual(prngB.next());
  });

  it('PRNG gaussian distribution produces values within bounds', () => {
    const prng = new PRNG(999);
    const values = Array.from({ length: 500 }, () => prng.gaussian(0, 1));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    expect(Math.abs(mean)).toBeLessThan(0.15);
  });

  it('Layout engine wraps text into lines and starts new pages when height exceeds bounds', () => {
    const defaultSettings: EngineSettings = {
      fontFamily: "'Caveat', cursive",
      fontSize: 18,
      lineSpacing: 1.5,
      letterSpacing: 0,
      wordSpacing: 0,
      paragraphSpacing: 4,
      slant: 0,
      inkColor: '#1B3FA0',
      penType: 'ballpoint',
      paperStyle: 'ruled-medium',
      paperColor: '#FBF7EE',
      margins: { top: 20, bottom: 20, left: 25, right: 20 },
      pageNumbering: 'bottom-right',
      seed: 42,
      fatigue: true,
      paperTexture: true,
      phoneScanLook: false,
      fontWeight: 400,
      inkVariation: 25,
      baselineWobble: 35,
      spacingIrregularity: 25,
      rotationJitter: 30,
    };

    // Generate a long text with multiple paragraphs
    const longText = Array.from(
      { length: 50 },
      (_, i) => `Paragraph ${i + 1}: The quick brown fox jumps over the lazy dog repeatedly to test multi-page pagination.`
    ).join('\n\n');

    const pages = calculateDocumentLayout(longText, {
      canvasWidth: A4_WIDTH_PREVIEW,
      canvasHeight: A4_HEIGHT_PREVIEW,
      settings: defaultSettings,
    });

    // Should create more than 1 page
    expect(pages.length).toBeGreaterThan(1);
    expect(pages[0].lines.length).toBeGreaterThan(0);
    expect(pages[1].lines.length).toBeGreaterThan(0);
  });
});
