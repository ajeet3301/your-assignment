import { EngineSettings, PageLayout, MeasuredLine, TextSpan, A4_WIDTH_MM, A4_HEIGHT_MM } from './types';
import { getRulingMetrics } from './paper-ruling';
import { resolveImageUrl } from './image-registry';

export interface LayoutOptions {
  canvasWidth: number;
  canvasHeight: number;
  settings: EngineSettings;
}

/**
 * Parses markdown inline styling, per-selection colors, and font overrides.
 * Supports:
 * - [colored text]{#E5484D} or [text]{color=#15803D}
 * - [font override]{font='Caveat', cursive}
 * - **bold text**
 */
export function parseSpans(
  text: string,
  defaultFont: string,
  defaultColor: string
): TextSpan[] {
  const spans: TextSpan[] = [];
  // Matches:
  // 1. [content]{attrs}
  // 2. **bold**
  const regex = /\[([^\]]+)\]\{([^}]+)\}|\*\*([^*]+)\*\*/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      spans.push({
        text: text.slice(lastIndex, match.index),
        fontFamily: defaultFont,
        color: defaultColor,
        isBold: false,
      });
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      // Attribute span: [text]{attrs}
      const spanContent = match[1];
      const rawAttrs = match[2].trim();

      let spanColor = defaultColor;
      let spanFont = defaultFont;

      if (rawAttrs.startsWith('#')) {
        spanColor = rawAttrs;
      } else {
        const colorMatch = rawAttrs.match(/color\s*=\s*['"]?([#a-zA-Z0-9]+)['"]?/i);
        if (colorMatch) spanColor = colorMatch[1];

        const fontMatch = rawAttrs.match(/font\s*=\s*['"]?([^'"]+)['"]?/i);
        if (fontMatch) spanFont = fontMatch[1];
      }

      spans.push({
        text: spanContent,
        fontFamily: spanFont,
        color: spanColor,
        isBold: false,
      });
    } else if (match[3] !== undefined) {
      // Bold span: **text**
      spans.push({
        text: match[3],
        fontFamily: defaultFont,
        color: defaultColor,
        isBold: true,
      });
    }

    lastIndex = regex.lastIndex;
  }

  // Trailing text
  if (lastIndex < text.length) {
    spans.push({
      text: text.slice(lastIndex),
      fontFamily: defaultFont,
      color: defaultColor,
      isBold: false,
    });
  }

  return spans.length > 0
    ? spans
    : [{ text, fontFamily: defaultFont, color: defaultColor, isBold: false }];
}

