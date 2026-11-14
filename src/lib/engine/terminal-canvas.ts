import { TerminalTheme } from '@/app/terminal/page';

interface RenderTerminalOptions {
  themeConfig: {
    bg: string;
    text: string;
    headerBg: string;
    headerText: string;
    dots: boolean;
  };
  windowTitle: string;
  promptPrefix: string;
  output: string;
  commandName?: string;
  width?: number;
}

/**
 * Procedurally draws a realistic high-res terminal window to an offscreen canvas and returns PNG Data URL
 */
export function generateTerminalScreenshotDataUrl({
  themeConfig,
  windowTitle,
  promptPrefix,
  output,
  commandName = 'run solution',
  width = 680,
}: RenderTerminalOptions): string {
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const outputLines = output.split('\n');
  const lineHeight = 22;
  const headerHeight = 36;
  const padding = 20;

  // Calculate total height needed
  const totalContentHeight = (outputLines.length + 1) * lineHeight;
  const height = headerHeight + padding * 2 + totalContentHeight;

  // Use 2x pixel ratio for retina crispness
  const dpr = 2;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  // 1. Draw Terminal Outer Shadow & Rounded Window
  const radius = 10;
  ctx.save();
  ctx.fillStyle = themeConfig.bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, radius);
  ctx.fill();

  // Subtle border
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.stroke();

  // 2. Draw Window Header Chrome
  ctx.fillStyle = themeConfig.headerBg;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, headerHeight, [radius, radius, 0, 0]);
  ctx.fill();

  // Header separator line
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.moveTo(0, headerHeight);
  ctx.lineTo(width, headerHeight);
  ctx.stroke();

  // Window Dots (macOS/Ubuntu/Dracula style)
  if (themeConfig.dots) {
    const dotColors = ['#FF5F56', '#FFBD2E', '#27C93F'];
    dotColors.forEach((color, i) => {
      ctx.beginPath();
      ctx.arc(18 + i * 16, headerHeight / 2, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  }

  // Window Title
  ctx.fillStyle = themeConfig.headerText;
  ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(windowTitle || 'bash - 80x24', width / 2, headerHeight / 2 + 4);

  // 3. Draw Prompt Line & Output Text
  ctx.textAlign = 'left';
  ctx.font = '13px Consolas, Monaco, "Courier New", monospace';

  let currentY = headerHeight + padding + 14;

  // Command prompt line
  ctx.fillStyle = '#4ade80'; // Emerald prompt
  ctx.fillText(promptPrefix, padding, currentY);
  const promptWidth = ctx.measureText(promptPrefix + ' ').width;

  ctx.fillStyle = themeConfig.text;
  ctx.fillText(commandName, padding + promptWidth, currentY);

  currentY += lineHeight + 4;

  // Output lines
  outputLines.forEach((line) => {
    ctx.fillStyle = themeConfig.text;
    ctx.fillText(line, padding, currentY);
    currentY += lineHeight;
  });

  ctx.restore();

  return canvas.toDataURL('image/png');
}
