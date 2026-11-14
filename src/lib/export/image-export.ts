import { EngineSettings, PageLayout, A4_WIDTH_300DPI, A4_HEIGHT_300DPI } from '../engine/types';
import { renderHandwrittenPage } from '../engine/canvas-renderer';

export function exportPageAsPng(
  page: PageLayout,
  totalPages: number,
  settings: EngineSettings,
  filename: string = 'handwritten-page.png',
  dpi: number = 300
) {
  const canvas = document.createElement('canvas');
  canvas.width = A4_WIDTH_300DPI;
  canvas.height = A4_HEIGHT_300DPI;

  renderHandwrittenPage({
    canvas,
    page,
    totalPages,
    settings,
    dpi,
  });

  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
