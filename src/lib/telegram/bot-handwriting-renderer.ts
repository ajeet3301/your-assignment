import path from 'path';
import fs from 'fs';
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { PDFDocument } from 'pdf-lib';
import { StudentSubmissionHeader, SolvedQuestionDocItem } from '../docx/docx-generator';

export interface HandwritingRenderOptions {
  header: StudentSubmissionHeader;
  questions: SolvedQuestionDocItem[];
  screenshots?: { label: string; buffer: Buffer }[];
  font?: string; // 'homemade-apple' | 'kalam' | 'patrick-hand' | 'caveat' | 'shadows-into-light'
  inkColor?: string; // 'blue' | 'black' | 'red' | 'green' | hex
  paperStyle?: string; // 'plain' (blank) | 'ruled' | 'margin'
  questionColor?: string; // 'black' | hex
  answerColor?: string; // 'blue' | hex
}

// 150 DPI A4 Dimensions in Pixels (210mm x 297mm)
const A4_WIDTH_150DPI = 1240;
const A4_HEIGHT_150DPI = 1754;

const INK_COLORS: Record<string, string> = {
  blue: '#1A3673', // Rich Royal Blue Ink (Answers)
  black: '#111827', // Pitch Black Ink (Questions & Header)
  red: '#9B1D20',
  green: '#1E5E3A',
};

// Track font registration singleton
let fontsRegistered = false;

function ensureFontsRegistered() {
  if (fontsRegistered) return;
  fontsRegistered = true;

  const fontDefs = [
    { file: 'HomemadeApple-Regular.ttf', alias: 'Homemade Apple' },
    { file: 'Kalam-Regular.ttf', alias: 'Kalam' },
    { file: 'PatrickHand-Regular.ttf', alias: 'Patrick Hand' },
    { file: 'Caveat-Regular.ttf', alias: 'Caveat' },
    { file: 'ShadowsIntoLight-Regular.ttf', alias: 'Shadows Into Light' },
    { file: 'RobotoMono-Regular.ttf', alias: 'TerminalMono' },
    { file: 'Inter-Regular.ttf', alias: 'TerminalHeader' },
  ];

  const fontsDir = path.join(process.cwd(), 'public', 'fonts');

  for (const f of fontDefs) {
    const fullPath = path.join(fontsDir, f.file);
    try {
      if (fs.existsSync(fullPath)) {
        GlobalFonts.registerFromPath(fullPath, f.alias);
      }
    } catch (e) {
      console.warn(`Could not register font ${f.alias} from ${fullPath}:`, e);
    }
  }
}

/**
 * Resolves font family name registered in GlobalFonts
 */
function resolveFontFamily(requested?: string): string {
  const norm = (requested || 'homemade-apple').toLowerCase().trim();
  if (norm.includes('apple') || norm.includes('homemade')) return '"Homemade Apple", cursive, sans-serif';
  if (norm.includes('patrick')) return '"Patrick Hand", sans-serif';
  if (norm.includes('caveat')) return '"Caveat", cursive, sans-serif';
  if (norm.includes('shadow')) return '"Shadows Into Light", cursive, sans-serif';
  if (norm.includes('kalam')) return '"Kalam", cursive, sans-serif';
  return '"Homemade Apple", cursive, sans-serif';
}

/**
 * Resolves ink hex code
 */
function resolveInkColor(color?: string): string {
  const norm = (color || 'blue').toLowerCase().trim();
  return INK_COLORS[norm] || color || INK_COLORS.blue;
}

/**
 * Draws paper background (plain/blank, ruled, or margin)
 */
function drawPaper(
  ctx: any,
  width: number,
  height: number,
  paperStyle: string
) {
  const style = (paperStyle || 'plain').toLowerCase();

  // Pure clean white blank page for 'plain', and natural off-white for 'ruled'/'margin'
  ctx.fillStyle = style === 'plain' || style === 'blank' ? '#FFFFFF' : '#FAF7F0';
  ctx.fillRect(0, 0, width, height);

  const lineSpacing = 36;
  const startY = 120;
  const endY = height - 80;

  if (style === 'ruled' || style === 'margin') {
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(75, 105, 155, 0.22)';

    for (let y = startY; y <= endY; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(width - 40, y);
      ctx.stroke();
    }

    if (style === 'margin') {
      // Red vertical margin line
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(215, 60, 60, 0.38)';
      ctx.beginPath();
      ctx.moveTo(130, 0);
      ctx.lineTo(130, height);
      ctx.stroke();
    }
  }
}

/**
 * Text word wrapping helper with pixel measurement
 */
function wrapText(
  ctx: any,
  text: string,
  maxWidth: number
): string[] {
  const clean = text.replace(/\r\n/g, '\n');
  const rawLines = clean.split('\n');
  const result: string[] = [];

  for (const rawLine of rawLines) {
    if (!rawLine.trim()) {
      result.push('');
      continue;
    }

    const words = rawLine.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        result.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      result.push(currentLine);
    }
  }

  return result;
}

