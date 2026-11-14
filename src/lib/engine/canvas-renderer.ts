import { PRNG } from './prng';
import { EngineSettings, PageLayout, A4_WIDTH_MM, A4_HEIGHT_MM, PREVIEW_SCALE_DPI } from './types';
import { PEN_PROFILES } from './pen-effects';
import { drawPaperBackground } from './paper-ruling';
import { resolveImageUrl } from './image-registry';

export interface RenderPageOptions {
  canvas: HTMLCanvasElement;
  page: PageLayout;
  totalPages: number;
  settings: EngineSettings;
  dpi?: number;
  hoverFontFamily?: string | null; // Real-time hover preview
}

/**
 * Perturbs ink color slightly per glyph based on the inkVariation slider (0-100%)
 */
function applyInkVariation(hex: string, prng: PRNG, variationPercent: number): string {
  if (!hex || variationPercent <= 0) return hex || '#1B3FA0';

  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;

  const delta = Math.round(prng.gaussian(0, (variationPercent / 100) * 16));

  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const newR = clamp(r + delta);
  const newG = clamp(g + delta);
  const newB = clamp(b + delta);

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
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

const imageCache = new Map<string, HTMLImageElement>();

/**
 * Checks if a font family is cursive / joined
 */
function isCursiveFont(family: string): boolean {
  const lower = family.toLowerCase();
  return (
    lower.includes('caveat') ||
    lower.includes('homemade apple') ||
    lower.includes('dancing') ||
    lower.includes('cedarville') ||
    lower.includes('sacramento') ||
    lower.includes('allura') ||
    lower.includes('satisfy') ||
    lower.includes('great vibes') ||
    lower.includes('la belle') ||
    lower.includes('alex brush') ||
    lower.includes('marck') ||
    lower.includes('dafoe') ||
    lower.includes('yellowtail')
  );
}

/**
 * Renders a single handwritten page onto a canvas with realism physics
 */
export function renderHandwrittenPage(options: RenderPageOptions) {
  const {
    canvas,
    page,
    totalPages,
    settings,
    dpi = PREVIEW_SCALE_DPI,
    hoverFontFamily,
  } = options;
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

  // Sliders normalizers
  const wobbleFactor = (settings.baselineWobble ?? 35) / 100;
  const spacingFactor = (settings.spacingIrregularity ?? 25) / 100;
  const rotationFactor = (settings.rotationJitter ?? 30) / 100;
  const inkVarFactor = settings.inkVariation ?? 25;

  // 2. Render each line
  for (let lineIdx = 0; lineIdx < page.lines.length; lineIdx++) {
    const line = page.lines[lineIdx];

    // Image Block (e.g. Terminal Screenshot or Diagram)
    if (line.isImage && line.imageUrl) {
      const resolvedSrc = resolveImageUrl(line.imageUrl);
      let img = imageCache.get(resolvedSrc);
      if (!img) {
        img = new Image();
        img.onload = () => {
          // Re-render once image is loaded into memory
          renderHandwrittenPage(options);
        };
        img.src = resolvedSrc;
        imageCache.set(resolvedSrc, img);
      }

      const imgX = leftMarginPx;
      const imgY = line.y;
      const imgW = line.imageWidth || width - leftMarginPx * 2;
      const imgH = line.imageHeight || Math.round(imgW * 0.48);

      ctx.save();
      // Reset compositing from pen's blendMode ('multiply') to normal 'source-over'
      // so screenshot pixels are never multiplied into solid black!
      ctx.globalCompositeOperation = 'source-over';

      // Realistic photo / screenshot shadow on paper
      ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
      ctx.shadowBlur = 10 * scale;
      ctx.shadowOffsetY = 4 * scale;

      // Draw clean backing container
      ctx.beginPath();
      ctx.roundRect(imgX, imgY, imgW, imgH, 6 * scale);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      // Clear shadow before drawing the image content
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      if (img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(imgX, imgY, imgW, imgH, 6 * scale);
        ctx.clip();
        ctx.drawImage(img, imgX, imgY, imgW, imgH);
        ctx.restore();

        // Subtle realistic border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.lineWidth = 1 * scale;
        ctx.beginPath();
        ctx.roundRect(imgX, imgY, imgW, imgH, 6 * scale);
        ctx.stroke();
      } else {
        // Clean loading card placeholder
        ctx.fillStyle = '#F3F4F6';
        ctx.beginPath();
        ctx.roundRect(imgX, imgY, imgW, imgH, 6 * scale);
        ctx.fill();

        ctx.fillStyle = '#6B7280';
        ctx.font = `${12 * scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('📷 Loading Screenshot...', imgX + imgW / 2, imgY + imgH / 2);
      }

      ctx.restore();
      continue;
    }

    const pageProgression = line.y / height; // 0 to 1
    const fatigueMultiplier = settings.fatigue ? 1.0 + pageProgression * 0.4 : 1.0;

    let cursorX = leftMarginPx;
    let baselineDrift = 0;

    const baseFontSize = line.isHeading
      ? settings.fontSize * (line.headingLevel === 1 ? 1.4 : line.headingLevel === 2 ? 1.25 : 1.15)
      : settings.fontSize;

    const fontSizePx = baseFontSize * scale;

    const spansToRender = line.spans && line.spans.length > 0
      ? line.spans
      : [{
          text: line.text,
          fontFamily: hoverFontFamily || settings.fontFamily,
          color: line.isHeading && settings.headingColor ? settings.headingColor : settings.inkColor,
          isBold: false,
        }];

    for (let sIdx = 0; sIdx < spansToRender.length; sIdx++) {
      const span = spansToRender[sIdx];
      const activeFont = hoverFontFamily || span.fontFamily || settings.fontFamily;
      const activeColor = span.color || settings.inkColor;
      const isBold = span.isBold || settings.fontWeight > 500;

      ctx.font = `${isBold || line.isHeading ? '600' : '400'} ${fontSizePx}px ${activeFont}`;
      ctx.textBaseline = 'alphabetic';

      const isCursive = isCursiveFont(activeFont);
      const words = span.text.split(' ');

      for (let wIdx = 0; wIdx < words.length; wIdx++) {
        const word = words[wIdx];
        if (!word) {
          cursorX += ctx.measureText(' ').width * 0.9;
          continue;
        }

        // For cursive fonts, we vary rotation and baseline drift at the WORD level to preserve joins
        const wordRotation = isCursive
          ? prng.gaussian(0, (0.02 * rotationFactor + (settings.slant * Math.PI) / 180) * fatigueMultiplier)
          : 0;

        for (let cIdx = 0; cIdx < word.length; cIdx++) {
          const char = word[cIdx];

          const sizeJitter = 1.0 + prng.gaussian(0, 0.05 * spacingFactor * fatigueMultiplier);
          const rotationJitter = isCursive
            ? wordRotation
            : prng.gaussian(0, (0.03 * rotationFactor + (settings.slant * Math.PI) / 180) * fatigueMultiplier);

          baselineDrift += prng.gaussian(0, 0.35 * wobbleFactor * fatigueMultiplier);
          baselineDrift = Math.max(-3.5 * scale, Math.min(3.5 * scale, baselineDrift));

          const charMetrics = ctx.measureText(char);
          const charWidth = charMetrics.width;

          // Ink opacity and shade variation
          const opacityJitter = Math.max(
            0.3,
            Math.min(1.0, pen.baseOpacity + prng.gaussian(0, pen.opacityJitter))
          );
          const variedColor = applyInkVariation(activeColor, prng, inkVarFactor);

          ctx.save();
          ctx.fillStyle = variedColor;
          ctx.globalAlpha = opacityJitter;

          const glyphX = cursorX + charWidth * 0.5;
          const glyphY = line.y + baselineDrift - fontSizePx * 0.15;

          ctx.translate(glyphX, glyphY);
          ctx.rotate(rotationJitter);
          ctx.scale(sizeJitter, sizeJitter);

          if (settings.slant !== 0) {
            ctx.transform(1, 0, Math.tan((settings.slant * Math.PI) / 180), 1, 0, 0);
          }

          ctx.fillText(char, -charWidth * 0.5, fontSizePx * 0.15);

          // Simulated bold weight via micro-stroke
          if (isBold) {
            ctx.lineWidth = Math.max(0.6, 1.0 * scale);
            ctx.strokeStyle = variedColor;
            ctx.strokeText(char, -charWidth * 0.5, fontSizePx * 0.15);
          }

          // Pen bleed simulation
          if (pen.bleedAmount > 0.2) {
            ctx.globalAlpha = opacityJitter * 0.15;
            ctx.lineWidth = pen.bleedAmount * scale;
            ctx.strokeStyle = variedColor;
            ctx.strokeText(char, -charWidth * 0.5, fontSizePx * 0.15);
          }

          ctx.restore();

          const letterAdvance = isCursive
            ? charWidth * 0.98 // tighter tracking to keep joins seamless
            : charWidth + (settings.letterSpacing + prng.range(-0.4, 0.6) * spacingFactor) * scale;

          cursorX += letterAdvance;
        }

        // Word spacing
        if (wIdx < words.length - 1) {
          const spaceMetrics = ctx.measureText(' ');
          const wordSpacingJitter =
            (settings.wordSpacing + prng.range(-1.0, 1.8) * spacingFactor) * scale;
          cursorX += spaceMetrics.width + wordSpacingJitter;
        }
      }
    }

    // Hand-drawn underline for headings
    if (line.isHeading) {
      ctx.save();
      ctx.strokeStyle = settings.headingColor || settings.inkColor;
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
    ctx.font = `400 ${Math.round(14 * scale)}px ${hoverFontFamily || settings.fontFamily}`;
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
