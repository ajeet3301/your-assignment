import * as opentype from 'opentype.js';

export interface FontValidationResult {
  valid: boolean;
  error?: string;
  familyName?: string;
  format?: 'ttf' | 'otf' | 'woff' | 'woff2';
  fsType?: number;
  canEmbedInPdf: boolean;
  embeddingWarning?: string;
  missingGlyphs: string[];
  glyphCoveragePercent: number;
  parsedFont?: opentype.Font;
  cleanBuffer?: ArrayBuffer;
}

const REQUIRED_CHARS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  lowercase: 'abcdefghijklmnopqrstuvwxyz'.split(''),
  numbers: '0123456789'.split(''),
  punctuation: '.,?!-_:;\'"()'.split(''),
};

/**
 * Checks magic bytes against known font header signatures
 */
export function checkFontMagicBytes(bytes: Uint8Array): 'ttf' | 'otf' | 'woff' | 'woff2' | null {
  if (bytes.length < 4) return null;

  // TrueType: 0x00 0x01 0x00 0x00 or 'true' (0x74 0x72 0x75 0x65)
  if (
    (bytes[0] === 0x00 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00) ||
    (bytes[0] === 0x74 && bytes[1] === 0x72 && bytes[2] === 0x75 && bytes[3] === 0x65)
  ) {
    return 'ttf';
  }

  // OpenType (CFF): 'OTTO' (0x4F 0x54 0x54 0x4F)
  if (bytes[0] === 0x4f && bytes[1] === 0x54 && bytes[2] === 0x54 && bytes[3] === 0x4f) {
    return 'otf';
  }

  // WOFF: 'wOFF' (0x77 0x4F 0x46 0x46)
  if (bytes[0] === 0x77 && bytes[1] === 0x4f && bytes[2] === 0x46 && bytes[3] === 0x46) {
    return 'woff';
  }

  // WOFF2: 'wOF2' (0x77 0x4F 0x46 0x32)
  if (bytes[0] === 0x77 && bytes[1] === 0x4f && bytes[2] === 0x46 && bytes[3] === 0x32) {
    return 'woff2';
  }

  return null;
}

/**
 * Comprehensive font validation using opentype.js and byte checks
 */
export async function validateFontFile(file: File): Promise<FontValidationResult> {
  // 1. Max file size: 5 MB
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File exceeds maximum allowed size of 5 MB (size: ${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
      missingGlyphs: [],
      glyphCoveragePercent: 0,
      canEmbedInPdf: false,
    };
  }

  // 2. Extension check
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !['ttf', 'otf', 'woff', 'woff2'].includes(ext)) {
    return {
      valid: false,
      error: 'Invalid file extension. Please upload a .ttf, .otf, .woff, or .woff2 font.',
      missingGlyphs: [],
      glyphCoveragePercent: 0,
      canEmbedInPdf: false,
    };
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // 3. Magic bytes check
  const magicFormat = checkFontMagicBytes(bytes);
  if (!magicFormat) {
    return {
      valid: false,
      error: 'Corrupt or non-font file. Header magic bytes do not match TrueType, OpenType, or WOFF formats.',
      missingGlyphs: [],
      glyphCoveragePercent: 0,
      canEmbedInPdf: false,
    };
  }

  // 4. Parse with opentype.js
  let parsedFont: opentype.Font;
  try {
    parsedFont = opentype.parse(buffer);
  } catch (err: any) {
    return {
      valid: false,
      error: `Failed to parse font tables: ${err.message || 'Corrupt font data'}`,
      missingGlyphs: [],
      glyphCoveragePercent: 0,
      canEmbedInPdf: false,
    };
  }

  // 5. Require a family name
  const rawFamily =
    parsedFont.names.fontFamily?.en ||
    parsedFont.names.fullName?.en ||
    parsedFont.names.postScriptName?.en ||
    Object.values(parsedFont.names.fontFamily || {})[0];

  if (!rawFamily || typeof rawFamily !== 'string' || !rawFamily.trim()) {
    return {
      valid: false,
      error: 'Font lacks a valid Family Name in its OpenType name table.',
      missingGlyphs: [],
      glyphCoveragePercent: 0,
      canEmbedInPdf: false,
    };
  }

  const familyName = String(rawFamily).trim();

  // 6. Glyph coverage check
  const allTestChars = [
    ...REQUIRED_CHARS.uppercase,
    ...REQUIRED_CHARS.lowercase,
    ...REQUIRED_CHARS.numbers,
    ...REQUIRED_CHARS.punctuation,
  ];

  const missing: string[] = [];
  allTestChars.forEach((char) => {
    try {
      const glyph = parsedFont.charToGlyph(char);
      if (!glyph || (glyph as any).unicode === undefined || glyph.index === 0) {
        missing.push(char);
      }
    } catch {
      missing.push(char);
    }
  });

  const presentCount = allTestChars.length - missing.length;
  const coveragePercent = Math.round((presentCount / allTestChars.length) * 100);

  // 7. Check OS/2 fsType for embedding restrictions
  // fsType 0x0002 = Restricted License embedding (Must not be modified or embedded)
  const os2Table = parsedFont.tables?.os2;
  const fsType = os2Table ? Number(os2Table.fsType) : 0;
  const isRestricted = (fsType & 0x0002) !== 0;

  let canEmbedInPdf = !isRestricted;
  let embeddingWarning: string | undefined;

  if (isRestricted) {
    embeddingWarning =
      'This font has a restricted license (OS/2 fsType=2). PDF vector font embedding is disabled; high-resolution 300 DPI canvas rendering will be used instead.';
  }

  // 8. Sanitise / re-export clean buffer
  let cleanBuffer: ArrayBuffer = buffer;
  try {
    cleanBuffer = parsedFont.toArrayBuffer();
  } catch {
    cleanBuffer = buffer;
  }

  return {
    valid: true,
    familyName,
    format: magicFormat,
    fsType,
    canEmbedInPdf,
    embeddingWarning,
    missingGlyphs: missing,
    glyphCoveragePercent: coveragePercent,
    parsedFont,
    cleanBuffer,
  };
}
