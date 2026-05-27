# 🔥 RoastMyResume

> **Tagline:** *Find out why you're not getting the call — before the recruiter does.*

**RoastMyResume** is a privacy-first, highly interactive, and hilariously brutal web application that analyzes a job seeker's resume against a specific target Job Description (JD). Utilizing advanced AI recruiter personas, it roasts candidates' credentials and gives them specific, high-octane fixes to make their resumes actually get interviews.

Built as a decoupled monorepo with a **Next.js 16 (Turbopack) Frontend** and a **Node.js Express Backend**, it is fully optimized for **Vercel** and **Render** production deployments.

---

## ✨ Features & Architecture

```
Upload PDF ➔ Paste Job Description ➔ Select Persona ➔ SAVAGE ROAST & FIXES
```

### 🧠 F1 — Zero-Persistence In-Memory PDF Parser
*   **Privacy-First:** User resumes are never stored on any database or written to disk. The entire extraction runs in-memory.
*   **Text-Based Guardrails:** Detects and handles scanned/unreadable PDFs instantly, prompting users with readable errors.

### 🎯 F2 & F3 — Job Description Alignment & AI Personas
*   Analyzes your resume directly against the requirements of the *specific* job description you paste.
*   Get feedback through three distinct, opinionated AI personas:
    *   **😤 Angry FAANG Recruiter:** Brutal, corporate, zero tolerance, and obsessed with massive metrics.
    *   **🥱 Bored Startup Founder:** Sarcastic, judges the "vibes", hates corporate buzzwords, values speed and shipping.
    *   **🤓 Senior Dev:** Condescending software architect, corrects your stack choices, and mocks basic todo projects.

### 🔴 F4 — Estimated ATS Score Match
*   Generates a dynamic 0–100 score indicating your alignment with the JD, accompanied by color-coded indicator bands:
    *   🔴 **0–40:** Career Disaster (Instant reject)
    *   🟡 **41–70:** Borderline Reject (Needs massive work)
    *   🟢 **71–85:** Decent Effort (Likely phone screen)
    *   🔵 **86–100:** Exceptional Alignment (Fast-track)

### 🔬 F5 & F6 — "Roast & Fix" Diagnostics & Bullet Rewriter
*   **Section-by-Section Critique:** Side-by-side diagnostic cards mapping the **Savage Roast** (persona-voiced critique) against the **Actionable Fix** (2-4 sentences of exact instructions).
*   **Rewrite Engine:** AI isolates the 3 weakest, lowest-impact bullet points in your experience and rewrites them into metric-rich, high-performance copy-pasteable bullets with a **one-click copy button**.

---

## 🛠️ Tech Stack & Engineering Highlights

| Component | Technology | Rationale / Library |
| :--- | :--- | :--- |
| **Artificial Intelligence** | **Google Gemini 2.5 Flash** | Core LLM with strict native JSON Schema Enforcement (`responseSchema`) for 100% reliable system formats. |
| **Frontend** | **Next.js 16 & React 19** | Built with Next.js Turbopack client state hooks, smooth glassmorphism dark-mode UI, and micro-animations. |
| **Backend** | **Express.js & Node.js** | Lightweight REST API server configured entirely in modern JavaScript (ES Modules). |
| **PDF Extraction** | **pdfjs-dist (Mozilla)** | Custom loaded legacy bundle with synchronous worker routing to safely extract text in-memory. |
| **Multi-Part Uploads** | **Multer** | Secure in-memory buffer handling with a strict 5MB size limit. |
| **Monorepo Scripting** | **npm Workspaces & Concurrently** | Links separate `frontend` and `backend` workspaces, starting them concurrently with one terminal command. |

---

## 🚀 Getting Started (Local Development)

### 1. Prerequsites
Make sure you have Node.js (v18+) and npm installed.

### 2. Installation
Clone the repository, go to the root directory, and install all workspace dependencies in one command:
```bash
npm install
```

### 3. Environment Variables
Create the environment files inside both workspace folders:

#### Backend: `backend/.env`
```env
PORT=4000
GEMINI_API_KEY=your_gemini_api_key_here
```

#### Frontend: `frontend/.env.local`
```env
# Keep empty in local development to fall back to Next.js local API rewrites
NEXT_PUBLIC_BACKEND_URL=
```

### 4. Run Development Servers
Start both the Next.js frontend and Express backend concurrently:
```bash
npm run dev
```
*   **Frontend URL:** http://localhost:3000
*   **Backend URL:** http://localhost:4000

---

## ☁️ Production Deployment

### 1. Backend on Render (onrender.com)
*   **Build Command:** `npm install` (The workspace automatically runs a dummy `npm run build` task successfully)
*   **Start Command:** `npm run start --workspace backend`
*   **Environment Variables:**
    *   `GEMINI_API_KEY` = `(Your Gemini Key)`
    *   `NODE_ENV` = `production`
    *   `FRONTEND_URL` = `https://your-app.vercel.app` (Automatically whitelists CORS for this domain and all `*.vercel.app` staging previews)

### 2. Frontend on Vercel (vercel.com)
*   **Build Command:** `npm run build`
*   **Output Directory:** `.next`
*   **Environment Variables:**
    *   `NEXT_PUBLIC_BACKEND_URL` = `https://your-backend-app.onrender.com`
    *   `BACKEND_URL` = `https://your-backend-app.onrender.com`
    
> [!IMPORTANT]
> **Vercel 10-Second Serverless Timeout Bypass:**
> Next.js rewrites on Vercel fail frequently due to the strict 10s Serverless Hobby timeout. **RoastMyResume** resolves this by dynamically checking `NEXT_PUBLIC_BACKEND_URL` in production, routing fetches directly to your Render instance straight from the browser—bypassing Vercel's limits completely!

---

## 📜 License
Built with passion for **GDG SSTC — The Last Quest (May 2026)**. Zero-persistence resume parsing, privacy-first, 100% savage.
