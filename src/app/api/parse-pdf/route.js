import { NextResponse } from 'next/server';
import { createRequire } from 'module';

const nodeRequire = createRequire(import.meta.url);
const pdf = nodeRequire('pdf-parse/lib/pdf-parse.js');

export const runtime = 'nodejs';

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
      const parsePdf = typeof pdf === 'function' ? pdf : (pdf && pdf.default);
      if (typeof parsePdf !== 'function') {
        throw new Error(`PDF parsing library was not loaded correctly. (Type: ${typeof pdf}, default type: ${pdf ? typeof pdf.default : 'undefined'}).`);
      }
      const data = await parsePdf(buffer);
      parsedText = data.text;
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
