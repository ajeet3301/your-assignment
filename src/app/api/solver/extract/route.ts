import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const fileName = file.name || 'document.txt';
    const ext = fileName.toLowerCase().split('.').pop() || '';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = '';

    // 1. Plain Text
    if (ext === 'txt') {
      extractedText = buffer.toString('utf-8');
    }
    // 2. Word Document (.docx)
    else if (ext === 'docx') {
      const zip = await JSZip.loadAsync(buffer);
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
        extractedText = paragraphs.join('\n\n');
      }
    }
    // 3. PDF Document (.pdf)
    else if (ext === 'pdf') {
      try {
        const pdfModule: any = await import('pdf-parse');
        const pdfParse = pdfModule.default || pdfModule;
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text || '';
      } catch (err: any) {
        return NextResponse.json({ error: 'Failed to extract text from PDF: ' + err.message }, { status: 500 });
      }
    }
    // 4. Image (.png, .jpg, .jpeg, .webp) -> Vision OCR
    else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      const apiKey = process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY;
      if (apiKey) {
        const base64 = buffer.toString('base64');
        const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
        const dataUrl = `data:${mime};base64,${base64}`;

        const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'google/gemini-2.0-flash-exp:free',
            messages: [
              {
                role: 'system',
                content:
                  'You are an OCR and document parser. Transcribe all text, headers, and assignment questions from the image exactly as shown. Keep question numbers (Q1., Q2., etc.). Output ONLY the transcribed text.',
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'Transcribe this assignment question sheet:' },
                  { type: 'image_url', image_url: { url: dataUrl } },
                ],
              },
            ],
          }),
        });

        if (aiRes.ok) {
          const data = await aiRes.json();
          extractedText = data.choices?.[0]?.message?.content || '';
        }
      }

      if (!extractedText) {
        extractedText =
          `Assignment Sheet Photo (${fileName})\n\n` +
          `Q1. Answer the assignment problem shown in the uploaded screenshot.\n` +
          `Q2. Provide complete working steps, explanation, and diagram if applicable.`;
      }
    } else {
      return NextResponse.json(
        { error: `Unsupported file format (.${ext}). Upload .txt, .docx, .pdf, or image.` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      fileName,
      text: extractedText.trim(),
    });
  } catch (err: any) {
    console.error('File extraction exception:', err);
    return NextResponse.json({ error: err.message || 'File processing failed' }, { status: 500 });
  }
}
