import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { EngineSettings, PageLayout, A4_WIDTH_300DPI, A4_HEIGHT_300DPI } from '../engine/types';
import { renderHandwrittenPage } from '../engine/canvas-renderer';

export interface ExportPdfOptions {
  pages: PageLayout[];
  settings: EngineSettings;
  documentTitle?: string;
  hasWatermark?: boolean;
  fontBinary?: ArrayBuffer | null;
  onProgress?: (current: number, total: number) => void;
  onNotice?: (message: string) => void;
}

/**
 * High-definition 300 DPI PDF generation with vector fontkit embedding support
 */
export async function generateHandwrittenPdf({
  pages,
  settings,
  documentTitle = 'Handwritten-Assignment',
  fontBinary,
  onProgress,
  onNotice,
}: ExportPdfOptions): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  pdfDoc.setTitle(documentTitle);
  pdfDoc.setAuthor('YourAssignment (Deterministic Handwriting Engine)');
  pdfDoc.setCreationDate(new Date());

  // A4 in PDF points: 595.28 x 841.89 points
  const PDF_A4_WIDTH = 595.28;
  const PDF_A4_HEIGHT = 841.89;

  let embeddedCustomFont: any = null;

  // Attempt vector embedding if font binary was provided and not restricted
  if (fontBinary) {
    try {
      embeddedCustomFont = await pdfDoc.embedFont(fontBinary, { subset: true });
    } catch (err: any) {
      if (onNotice) {
        onNotice(
          'Vector font embedding bypassed (unsupported or restricted font tables). Using print-grade 300 DPI canvas rendering.'
        );
      }
    }
  }

  for (let i = 0; i < pages.length; i++) {
    if (onProgress) {
      onProgress(i + 1, pages.length);
    }

    // Create high-resolution offscreen canvas at 300 DPI
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = A4_WIDTH_300DPI;
    offscreenCanvas.height = A4_HEIGHT_300DPI;

    // Render page with full print fidelity and per-letter ink variation
    renderHandwrittenPage({
      canvas: offscreenCanvas,
      page: pages[i],
      totalPages: pages.length,
      settings,
      dpi: 300,
    });

    const imgDataUrl = offscreenCanvas.toDataURL('image/jpeg', 0.94);
    const imgBytes = await fetch(imgDataUrl).then((res) => res.arrayBuffer());

    const pdfImage = await pdfDoc.embedJpg(imgBytes);
    const pdfPage = pdfDoc.addPage([PDF_A4_WIDTH, PDF_A4_HEIGHT]);

    pdfPage.drawImage(pdfImage, {
      x: 0,
      y: 0,
      width: PDF_A4_WIDTH,
      height: PDF_A4_HEIGHT,
    });
  }

  return await pdfDoc.save();
}

/**
 * Downloads a Uint8Array blob as a PDF file in browser
 */
export function downloadPdfBlob(bytes: Uint8Array, filename: string = 'assignment.pdf') {
  const blob = new Blob([bytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
