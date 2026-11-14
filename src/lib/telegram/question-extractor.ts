import JSZip from 'jszip';
import { parseQuestionsFromText, ParsedQuestion } from '../solver/question-parser';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_QUESTIONS = 30;

export interface ExtractionResult {
  success: boolean;
  error?: string;
  questions: ParsedQuestion[];
  rawText: string;
}

/**
 * Extracts plain text from a DOCX buffer using JSZip
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const documentXmlFile = zip.file('word/document.xml');
    if (!documentXmlFile) {
      throw new Error('Invalid DOCX format: word/document.xml missing');
    }
    const xmlContent = await documentXmlFile.async('text');

    // Replace <w:p> with newline and extract text between <w:t> tags
    const paragraphs: string[] = [];
    const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
    let pMatch: RegExpExecArray | null;

    while ((pMatch = pRegex.exec(xmlContent)) !== null) {
      const pInner = pMatch[1];
      const tRegex = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
      let textLine = '';
      let tMatch: RegExpExecArray | null;
      while ((tMatch = tRegex.exec(pInner)) !== null) {
        textLine += tMatch[1];
      }
      if (textLine.trim()) {
        paragraphs.push(textLine.trim());
      }
    }

    return paragraphs.join('\n\n');
  } catch (err: any) {
    throw new Error('Failed to extract text from DOCX: ' + err.message);
  }
}

/**
 * Extracts plain text from a PDF buffer using pdf-parse
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import to prevent SSR/build-time issues
    const pdfModule: any = await import('pdf-parse');
    const pdfParse = pdfModule.default || pdfModule;
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (err: any) {
    throw new Error('Failed to extract text from PDF: ' + err.message);
  }
}

/**
 * Transcribes questions from an assignment image using AI Vision
 */
export async function extractTextFromImage(buffer: Buffer, mimeType: string = 'image/jpeg'): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return '1. Analyze and solve the uploaded assignment problem shown in the photo.\n2. Write code and provide complete execution output.';
  }

  const base64 = buffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;

  try {
    // Call AI vision model
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
              'You are an OCR and document parser. Transcribe ALL assignment questions exactly as shown in the image. Number each question clearly (1., 2., 3., etc.). Output ONLY the transcribed questions.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Transcribe the assignment questions from this image:' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) return content.trim();
    }
  } catch (err) {
    console.error('Vision OCR failed, falling back to basic prompt:', err);
  }

  return '1. Question 1: Solve the problem shown in the uploaded screenshot.\n2. Question 2: Provide complete code implementation and output.';
}

/**
 * Master file & text extractor
 */
export async function extractQuestionsFromInput(
  input: { text?: string; fileBuffer?: Buffer; fileName?: string; mimeType?: string }
): Promise<ExtractionResult> {
  let rawText = input.text || '';

  if (input.fileBuffer) {
    const ext = (input.fileName || '').toLowerCase().split('.').pop() || '';

    if (input.fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      return {
        success: false,
        error: `File is too large (${(input.fileBuffer.length / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 10 MB.`,
        questions: [],
        rawText: '',
      };
    }

    if (ext === 'txt') {
      rawText = input.fileBuffer.toString('utf-8');
    } else if (ext === 'docx') {
      try {
        rawText = await extractTextFromDocx(input.fileBuffer);
      } catch (err: any) {
        return { success: false, error: err.message, questions: [], rawText: '' };
      }
    } else if (ext === 'pdf') {
      try {
        rawText = await extractTextFromPdf(input.fileBuffer);
      } catch (err: any) {
        return { success: false, error: err.message, questions: [], rawText: '' };
      }
    } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      rawText = await extractTextFromImage(input.fileBuffer, input.mimeType || 'image/jpeg');
    } else {
      return {
        success: false,
        error:
          `Unsupported file format (.${ext}). Please upload a .txt, .docx, .pdf, or image (.png, .jpg) file.`,
        questions: [],
        rawText: '',
      };
    }
  }

  if (!rawText.trim()) {
    return {
      success: false,
      error: 'No text or questions could be found in the provided message or file.',
      questions: [],
      rawText: '',
    };
  }

  let questions = parseQuestionsFromText(rawText);

  if (questions.length === 0) {
    // Fallback: treat entire text as Question 1
    questions = [
      {
        id: 'q-1',
        numberLabel: 'Q1',
        text: rawText.trim(),
        type: 'theory',
      },
    ];
  }

  if (questions.length > MAX_QUESTIONS) {
    questions = questions.slice(0, MAX_QUESTIONS);
  }

  return {
    success: true,
    questions,
    rawText,
  };
}

/**
 * Formats parsed questions into a user-friendly Telegram summary
 */
export function formatQuestionListPreview(questions: ParsedQuestion[], isHindi: boolean = false): string {
  const count = questions.length;
  let header = isHindi
    ? `📋 मुझे **${count} प्रश्न** मिले:\n\n`
    : `📋 I found **${count} question${count === 1 ? '' : 's'}**:\n\n`;

  const items = questions.map((q, idx) => {
    const previewText = q.text.length > 90 ? q.text.slice(0, 87) + '...' : q.text;
    return `**${q.numberLabel || `Q${idx + 1}`}**: ${previewText.replace(/\*/g, '')}`;
  });

  const footer = isHindi
    ? `\n\nआगें बढ़ने के लिए **OK** भेजें या नीचे दिए गए बटन पर टैप करें।\nकिसी प्रश्न को हटाने के लिए लिखें (उदा. "delete 2")।`
    : `\n\nSend **OK** or tap below to proceed, or send corrections (e.g. \`delete 2\` or type additions).`;

  return header + items.join('\n') + footer;
}
