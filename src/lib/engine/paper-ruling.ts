import { PaperStyle, Margins, A4_WIDTH_MM, A4_HEIGHT_MM } from './types';

export interface RulingConfig {
  lineSpacingPx: number;
  firstLineY: number;
  lastLineY: number;
  marginLineX: number;
}

/**
 * Calculates pixel-perfect positions for paper rulings based on canvas dimensions and mm margins
 */
export function getRulingMetrics(
  canvasWidth: number,
  canvasHeight: number,
  style: PaperStyle,
  margins: Margins
): RulingConfig {
  const scaleX = canvasWidth / A4_WIDTH_MM;
  const scaleY = canvasHeight / A4_HEIGHT_MM;

  const topMarginPx = margins.top * scaleY;
  const bottomMarginPx = margins.bottom * scaleY;
  const leftMarginPx = margins.left * scaleX;

  let lineSpacingMm = 8.5; // default medium ruled
  if (style === 'ruled-narrow') lineSpacingMm = 6.5;
  if (style === 'ruled-wide') lineSpacingMm = 10.5;
  if (style === 'grid' || style === 'dotted') lineSpacingMm = 5.0;

  const lineSpacingPx = lineSpacingMm * scaleY;

  return {
    lineSpacingPx,
    firstLineY: topMarginPx + lineSpacingPx * 0.8,
    lastLineY: canvasHeight - bottomMarginPx,
    marginLineX: leftMarginPx,
  };
}

/**
 * Procedurally draws the realistic notebook paper background to an HTML Canvas
 */
export function drawPaperBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  style: PaperStyle,
  paperColor: string,
  margins: Margins,
  texture: boolean = true,
  phoneScanLook: boolean = false
) {
  // 1. Base paper fill
  ctx.save();
  ctx.fillStyle = paperColor || '#FBF7EE';
  ctx.fillRect(0, 0, width, height);

  const metrics = getRulingMetrics(width, height, style, margins);
  const scaleX = width / A4_WIDTH_MM;

  // 2. Ruled Lines or Grids
  if (
    style === 'ruled-narrow' ||
    style === 'ruled-medium' ||
    style === 'ruled-wide' ||
    style === 'ruled-margin'
  ) {
    ctx.lineWidth = Math.max(1, Math.round(scaleX * 0.25));
    ctx.strokeStyle = 'rgba(70, 95, 133, 0.22)'; // gentle ink-blue ruled line

    for (let y = metrics.firstLineY; y <= metrics.lastLineY; y += metrics.lineSpacingPx) {
      ctx.beginPath();
      ctx.moveTo(0, Math.round(y));
      ctx.lineTo(width, Math.round(y));
      ctx.stroke();
    }

    // Red margin line (if ruled-margin or by default on standard notebook styles)
    if (style === 'ruled-margin' || style === 'ruled-medium' || style === 'ruled-narrow') {
      const redMarginX = Math.round(metrics.marginLineX);
      ctx.beginPath();
      ctx.lineWidth = Math.max(1.2, Math.round(scaleX * 0.35));
      ctx.strokeStyle = 'rgba(229, 72, 77, 0.45)'; // classic margin red
      ctx.moveTo(redMarginX, 0);
      ctx.lineTo(redMarginX, height);
      ctx.stroke();
    }
  } else if (style === 'grid') {
    ctx.lineWidth = Math.max(0.75, Math.round(scaleX * 0.15));
    ctx.strokeStyle = 'rgba(80, 100, 130, 0.18)';

    // Horizontal
    for (let y = metrics.firstLineY; y <= metrics.lastLineY; y += metrics.lineSpacingPx) {
      ctx.beginPath();
      ctx.moveTo(0, Math.round(y));
      ctx.lineTo(width, Math.round(y));
      ctx.stroke();
    }
    // Vertical
    for (let x = 0; x <= width; x += metrics.lineSpacingPx) {
      ctx.beginPath();
      ctx.moveTo(Math.round(x), 0);
      ctx.lineTo(Math.round(x), height);
      ctx.stroke();
    }
  } else if (style === 'dotted') {
    ctx.fillStyle = 'rgba(80, 100, 130, 0.25)';
    const dotRadius = Math.max(1, Math.round(scaleX * 0.2));

    for (let y = metrics.firstLineY; y <= metrics.lastLineY; y += metrics.lineSpacingPx) {
      for (let x = metrics.lineSpacingPx; x <= width - metrics.lineSpacingPx; x += metrics.lineSpacingPx) {
        ctx.beginPath();
        ctx.arc(Math.round(x), Math.round(y), dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 3. Realistic paper grain (procedural subtle speckles)
  if (texture) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.015)';
    const grainStep = Math.max(12, Math.round(width / 70));
    for (let x = 0; x < width; x += grainStep) {
      for (let y = 0; y < height; y += grainStep) {
        if ((x * 13 + y * 37) % 5 === 0) {
          ctx.fillRect(x + ((y % 7) - 3), y + ((x % 7) - 3), 1, 1);
        }
      }
    }
  }

  // 4. Phone-scan look: subtle vignette and corner lighting
  if (phoneScanLook) {
    const vignette = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.4,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.8
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}
