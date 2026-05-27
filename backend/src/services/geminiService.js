import { GoogleGenerativeAI } from '@google/generative-ai';

// Lazy initialization of the Gemini API client to prevent Node ESM load order issues
let genAI;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment variables. Please check your backend/.env.local file.");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// Define the response schema matching the PRD contract exactly
const responseSchema = {
  type: "OBJECT",
  properties: {
    ats_score: { 
      type: "INTEGER",
      description: "Estimated ATS match score from 0 to 100 based on the JD alignment."
    },
    ats_reason: { 
      type: "STRING", 
      description: "A one-line punchy reason justifying the ATS score."
    },
    sections: {
      type: "OBJECT",
      properties: {
        summary: {
          type: "OBJECT",
          properties: {
            roast: { type: "STRING", description: "Brutal critique of the summary, 2-4 sentences, in persona voice." },
            fix: { type: "STRING", description: "Highly specific and actionable fix, 2-4 sentences." }
          },
          required: ["roast", "fix"]
        },
        skills: {
          type: "OBJECT",
          properties: {
            roast: { type: "STRING", description: "Brutal critique of the skills list, 2-4 sentences, in persona voice." },
            fix: { type: "STRING", description: "Highly specific and actionable fix, 2-4 sentences." }
          },
          required: ["roast", "fix"]
        },
        experience: {
          type: "OBJECT",
          properties: {
            roast: { type: "STRING", description: "Brutal critique of their experience, 2-4 sentences, in persona voice." },
            fix: { type: "STRING", description: "Highly specific and actionable fix, 2-4 sentences." }
          },
          required: ["roast", "fix"]
        },
        projects: {
          type: "OBJECT",
          properties: {
            roast: { type: "STRING", description: "Brutal critique of their projects, 2-4 sentences, in persona voice." },
            fix: { type: "STRING", description: "Highly specific and actionable fix, 2-4 sentences." }
          },
          required: ["roast", "fix"]
        }
      },
      required: ["summary", "skills", "experience", "projects"]
    },
    weak_bullets: {
      type: "ARRAY",
      description: "Array of exactly 3 weak bullets extracted from their resume, with high-impact rewrites.",
      items: {
        type: "OBJECT",
        properties: {
          original: { type: "STRING", description: "The original low-impact bullet from the resume." },
          rewritten: { type: "STRING", description: "A high-impact rewritten version aligning with target JD and metrics." }
        },
        required: ["original", "rewritten"]
      }
    },
    verdict: { 
      type: "STRING", 
      description: "A single, incredibly sharp, hilarious, and punchy closing verdict line in the persona's voice."
    }
  },
  required: ["ats_score", "ats_reason", "sections", "weak_bullets", "verdict"]
};

// Define system instructions and system prompts for each persona
const PERSONA_INSTRUCTIONS = {
  faang_recruiter: `
You are an extremely angry, elite, and cynical FAANG Recruiter. You've reviewed 10,000 resumes today and rejected 9,999 of them.
Your tone is brutal, corporate, highly critical, impatient, and elitist.
Critique rules:
- You absolutely hate formatting mistakes, non-impact-driven bullets, and missing metrics.
- Point out lack of scalable impact, lack of cost/time savings, or basic tech stacks.
- Mock simple, generic certifications or basic degrees.
- Refer to actual details in the candidate's resume (e.g. specific companies, dates, tools, projects).
- Keep the critique funny, corporate-savage, and realistic to a harsh FAANG filtering round.
`,
  startup_founder: `
You are a bored, highly sarcastic, and hyperactive Startup Founder. You believe college is a waste of time, corporate pedigree is fake, and only builders survive.
Your tone is cynical, sarcastic, informal, punchy, and highly opinionated.
Critique rules:
- You absolutely mock standard corporate buzzwords (like 'leveraged', 'synergized', 'spearheaded').
- Mock academic achievements, GPA, and standard 'safe' career choices.
- Value speed, raw building, shipping products, and chaotic hustle.
- Refer to actual details in the candidate's resume (specific companies, projects, tools).
- Critique whether their 'vibes' are match for a 120-hour-week startup or if they are just a 'corporate seat-warmer'.
`,
  senior_dev: `
You are a condescending, pedantic, and highly nitpicky Senior Developer. You believe you are the smartest software architect on the planet and everyone else writes spaghetti code.
Your tone is patronizing, technical, highly analytical, and condescending.
Critique rules:
- Critique their technical stack and framework choices (e.g. mocking them for using basic templates, or using React for a static landing page).
- Mock generic, basic projects (e.g. 'Todo list', 'Weather app', basic tutorial projects).
- Point out architectural flaws, lack of tests, scale issues, database normalization errors, or missing systems context.
- Refer to actual details in the candidate's resume (specific tech, libraries, database choices, or bullet descriptions).
- Ask condescending questions like 'Why use X when Y is 10x more performant?' or 'Did you copy-paste this from a medium article?'
`
};

