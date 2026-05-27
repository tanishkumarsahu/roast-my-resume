import { NextResponse } from 'next/server';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export const runtime = 'nodejs';

async function extractTextFromPdf(buffer) {
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
    isEvalSupported: false,
    isOffscreenCanvasSupported: false,
    useSystemFonts: false,
    useWorkerFetch: false,
    useWasm: false,
  });

  const pdfDocument = await loadingTask.promise;

  try {
    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .filter((item) => typeof item.str === 'string')
        .map((item) => item.str)
        .join(' ');

      pages.push(pageText);
      page.cleanup();
    }

    return pages.join('\n\n');
  } finally {
    await pdfDocument.destroy();
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No resume file uploaded!' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported!' }, { status: 400 });
    }

    // PRD F1 - max 5MB (5 * 1024 * 1024 bytes)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size exceeds the 5MB limit. Please upload a lighter PDF.' }, { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let parsedText = '';
    try {
      parsedText = await extractTextFromPdf(buffer);
    } catch (parseError) {
      console.error('PDF parsing error inside /api/parse-pdf:', parseError);
      return NextResponse.json({ 
        error: `Failed to extract text from the PDF. Error detail: ${parseError.message || parseError}` 
      }, { status: 500 });
    }

    if (!parsedText || parsedText.trim().length < 50) {
      return NextResponse.json({ error: 'Upload a text-based PDF, not a scanned image.' }, { status: 400 });
    }

    return NextResponse.json({ text: parsedText });

  } catch (error) {
    console.error('Server error in /api/parse-pdf:', error);
    return NextResponse.json({ error: error.message || 'Internal server error occurred.' }, { status: 500 });
  }
}
