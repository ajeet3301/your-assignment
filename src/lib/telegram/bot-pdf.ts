import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { SolvedQuestionDocItem, StudentSubmissionHeader } from '../docx/docx-generator';

export interface GeneratePdfOptions {
  header: StudentSubmissionHeader;
  questions: SolvedQuestionDocItem[];
  screenshots: { label: string; buffer: Buffer }[];
  isHandwritten?: boolean;
}

/**
 * Generates an A4 assignment submission PDF on the server using pdf-lib
 */
export async function generateServerAssignmentPdf(options: GeneratePdfOptions): Promise<Buffer> {
  const { header, questions, screenshots, isHandwritten = false } = options;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(header.assignmentTitle);
  pdfDoc.setAuthor(header.studentName);

  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);

  // A4 dimensions in points: 595.28 x 841.89
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN = 50;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let currentY = PAGE_HEIGHT - MARGIN;

  const checkNewPage = (neededHeight: number) => {
    if (currentY - neededHeight < MARGIN + 40) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      currentY = PAGE_HEIGHT - MARGIN;
      if (isHandwritten) {
        drawRulingLines();
      }
    }
  };

  const drawRulingLines = () => {
    const lineSpacing = 24;
    for (let y = MARGIN + 30; y < PAGE_HEIGHT - MARGIN; y += lineSpacing) {
      page.drawLine({
        start: { x: MARGIN - 10, y },
        end: { x: PAGE_WIDTH - MARGIN + 10, y },
        thickness: 0.5,
        color: rgb(0.85, 0.88, 0.95),
      });
    }
  };

  if (isHandwritten) {
    drawRulingLines();
  }

  // 1. Header Banner
  page.drawText(header.assignmentTitle.toUpperCase(), {
    x: MARGIN,
    y: currentY,
    size: 16,
    font: timesRomanBold,
    color: isHandwritten ? rgb(0.08, 0.16, 0.35) : rgb(0.12, 0.23, 0.54),
  });
  currentY -= 22;

  const metaText = `Name: ${header.studentName}   |   Roll No: ${header.rollNo}   |   Course: ${header.className}   |   Subject: ${header.subject}`;
  page.drawText(metaText, {
    x: MARGIN,
    y: currentY,
    size: 10,
    font: timesRoman,
    color: rgb(0.3, 0.3, 0.3),
  });
  currentY -= 14;

  // Horizontal divider
  page.drawLine({
    start: { x: MARGIN, y: currentY },
    end: { x: PAGE_WIDTH - MARGIN, y: currentY },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });
  currentY -= 25;

  // 2. Questions & Execution Screenshots
  for (let idx = 0; idx < questions.length; idx++) {
    const q = questions[idx];
    checkNewPage(120);

    // Question Label & Text
    const qLabel = `${q.numberLabel}: `;
    page.drawText(qLabel, {
      x: MARGIN,
      y: currentY,
      size: 12,
      font: timesRomanBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    const wrapLines = splitTextIntoLines(q.questionText, 70);
    for (let l = 0; l < wrapLines.length; l++) {
      if (l > 0) checkNewPage(18);
      page.drawText(wrapLines[l], {
        x: MARGIN + (l === 0 ? 30 : 0),
        y: currentY,
        size: 11,
        font: timesRoman,
        color: rgb(0.1, 0.1, 0.1),
      });
      currentY -= 16;
    }
    currentY -= 8;

    // Code Snippet (if any)
    if (q.codeSnippet) {
      const codeLines = q.codeSnippet.split('\n').slice(0, 15);
      const codeBlockHeight = codeLines.length * 14 + 16;
      checkNewPage(codeBlockHeight);

      // Shaded background box for code
      page.drawRectangle({
        x: MARGIN,
        y: currentY - codeBlockHeight + 12,
        width: CONTENT_WIDTH,
        height: codeBlockHeight,
        color: rgb(0.96, 0.96, 0.97),
        borderColor: rgb(0.85, 0.85, 0.88),
        borderWidth: 0.5,
      });

      let codeY = currentY - 2;
      for (const cl of codeLines) {
        page.drawText(cl.slice(0, 75), {
          x: MARGIN + 10,
          y: codeY,
          size: 9.5,
          font: courier,
          color: rgb(0.15, 0.15, 0.2),
        });
        codeY -= 14;
      }
      currentY -= codeBlockHeight + 10;
    }

    // Terminal Screenshot (if available)
    const ss = screenshots[idx];
    if (ss && ss.buffer) {
      try {
        const embeddedImage = await pdfDoc.embedPng(ss.buffer);
        const imgDims = embeddedImage.scale(0.5); // Retina scale down to 50%
        const displayWidth = Math.min(CONTENT_WIDTH, imgDims.width);
        const displayHeight = (displayWidth / imgDims.width) * imgDims.height;

        checkNewPage(displayHeight + 20);

        page.drawImage(embeddedImage, {
          x: MARGIN,
          y: currentY - displayHeight,
          width: displayWidth,
          height: displayHeight,
        });

        currentY -= displayHeight + 16;
      } catch (err) {
        console.error('Failed to embed screenshot in PDF:', err);
      }
    }

    // Explanation
    if (q.explanation) {
      checkNewPage(40);
      page.drawText(`Explanation: ${q.explanation.slice(0, 200)}`, {
        x: MARGIN,
        y: currentY,
        size: 10,
        font: timesRoman,
        color: rgb(0.3, 0.3, 0.3),
      });
      currentY -= 24;
    }

    currentY -= 10;
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

function splitTextIntoLines(text: string, maxCharsPerLine: number = 75): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine += ' ' + word;
    }
  }
  if (currentLine.trim()) lines.push(currentLine.trim());
  return lines;
}
