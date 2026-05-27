import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * Extracts text from a PDF buffer.
 * @param {Buffer} buffer - The PDF file buffer.
 * @returns {Promise<string>} The extracted text.
 */
export async function parsePDF(buffer) {
  try {
    // Convert Buffer to Uint8Array for pdfjs-dist
    const uint8Array = new Uint8Array(buffer);

    // Load the PDF document
    const loadingTask = getDocument({
      data: uint8Array,
      useSystemArr: true,
      disableWorker: true, // Run in main thread, avoiding Node.js worker/path issues
    });

    const pdf = await loadingTask.promise;
    let extractedText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => item.str)
        .join(' ');
      extractedText += pageText + '\n';
    }

    const trimmedText = extractedText.trim();
    if (!trimmedText) {
      throw new Error("Upload a text-based PDF, not a scanned image.");
    }

    return trimmedText;
  } catch (error) {
    // Catch-all: check if it's already our friendly error message
    if (error.message && error.message.includes("scanned image")) {
      throw error;
    }
    
    // Otherwise, wrap standard PDF loading errors
    console.error("PDF Parsing error:", error);
    throw new Error("catastrophic PDF parsing failure. Make sure your file is text-based and unencrypted.");
  }
}
