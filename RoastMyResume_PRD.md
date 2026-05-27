# RoastMyResume — PRD

## Overview
**Tagline:** *Find out why you're not getting the call — before the recruiter does.*  
**Type:** Single-session web app, no auth, no DB  
**Stack:** Next.js 14, Tailwind, Gemini 1.5 Flash, pdf-parse  
**Deadline:** May 28, 2026 | **Event:** GDG SSTC — The Last Quest

---

## Problem
Generic resume tools give generic feedback. No tool compares your resume against a *specific JD* in a recruiter's actual voice. Students don't know why they're getting rejected.

---

## User Flow
```
Upload PDF → Paste JD → Pick Persona → "Roast Me" → Loading → Results
```

---

## Features

### F1 — PDF Upload
- `.pdf` only, max 5MB
- Drag & drop or click
- States: default / uploaded (filename + ✅) / error
- On upload: hit `/api/parse-pdf`, store extracted text in state

### F2 — JD Input
- Textarea, min 50 chars
- Placeholder: *"Paste the full JD — the more detail, the harsher the roast"*

### F3 — Persona Selector
| Persona | Emoji | Tone |
|---------|-------|------|
| Angry FAANG Recruiter | 😤 | Brutal, corporate, zero tolerance |
| Bored Startup Founder | 🥱 | Sarcastic, judges vibe |
| Senior Dev | 🤓 | Nitpicky, technical, condescending |

- Cards UI, one must be selected before submit

### F4 — ATS Score
- 0–100, displayed large at top of results
- Colors: 🔴 0–40 / 🟡 41–70 / 🟢 71–85 / 🔵 86–100
- One-line reason below score

### F5 — Section Analysis
Sections: Summary, Skills, Experience, Projects

```
┌──────────────────┬──────────────────┐
│ 🔥 Roast          │ ✅ Fix            │
│ persona-toned,   │ actionable,      │
│ references actual│ specific,        │
│ resume content   │ 2–4 sentences    │
└──────────────────┴──────────────────┘
```
Desktop: side-by-side | Mobile: stacked

### F6 — Bullet Rewriter
- 3 weakest bullets picked by AI
- Before → After format
- One-click copy button per rewrite

### F7 — Overall Verdict
- One punchy closing line in persona's voice
- Styled as a large italic quote

---

## API Design

### POST `/api/parse-pdf`
- Input: FormData (PDF)
- Output: `{ text: string }`
- Errors: 400 no file / 413 too large / 500 parse fail

### POST `/api/roast`
Input:
```json
{
  "resumeText": "string",
  "jobDescription": "string",
  "persona": "faang_recruiter" | "startup_founder" | "senior_dev"
}
```

Output JSON contract:
```json
{
  "ats_score": 63,
  "ats_reason": "string",
  "sections": {
    "summary": { "roast": "string", "fix": "string" },
    "skills":  { "roast": "string", "fix": "string" },
    "experience": { "roast": "string", "fix": "string" },
    "projects": { "roast": "string", "fix": "string" }
  },
  "weak_bullets": [
    { "original": "string", "rewritten": "string" },
    { "original": "string", "rewritten": "string" },
    { "original": "string", "rewritten": "string" }
  ],
  "verdict": "string"
}
```

---

## Gemini Prompt Rules
- Persona-specific system prompt (tone guide per persona)
- Always reference *actual resume text* — never be generic
- Return **only valid JSON**, no markdown, no preamble
- ATS score = single number, not a range
- Exactly 3 weak bullets
- Roast + fix = 2–4 sentences each

---

## Loading Screen
Full screen, rotating lines every 2s:
- "Reading your resume... oh no."
- "Judging your life choices..."
- "Finding your worst bullet point..."
- "Calculating how unemployable you are..."
- "This might hurt a little."

---

## Error Handling
| Scenario | Message |
|----------|---------|
| Scanned PDF (no text) | "Upload a text-based PDF, not a scanned image." |
| Gemini bad JSON | Auto-retry once, then show error |
| Rate limit | "Too many requests. Try again in a moment." |
| Timeout >30s | Error toast + retry button |

---

## Non-Functional
- Response time < 20s end-to-end
- Fully mobile responsive
- Resume text never persisted (privacy win — mention to judges)
- Gemini key in `.env.local` only

---

## Out of Scope (v1)
Auth, saved history, LinkedIn URL, Word upload, Hindi output, PDF export, multi-JD comparison

---

## Implementation Plan

| Days | Task |
|------|------|
| 1–2 | Setup + PDF upload + parse API |
| 3–4 | Gemini integration + prompt tuning |
| 5–6 | Results UI (score, cards, bullet rewriter) |
| 7–8 | Polish, edge cases, mobile |
| 9 | Vercel deploy + real resume testing |
| 10 (28th) | Submission doc + Loom demo |

---

## Demo Script (May 30)
1. Open deployed URL
2. Upload your own resume (pre-loaded)
3. Paste real Google SWE JD (pre-copied)
4. Select 😤 Angry FAANG Recruiter
5. Hit Roast Me → let loading lines land
6. Show ATS score — pause for reaction
7. Read one roast line out loud
8. Show bullet rewrite
9. Say: *"No other tool does this against a specific JD in a recruiter's voice. And it never stores your resume."*

---

## Novelty Statement
> Most resume tools give generic feedback. RoastMyResume compares your resume against a **specific JD**, roasts you in a **chosen recruiter persona**, and rewrites your **exact weak bullets** — not templates, your actual content.
