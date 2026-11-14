import { describe, it, expect } from 'vitest';
import { checkFontMagicBytes, validateFontFile } from '../lib/engine/font-validator';
import { parseSpans, calculateDocumentLayout } from '../lib/engine/layout-engine';
import { DEFAULT_SETTINGS } from '../lib/store/editor-store';
import { A4_WIDTH_PREVIEW, A4_HEIGHT_PREVIEW } from '../lib/engine/types';
import fs from 'fs';
import path from 'path';

describe('Font and Color System Tests', () => {
  it('checkFontMagicBytes identifies valid TTF/OTF/WOFF headers and rejects corrupt files', () => {
    // TrueType header: 0x00 0x01 0x00 0x00
    const ttfHeader = new Uint8Array([0x00, 0x01, 0x00, 0x00, 0x00, 0x00]);
    expect(checkFontMagicBytes(ttfHeader)).toBe('ttf');

    // OpenType CFF header: 'OTTO' (0x4F, 0x54, 0x54, 0x4F)
    const otfHeader = new Uint8Array([0x4f, 0x54, 0x54, 0x4f, 0x00, 0x00]);
    expect(checkFontMagicBytes(otfHeader)).toBe('otf');

    // WOFF header: 'wOFF' (0x77, 0x4F, 0x46, 0x46)
    const woffHeader = new Uint8Array([0x77, 0x4f, 0x46, 0x46, 0x00, 0x00]);
    expect(checkFontMagicBytes(woffHeader)).toBe('woff');

    // Corrupt / executable header (e.g. 'MZ' 0x4D 0x5A or random binary)
    const exeHeader = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
    expect(checkFontMagicBytes(exeHeader)).toBeNull();

    // Plain text / empty
    const plainText = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
    expect(checkFontMagicBytes(plainText)).toBeNull();
  });

  it('validateFontFile rejects oversized files > 5MB', async () => {
    // Create dummy oversized file
    const bigBlob = new Blob([new Uint8Array(6 * 1024 * 1024)]);
    const bigFile = new File([bigBlob], 'huge-font.ttf', { type: 'font/ttf' });

    const result = await validateFontFile(bigFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum allowed size of 5 MB');
  });

  it('validateFontFile rejects non-font file with misleading extension', async () => {
    // Renamed .exe or corrupt text file
    const fakeFile = new File(['This is definitely not a true font binary'], 'fake.ttf', {
      type: 'font/ttf',
    });

    const result = await validateFontFile(fakeFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Corrupt or non-font file');
  });

  it('parseSpans extracts per-selection color and font overrides', () => {
    const text = 'Normal text with [red alert]{#E5484D} and [cursive word]{font=Caveat} and **bold note**.';
    const spans = parseSpans(text, "'Inter', sans-serif", '#1B3FA0');

    expect(spans.length).toBeGreaterThanOrEqual(4);

    const redSpan = spans.find((s) => s.text === 'red alert');
    expect(redSpan).toBeDefined();
    expect(redSpan?.color).toBe('#E5484D');

    const fontSpan = spans.find((s) => s.text === 'cursive word');
    expect(fontSpan).toBeDefined();
    expect(fontSpan?.fontFamily).toBe('Caveat');

    const boldSpan = spans.find((s) => s.text === 'bold note');
    expect(boldSpan).toBeDefined();
    expect(boldSpan?.isBold).toBe(true);
  });

  it('Mixed fonts and colors paginate correctly without errors', () => {
    const mixedDocument = `
# Engineering Assignment

[Section 1: General Dynamics]{#1B3FA0}
The acceleration of a particle is given by [a(t) = dv/dt]{#15803D font='Kalam', cursive}.
In [polar coordinates]{font='Caveat', cursive}:
a_r = r'' - r(θ')^2

[Section 2: High Temperature Limits]{#E5484D}
At extremely high thermodynamic temperatures, quantum effects converge to classical limits.
    `;

    const pages = calculateDocumentLayout(mixedDocument, {
      canvasWidth: A4_WIDTH_PREVIEW,
      canvasHeight: A4_HEIGHT_PREVIEW,
      settings: DEFAULT_SETTINGS,
    });

    expect(pages.length).toBeGreaterThan(0);
    expect(pages[0].lines.length).toBeGreaterThan(0);

    // Verify lines contain spans with the specified colors and fonts
    const allSpans = pages[0].lines.flatMap((l) => l.spans);
    const hasGreen = allSpans.some((s) => s.color === '#15803D');
    const hasRed = allSpans.some((s) => s.color === '#E5484D');
    expect(hasGreen || hasRed).toBe(true);
  });

  it('fonts.json manifest is strictly valid and contains required license and author info', () => {
    const manifestPath = path.join(process.cwd(), 'public', 'fonts', 'fonts.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const fonts = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(Array.isArray(fonts)).toBe(true);
    expect(fonts.length).toBeGreaterThanOrEqual(40);

    for (const font of fonts) {
      expect(font.id).toBeDefined();
      expect(font.name).toBeDefined();
      expect(font.author).toBeDefined();
      expect(font.author.trim().length).toBeGreaterThan(0);
      expect(font.license).toBeDefined();
      expect(font.license.trim().length).toBeGreaterThan(0);
      expect(font.licenseUrl).toBeDefined();
      expect(font.licenseUrl.trim().length).toBeGreaterThan(0);
    }
  });

  it('headingColor correctly applies to headings while body text retains inkColor', () => {
    const docWithHeadings = `# Main Assignment Title\n## Section 1\nThis is normal body text.`;
    const settingsWithHeadingColor = {
      ...DEFAULT_SETTINGS,
      inkColor: '#1B3FA0',
      headingColor: '#E5484D',
    };

    const pages = calculateDocumentLayout(docWithHeadings, {
      canvasWidth: A4_WIDTH_PREVIEW,
      canvasHeight: A4_HEIGHT_PREVIEW,
      settings: settingsWithHeadingColor,
    });

    expect(pages.length).toBeGreaterThan(0);
    const headingLines = pages[0].lines.filter((l) => l.isHeading);
    const bodyLines = pages[0].lines.filter((l) => !l.isHeading && !l.isImage);

    expect(headingLines.length).toBeGreaterThanOrEqual(2);
    expect(bodyLines.length).toBeGreaterThanOrEqual(1);

    // Heading lines should use headingColor
    expect(headingLines[0].spans[0].color).toBe('#E5484D');
    // Body lines should use inkColor
    expect(bodyLines[0].spans[0].color).toBe('#1B3FA0');
  });

  it('layout engine parses embedded terminal screenshot markdown into isImage line', () => {
    const docWithScreenshot = `Problem Statement\n\n![Terminal Output](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==)\n\nConclusion`;
    const pages = calculateDocumentLayout(docWithScreenshot, {
      canvasWidth: A4_WIDTH_PREVIEW,
      canvasHeight: A4_HEIGHT_PREVIEW,
      settings: DEFAULT_SETTINGS,
    });

    expect(pages.length).toBeGreaterThan(0);
    const imageLine = pages[0].lines.find((l) => l.isImage);
    expect(imageLine).toBeDefined();
    expect(imageLine?.imageUrl).toContain('data:image/png;base64');
    expect(imageLine?.height).toBeGreaterThan(50);
  });
});
