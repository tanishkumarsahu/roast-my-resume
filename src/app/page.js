'use client';

import { useState, useEffect, useRef } from 'react';

const LOADING_MESSAGES = [
  "Reading your resume... oh no.",
  "Judging your life choices...",
  "Finding your worst bullet point...",
  "Calculating how unemployable you are...",
  "This might hurt a little."
];

const PERSONAS = [
  {
    id: "faang_recruiter",
    name: "Angry FAANG Recruiter",
    emoji: "😤",
    styleClass: "faang",
    tagline: "Brutal, corporate, zero tolerance."
  },
  {
    id: "startup_founder",
    name: "Bored Startup Founder",
    emoji: "🥱",
    styleClass: "startup",
    tagline: "Sarcastic, judges vibe."
  },
  {
    id: "senior_dev",
    name: "Senior Dev",
    emoji: "🤓",
    styleClass: "dev",
    tagline: "Nitpicky, technical, condescending."
  }
];

export default function Home() {
  // --- States ---
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [error, setError] = useState(null);
  
  // Inputs matching PRD
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [persona, setPersona] = useState(''); // faang_recruiter, startup_founder, senior_dev

  // Results state
  const [roast, setRoast] = useState(null);
  
  // Interactive copy-to-clipboard state
  const [copiedIndex, setCopiedIndex] = useState(null);
  
  // Refs
  const fileInputRef = useRef(null);

  // --- Effects ---
  
  // Load session from sessionStorage on mount
  useEffect(() => {
    try {
      const cachedRoast = sessionStorage.getItem('roastData_v2');
      const cachedText = sessionStorage.getItem('resumeText_v2');
      const cachedJD = sessionStorage.getItem('jobDescription_v2');
      const cachedPersona = sessionStorage.getItem('persona_v2');
      
      if (cachedRoast && cachedText) {
        setRoast(JSON.parse(cachedRoast));
        setResumeText(cachedText);
        if (cachedJD) setJobDescription(cachedJD);
        if (cachedPersona) setPersona(cachedPersona);
      }
    } catch (e) {
      console.error("Error loading session:", e);
    }
  }, []);

  // PRD Loading Screen: rotating lines every 2s
  useEffect(() => {
    let intervalId;
    if (loading) {
      let index = 0;
      setLoadingMsg(LOADING_MESSAGES[0]);
      intervalId = setInterval(() => {
        index = (index + 1) % LOADING_MESSAGES.length;
        setLoadingMsg(LOADING_MESSAGES[index]);
      }, 2000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [loading]);

  // --- Handlers ---
  
  // Drag & Drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await processSelectedFile(e.target.files[0]);
    }
  };

  const clickUploadArea = () => {
    fileInputRef.current.click();
  };

  // Validates, uploads to parse-pdf, and stores extracted text
  const processSelectedFile = async (selectedFile) => {
    setError(null);
    
    // PRD F1 - PDF Only validation
    if (selectedFile.type !== 'application/pdf') {
      setError('Please upload a PDF file only. Our incinerator doesn\'t accept raw formats.');
      return;
    }
    
    // PRD F1 - max 5MB (5 * 1024 * 1024 bytes)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      setError('File size exceeds the 5MB limit. Please simplify your resume margins.');
      return;
    }

    setFile(selectedFile);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Decoupled Route: POST /api/parse-pdf
      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract text from your PDF.');
      }

      setResumeText(data.text);
      sessionStorage.setItem('resumeText_v2', data.text);

    } catch (err) {
      console.error(err);
      setFile(null);
      setError(err.message || 'catastrophic PDF parsing failure. Make sure your file is text-based and unencrypted.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger JSON-based /api/roast call
  const handleRoastSubmit = async () => {
    if (!resumeText) {
      setError('Upload a valid PDF resume first.');
      return;
    }
    if (jobDescription.trim().length < 50) {
      setError('Paste a target Job Description of at least 50 characters.');
      return;
    }
    if (!persona) {
      setError('Select a Recruiter Persona to host your roast.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // POST /api/roast (JSON Contract)
      const response = await fetch('/api/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText,
          jobDescription,
          persona
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server error occurred during roasting.');
      }

      setRoast(data);
      
      // Cache session data
      sessionStorage.setItem('roastData_v2', JSON.stringify(data));
      sessionStorage.setItem('jobDescription_v2', jobDescription);
      sessionStorage.setItem('persona_v2', persona);

    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during generative AI parsing. Please check your config and try again.');
    } finally {
      setLoading(false);
    }
  };

  // F6 - Copy-to-clipboard action per bullet rewrite
  const copyBullet = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  // Reset entire flow
  const handleReset = () => {
    sessionStorage.removeItem('roastData_v2');
    sessionStorage.removeItem('resumeText_v2');
    sessionStorage.removeItem('jobDescription_v2');
    sessionStorage.removeItem('persona_v2');

    setFile(null);
    setResumeText('');
    setJobDescription('');
    setPersona('');
    setRoast(null);
    setError(null);
  };

  // --- Dynamic Color Band Resolver for F4 ATS Score ---
  const getScoreClass = (score) => {
    if (score <= 40) return 'score-red';     // 🔴 0–40
    if (score <= 70) return 'score-yellow';  // 🟡 41–70
    if (score <= 85) return 'score-green';   // 🟢 71–85
    return 'score-blue';                     // 🔵 86–100
  };

  const getPersonaAuthorName = (personaId) => {
    const matched = PERSONAS.find(p => p.id === personaId);
    return matched ? matched.name : "The Recruiter";
  };

  const isSubmitDisabled = !file || !resumeText || jobDescription.trim().length < 50 || !persona;

  return (
    <div className="app-container">
      {/* Global Header */}
      <header className="app-header">
        <div className="logo-wrapper">
          <span className="fire-emoji">🔥</span>
          <h1 className="logo-text">ROAST MY RESUME</h1>
        </div>
        <p className="app-subtitle">
          Find out why you're not getting the call — before the recruiter does. Compare your resume directly against a specific JD under real recruiter personas.
        </p>
      </header>

      {/* ERROR MESSAGE CARD */}
      {error && (
        <div className="error-box" style={{ background: 'hsla(0, 84%, 60%, 0.1)', border: '1px solid hsla(0, 84%, 60%, 0.3)', borderRadius: '12px', padding: '1.5rem', margin: roast ? '1.5rem 0' : '1.5rem auto', maxWidth: roast ? '100%' : '750px' }}>
          <div style={{ color: '#ff5252', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span>⚠️</span> Error Code: Career Disaster
          </div>
          <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.95rem', lineHeight: '1.5' }}>{error}</p>
        </div>
      )}

      {/* --- VIEW 1: FORM INPUTS STAGE --- */}
      {!roast && !loading && (
        <main className="input-stage-card glass-card">
          
          {/* Step 1: PDF Upload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h2 className="stage-title">
              <span className="stage-title-number">1</span> F1 — PDF Upload
            </h2>
            <div 
              className={`dropzone ${dragActive ? 'active' : ''} ${file ? 'uploaded' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={clickUploadArea}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                className="file-input" 
                accept=".pdf"
                onChange={handleFileChange}
              />
              <span className="dropzone-icon">
                {file ? "✅" : "📁"}
              </span>
              <h3 className="upload-title">
                {file ? `${file.name} — Loaded` : "Drag & drop your PDF resume here"}
              </h3>
              <p className="upload-desc">
                {file 
                  ? `Ready to match! File size: ${(file.size / 1024 / 1024).toFixed(2)} MB.` 
                  : "PDF only, max 5MB size limit enforced."}
              </p>
            </div>
          </div>

          {/* Step 2: Job Description Input */}
          <div className="jd-textarea-wrapper">
            <h2 className="stage-title">
              <span className="stage-title-number">2</span> F2 — Paste Target Job Description
            </h2>
            <textarea 
              className="jd-textarea"
              placeholder="Paste the full JD — the more detail, the harsher the roast..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
            <span className={`jd-counter ${jobDescription.trim().length >= 50 ? 'valid' : ''}`}>
              {jobDescription.trim().length} / 50 characters min
            </span>
          </div>

          {/* Step 3: Persona Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h2 className="stage-title">
              <span className="stage-title-number">3</span> F3 — Pick Recruiter Persona
            </h2>
            <div className="persona-grid">
              {PERSONAS.map((p) => (
                <div 
                  key={p.id}
                  className={`persona-card ${persona === p.id ? `active ${p.styleClass}` : ''}`}
                  onClick={() => setPersona(p.id)}
                >
                  <span className="persona-emoji">{p.emoji}</span>
                  <span className="persona-name">{p.name}</span>
                  <span className="persona-desc">{p.tagline}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Trigger */}
          <div style={{ marginTop: '1rem' }}>
            <button 
              className="roast-submit-button"
              onClick={handleRoastSubmit}
              disabled={isSubmitDisabled}
            >
              ROAST MY LIFE
            </button>
          </div>

        </main>
      )}

      {/* --- LOADING STAGE SCREEN --- */}
      {loading && (
        <main className="loading-overlay glass-card">
          <div className="loading-box">
            <div className="flame-spinner"></div>
            <h2 className="loading-text" style={{ minHeight: '2.5rem' }}>{loadingMsg}</h2>
            <p className="loading-subtext" style={{ marginTop: '0.5rem' }}>
              Your credentials are being thoroughly examined against corporate standards. Please maintain professional silence.
            </p>
          </div>
        </main>
      )}

      {/* --- VIEW 2: RESULTS DASHBOARD STAGE --- */}
      {roast && !loading && (
        <main className="results-dashboard">
          
          {/* F4 - ATS Score visual gauge */}
          <div className="ats-score-card glass-card">
            <div className="ats-score-info">
              <span className="ats-score-label">Estimated ATS Score Match</span>
              <h2 className="grade-custom-label">Grading Complete</h2>
              <p className="ats-reason-text">"{roast.ats_reason}"</p>
            </div>
            
            <div className="grade-gauge-container">
              <div className={`ats-circle-gauge ${getScoreClass(roast.ats_score)}`}>
                <span className="ats-circle-val">{roast.ats_score}</span>
                <span className="ats-circle-max">/ 100</span>
              </div>
            </div>
          </div>

          {/* F5 - Section Analysis Cards */}
          <section className="sections-wrapper">
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'hsl(var(--text-secondary))' }}>
              🔬 Section-by-Section Diagnostics
            </h3>
            
            {roast.sections && Object.keys(roast.sections).map((key) => {
              const sec = roast.sections[key];
              return (
                <div key={key} className="section-group">
                  <h4 className="section-header">{key}</h4>
                  
                  <div className="section-cards-grid">
                    
                    {/* Roast Card */}
                    <div className="analysis-card card-roast">
                      <span className="analysis-card-title roast-card-title">
                        🔥 The Savage Roast
                      </span>
                      <p className="analysis-card-body roast-card-body">
                        {sec.roast}
                      </p>
                    </div>

                    {/* Fix Card */}
                    <div className="analysis-card card-fix">
                      <span className="analysis-card-title fix-card-title">
                        🛠️ Actionable Fix
                      </span>
                      <p className="analysis-card-body fix-card-body">
                        {sec.fix}
                      </p>
                    </div>

                  </div>
                </div>
              );
            })}
          </section>

          {/* F6 - Bullet Rewriter Cards */}
          <section className="glass-card panel-card bullets-panel">
            <div className="panel-title-row">
              <span className="panel-icon">🔧</span>
              <h3 className="panel-title" style={{ fontSize: '1.35rem' }}>Weak Bullets Rewrite Engine</h3>
            </div>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', lineHeight: '1.5' }}>
              We analyzed your work experiences and selected your 3 weakest, lowest-impact descriptions. Replace them with these high-octane alternatives.
            </p>

            <div className="bullets-group">
              {roast.weak_bullets && roast.weak_bullets.map((bullet, idx) => (
                <div key={idx} className="bullet-card">
                  
                  {/* Before */}
                  <div className="bullet-row">
                    <span className="bullet-pill pill-before">Before</span>
                    <p className="bullet-text original">"{bullet.original}"</p>
                  </div>

                  {/* After */}
                  <div className="bullet-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                      <span className="bullet-pill pill-after">After</span>
                      <p className="bullet-text rewritten">"{bullet.rewritten}"</p>
                    </div>
                    
                    <button 
                      className={`copy-btn ${copiedIndex === idx ? 'copied' : ''}`}
                      onClick={() => copyBullet(bullet.rewritten, idx)}
                    >
                      {copiedIndex === idx ? "✓ Copied!" : "📋 Copy"}
                    </button>
                  </div>

                </div>
              ))}
            </div>
          </section>

          {/* F7 - Overall Verdict Blockquote */}
          <section className="glass-card verdict-card">
            <span style={{ fontSize: '2.5rem', position: 'absolute', top: '0.5rem', left: '1.5rem', color: 'hsla(var(--flame-start), 0.1)', fontWeight: '900', userSelect: 'none' }}>“</span>
            <blockquote className="verdict-quote">
              {roast.verdict}
            </blockquote>
            <span style={{ fontSize: '2.5rem', position: 'absolute', bottom: '-1rem', right: '1.5rem', color: 'hsla(var(--flame-start), 0.1)', fontWeight: '900', userSelect: 'none' }}>”</span>
            <div className="verdict-author">
              — {getPersonaAuthorName(persona)}
            </div>
          </section>

          {/* Reset Control */}
          <div className="ats-score-card glass-card" style={{ background: 'transparent', borderStyle: 'dashed', padding: '1.5rem', justifyContent: 'center' }}>
            <button className="back-btn" onClick={handleReset}>
              <span>🔄</span> Roast Another Resume
            </button>
          </div>

        </main>
      )}

      {/* Global Footer */}
      <footer className="footer-row">
        <span>© 2026 Roast My Resume. Built for GDG SSTC The Last Quest.</span>
        <span>Secure client-side session text. Privacy win: no history logged.</span>
      </footer>
    </div>
  );
}
