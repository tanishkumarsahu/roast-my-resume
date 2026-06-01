'use client';

import { useState, useEffect, useRef } from 'react';
import ThemeSwitch from '../components/ThemeSwitch';

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
    tagline: "Brutal, corporate, zero tolerance.",
    stats: { brutal: "100%", mercy: "0", damage: "MAX" }
  },
  {
    id: "startup_founder",
    name: "Bored Startup Founder",
    emoji: "🥱",
    styleClass: "startup",
    tagline: "Sarcastic, judges vibe.",
    stats: { brutal: "40%", mercy: "100%", damage: "LOW" }
  },
  {
    id: "senior_dev",
    name: "Senior Dev",
    emoji: "🤓",
    styleClass: "dev",
    tagline: "Nitpicky, technical, condescending.",
    stats: { brutal: "90%", mercy: "10%", damage: "HIGH" }
  }
];

async function readApiResponse(response, fallbackMessage) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const body = await response.text();
  const isHtml = body.trimStart().startsWith('<!DOCTYPE') || body.trimStart().startsWith('<html');

  return {
    error: response.ok
      ? fallbackMessage
      : isHtml
        ? `${fallbackMessage} The server returned an HTML error page instead of JSON. Check the production function logs.`
        : body || fallbackMessage
  };
}

