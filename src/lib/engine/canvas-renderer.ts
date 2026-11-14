import { PRNG } from './prng';
import { EngineSettings, PageLayout, A4_WIDTH_MM, A4_HEIGHT_MM, PREVIEW_SCALE_DPI } from './types';
import { PEN_PROFILES } from './pen-effects';
import { drawPaperBackground } from './paper-ruling';

export interface RenderPageOptions {
  canvas: HTMLCanvasElement;
  page: PageLayout;
  totalPages: number;
  settings: EngineSettings;
  dpi?: number;
}

/**
 * Draws a wobbly hand-drawn line (for underlines, rules) using small stochastic segments
 */
function drawWobblyLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  prng: PRNG,
  amplitude: number = 1.5
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.hypot(dx, dy);
  const segments = Math.max(4, Math.floor(distance / 12));

  ctx.beginPath();
  ctx.moveTo(x1, y1);

  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const px = x1 + dx * t;
    const py = y1 + dy * t + prng.gaussian(0, amplitude);
    ctx.lineTo(px, py);
  }

  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/**
 * Renders a single handwritten page onto a canvas with realism physics
 */
export function renderHandwrittenPage({
  canvas,
  page,
  totalPages,
  settings,
  dpi = PREVIEW_SCALE_DPI,
}: RenderPageOptions) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // 1. Draw Paper Background
  drawPaperBackground(
    ctx,
    width,
    height,
    settings.paperStyle,
    settings.paperColor,
    settings.margins,
    settings.paperTexture,
    settings.phoneScanLook
  );

  const scale = width / 800;
  const prng = new PRNG(settings.seed + page.pageIndex * 10007);
  const pen = PEN_PROFILES[settings.penType] || PEN_PROFILES.ballpoint;

  ctx.save();
  ctx.globalCompositeOperation = pen.blendMode;

  const scaleX = width / A4_WIDTH_MM;
  const leftMarginPx = settings.margins.left * scaleX;

  // 2. Render each line glyph-by-glyph
  for (let lineIdx = 0; lineIdx < page.lines.length; lineIdx++) {
    const line = page.lines[lineIdx];
    const text = line.text;

    // Line-level fatigue drift: as we go down the page, baseline shifts slightly
    const pageProgression = line.y / height; // 0 to 1
    const fatigueMultiplier = settings.fatigue ? 1.0 + pageProgression * 0.4 : 1.0;

    let cursorX = leftMarginPx;
    let baselineDrift = 0;

    const baseFontSize = line.isHeading
      ? settings.fontSize * (line.headingLevel === 1 ? 1.4 : line.headingLevel === 2 ? 1.25 : 1.15)
      : settings.fontSize;

    const fontSizePx = baseFontSize * scale;

    ctx.font = `${line.isHeading ? '600' : '400'} ${fontSizePx}px ${settings.fontFamily}`;
    ctx.textBaseline = 'alphabetic';

    const words = text.split(' ');

    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      const word = words[wIdx];

      // For cursive fonts, we render in connected micro-segments or per-glyph with joined spacing
      for (let cIdx = 0; cIdx < word.length; cIdx++) {
        const char = word[cIdx];

        // Stochastic per-glyph variations
        const sizeJitter = 1.0 + prng.gaussian(0, 0.04 * fatigueMultiplier);
        const rotationJitter = prng.gaussian(0, (0.025 + (settings.slant * Math.PI) / 180) * fatigueMultiplier);
        baselineDrift += prng.gaussian(0, 0.3 * fatigueMultiplier);
        baselineDrift = Math.max(-3 * scale, Math.min(3 * scale, baselineDrift));

        const charMetrics = ctx.measureText(char);
        const charWidth = charMetrics.width;

        // Pen pressure & opacity jitter
        const opacityJitter = Math.max(
          0.3,
          Math.min(1.0, pen.baseOpacity + prng.gaussian(0, pen.opacityJitter))
        );

        ctx.save();
        ctx.fillStyle = settings.inkColor;
        ctx.globalAlpha = opacityJitter;

        // Position & Rotate around glyph center
        const glyphX = cursorX + charWidth * 0.5;
        const glyphY = line.y + baselineDrift - fontSizePx * 0.15;

        ctx.translate(glyphX, glyphY);
        ctx.rotate(rotationJitter);
        ctx.scale(sizeJitter, sizeJitter);

        // Skew
        if (settings.slant !== 0) {
          ctx.transform(1, 0, Math.tan((settings.slant * Math.PI) / 180), 1, 0, 0);
        }

        ctx.fillText(char, -charWidth * 0.5, fontSizePx * 0.15);

        // Optional pen bleed / stroke softness simulation
        if (pen.bleedAmount > 0.2) {
          ctx.globalAlpha = opacityJitter * 0.15;
          ctx.lineWidth = pen.bleedAmount * scale;
          ctx.strokeStyle = settings.inkColor;
          ctx.strokeText(char, -charWidth * 0.5, fontSizePx * 0.15);
        }

        ctx.restore();

        // Advance cursor
        const letterSpacingJitter = (settings.letterSpacing + prng.range(-0.5, 0.8)) * scale;
        cursorX += charWidth + letterSpacingJitter;
      }

      // Word spacing jitter
      if (wIdx < words.length - 1) {
        const spaceMetrics = ctx.measureText(' ');
        const wordSpacingJitter = (settings.wordSpacing + prng.range(-1.2, 2.0)) * scale;
        cursorX += spaceMetrics.width + wordSpacingJitter;
      }
    }

    // Hand-drawn underline for headings
    if (line.isHeading) {
      ctx.save();
      ctx.strokeStyle = settings.inkColor;
      ctx.lineWidth = Math.max(1.2, 2.0 * scale);
      ctx.globalAlpha = 0.85;
      const underlineY = line.y + 4 * scale;
      drawWobblyLine(ctx, leftMarginPx, underlineY, cursorX, underlineY, prng, 1.2 * scale);
      ctx.restore();
    }
  }

  // 3. Page Numbering
  if (settings.pageNumbering !== 'none') {
    ctx.save();
    ctx.font = `400 ${Math.round(14 * scale)}px ${settings.fontFamily}`;
    ctx.fillStyle = settings.inkColor;
    ctx.globalAlpha = 0.7;

    const pageStr =
      settings.pageNumbering === '1-of-n'
        ? `${page.pageIndex + 1} of ${totalPages}`
        : `${page.pageIndex + 1}`;

    const textMetrics = ctx.measureText(pageStr);

    let px = width - textMetrics.width - settings.margins.right * scaleX;
    let py = height - (settings.margins.bottom * 0.5 * height) / A4_HEIGHT_MM;

    if (settings.pageNumbering === 'bottom-center') {
      px = (width - textMetrics.width) / 2;
    } else if (settings.pageNumbering === 'top-right') {
      py = (settings.margins.top * 0.7 * height) / A4_HEIGHT_MM;
    }

    ctx.fillText(pageStr, px, py);
    ctx.restore();
  }

  ctx.restore();
}
