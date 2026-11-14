export type PenType = 'ballpoint' | 'gel' | 'fountain' | 'pencil' | 'marker';

export type PaperStyle =
  | 'plain'
  | 'ruled-narrow'
  | 'ruled-medium'
  | 'ruled-wide'
  | 'ruled-margin'
  | 'grid'
  | 'dotted';

export type PageNumberStyle = 'none' | 'bottom-right' | 'bottom-center' | 'top-right' | '1-of-n';

export interface Margins {
  top: number; // in mm
  bottom: number; // in mm
  left: number; // in mm
  right: number; // in mm
}

export interface EngineSettings {
  fontFamily: string;
  fontSize: number; // pt (typically 14-22)
  lineSpacing: number; // line height multiplier or ruling height in mm
  letterSpacing: number; // px variation
  wordSpacing: number; // px variation
  paragraphSpacing: number; // px
  slant: number; // degrees (-15 to +15)
  inkColor: string; // hex (e.g. #1B3FA0, #111827)
  penType: PenType;
  paperStyle: PaperStyle;
  paperColor: string; // hex (e.g. #FBF7EE, #FFFFFF)
  margins: Margins;
  pageNumbering: PageNumberStyle;
  seed: number;
  fatigue: boolean;
  paperTexture: boolean;
  phoneScanLook: boolean;
}

export interface PageLayout {
  pageIndex: number;
  lines: MeasuredLine[];
}

export interface MeasuredGlyph {
  char: string;
  width: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  skewX: number;
  opacity: number;
  baselineDrift: number;
}

export interface MeasuredLine {
  text: string;
  glyphs: MeasuredGlyph[];
  y: number;
  height: number;
  isHeading?: boolean;
  headingLevel?: number;
}

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

// High-resolution standard for crisp 300 DPI exports
export const A4_WIDTH_300DPI = 2480;
export const A4_HEIGHT_300DPI = 3508;

// Preview canvas resolution (e.g. 100 DPI for fast reactive 60fps typing)
export const PREVIEW_SCALE_DPI = 100;
export const A4_WIDTH_PREVIEW = Math.round((A4_WIDTH_MM / 25.4) * PREVIEW_SCALE_DPI); // 827 px
export const A4_HEIGHT_PREVIEW = Math.round((A4_HEIGHT_MM / 25.4) * PREVIEW_SCALE_DPI); // 1169 px