const getApiUrl = (path) => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBase}${path}`;
};


export default function Home() {
  const [showIntro, setShowIntro] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 40; 
      const y = (e.clientY / window.innerHeight - 0.5) * 40;
      document.documentElement.style.setProperty('--mouse-x', `${x}px`);
      document.documentElement.style.setProperty('--mouse-y', `${y}px`);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (isDarkTheme) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [isDarkTheme]);

  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [persona, setPersona] = useState('');

  const [roast, setRoast] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    try {
      const cachedLogin = sessionStorage.getItem('isLoggedIn_v2');
      if (cachedLogin === 'true') {
        setIsLoggedIn(true);
        setShowIntro(false);
      } else {
        setTimeout(() => setShowIntro(false), 4500);
      }

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

  const processSelectedFile = async (selectedFile) => {
    setError(null);
    if (selectedFile.type !== 'application/pdf') {
      setError('Please upload a PDF file only. Our incinerator doesn\'t accept raw formats.');
      return;
    }
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

      const response = await fetch(getApiUrl('/api/parse-pdf'), {
        method: 'POST',
        body: formData
      });
      const data = await readApiResponse(response, 'Failed to extract text from your PDF.');
      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract text from your PDF.');
      }
      setResumeText(data.text);
      sessionStorage.setItem('resumeText_v2', data.text);
    } catch (err) {
      console.error(err);
      setFile(null);
      setError(err.message || 'Catastrophic PDF parsing failure. Make sure your file is text-based and unencrypted.');
    } finally {
      setLoading(false);
    }
  };

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
      const response = await fetch(getApiUrl('/api/roast'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription, persona })
      });
      const data = await readApiResponse(response, 'Server error occurred during roasting.');
      if (!response.ok) {
        throw new Error(data.error || 'Server error occurred during roasting.');
      }

      setRoast(data);
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

  const copyBullet = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

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

  const getScoreClass = (score) => {
    if (score <= 40) return 'score-red';
    if (score <= 70) return 'score-yellow';
    if (score <= 85) return 'score-green';
    return 'score-blue';
  };

  const getPersonaAuthorName = (personaId) => {
    const matched = PERSONAS.find(p => p.id === personaId);
    return matched ? matched.name : "The Recruiter";
  };

  const isSubmitDisabled = !file || !resumeText || jobDescription.trim().length < 50 || !persona;

  if (showIntro) {
    return (
      <>
        <ThemeSwitch isDark={isDarkTheme} onToggle={() => setIsDarkTheme(!isDarkTheme)} />
        <div className="site-intro-overlay">
          <h1 className="site-intro-text">INITIALIZING</h1>
          <div className="site-intro-bar">
            <div className="site-intro-fill"></div>
          </div>
        </div>
      </>
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <ThemeSwitch isDark={isDarkTheme} onToggle={() => setIsDarkTheme(!isDarkTheme)} />
        <div className="login-overlay">
          <div className="login-box">
          <div className="login-header">
            <h1 className="login-title">INCINERATOR</h1>
            <p className="login-subtitle">AUTHORIZED PERSONNEL ONLY</p>
          </div>
          <div className="login-input-group">
            <label className="login-label">VICTIM NAME</label>
            <input type="text" className="login-input" placeholder="e.g. John Doe" />
          </div>
          <div className="login-input-group">
            <label className="login-label">YEARS UNEMPLOYED</label>
            <input type="number" className="login-input" placeholder="e.g. 3" min="0" />
          </div>
          <button 
            className="login-btn" 
            onClick={() => {
              sessionStorage.setItem('isLoggedIn_v2', 'true');
              setIsLoggedIn(true);
            }}
          >
            AUTHENTICATE
          </button>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      <ThemeSwitch isDark={isDarkTheme} onToggle={() => setIsDarkTheme(!isDarkTheme)} />
      <div className="app-container">
        <header className="app-header">
        <div className="logo-wrapper">
          <span className="fire-emoji">🔥</span>
          <h1 className="logo-text">ROAST MY RESUME</h1>
        </div>
        <p className="app-subtitle">
          Find out why you're not getting the call — before the recruiter does.
        </p>
      </header>

      {error && (
        <div className="glass-card" style={{ background: '#ff4d4d', color: '#fff' }}>
          <div style={{ fontWeight: '800', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
            ⚠️ ERROR DETECTED
          </div>
          <p style={{ fontWeight: '600' }}>{error}</p>
        </div>
      )}

      {!roast && !loading && (
        <main className="input-stage-card">

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            <h2 className="stage-title">
              <span className="stage-title-number">1</span> F1 — UPLOAD RESUME
            </h2>
            <div
              className={`dropzone ${dragActive ? 'active' : ''} ${file ? 'uploaded' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={clickUploadArea}
            >
              <input ref={fileInputRef} type="file" className="file-input" accept=".pdf" onChange={handleFileChange} />
              <span className="dropzone-icon">{file ? "✅" : "📁"}</span>
              <h3 className="upload-title">
                {file ? `${file.name} — LOADED` : "DRAG & DROP PDF"}
              </h3>
              <p className="upload-desc">
                {file ? `Size: ${(file.size / 1024 / 1024).toFixed(2)} MB.` : "MAXIMUM 5MB ALLOWED."}
              </p>
            </div>
          </div>

          <div className="jd-textarea-wrapper">
            <h2 className="stage-title">
              <span className="stage-title-number">2</span> F2 — TARGET JOB DESCRIPTION
            </h2>
            <textarea
              className="jd-textarea"
              placeholder="Paste the target JD here... more detail = harsher roast."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
            <span className={`jd-counter ${jobDescription.trim().length >= 50 ? 'valid' : ''}`}>
              {jobDescription.trim().length} / 50 MINIMUM
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            <h2 className="stage-title">
              <span className="stage-title-number">3</span> F3 — SELECT PERSONA
            </h2>
            <div className="persona-grid">
              {PERSONAS.map((p, index) => (
                <div
                  key={p.id}
                  className={`card-profile ${persona === p.id ? 'active' : ''}`}
                  onClick={() => setPersona(p.id)}
                >
                  <div className="prof-photo" style={{ background: persona === p.id ? 'var(--accent-cyan)' : 'var(--card-bg)' }}>
                    <div className="prof-photo-num">0{index + 1}</div>
                    <div className="prof-avatar" style={{ color: persona === p.id ? 'var(--accent-pink)' : 'var(--text-primary)' }}>{p.emoji}</div>
                    <div className="prof-status-badge" style={{ background: persona === p.id ? 'var(--accent-green)' : '#888' }}>
                      {persona === p.id ? '● SELECTED' : '● AVAILABLE'}
                    </div>
                  </div>
                  <div className="prof-body">
                    <div className="prof-handle">@{p.id}</div>
                    <div className="prof-name" style={{ fontSize: '2rem' }}>{p.name.toUpperCase()}</div>
                    <div className="prof-bio">{p.tagline}</div>
                  </div>
                  <div className="prof-stats">
                    <div className="pstat"><span className="psv">{p.stats.brutal}</span><span className="psl">Brutal</span></div>
                    <div className="pstat"><span className="psv">{p.stats.mercy}</span><span className="psl">Mercy</span></div>
                    <div className="pstat"><span className="psv">{p.stats.damage}</span><span className="psl">Damage</span></div>
                  </div>
                  <button className="prof-btn" style={{ background: persona === p.id ? 'var(--accent-cyan)' : 'var(--text-primary)', color: persona === p.id ? 'var(--bg-color)' : 'var(--accent-cyan)' }}>
                    {persona === p.id ? 'SELECTED' : 'SELECT PERSONA'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button className="roast-submit-button" onClick={handleRoastSubmit} disabled={isSubmitDisabled}>
            ROAST MY LIFE
          </button>
        </main>
      )}

      {loading && (
        <main className="glass-card loading-overlay">
          <div className="loading-box">
            <div className="loader">
              <div className="circle"><div className="dot" /><div className="outline" /></div>
              <div className="circle"><div className="dot" /><div className="outline" /></div>
              <div className="circle"><div className="dot" /><div className="outline" /></div>
              <div className="circle"><div className="dot" /><div className="outline" /></div>
            </div>
            <h2 className="loading-text">{loadingMsg}</h2>
            <p className="loading-subtext">Executing judgmental algorithms...</p>
          </div>
        </main>
      )}

      {roast && !loading && (
        <main className="results-dashboard">
          
          <div className="ats-score-card">
            <div className="ats-score-info">
              <span className="ats-score-label">ATS MATCH ESTIMATE</span>
              <h2 className="grade-custom-label">ANALYSIS COMPLETE</h2>
              <p className="ats-reason-text">"{roast.ats_reason}"</p>
            </div>
            <div className="grade-gauge-container">
              <div className={`ats-circle-gauge ${getScoreClass(roast.ats_score)}`}>
                <span className="ats-circle-val">{roast.ats_score}</span>
                <span className="ats-circle-max">/ 100</span>
              </div>
            </div>
          </div>

          <section className="section-group">
            <h3 className="section-header">DIAGNOSTICS</h3>
            {roast.sections && Object.keys(roast.sections).map((key) => {
              const sec = roast.sections[key];
              return (
                <div key={key} style={{ marginBottom: '2rem' }}>
                  <h4 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', marginBottom: '0.5rem' }}>{key}</h4>
                  <div className="section-cards-grid">
                    <div className="analysis-card card-roast">
                      <span className="analysis-card-title">🔥 THE ROAST</span>
                      <p className="analysis-card-body">{sec.roast}</p>
                    </div>
                    <div className="analysis-card card-fix">
                      <span className="analysis-card-title">🛠️ THE FIX</span>
                      <p className="analysis-card-body">{sec.fix}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="bullets-panel">
            <div className="panel-title-row">
              <span style={{ fontSize: '2rem' }}>🔧</span>
              <h3 className="panel-title">WEAK BULLETS REWRITE</h3>
            </div>
            <div className="bullets-group">
              {roast.weak_bullets && roast.weak_bullets.map((bullet, idx) => (
                <div key={idx} className="bullet-card">
                  <div className="bullet-row">
                    <span className="bullet-pill pill-before">BEFORE</span>
                    <p className="bullet-text">"{bullet.original}"</p>
                  </div>
                  <div className="bullet-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span className="bullet-pill pill-after">AFTER</span>
                      <p className="bullet-text">"{bullet.rewritten}"</p>
                    </div>
                    <button className={`copy-btn ${copiedIndex === idx ? 'copied' : ''}`} onClick={() => copyBullet(bullet.rewritten, idx)}>
                      {copiedIndex === idx ? "COPIED" : "COPY"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="verdict-card" style={{ marginTop: '3rem' }}>
            <blockquote className="verdict-quote">{roast.verdict}</blockquote>
            <div className="verdict-author">— {getPersonaAuthorName(persona)}</div>
          </section>

          <div style={{ marginTop: '3rem' }}>
            <button className="back-btn" onClick={handleReset}>
              🔄 ROAST ANOTHER RESUME
            </button>
          </div>
        </main>
      )}

      <footer className="footer-row">
        <span>© 2026 ROAST MY RESUME</span>
        <span>BRUTALIST EDITION</span>
      </footer>
    </div>
    </>
  );
}
