import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Direct Client-to-Storage Upload Route (Vercel Blob)
 * Never passes large file bytes through serverless API memory!
 * Files stream directly from browser to Vercel Blob.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  // If Vercel Blob is not configured, inform client
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          'Vercel Blob is not configured. Falling back to in-browser IndexedDB / data-url storage.',
        fallback: true,
      },
      { status: 200 }
    );
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Authenticate & limit uploads to valid assignment extensions
        const validExtensions = ['.txt', '.docx', '.pdf', '.png', '.jpg', '.jpeg'];
        const isValid = validExtensions.some((ext) => pathname.toLowerCase().endsWith(ext));

        if (!isValid) {
          throw new Error('Unsupported file extension. Only .txt, .docx, .pdf, .png, .jpg allowed.');
        }

        return {
          allowedContentTypes: [
            'text/plain',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/pdf',
            'image/png',
            'image/jpeg',
          ],
          maximumSizeInBytes: 25 * 1024 * 1024, // 25 MB max direct upload
          tokenPayload: JSON.stringify({ uploadedAt: Date.now() }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Run any post-upload notification or indexing
        console.log('Blob upload completed successfully:', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 } // Bad request
    );
  }
}
