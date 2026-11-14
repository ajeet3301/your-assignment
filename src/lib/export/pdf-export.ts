import { PDFDocument } from 'pdf-lib';
import { EngineSettings, PageLayout, A4_WIDTH_300DPI, A4_HEIGHT_300DPI } from '../engine/types';
import { renderHandwrittenPage } from '../engine/canvas-renderer';

export interface ExportPdfOptions {
  pages: PageLayout[];
  settings: EngineSettings;
  documentTitle?: string;
  hasWatermark?: boolean;
  onProgress?: (current: number, total: number) => void;
}

/**
 * High-definition 300 DPI PDF generation with embedded A4 page canvas renders
 */
export async function generateHandwrittenPdf({
  pages,
  settings,
  documentTitle = 'Handwritten-Assignment',
  hasWatermark = true,
  onProgress,
}: ExportPdfOptions): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(documentTitle);
  pdfDoc.setAuthor('YourAssignment (Deterministic Handwriting Engine)');
  pdfDoc.setCreationDate(new Date());

  // A4 in PDF points (72 points per inch): 595.28 x 841.89 points
  const PDF_A4_WIDTH = 595.28;
  const PDF_A4_HEIGHT = 841.89;

  for (let i = 0; i < pages.length; i++) {
    if (onProgress) {
      onProgress(i + 1, pages.length);
    }

    // Create high-resolution offscreen canvas at 300 DPI
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = A4_WIDTH_300DPI;
    offscreenCanvas.height = A4_HEIGHT_300DPI;

    // Render page with full print fidelity
    renderHandwrittenPage({
      canvas: offscreenCanvas,
      page: pages[i],
      totalPages: pages.length,
      settings,
      dpi: 300,
    });

    // Optional free watermark in footer
    if (hasWatermark) {
      const ctx = offscreenCanvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.font = '600 42px sans-serif';
        ctx.fillStyle = 'rgba(31, 58, 138, 0.45)'; // ink-blue watermark
        ctx.textAlign = 'center';
        ctx.fillText('Generated with YourAssignment (Free Plan)', A4_WIDTH_300DPI / 2, A4_HEIGHT_300DPI - 80);
        ctx.restore();
      }
    }

    // Convert to high-quality JPEG image data URL (quality 0.92 balances file size and sharpness)
    const imgDataUrl = offscreenCanvas.toDataURL('image/jpeg', 0.92);
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
