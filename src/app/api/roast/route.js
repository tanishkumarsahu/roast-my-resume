import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const PERSONAS = {
  faang_recruiter: {
    name: "Angry FAANG Recruiter",
    emoji: "😤",
    toneDescription: "brutal, corporate, hyper-critical, zero tolerance, obsessed with elite credentials (Ivy Leagues, FAANG history), hates formatting errors, references LeetCode grind, and acts like they have 10,000 other resumes to read."
  },
  startup_founder: {
    name: "Bored Startup Founder",
    emoji: "🥱",
    toneDescription: "sarcastic, easily bored, cynical, judges 'vibes', hates corporate fluff and corporate drones, mocks massive bureaucracies, values 'builders' and raw speed, and looks for signs of actual hands-on shipping rather than slide-making."
  },
  senior_dev: {
    name: "Senior Dev",
    emoji: "🤓",
    toneDescription: "nitpicky, highly technical, condescending, gatekeeping, complains about library/stack choices, groans at over-engineering, mocks buzzwords, and treats every resume like a poorly written pull request that needs to be rejected."
  }
};

export async function POST(request) {
  try {
    const { resumeText, jobDescription, persona } = await request.json();

    // Validations
    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json({ error: 'Missing or too short resume text context.' }, { status: 400 });
    }

    if (!jobDescription || jobDescription.trim().length < 50) {
      return NextResponse.json({ error: 'Job description is too short! Paste a detailed JD of at least 50 characters.' }, { status: 400 });
    }

    if (!persona || !PERSONAS[persona]) {
      return NextResponse.json({ error: 'Invalid persona selected.' }, { status: 400 });
    }

    const selectedPersona = PERSONAS[persona];
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'GEMINI_API_KEY is not configured on the server. Please add your Gemini API Key to your environment variables or .env.local file.'
      }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const systemPrompt = `You are a savage, elite AI Resume Reviewer acting in the exact role of: ${selectedPersona.name} ${selectedPersona.emoji}. 
Your personality is: ${selectedPersona.toneDescription}

Your objective is to compare the candidate's resume text against the provided Job Description (JD). You must dissect the resume, find where the candidate fails to meet the JD, and roast their life choices while providing genuine, constructive advice on how to fix it.

You must output your complete analysis in a strict JSON format matching this EXACT schema:
{
  "ats_score": 63, // Must be an integer between 0 and 100 reflecting how well the resume matches the JD (not a range).
  "ats_reason": "string (a brief, one-sentence summary of why they got this score, in your persona's voice)",
  "sections": {
    "summary": { 
      "roast": "string (2-4 highly sarcastic, witty sentences roasting their summary/objective based on the JD)", 
      "fix": "string (2-4 highly specific, constructive sentences telling them exactly how to rewrite it to fit the JD)" 
    },
    "skills": { 
      "roast": "string (2-4 highly sarcastic, witty sentences mocking their skills, buzzwords, or technology stacks based on the JD)", 
      "fix": "string (2-4 highly specific, constructive sentences detailing exactly what tools/skills they must emphasize or learn for this JD)" 
    },
    "experience": { 
      "roast": "string (2-4 highly sarcastic, witty sentences roasting their work history, job titles, or lack of impact based on the JD)", 
      "fix": "string (2-4 highly specific, constructive sentences advising them how to reposition their work history to hit the JD requirements)" 
    },
    "projects": { 
      "roast": "string (2-4 highly sarcastic, witty sentences mocking their side projects, simple school projects, or over-engineered toys based on the JD)", 
      "fix": "string (2-4 highly specific, constructive sentences suggesting high-impact, relevant projects they should add to match the JD)" 
    }
  },
  "weak_bullets": [
    {
      "original": "string (the EXACT weak, low-impact, or vague bullet point taken verbatim from the candidate's resume)",
      "rewritten": "string (a high-octane, highly professional, results-oriented rewrite of that bullet point tailored to the JD, using strong action verbs and quantified impact)"
    },
    {
      "original": "string (the second verbatim weak bullet from the resume)",
      "rewritten": "string (the high-impact rewritten version of the second bullet)"
    },
    {
      "original": "string (the third verbatim weak bullet from the resume)",
      "rewritten": "string (the high-impact rewritten version of the third bullet)"
    }
  ], // There must be EXACTLY 3 weak bullet points analyzed.
  "verdict": "string (one final, extremely punchy, memorable, and devastating closing line in your persona's voice)"
}

Rules:
1. ALWAYS reference actual content from the candidate's resume and compare it directly to the JD. Do not make up fake job history.
2. Be brutally funny, sarcastic, and characteristic of your persona, but ensure the "fix" fields are highly actionable and high-quality.
3. Your output must be ONLY the raw, valid JSON. No markdown backticks, no markdown wrapping, and no conversational preamble.

Here is the candidate's Resume:
---
${resumeText}
---

Here is the Target Job Description (JD):
---
${jobDescription}
---`;

    const response = await model.generateContent(systemPrompt);
    const responseText = response.response.text();
    
    // Parse JSON
    let roastData;
    try {
      roastData = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('Failed to parse Gemini JSON response:', responseText);
      // Fallback JSON in case AI outputs invalid JSON
      roastData = {
        ats_score: 30,
        ats_reason: "Your resume was so structurally chaotic that it broke our AI's grading circuits.",
        sections: {
          summary: { roast: "Your summary is completely illegible or non-existent.", fix: "Write a short, 3-line professional summary highlighting your actual technical metrics." },
          skills: { roast: "Your skills are either completely missing or misaligned with the job description.", fix: "List concrete, relevant tools and frameworks instead of generic soft skills." },
          experience: { roast: "Your experience doesn't show any quantifiable achievements or ownership.", fix: "Rewrite your bullet points using the X-Y-Z formula: Accomplished [X], as measured by [Y], by doing [Z]." },
          projects: { roast: "Your projects section looks like a list of simple tutorial clones.", fix: "Build a complex, full-stack application with real users and state management." }
        },
        weak_bullets: [
          { original: "Responsible for writing code.", rewritten: "Engineered and maintained robust frontend features, increasing user engagement by 15%." },
          { original: "Assisted the team.", rewritten: "Collaborated with cross-functional teams to deliver critical product features ahead of schedule." },
          { original: "Worked on database.", rewritten: "Optimized database queries, reducing API response times by 30%." }
        ],
        verdict: "Please delete this file and start over. I have zero words."
      };
    }

    return NextResponse.json(roastData);

  } catch (error) {
    console.error('Server error in /api/roast:', error);
    return NextResponse.json({ error: error.message || 'Internal server error occurred.' }, { status: 500 });
  }
}