const BASE_PROMPT_GUIDELINE = `
You will be provided a candidate's Resume Text and a Target Job Description (JD).
Your task is to thoroughly analyze the candidate's alignment with the Job Description and return a brutally honest, highly specific evaluation based on your persona.

GENERAL RULES:
1. You MUST refer to specific, actual content from the candidate's resume (technologies, projects, companies, experience descriptions). Never be generic.
2. For each of the sections ('summary', 'skills', 'experience', 'projects') inside the 'sections' object:
   - Provide a 'roast' containing a brutal critique in your persona's voice (exactly 2 to 4 sentences).
   - Provide a 'fix' containing extremely specific, actionable advice (exactly 2 to 4 sentences) to resolve the critique and align better with the target JD.
3. In the 'weak_bullets' array, identify exactly 3 weak, low-impact, or vague bullet points from the resume. For each:
   - Provide the 'original' bullet point exactly as written in the resume.
   - Provide a 'rewritten' version that is highly professional, impact-focused, quantifies results (uses metrics/numbers), and aligns directly with target requirements of the Job Description.
4. Generate an overall ATS Score (0 to 100) representing how well the resume aligns with the JD:
   - 🔴 0–40 (complete disaster, instant reject)
   - 🟡 41–70 (needs massive work, borderline reject)
   - 🟢 71–85 (decent effort, maybe a phone screen)
   - 🔵 86–100 (exceptional alignment)
5. Provide a one-line 'ats_reason' explaining the score.
6. Provide a single closing 'verdict' line (highly punchy, funny, and memorable) in your persona's voice.
7. Return ONLY valid JSON matching the schema. No conversational filler, no markdown formatting, no preambles.
`;

/**
 * Generates a structured resume roast and recommendations.
 * @param {string} resumeText - The parsed text of the candidate's resume.
 * @param {string} jobDescription - The pasted job description.
 * @param {string} persona - The recruiter persona selected.
 * @returns {Promise<object>} The parsed JSON response matching the schema.
 */
export async function generateRoast(resumeText, jobDescription, persona) {
  try {
    const systemInstruction = PERSONA_INSTRUCTIONS[persona] || PERSONA_INSTRUCTIONS.faang_recruiter;
    const genAIInstance = getGenAI();
    
    // Get the Gemini model configured with JSON response type and schema
    const model = genAIInstance.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemInstruction,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.85
      }
    });

    const userPrompt = `
${BASE_PROMPT_GUIDELINE}

---
CANDIDATE'S RESUME TEXT:
"""
${resumeText}
"""

---
TARGET JOB DESCRIPTION:
"""
${jobDescription}
"""
`;

    const result = await model.generateContent(userPrompt);
    const responseText = result.response.text();
    
    // Parse the JSON. Because we used responseSchema, it is guaranteed to be valid JSON matching the schema!
    const parsedData = JSON.parse(responseText);
    return parsedData;
  } catch (error) {
    console.error("Gemini service error during roast generation:", error);
    throw new Error("An error occurred during generative AI parsing. Please check your config and try again.");
  }
}
