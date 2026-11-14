'use client';

// Persistent client-side Image Registry for attachments in handwritten documents
const REGISTRY_STORAGE_KEY = 'yourassignment_image_registry';

interface RegisteredImage {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: number;
}

// In-memory cache for ultra-fast lookup
const memoryCache = new Map<string, string>();

/**
 * Loads registry from localStorage on startup
 */
function loadRegistry(): Record<string, RegisteredImage> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(REGISTRY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    Object.values(parsed).forEach((img: any) => {
      if (img && img.id && img.dataUrl) {
        memoryCache.set(img.id, img.dataUrl);
      }
    });
    return parsed;
  } catch {
    return {};
  }
}

/**
 * Saves registry to localStorage
 */
function persistRegistry(registry: Record<string, RegisteredImage>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(registry));
  } catch (e) {
    console.warn('Image registry localStorage write error:', e);
  }
}

let imageCounter = 1;

/**
 * Registers a new image / screenshot and returns a clean, human-readable attachment tag ID
 */
export function registerImage(dataUrl: string, name: string = 'Screenshot'): string {
  // Generate short clean ID
  const id = `img_${Date.now().toString(36)}_${(imageCounter++).toString(36)}`;

  // Store in memory cache
  memoryCache.set(id, dataUrl);

  if (typeof window !== 'undefined') {
    const registry = loadRegistry();
    registry[id] = {
      id,
      name,
      dataUrl,
      createdAt: Date.now(),
    };
    persistRegistry(registry);
  }

  return id;
}

/**
 * Resolves an image identifier or URL into a displayable data URL or http URL
 */
export function resolveImageUrl(idOrUrl: string): string {
  if (!idOrUrl) return '';

  // Already a full data URL or web URL
  if (idOrUrl.startsWith('data:image/') || idOrUrl.startsWith('http://') || idOrUrl.startsWith('https://')) {
    return idOrUrl;
  }

  // Strip prefixes like "attachment:", "img:", or "image:"
  const cleanId = idOrUrl
    .replace(/^attachment:/i, '')
    .replace(/^img:/i, '')
    .replace(/^image:/i, '')
    .trim();

  // Check in-memory cache
  if (memoryCache.has(cleanId)) {
    return memoryCache.get(cleanId)!;
  }

  // Check localStorage registry
  if (typeof window !== 'undefined') {
    const registry = loadRegistry();
    if (registry[cleanId]?.dataUrl) {
      memoryCache.set(cleanId, registry[cleanId].dataUrl);
      return registry[cleanId].dataUrl;
    }
  }

  return idOrUrl;
}

/**
 * Scans markdown text for bulky base64 data URLs in images, extracts them to the registry,
 * and replaces the 100,000+ character blobs with concise, readable markdown tags:
 * e.g. ![Screenshot](attachment:img_1a)
 */
export function sanitizeDocumentImages(rawText: string): {
  cleanText: string;
  migratedCount: number;
} {
  if (!rawText) return { cleanText: '', migratedCount: 0 };

  let count = 0;

  // 1. Match standard markdown with data URL: ![alt](data:image/...)
  let sanitized = rawText.replace(
    /!\[([^\]]*)\]\((data:image\/[a-zA-Z0-9+]+;base64,[A-Za-z0-9+/=]+)\)/g,
    (_, alt, dataUrl) => {
      count++;
      const id = registerImage(dataUrl, alt || 'Screenshot');
      return `![${alt || 'Screenshot'}](attachment:${id})`;
    }
  );

  // 2. Match loose / truncated data:image/... strings that may have broken markdown
  sanitized = sanitized.replace(
    /(?:^|\n)\s*(data:image\/[a-zA-Z0-9+]+;base64,[A-Za-z0-9+/=]{100,})\s*(?:\n|$)/g,
    (_, dataUrl) => {
      count++;
      const id = registerImage(dataUrl, 'Pasted Screenshot');
      return `\n\n![Pasted Screenshot](attachment:${id})\n\n`;
    }
  );

  return { cleanText: sanitized, migratedCount: count };
}
