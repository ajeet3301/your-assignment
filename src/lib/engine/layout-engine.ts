import { EngineSettings, PageLayout, MeasuredLine, A4_WIDTH_MM, A4_HEIGHT_MM } from './types';
import { getRulingMetrics } from './paper-ruling';

export interface LayoutOptions {
  canvasWidth: number;
  canvasHeight: number;
  settings: EngineSettings;
}

/**
 * Calculates page-by-page layout with baseline grid snapping and line wrapping.
 */
export function calculateDocumentLayout(
  rawText: string,
  options: LayoutOptions,
  measureTextFn?: (text: string, font: string) => number
): PageLayout[] {
  const { canvasWidth, canvasHeight, settings } = options;
  const scaleX = canvasWidth / A4_WIDTH_MM;
  const scaleY = canvasHeight / A4_HEIGHT_MM;

  const leftMarginPx = settings.margins.left * scaleX;
  const rightMarginPx = settings.margins.right * scaleX;
  const usableWidth = canvasWidth - leftMarginPx - rightMarginPx;

  const ruling = getRulingMetrics(canvasWidth, canvasHeight, settings.paperStyle, settings.margins);

  // Line spacing in px: If ruled, snap to ruling. If plain, compute from fontSize & multiplier
  const lineSpacingPx =
    settings.paperStyle !== 'plain'
      ? ruling.lineSpacingPx
      : settings.fontSize * 1.6 * (canvasWidth / 800);

  const startY = ruling.firstLineY;
  const maxY = canvasHeight - settings.margins.bottom * scaleY;

  // Split content into blocks / paragraphs
  const rawParagraphs = rawText.split('\n');
  const pages: PageLayout[] = [];

  let currentPageIndex = 0;
  let currentLines: MeasuredLine[] = [];
  let currentY = startY;

  // Approximate character width if measureTextFn is not provided
  const estimateCharWidth = (fontSizePx: number) => fontSizePx * 0.48;

  for (let pIdx = 0; pIdx < rawParagraphs.length; pIdx++) {
    const paragraph = rawParagraphs[pIdx];

    // Check if line is a heading
    let isHeading = false;
    let headingLevel = 0;
    let textToWrap = paragraph;

    if (paragraph.startsWith('### ')) {
      isHeading = true;
      headingLevel = 3;
      textToWrap = paragraph.slice(4);
    } else if (paragraph.startsWith('## ')) {
      isHeading = true;
      headingLevel = 2;
      textToWrap = paragraph.slice(3);
    } else if (paragraph.startsWith('# ')) {
      isHeading = true;
      headingLevel = 1;
      textToWrap = paragraph.slice(2);
    }

    const currentFontSize = isHeading
      ? settings.fontSize * (headingLevel === 1 ? 1.4 : headingLevel === 2 ? 1.25 : 1.15)
      : settings.fontSize;
    const fontSizePx = currentFontSize * (canvasWidth / 800);

    // Empty paragraph represents a blank line
    if (textToWrap.trim() === '') {
      currentY += lineSpacingPx * 0.7;
      if (currentY > maxY) {
        pages.push({ pageIndex: currentPageIndex, lines: currentLines });
        currentPageIndex++;
        currentLines = [];
        currentY = startY;
      }
      continue;
    }

    // Wrap words into lines
    const words = textToWrap.split(' ');
    let currentLineWords: string[] = [];
    let currentLineWidth = 0;

    const getWordWidth = (word: string) => {
      if (measureTextFn) {
        return measureTextFn(word, `${fontSizePx}px ${settings.fontFamily}`);
      }
      return word.length * estimateCharWidth(fontSizePx);
    };

    const spaceWidth = getWordWidth(' ');

    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      const wordWidth = getWordWidth(word);

      if (currentLineWidth + wordWidth + (currentLineWords.length > 0 ? spaceWidth : 0) <= usableWidth) {
        currentLineWords.push(word);
        currentLineWidth += wordWidth + (currentLineWords.length > 1 ? spaceWidth : 0);
      } else {
        // Push line
        if (currentLineWords.length > 0) {
          const lineText = currentLineWords.join(' ');
          if (currentY > maxY && currentLines.length > 0) {
            // New page
            pages.push({ pageIndex: currentPageIndex, lines: currentLines });
            currentPageIndex++;
            currentLines = [];
            currentY = startY;
          }

          currentLines.push({
            text: lineText,
            glyphs: [],
            y: currentY,
            height: lineSpacingPx,
            isHeading,
            headingLevel,
          });

          currentY += lineSpacingPx;
        }

        currentLineWords = [word];
        currentLineWidth = wordWidth;
      }
    }

    // Remaining words in paragraph
    if (currentLineWords.length > 0) {
      const lineText = currentLineWords.join(' ');
      if (currentY > maxY && currentLines.length > 0) {
        pages.push({ pageIndex: currentPageIndex, lines: currentLines });
        currentPageIndex++;
        currentLines = [];
        currentY = startY;
      }

      currentLines.push({
        text: lineText,
        glyphs: [],
        y: currentY,
        height: lineSpacingPx,
        isHeading,
        headingLevel,
      });

      currentY += lineSpacingPx;
    }

    // Paragraph spacing
    if (settings.paragraphSpacing > 0) {
      currentY += (settings.paragraphSpacing / 10) * lineSpacingPx * 0.3;
    }
  }

  // Final page
  if (currentLines.length > 0 || pages.length === 0) {
    pages.push({ pageIndex: currentPageIndex, lines: currentLines });
  }

  return pages;
}