/**
 * Calculates page-by-page layout with baseline grid snapping, mixed fonts, and colors.
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

  const rawParagraphs = rawText.split('\n');
  const pages: PageLayout[] = [];

  let currentPageIndex = 0;
  let currentLines: MeasuredLine[] = [];
  let currentY = startY;

  const estimateCharWidth = (fontSizePx: number) => fontSizePx * 0.48;

  for (let pIdx = 0; pIdx < rawParagraphs.length; pIdx++) {
    const paragraph = rawParagraphs[pIdx];

    // Image Block Check: ![alt](url) or loose data:image URL
    const imageMatch = paragraph.trim().match(/^!\[([^\]]*)\]\((.+)\)$/);
    const looseDataUrlMatch = !imageMatch && paragraph.trim().startsWith('data:image/')
      ? paragraph.trim().match(/^(data:image\/[a-zA-Z0-9+]+;base64,[A-Za-z0-9+/=]+)$/)
      : null;

    if (imageMatch || looseDataUrlMatch) {
      const rawUrl = imageMatch ? imageMatch[2] : looseDataUrlMatch![1];
      const resolvedUrl = resolveImageUrl(rawUrl);
      const imgWidth = Math.min(usableWidth, 620 * (canvasWidth / 800));
      const imgHeight = Math.round(imgWidth * 0.48);

      if (currentY + imgHeight > maxY && currentLines.length > 0) {
        pages.push({ pageIndex: currentPageIndex, lines: currentLines });
        currentPageIndex++;
        currentLines = [];
        currentY = startY;
      }

      currentLines.push({
        text: paragraph.trim(),
        spans: [],
        glyphs: [],
        y: currentY,
        height: imgHeight,
        isImage: true,
        imageUrl: resolvedUrl,
        imageWidth: imgWidth,
        imageHeight: imgHeight,
      });

      currentY += imgHeight + lineSpacingPx;
      continue;
    }

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

    // Empty paragraph
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

    const defaultInk = isHeading && settings.headingColor ? settings.headingColor : settings.inkColor;
    const spans = parseSpans(textToWrap, settings.fontFamily, defaultInk);

    // Flatten spans into word tokens with their respective styling
    interface StyledWord {
      word: string;
      fontFamily: string;
      color: string;
      isBold: boolean;
      width: number;
    }

    const styledWords: StyledWord[] = [];

    spans.forEach((span) => {
      const words = span.text.split(' ');
      words.forEach((w) => {
        if (!w && words.length > 1) return;
        const fontStyle = `${span.isBold || settings.fontWeight > 500 ? '600' : '400'} ${fontSizePx}px ${span.fontFamily || settings.fontFamily}`;
        const width = measureTextFn
          ? measureTextFn(w, fontStyle)
          : w.length * estimateCharWidth(fontSizePx);

        styledWords.push({
          word: w,
          fontFamily: span.fontFamily || settings.fontFamily,
          color: span.color || defaultInk,
          isBold: span.isBold || false,
          width,
        });
      });
    });

    const spaceWidth = estimateCharWidth(fontSizePx) * 0.9;
    let currentLineWords: StyledWord[] = [];
    let currentLineWidth = 0;

    const commitLine = () => {
      if (currentLineWords.length === 0) return;

      if (currentY > maxY && currentLines.length > 0) {
        pages.push({ pageIndex: currentPageIndex, lines: currentLines });
        currentPageIndex++;
        currentLines = [];
        currentY = startY;
      }

      // Reconstruct spans for this specific line
      const lineSpans: TextSpan[] = [];
      let activeSpan: TextSpan | null = null;

      currentLineWords.forEach((sw, idx) => {
        if (
          activeSpan &&
          activeSpan.fontFamily === sw.fontFamily &&
          activeSpan.color === sw.color &&
          activeSpan.isBold === sw.isBold
        ) {
          activeSpan.text += ' ' + sw.word;
        } else {
          if (activeSpan) lineSpans.push(activeSpan);
          activeSpan = {
            text: sw.word,
            fontFamily: sw.fontFamily,
            color: sw.color,
            isBold: sw.isBold,
          };
        }
      });
      if (activeSpan) lineSpans.push(activeSpan);

      currentLines.push({
        text: currentLineWords.map((sw) => sw.word).join(' '),
        spans: lineSpans,
        glyphs: [],
        y: currentY,
        height: lineSpacingPx,
        isHeading,
        headingLevel,
      });

      currentY += lineSpacingPx;
      currentLineWords = [];
      currentLineWidth = 0;
    };

    for (let i = 0; i < styledWords.length; i++) {
      const sw = styledWords[i];
      const wordPlusSpace = currentLineWidth > 0 ? spaceWidth + sw.width : sw.width;

      if (currentLineWidth + wordPlusSpace <= usableWidth || currentLineWords.length === 0) {
        currentLineWords.push(sw);
        currentLineWidth += wordPlusSpace;
      } else {
        commitLine();
        currentLineWords.push(sw);
        currentLineWidth = sw.width;
      }
    }

    commitLine();

    // Paragraph spacing
    if (settings.paragraphSpacing > 0) {
      currentY += (settings.paragraphSpacing / 10) * lineSpacingPx * 0.3;
    }
  }

  if (currentLines.length > 0 || pages.length === 0) {
    pages.push({ pageIndex: currentPageIndex, lines: currentLines });
  }

  return pages;
}