/**
 * Server-safe Handwritten PDF Generator using @napi-rs/canvas and pdf-lib
 * Defaults to:
 * - Font: "Homemade Apple"
 * - Paper: "plain" (blank page)
 * - Question: Black Ink (#111827)
 * - Answer: Royal Blue Ink (#1A3673)
 */
export async function renderServerHandwrittenPdf(
  options: HandwritingRenderOptions
): Promise<Buffer> {
  ensureFontsRegistered();

  const {
    header,
    questions,
    screenshots = [],
    font = 'homemade-apple',
    inkColor = 'blue',
    paperStyle = 'plain',
    questionColor = 'black',
    answerColor,
  } = options;

  const fontFamily = resolveFontFamily(font);
  const questionInk = resolveInkColor(questionColor || 'black');
  const answerInk = resolveInkColor(answerColor || inkColor || 'blue');

  const marginX = paperStyle === 'margin' ? 150 : 80;
  const contentWidth = A4_WIDTH_150DPI - marginX - 80;

  const canvasPages: any[] = [];

  function createNewPage(): { canvas: any; ctx: any; currentY: number } {
    const canvas = createCanvas(A4_WIDTH_150DPI, A4_HEIGHT_150DPI);
    const ctx = canvas.getContext('2d');
    drawPaper(ctx, A4_WIDTH_150DPI, A4_HEIGHT_150DPI, paperStyle);
    canvasPages.push(canvas);
    return { canvas, ctx, currentY: 120 };
  }

  let { ctx, currentY } = createNewPage();

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > A4_HEIGHT_150DPI - 90) {
      const next = createNewPage();
      ctx = next.ctx;
      currentY = next.currentY;
    }
  };

  // 1. Student Header on First Page (In Black)
  ctx.save();
  ctx.font = `bold 28px ${fontFamily}`;
  ctx.fillStyle = questionInk;
  ctx.fillText(header.assignmentTitle.toUpperCase(), marginX, currentY);
  currentY += 38;

  ctx.font = `20px ${fontFamily}`;
  ctx.fillStyle = questionInk;
  const subMeta = `Name: ${header.studentName}    Roll No: ${header.rollNo}    Class: ${header.className}`;
  ctx.fillText(subMeta, marginX, currentY);
  currentY += 30;

  const courseMeta = `Subject: ${header.subject}`;
  ctx.fillText(courseMeta, marginX, currentY);
  currentY += 26;

  // Hand-drawn wavy divider line in Black
  ctx.strokeStyle = questionInk;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(marginX, currentY);
  for (let x = marginX; x <= marginX + contentWidth; x += 20) {
    const yOffset = Math.sin(x * 0.08) * 1.5;
    ctx.lineTo(x, currentY + yOffset);
  }
  ctx.stroke();
  currentY += 38;
  ctx.restore();

  // 2. Render Questions (in Black) & Answers (in Blue)
  for (let qIdx = 0; qIdx < questions.length; qIdx++) {
    const q = questions[qIdx];
    checkPageBreak(120);

    // Question Label & Text (In Black)
    ctx.save();
    ctx.font = `bold 22px ${fontFamily}`;
    ctx.fillStyle = questionInk;
    const labelText = `${q.numberLabel || `Q${qIdx + 1}`}:`;
    ctx.fillText(labelText, marginX, currentY);

    ctx.font = `21px ${fontFamily}`;
    ctx.fillStyle = questionInk;
    const labelMetrics = ctx.measureText(labelText);
    const qIndent = labelMetrics.width + 12;

    const qLines = wrapText(ctx, q.questionText, contentWidth - qIndent);
    for (let l = 0; l < qLines.length; l++) {
      if (l > 0) checkPageBreak(32);
      const xPos = l === 0 ? marginX + qIndent : marginX;
      ctx.fillText(qLines[l], xPos, currentY);
      currentY += 34;
    }
    ctx.restore();
    currentY += 12;

    // Check if question has code snippet
    if (q.codeSnippet && q.codeSnippet.trim()) {
      checkPageBreak(80);
      ctx.save();
      ctx.font = `bold 20px ${fontFamily}`;
      ctx.fillStyle = answerInk;
      const langLabel = q.codeLanguage ? q.codeLanguage.toUpperCase() : 'CODE';
      ctx.fillText(`Program (${langLabel}):`, marginX, currentY);
      currentY += 28;
      ctx.restore();

      const codeLines = q.codeSnippet.trim().split('\n').slice(0, 45);
      const codeLineHeight = 22;
      const boxHeight = codeLines.length * codeLineHeight + 24;
      checkPageBreak(boxHeight + 20);

      ctx.save();
      ctx.fillStyle = 'rgba(245, 248, 252, 0.95)';
      ctx.strokeStyle = 'rgba(30, 58, 138, 0.25)';
      ctx.lineWidth = 1;
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(marginX, currentY, contentWidth, boxHeight, 8);
      } else {
        ctx.rect(marginX, currentY, contentWidth, boxHeight);
      }
      ctx.fill();
      ctx.stroke();

      ctx.font = '14px TerminalMono, Consolas, Monaco, monospace';
      ctx.fillStyle = '#0F172A';
      let codeY = currentY + 20;
      for (let cIdx = 0; cIdx < codeLines.length; cIdx++) {
        const cl = codeLines[cIdx];
        // Line number
        ctx.fillStyle = '#94A3B8';
        ctx.fillText(String(cIdx + 1).padStart(2, ' '), marginX + 12, codeY);
        // Code text
        ctx.fillStyle = '#0F172A';
        ctx.fillText(cl.slice(0, 85), marginX + 40, codeY);
        codeY += codeLineHeight;
      }
      ctx.restore();
      currentY += boxHeight + 16;

      // Explanation (if present and distinct from code)
      if (q.explanation && q.explanation.trim() && q.explanation.trim() !== q.codeSnippet.trim()) {
        checkPageBreak(60);
        ctx.save();
        ctx.font = `bold 18px ${fontFamily}`;
        ctx.fillStyle = answerInk;
        ctx.fillText('Explanation / Output:', marginX, currentY);
        currentY += 26;

        ctx.font = `18px ${fontFamily}`;
        ctx.fillStyle = answerInk;
        const expLines = wrapText(ctx, q.explanation.trim(), contentWidth - 20);
        for (const line of expLines) {
          checkPageBreak(30);
          ctx.fillText(line, marginX + 15, currentY);
          currentY += 30;
        }
        ctx.restore();
        currentY += 12;
      }
    } else {
      // Pure Theory / Numerical / MCQ Answer Body (In Blue)
      const answerText = q.answer || q.explanation || '';
      if (answerText.trim()) {
        checkPageBreak(80);
        ctx.save();
        ctx.font = `bold 20px ${fontFamily}`;
        ctx.fillStyle = answerInk;
        ctx.fillText('Ans:', marginX, currentY);
        currentY += 32;

        ctx.font = `20px ${fontFamily}`;
        ctx.fillStyle = answerInk;
        const ansLines = wrapText(ctx, answerText, contentWidth - 20);
        for (const line of ansLines) {
          checkPageBreak(32);
          ctx.fillText(line, marginX + 15, currentY);
          currentY += 34;
        }
        ctx.restore();
        currentY += 14;
      }
    }

    // Terminal Screenshot / Diagram (if available)
    let screenshotBuffer: Buffer | null = null;
    const matchingSs = screenshots.find((s) => s.label === q.numberLabel) || screenshots[qIdx];
    if (matchingSs && matchingSs.buffer) {
      screenshotBuffer = matchingSs.buffer;
    } else if (q.outputScreenshotDataUrl) {
      const base64 = q.outputScreenshotDataUrl.split(',')[1] || q.outputScreenshotDataUrl;
      screenshotBuffer = Buffer.from(base64, 'base64');
    }

    if (screenshotBuffer) {
      try {
        const img = await loadImage(screenshotBuffer);
        const maxImgWidth = contentWidth - 20;
        const scale = Math.min(maxImgWidth / img.width, 1);
        const displayW = Math.round(img.width * scale);
        const displayH = Math.round(img.height * scale);

        checkPageBreak(displayH + 40);

        // Drop shadow / bordered sticker look
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;
        ctx.fillRect(marginX + 10, currentY, displayW, displayH);

        ctx.drawImage(img as any, marginX + 10, currentY, displayW, displayH);
        ctx.restore();

        currentY += displayH + 24;
      } catch (err) {
        console.warn(`Failed to embed screenshot image in handwritten page for ${q.numberLabel}:`, err);
      }
    }

    currentY += 20;
  }

  // Draw Page Numbers at Bottom
  const totalPages = canvasPages.length;
  for (let pIdx = 0; pIdx < totalPages; pIdx++) {
    const pageCanvas = canvasPages[pIdx];
    const pageCtx = pageCanvas.getContext('2d');
    pageCtx.save();
    pageCtx.font = `18px ${fontFamily}`;
    pageCtx.fillStyle = 'rgba(70, 70, 70, 0.6)';
    pageCtx.textAlign = 'right';
    pageCtx.fillText(`Page ${pIdx + 1} of ${totalPages}`, A4_WIDTH_150DPI - 60, A4_HEIGHT_150DPI - 45);
    pageCtx.restore();
  }

  // 3. Assemble PDF using pdf-lib
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`${header.assignmentTitle} (Handwritten)`);
  pdfDoc.setAuthor(header.studentName);

  // A4 dimensions in PDF points: 595.28 x 841.89
  const PDF_PAGE_WIDTH = 595.28;
  const PDF_PAGE_HEIGHT = 841.89;

  for (const pageCanvas of canvasPages) {
    const pngBuffer = pageCanvas.toBuffer('image/png');
    const embeddedPng = await pdfDoc.embedPng(pngBuffer);
    const pdfPage = pdfDoc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT]);
    pdfPage.drawImage(embeddedPng, {
      x: 0,
      y: 0,
      width: PDF_PAGE_WIDTH,
      height: PDF_PAGE_HEIGHT,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
