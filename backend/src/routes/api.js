import express from 'express';
import multer from 'multer';
import { parsePDF } from '../utils/pdfParser.js';
import { generateRoast } from '../services/geminiService.js';

const router = express.Router();

// Multer setup: In-memory storage, 5MB file limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
}).single('file');

/**
 * POST /api/parse-pdf
 * Accepts PDF resume upload in form-data ('file') and extracts text in-memory.
 */
router.post('/parse-pdf', (req, res) => {
  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ 
          error: 'File size exceeds the 5MB limit. Please simplify your resume margins.' 
        });
      }
      return res.status(400).json({ error: `Multer upload error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: 'Failed to process file upload.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Upload a valid PDF resume first.' });
    }

    // Enforce PDF only extension & mimetype check
    const isPdfExtension = req.file.originalname.toLowerCase().endsWith('.pdf');
    const isPdfMime = req.file.mimetype === 'application/pdf';

    if (!isPdfMime && !isPdfExtension) {
      return res.status(400).json({ 
        error: "Please upload a PDF file only. Our incinerator doesn't accept raw formats." 
      });
    }

    try {
      const extractedText = await parsePDF(req.file.buffer);
      return res.json({ text: extractedText });
    } catch (parseError) {
      // If it's a scanned PDF error, return 400 Bad Request, otherwise 500
      const status = parseError.message.includes("scanned") ? 400 : 500;
      return res.status(status).json({ error: parseError.message });
    }
  });
});

/**
 * POST /api/roast
 * Accepts JSON containing resumeText, jobDescription, and persona, returning structured AI feedback.
 */
router.post('/roast', async (req, res) => {
  try {
    const { resumeText, jobDescription, persona } = req.body;

    // PRD F1 validation
    if (!resumeText || typeof resumeText !== 'string' || resumeText.trim() === '') {
      return res.status(400).json({ error: 'Upload a valid PDF resume first.' });
    }

    // PRD F2 validation (min 50 chars)
    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length < 50) {
      return res.status(400).json({ 
        error: 'Paste a target Job Description of at least 50 characters.' 
      });
    }

    // PRD F3 validation
    const validPersonas = ['faang_recruiter', 'startup_founder', 'senior_dev'];
    if (!persona || !validPersonas.includes(persona)) {
      return res.status(400).json({ error: 'Select a Recruiter Persona to host your roast.' });
    }

    const roastResponse = await generateRoast(resumeText, jobDescription, persona);
    return res.json(roastResponse);
  } catch (error) {
    console.error("Roast router error:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
