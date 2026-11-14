import JSZip from 'jszip';

/**
 * Extracts plain text from an uploaded File (TXT, DOCX, PDF, or Image).
 * DOCX and TXT are processed instantly client-side;
 * PDF and Images use the server extraction endpoint.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.toLowerCase().split('.').pop() || '';

  // 1. Text file: read client-side directly
  if (ext === 'txt') {
    return await file.text();
  }

  // 2. DOCX: extract XML in browser using JSZip
  if (ext === 'docx') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const documentXml = zip.file('word/document.xml');
      if (documentXml) {
        const xml = await documentXml.async('text');
        const paragraphs: string[] = [];
        const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
        let pMatch: RegExpExecArray | null;

        while ((pMatch = pRegex.exec(xml)) !== null) {
          const tRegex = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
          let textLine = '';
          let tMatch: RegExpExecArray | null;
          while ((tMatch = tRegex.exec(pMatch[1])) !== null) {
            textLine += tMatch[1];
          }
          if (textLine.trim()) paragraphs.push(textLine.trim());
        }
        return paragraphs.join('\n\n');
      }
    } catch (e) {
      console.warn('Client DOCX parsing failed, falling back to server:', e);
    }
  }

  // 3. Fallback & Server processing for PDF, Images, and large DOCX
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/solver/extract', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to extract text from file');
  }

  return data.text || '';
}
