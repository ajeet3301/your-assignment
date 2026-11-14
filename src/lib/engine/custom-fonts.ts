import Dexie, { Table } from 'dexie';
import { HandwritingFont } from './fonts';

export interface StoredCustomFont {
  id: string;
  name: string;
  family: string;
  dataBase64: string;
  format: 'truetype' | 'opentype' | 'woff2';
  createdAt: string;
}

class CustomFontsDB extends Dexie {
  customFonts!: Table<StoredCustomFont, string>;

  constructor() {
    super('YourAssignmentCustomFontsDB');
    this.version(1).stores({
      customFonts: 'id, name, family, createdAt',
    });
  }
}

const customFontsDb = typeof window !== 'undefined' ? new CustomFontsDB() : null;

/**
 * Loads a font binary into document.fonts using FontFace API
 */
export async function registerFontFace(name: string, buffer: ArrayBuffer, format: string) {
  if (typeof document === 'undefined') return;
  try {
    const font = new FontFace(name, buffer);
    await font.load();
    document.fonts.add(font);
  } catch (err) {
    console.warn(`Failed to register custom font ${name}:`, err);
  }
}

/**
 * Saves and loads an uploaded user font (.ttf, .otf, .woff2)
 */
export async function uploadCustomFont(file: File): Promise<HandwritingFont> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  let format: 'truetype' | 'opentype' | 'woff2' = 'truetype';
  if (extension === 'otf') format = 'opentype';
  if (extension === 'woff2') format = 'woff2';

  const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9 ]/g, '');
  const fontId = `custom-${Date.now()}`;
  const fontFamily = `'Custom_${cleanName.replace(/\s+/g, '_')}', cursive`;

  const buffer = await file.arrayBuffer();

  // Register in browser immediately
  await registerFontFace(`Custom_${cleanName.replace(/\s+/g, '_')}`, buffer, format);

  // Convert to Base64 to save in IndexedDB
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  if (customFontsDb) {
    await customFontsDb.customFonts.put({
      id: fontId,
      name: `${cleanName} (Personal)`,
      family: fontFamily,
      dataBase64: base64,
      format,
      createdAt: new Date().toISOString(),
    });
  }

  return {
    id: fontId,
    name: `${cleanName} (Personal)`,
    family: fontFamily,
    category: 'Casual',
    defaultSize: 18,
    defaultSlant: 0,
    author: 'You (Uploaded)',
    license: 'Personal Font',
    sampleText: 'My personal handwritten assignment font',
  };
}

/**
 * Restores previously uploaded custom fonts from IndexedDB on page load
 */
export async function loadSavedCustomFonts(): Promise<HandwritingFont[]> {
  if (!customFontsDb) return [];
  try {
    const stored = await customFontsDb.customFonts.toArray();
    const result: HandwritingFont[] = [];

    for (const item of stored) {
      // Decode base64 to buffer
      const binaryString = atob(item.dataBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      await registerFontFace(
        item.family.replace(/'/g, '').split(',')[0].trim(),
        bytes.buffer,
        item.format
      );

      result.push({
        id: item.id,
        name: item.name,
        family: item.family,
        category: 'Casual',
        defaultSize: 18,
        defaultSlant: 0,
        author: 'You (Uploaded)',
        license: 'Personal Font',
        sampleText: 'Personal uploaded handwriting font',
      });
    }

    return result;
  } catch (err) {
    console.warn('Failed to load saved custom fonts:', err);
    return [];
  }
}
