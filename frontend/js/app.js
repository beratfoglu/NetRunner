/*
  NetRunner — Main Application
  ----------------------------
  All JavaScript logic in one file.
*/

// ══════════════════════════════════════════════════════════════════════════
// CURSOR
// ══════════════════════════════════════════════════════════════════════════
const cursor = document.getElementById('cursor');
const cursorRing = document.getElementById('cursor-ring');
let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  cursor.style.left = mouseX + 'px';
  cursor.style.top = mouseY + 'px';
});

(function animateRing() {
  ringX += (mouseX - ringX) * 0.12;
  ringY += (mouseY - ringY) * 0.12;
  cursorRing.style.left = ringX + 'px';
  cursorRing.style.top = ringY + 'px';
  requestAnimationFrame(animateRing);
})();

// Hover effects
document.querySelectorAll('button, .tool-card, .sidebar-item, input, textarea, label, a').forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursor.classList.add('hover');
    cursorRing.classList.add('hover');
  });
  el.addEventListener('mouseleave', () => {
    cursor.classList.remove('hover');
    cursorRing.classList.remove('hover');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// SCROLL EFFECTS
// ══════════════════════════════════════════════════════════════════════════
window.addEventListener('scroll', () => {
  const scrollPct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  document.getElementById('progress-bar').style.width = scrollPct + '%';
  document.getElementById('main-nav').classList.toggle('scrolled', window.scrollY > 50);
});

// Reveal on scroll
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('visible');
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal, .reveal-left, .reveal-scale').forEach(el => {
  revealObserver.observe(el);
});

// Counter animation
const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const target = parseInt(el.getAttribute('data-target'));
    const duration = 1500;
    const start = performance.now();
    
    (function animate(now) {
      const progress = Math.min((now - start) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(easeOut * target);
      if (progress < 1) requestAnimationFrame(animate);
    })(start);
    
    counterObserver.unobserve(el);
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-num[data-target]').forEach(el => {
  counterObserver.observe(el);
});

// ══════════════════════════════════════════════════════════════════════════
// LANGUAGE
// ══════════════════════════════════════════════════════════════════════════
let currentLang = 'en';

function setLang(lang) {
  currentLang = lang;
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.lang-btn[onclick="setLang('${lang}')"]`).classList.add('active');
  
  document.querySelectorAll('[data-en]').forEach(el => {
    const text = el.getAttribute('data-' + lang);
    if (!text) return;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = text;
    } else {
      el.textContent = text;
    }
  });
}

// ══════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════════════════════
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const navBtn = document.getElementById('nav-' + pageId);
  if (navBtn) navBtn.classList.add('active');
  window.scrollTo(0, 0);
}

function openTool(toolName) {
  showPage('dashboard');
  
  document.querySelectorAll('.tool-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.classList.remove('active');
  });
  
  const toolMap = {
    'anonymizer': 'anonymizer-tool',
    'phishing': 'phishing-tool',
    'password': 'password-tool',
    'email': 'email-tool',
    'breach': 'breach-tool',
    'fingerprint': 'fingerprint-tool',
    'metadata': 'metadata-tool',
    'webrtc': 'webrtc-tool'  
  };
  
  const panelId = toolMap[toolName];
  if (panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
      panel.classList.add('active');
    }
  }
  
  const sidebarItems = document.querySelectorAll('.sidebar-item');
  sidebarItems.forEach(item => {
    const onclick = item.getAttribute('onclick');
    if (onclick && onclick.includes(`'${toolName}'`)) {
      item.classList.add('active');
    }
  });
}

// ══════════════════════════════════════════════════════════════════════════
// ANONYMIZER
// ══════════════════════════════════════════════════════════════════════════
let anonTab = 'mask';

function setAnonTab(mode) {
  anonTab = mode;
  document.getElementById('tab-mask').classList.toggle('active', mode === 'mask');
  document.getElementById('tab-analyze').classList.toggle('active', mode === 'analyze');
  document.getElementById('anon-mask-options').style.display = mode === 'mask' ? 'flex' : 'none';
  document.getElementById('anon-analyze-options').style.display = mode === 'analyze' ? 'block' : 'none';
  document.getElementById('anon-result').classList.remove('show');
  document.getElementById('analyze-result').classList.remove('show');
}

const PII_PATTERNS = [
  { type: 'EMAIL', regex: /[\w.+-]+@[\w-]+\.[a-z]{2,}/gi, color: '#ff9966' },
  { type: 'PHONE', regex: /(\+?\d[\d\s\-().]{6,}\d)/g, color: '#ff6699' },
  { type: 'TC_ID', regex: /\b[1-9]\d{10}\b/g, color: '#cc66ff' },
  { type: 'IBAN', regex: /\b[A-Z]{2}\d{2}[\dA-Z]{4,30}\b/g, color: '#6699ff' },
  { type: 'PERSON', regex: /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g, color: '#ff4444' },
  { type: 'URL', regex: /https?:\/\/[^\s]+/g, color: '#44aaff' },
];

async function runAnonymizer() {
  const input = document.getElementById('anon-input').value.trim();
  if (!input) return;
  
  const btn = document.getElementById('anon-btn');
  btn.innerHTML = `<span class="spinner"></span> ${currentLang === 'tr' ? 'Analiz ediliyor...' : 'Analyzing...'}`;
  btn.disabled = true;
  
  const redact = document.getElementById('anon-redact').checked;
  
  try {
    const res = await fetch('http://127.0.0.1:5001/anonymize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input, mode: redact ? 'redact' : 'mask' })
    });
    
    if (!res.ok) throw new Error();
    
    const data = await res.json();
    document.getElementById('anon-output').innerHTML = data.anonymized
      .replace(/\[([A-Z_]+)\]/g, '<span class="replaced">[$1]</span>')
      .replace(/⟨([A-Z_]+)⟩/g, '<span class="replaced">⟨$1⟩</span>');
    
    document.getElementById('anon-tags').innerHTML = data.entities
      .map(e => `<span class="pii-tag">${e.type}: ${e.value}</span>`)
      .join('');
    
    const count = data.entities_found;
    document.getElementById('anon-bar').style.width = Math.min(count * 15, 100) + '%';
    document.getElementById('anon-score').textContent = count;
    document.getElementById('anon-bar2').style.width = (count > 0 ? 100 : 0) + '%';
    document.getElementById('anon-score2').textContent = count > 0 ? '100%' : '0%';
  } catch {
    _localAnonymize(input, redact);
  }
  
  btn.innerHTML = `<span>${currentLang === 'tr' ? 'Metni Anonimleştir' : 'Anonymize Text'}</span>`;
  btn.disabled = false;
  document.getElementById('anon-result').classList.add('show');
}

function _localAnonymize(input, redact) {
  let output = input;
  const found = [];
  
  PII_PATTERNS.forEach(p => {
    [...new Set(input.match(p.regex) || [])].forEach(m => {
      found.push({ type: p.type, value: m, color: p.color });
      output = output.replaceAll(m, redact ? `[${p.type}]` : `⟨${p.type}⟩`);
    });
  });
  
  document.getElementById('anon-output').innerHTML = output
    .replace(/\[([A-Z_]+)\]/g, '<span class="replaced">[$1]</span>')
    .replace(/⟨([A-Z_]+)⟩/g, '<span class="replaced">⟨$1⟩</span>');
  
  document.getElementById('anon-tags').innerHTML = found
    .map(f => `<span class="pii-tag">${f.type}: ${f.value}</span>`)
    .join('');
  
  const count = found.length;
  document.getElementById('anon-bar').style.width = Math.min(count * 15, 100) + '%';
  document.getElementById('anon-score').textContent = count;
  document.getElementById('anon-bar2').style.width = (count > 0 ? 100 : 0) + '%';
  document.getElementById('anon-score2').textContent = count > 0 ? '100%' : '0%';
}

async function runAnalyzeOnly() {
  const input = document.getElementById('anon-input').value.trim();
  if (!input) return;
  
  const btn = document.getElementById('anon-analyze-btn');
  btn.innerHTML = `<span class="spinner"></span> ${currentLang === 'tr' ? 'Analiz ediliyor...' : 'Analyzing...'}`;
  btn.disabled = true;
  
  let entities = [];
  try {
    const res = await fetch('http://127.0.0.1:5001/anonymize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input, mode: 'analyze' })
    });
    if (res.ok) {
      const d = await res.json();
      entities = d.entities || [];
    } else throw new Error();
  } catch {
    PII_PATTERNS.forEach(p => {
      [...new Set(input.match(p.regex) || [])].forEach(m => {
        entities.push({ type: p.type, value: m, confidence: null, source: 'regex' });
      });
    });
  }
  
  const typeCount = {};
  entities.forEach(e => {
    typeCount[e.type] = (typeCount[e.type] || 0) + 1;
  });
  
  const summaryParts = Object.entries(typeCount).map(([k, v]) => 
    `<strong style="color:var(--accent)">${v} ${k}</strong>`
  );
  
  document.getElementById('analyze-summary').innerHTML = entities.length === 0
    ? (currentLang === 'tr' ? '✅ Kişisel veri tespit edilmedi.' : '✅ No PII detected in this text.')
    : (currentLang === 'tr' ? `${entities.length} kişisel veri bulundu: ` : `Found ${entities.length} PII entities: `) + summaryParts.join(', ') + '.';
  
  document.getElementById('analyze-entities').innerHTML = entities.map(e => `
    <div class="entity-card">
      <div class="entity-type">${e.type}</div>
      <div class="entity-value">${e.value}</div>
      ${e.confidence ? `<div class="entity-conf">${(e.confidence * 100).toFixed(1)}% confidence</div>` : ''}
    </div>
  `).join('');
  
  let highlighted = input;
  entities.forEach(e => {
    const color = PII_PATTERNS.find(p => p.type === e.type)?.color || '#00ffaa';
    highlighted = highlighted.replaceAll(e.value, 
      `<mark style="background:${color}22;color:${color};padding:1px 4px;border-radius:3px;border:1px solid ${color}44;">${e.value}</mark>`
    );
  });
  
  document.getElementById('analyze-highlighted').innerHTML = highlighted;
  document.getElementById('analyze-result').classList.add('show');
  
  btn.innerHTML = `<span>${currentLang === 'tr' ? 'Analiz Et ve PII Tespit Et' : 'Analyze & Detect PII'}</span>`;
  btn.disabled = false;
}

// ══════════════════════════════════════════════════════════════════════════
// PHISHING DETECTOR
// ══════════════════════════════════════════════════════════════════════════
let phishTab = 'url';

function setPhishTab(tab) {
  phishTab = tab;
  document.getElementById('ptab-url').classList.toggle('active', tab === 'url');
  document.getElementById('ptab-email').classList.toggle('active', tab === 'email');
  document.getElementById('phish-url-group').style.display = tab === 'url' ? 'block' : 'none';
  document.getElementById('phish-email-group').style.display = tab === 'email' ? 'block' : 'none';
  document.getElementById('phish-result').classList.remove('show');
  document.getElementById('email-phish-result').classList.remove('show');
}

async function runPhishing() {
  const input = document.getElementById('phish-input').value.trim();
  if (!input) return;
  
  const btn = document.getElementById('phish-btn');
  btn.innerHTML = `<span class="spinner"></span> ${currentLang === 'tr' ? 'Sentinel AI analiz ediyor...' : 'Sentinel AI analyzing...'}`;
  btn.disabled = true;
  
  try {
    const res = await fetch('http://127.0.0.1:5000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: input })
    });
    
    if (!res.ok) throw new Error();
    
    const data = await res.json();
    const score = Math.round(data.risk_score);
    const u = input.toLowerCase();
    
    _renderPhishResult(score, [
      { label: 'Suspicious TLD', tr: 'Şüpheli TLD', triggered: /\.(xyz|tk|ml|ga|cf|gq|pw|top|click)\b/.test(u) },
      { label: 'Login/Verify keyword', tr: 'Login/Verify kelimesi', triggered: /(login|signin|verify|account|secure|update)/.test(u) },
      { label: 'Brand impersonation', tr: 'Marka taklidi', triggered: /(paypal|google|apple|microsoft|amazon|netflix|instagram|facebook)/.test(u) },
      { label: 'IP address in URL', tr: "URL'de IP adresi", triggered: /\d{1,3}(\.\d{1,3}){3}/.test(u) },
      { label: 'No HTTPS', tr: 'HTTPS yok', triggered: !input.startsWith('https') },
      { label: 'Excessive hyphens', tr: 'Fazla kısa çizgi', triggered: (u.match(/-/g) || []).length > 3 },
      { label: 'Suspicious subdomain', tr: 'Şüpheli alt alan adı', triggered: (u.match(/\./g) || []).length > 4 },
    ]);
  } catch {
    document.getElementById('phish-badge').innerHTML = `<div class="badge badge-warning">⚠️ ${currentLang === 'tr' ? 'Sentinel AI çevrimdışı — python app.py çalıştır' : 'Sentinel AI offline — run python app.py'}</div>`;
    document.getElementById('phish-result').classList.add('show');
    document.getElementById('phish-features').innerHTML = '';
  }
  
  btn.innerHTML = `<span>${currentLang === 'tr' ? 'Sentinel AI ile Analiz Et' : 'Analyze with Sentinel AI'}</span>`;
  btn.disabled = false;
}

function _renderPhishResult(score, features) {
  const badgeEl = document.getElementById('phish-badge');
  if (score >= 60) {
    badgeEl.innerHTML = `<div class="badge badge-danger">🚨 ${currentLang === 'tr' ? 'Yüksek Risk — Muhtemel Phishing' : 'High Risk — Likely Phishing'} (${score}%)</div>`;
  } else if (score >= 30) {
    badgeEl.innerHTML = `<div class="badge badge-warning">⚠️ ${currentLang === 'tr' ? 'Orta Risk — Şüpheli' : 'Medium Risk — Suspicious'} (${score}%)</div>`;
  } else {
    badgeEl.innerHTML = `<div class="badge badge-success">✓ ${currentLang === 'tr' ? 'Düşük Risk — Güvenli' : 'Low Risk — Likely Safe'} (${score}%)</div>`;
  }
  
  const color = score >= 60 ? 'var(--red)' : score >= 30 ? 'var(--yellow)' : 'var(--green)';
  document.getElementById('phish-bar').style.cssText = `width:${score}%;background:${color}`;
  document.getElementById('phish-score').style.color = color;
  document.getElementById('phish-score').textContent = score + '%';
  
  document.getElementById('phish-features').innerHTML = features.map(f => `
    <div class="feature-item">
      <span class="fi-icon">${f.triggered ? '🔴' : '🟢'}</span>
      <span class="fi-label">${currentLang === 'tr' && f.tr ? f.tr : f.label}</span>
      <span class="fi-value" style="color:${f.triggered ? 'var(--red)' : 'var(--green)'}">
        ${f.triggered ? (currentLang === 'tr' ? 'TETİKLENDİ' : 'TRIGGERED') : (currentLang === 'tr' ? 'TEMİZ' : 'CLEAN')}
      </span>
    </div>
  `).join('');
  
  document.getElementById('phish-result').classList.add('show');
}

// ─── EMAIL PHISHING DETECTOR (AI + PATTERN) ───

// ─── EMAIL PHISHING DETECTOR (AI + PATTERN) ───

let emailPhishMode = 'ai'; // 'ai' or 'pattern'

function setEmailPhishMode(mode) {
  emailPhishMode = mode;
  document.getElementById('email-mode-ai').classList.toggle('active', mode === 'ai');
  document.getElementById('email-mode-pattern').classList.toggle('active', mode === 'pattern');

  const btn = document.getElementById('phish-email-btn');
  if (btn) {
    if (mode === 'ai') {
      btn.innerHTML = `<span>${currentLang === 'tr' ? 'PostWatch AI ile Analiz Et' : 'Analyze with PostWatch AI'}</span>`;
    } else {
      btn.innerHTML = `<span>${currentLang === 'tr' ? 'E-posta İçeriğini Analiz Et' : 'Analyze Email Content'}</span>`;
    }
  }

  document.getElementById('email-phish-result').classList.remove('show');
}

async function runEmailPhish() {
  const input = document.getElementById('phish-email-input').value.trim();
  
  // ✅ VALIDATION
  if (!input) {
    alert('Please paste email content');
    return;
  }
  
  if (input.length < 10) {
    alert('Email text too short (minimum 10 characters)');
    return;
  }

  const btn = document.getElementById('phish-email-btn');
  btn.disabled = true;

  if (emailPhishMode === 'ai') {
    // ── AI MODE ──
    btn.innerHTML = `<span class="spinner"></span> ${currentLang === 'tr' ? 'PostWatch AI analiz ediyor...' : 'PostWatch AI analyzing...'}`;

    try {
      console.log('📬 Sending to PostWatch AI...');
      console.log('   Text length:', input.length);
      console.log('   First 100 chars:', input.substring(0, 100));
      
      const response = await fetch('http://127.0.0.1:5007/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input })
      });

      console.log('📡 Response status:', response.status);
      console.log('   Response ok:', response.ok);

      // ✅ ERROR DETAILS
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ PostWatch AI error response:', errorText);
        
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || 'API error');
        } catch (parseError) {
          throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
        }
      }

      const data = await response.json();
      console.log('✅ PostWatch AI response:', data);
      
      _renderEmailPhishAI(data);
      
    } catch (error) {
      console.error('❌ PostWatch AI failed:', error);
      
      // Show error to user
      const badgeEl = document.getElementById('email-phish-badge');
      badgeEl.innerHTML = `
        <div class="badge badge-warning">
          ⚠️ ${currentLang === 'tr' ? 'PostWatch AI Hatası' : 'PostWatch AI Error'}: ${error.message}
        </div>`;
      document.getElementById('email-phish-result').classList.add('show');
      document.getElementById('email-score-grid').innerHTML = '';
      document.getElementById('email-keywords').innerHTML = '';
    }

    btn.innerHTML = `<span>${currentLang === 'tr' ? 'PostWatch AI ile Analiz Et' : 'Analyze with PostWatch AI'}</span>`;
    btn.disabled = false;

  } else {
    // ── PATTERN MODE ──
    btn.innerHTML = `<span class="spinner"></span> ${currentLang === 'tr' ? 'Analiz ediliyor...' : 'Analyzing...'}`;
    _runEmailPhishPattern(input);
    btn.innerHTML = `<span>${currentLang === 'tr' ? 'E-posta İçeriğini Analiz Et' : 'Analyze Email Content'}</span>`;
    btn.disabled = false;
  }
}

function _renderEmailPhishAI(data) {
  const pred = data.prediction;
  const probs = data.probabilities;
  
  const badgeEl = document.getElementById('email-phish-badge');
  
  let badgeClass, badgeIcon, badgeText;
  
  if (pred.risk_level === 'critical') {
    badgeClass = 'badge-danger';
    badgeIcon = '🚨';
    badgeText = currentLang === 'tr' ? 'KRİTİK RİSK — Kesinlikle Phishing' : 'CRITICAL RISK — Definitely Phishing';
  } else if (pred.risk_level === 'high') {
    badgeClass = 'badge-danger';
    badgeIcon = '🔴';
    badgeText = currentLang === 'tr' ? 'YÜKSEK RİSK — Muhtemel Phishing' : 'HIGH RISK — Likely Phishing';
  } else if (pred.risk_level === 'medium') {
    badgeClass = 'badge-warning';
    badgeIcon = '⚠️';
    badgeText = currentLang === 'tr' ? 'ORTA RİSK — Şüpheli' : 'MEDIUM RISK — Suspicious';
  } else if (pred.risk_level === 'low') {
    badgeClass = 'badge-warning';
    badgeIcon = '⚠️';
    badgeText = currentLang === 'tr' ? 'DÜŞÜK RİSK — Hafif Şüpheli' : 'LOW RISK — Slightly Suspicious';
  } else {
    badgeClass = 'badge-success';
    badgeIcon = '✅';
    badgeText = currentLang === 'tr' ? 'GÜVENLİ — Phishing Değil' : 'SAFE — Not Phishing';
  }
  
  badgeEl.innerHTML = `<div class="badge ${badgeClass}">${badgeIcon} ${badgeText} (${pred.risk_score}%)</div>`;
  badgeEl.innerHTML += `<div style="display:inline-block;margin-left:8px;padding:4px 8px;background:rgba(0,255,170,0.1);border:1px solid rgba(0,255,170,0.3);border-radius:4px;font-size:10px;color:var(--accent);">📬 POSTWATCH AI</div>`;
  
  const color = pred.is_phishing ? 'var(--red)' : 'var(--green)';
  document.getElementById('email-phish-bar').style.cssText = `width:${pred.risk_score}%;background:${color}`;
  document.getElementById('email-phish-score').style.color = color;
  document.getElementById('email-phish-score').textContent = pred.risk_score + '%';
  
  document.getElementById('email-score-grid').innerHTML = `
    <div class="email-score-card">
      <div class="esc-icon">🤖</div>
      <div class="esc-label">PostWatch AI</div>
      <div class="esc-value" style="color:var(--accent);">DistilBERT</div>
    </div>
    <div class="email-score-card">
      <div class="esc-icon">🎯</div>
      <div class="esc-label">Accuracy</div>
      <div class="esc-value" style="color:var(--accent);">97.6%</div>
    </div>
    <div class="email-score-card">
      <div class="esc-icon">🟢</div>
      <div class="esc-label">Safe Probability</div>
      <div class="esc-value" style="color:var(--green);">${(probs.safe * 100).toFixed(1)}%</div>
    </div>
    <div class="email-score-card">
      <div class="esc-icon">🔴</div>
      <div class="esc-label">Phishing Probability</div>
      <div class="esc-value" style="color:var(--red);">${(probs.phishing * 100).toFixed(1)}%</div>
    </div>
    <div class="email-score-card">
      <div class="esc-icon">📊</div>
      <div class="esc-label">Confidence</div>
      <div class="esc-value" style="color:var(--accent);">${(pred.confidence > 1 ? pred.confidence : pred.confidence * 100).toFixed(1)}%</div>
    </div>
    <div class="email-score-card">
      <div class="esc-icon">⚡</div>
      <div class="esc-label">Risk Level</div>
      <div class="esc-value" style="color:${color};">${pred.risk_level.toUpperCase()}</div>
    </div>
  `;
  
  document.getElementById('email-keywords').innerHTML = `<span style="color:var(--accent);font-size:12px;">📬 Analyzed by PostWatch AI - Neural Email Defense System</span>`;
  document.getElementById('email-phish-result').classList.add('show');
}

function _renderEmailPhishAI(data) {
  const pred = data.prediction;
  const probs = data.probabilities;
  
  const badgeEl = document.getElementById('email-phish-badge');
  
  let badgeClass, badgeIcon, badgeText;
  
  if (pred.risk_level === 'critical') {
    badgeClass = 'badge-danger';
    badgeIcon = '🚨';
    badgeText = currentLang === 'tr' ? 'KRİTİK RİSK — Kesinlikle Phishing' : 'CRITICAL RISK — Definitely Phishing';
  } else if (pred.risk_level === 'high') {
    badgeClass = 'badge-danger';
    badgeIcon = '🔴';
    badgeText = currentLang === 'tr' ? 'YÜKSEK RİSK — Muhtemel Phishing' : 'HIGH RISK — Likely Phishing';
  } else if (pred.risk_level === 'medium') {
    badgeClass = 'badge-warning';
    badgeIcon = '⚠️';
    badgeText = currentLang === 'tr' ? 'ORTA RİSK — Şüpheli' : 'MEDIUM RISK — Suspicious';
  } else if (pred.risk_level === 'low') {
    badgeClass = 'badge-warning';
    badgeIcon = '⚠️';
    badgeText = currentLang === 'tr' ? 'DÜŞÜK RİSK — Hafif Şüpheli' : 'LOW RISK — Slightly Suspicious';
  } else {
    badgeClass = 'badge-success';
    badgeIcon = '✅';
    badgeText = currentLang === 'tr' ? 'GÜVENLİ — Phishing Değil' : 'SAFE — Not Phishing';
  }
  
  badgeEl.innerHTML = `<div class="badge ${badgeClass}">${badgeIcon} ${badgeText} (${pred.risk_score}%)</div>`;
  badgeEl.innerHTML += `<div style="display:inline-block;margin-left:8px;padding:4px 8px;background:rgba(0,255,170,0.1);border:1px solid rgba(0,255,170,0.3);border-radius:4px;font-size:10px;color:var(--accent);">📬 POSTWATCH AI</div>`;
  
  const color = pred.is_phishing ? 'var(--red)' : 'var(--green)';
  document.getElementById('email-phish-bar').style.cssText = `width:${pred.risk_score}%;background:${color}`;
  document.getElementById('email-phish-score').style.color = color;
  document.getElementById('email-phish-score').textContent = pred.risk_score + '%';
  
  document.getElementById('email-score-grid').innerHTML = `
    <div class="email-score-card">
      <div class="esc-icon">🤖</div>
      <div class="esc-label">PostWatch AI</div>
      <div class="esc-value" style="color:var(--accent);">DistilBERT</div>
    </div>
    <div class="email-score-card">
      <div class="esc-icon">🎯</div>
      <div class="esc-label">Accuracy</div>
      <div class="esc-value" style="color:var(--accent);">97.6%</div>
    </div>
    <div class="email-score-card">
      <div class="esc-icon">🟢</div>
      <div class="esc-label">Safe Probability</div>
      <div class="esc-value" style="color:var(--green);">${(probs.safe * 100).toFixed(1)}%</div>
    </div>
    <div class="email-score-card">
      <div class="esc-icon">🔴</div>
      <div class="esc-label">Phishing Probability</div>
      <div class="esc-value" style="color:var(--red);">${(probs.phishing * 100).toFixed(1)}%</div>
    </div>
    <div class="email-score-card">
      <div class="esc-icon">📊</div>
      <div class="esc-label">Confidence</div>
      <div class="esc-value" style="color:var(--accent);">${(pred.confidence > 1 ? pred.confidence : pred.confidence * 100).toFixed(1)}%</div>
    </div>
    <div class="email-score-card">
      <div class="esc-icon">⚡</div>
      <div class="esc-label">Risk Level</div>
      <div class="esc-value" style="color:${color};">${pred.risk_level.toUpperCase()}</div>
    </div>
  `;
  
  document.getElementById('email-keywords').innerHTML = `<span style="color:var(--accent);font-size:12px;">📬 Analyzed by PostWatch AI - Neural Email Defense System</span>`;
  document.getElementById('email-phish-result').classList.add('show');
}

function _runEmailPhishPattern(input) {
  const txt = input.toLowerCase();
  
  const categories = [
    {
      icon: '⚡', label: 'Urgency / Pressure', tr: 'Aciliyet / Baskı',
      keywords: ['urgent', 'immediately', 'within 24 hours', 'expires', 'act now', 'right away', 'asap', 'limited time', 'deadline', 'suspend', 'terminate', 'last chance'],
      weight: 35
    },
    {
      icon: '🔗', label: 'Call to Action Bait', tr: 'Eylem Çağrısı Tuzağı',
      keywords: ['click here', 'click below', 'click this link', 'verify now', 'confirm now', 'update now', 'login now', 'sign in', 'tap here', 'follow the link'],
      weight: 30
    },
    {
      icon: '🎭', label: 'Account / Identity Threat', tr: 'Hesap / Kimlik Tehdidi',
      keywords: ['account suspended', 'account locked', 'unusual activity', 'unauthorized access', 'suspicious login', 'access restricted', 'verify your identity', 'confirm your account'],
      weight: 25
    },
    {
      icon: '🤖', label: 'Generic / Impersonal Greeting', tr: 'Genel / Kişisel Olmayan Selamlama',
      keywords: ['dear customer', 'dear user', 'dear member', 'dear account holder', 'hello user', 'valued customer', 'dear sir', 'dear madam'],
      weight: 15
    },
    {
      icon: '💰', label: 'Prize / Reward Lure', tr: 'Ödül / Kazanç Tuzağı',
      keywords: ['you have won', 'congratulations', 'prize', 'reward', 'free gift', 'claim your', 'lottery', 'selected winner', 'lucky winner'],
      weight: 25
    },
    {
      icon: '🔐', label: 'Credential Request', tr: 'Kimlik Bilgisi İsteği',
      keywords: ['enter your password', 'provide your', 'submit your credentials', 'update your payment', 'credit card', 'bank account', 'social security', 'ssn', 'pin number'],
      weight: 40
    },
  ];
  
  let totalScore = 0;
  const foundKeywords = [];
  
  const cardData = categories.map(cat => {
    const hits = cat.keywords.filter(kw => txt.includes(kw));
    hits.forEach(h => foundKeywords.push(h));
    const triggered = hits.length > 0;
    if (triggered) totalScore += cat.weight;
    return { ...cat, triggered, hits };
  });
  
  totalScore = Math.min(totalScore, 97);
  
  const badgeEl = document.getElementById('email-phish-badge');
  if (totalScore >= 60) {
    badgeEl.innerHTML = `<div class="badge badge-danger">🚨 ${currentLang === 'tr' ? 'Yüksek Risk — Muhtemelen Phishing E-postası' : 'High Risk — Likely Phishing Email'} (${totalScore}%)</div>`;
  } else if (totalScore >= 25) {
    badgeEl.innerHTML = `<div class="badge badge-warning">⚠️ ${currentLang === 'tr' ? 'Orta Risk — Şüpheli İçerik' : 'Medium Risk — Suspicious Content'} (${totalScore}%)</div>`;
  } else {
    badgeEl.innerHTML = `<div class="badge badge-success">✓ ${currentLang === 'tr' ? 'Düşük Risk — Büyük İhtimalle Güvenli' : 'Low Risk — Likely Safe'} (${totalScore}%)</div>`;
  }
  
  badgeEl.innerHTML += `<div style="display:inline-block;margin-left:8px;padding:4px 8px;background:rgba(255,170,0,0.1);border:1px solid rgba(255,170,0,0.3);border-radius:4px;font-size:10px;color:var(--yellow);">📋 PATTERN-BASED</div>`;
  
  const color = totalScore >= 60 ? 'var(--red)' : totalScore >= 25 ? 'var(--yellow)' : 'var(--green)';
  document.getElementById('email-phish-bar').style.cssText = `width:${totalScore}%;background:${color}`;
  document.getElementById('email-phish-score').style.color = color;
  document.getElementById('email-phish-score').textContent = totalScore + '%';
  
  document.getElementById('email-score-grid').innerHTML = cardData.map(cat => `
    <div class="email-score-card ${cat.triggered ? 'triggered' : 'clean'}">
      <div class="esc-icon">${cat.icon}</div>
      <div class="esc-label">${currentLang === 'tr' ? cat.tr : cat.label}</div>
      <div class="esc-value" style="color:${cat.triggered ? 'var(--red)' : 'var(--green)'}">
        ${cat.triggered ? (currentLang === 'tr' ? `TETİKLENDİ (${cat.hits.length})` : `TRIGGERED (${cat.hits.length})`) : (currentLang === 'tr' ? 'TEMİZ' : 'CLEAN')}
      </div>
    </div>
  `).join('');
  
  document.getElementById('email-keywords').innerHTML = foundKeywords.length > 0
    ? foundKeywords.map(k => `<span class="pii-tag" style="background:rgba(255,68,68,0.1);border-color:rgba(255,68,68,0.2);">"${k}"</span>`).join('')
    : `<span style="color:var(--text3);font-size:12px;">${currentLang === 'tr' ? 'Şüpheli anahtar kelime bulunamadı.' : 'No suspicious keywords detected.'}</span>`;
  
  document.getElementById('email-phish-result').classList.add('show');
}

// ══════════════════════════════════════════════════════════════════════════
// PASSWORD MANAGER
// ══════════════════════════════════════════════════════════════════════════
function updateLenLabel(v) {
  document.getElementById('pw-len-val').textContent = v;
}

function setPwTab(tab) {
  ['generate', 'check', 'breach'].forEach(t => {
    const tabBtn = document.getElementById('ptab-' + { generate: 'gen', check: 'check', breach: 'breach' }[t]);
    tabBtn.classList.toggle('active', t === tab);
    document.getElementById('pw-' + t).style.display = t === tab ? 'block' : 'none';
  });
}

function generatePassword() {
  const len = parseInt(document.getElementById('pw-length').value);
  const noAmbig = document.getElementById('pw-noambig').checked;
  
  let chars = '';
  if (document.getElementById('pw-upper').checked) chars += (noAmbig ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  if (document.getElementById('pw-lower').checked) chars += (noAmbig ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz');
  if (document.getElementById('pw-num').checked) chars += (noAmbig ? '23456789' : '0123456789');
  if (document.getElementById('pw-sym').checked) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';
  
  let pw = '';
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  arr.forEach(v => pw += chars[v % chars.length]);
  
  document.getElementById('pw-value').textContent = pw;
  document.getElementById('pw-value').style.color = 'var(--accent)';
  
  const entropy = Math.floor(len * Math.log2(chars.length));
  const section = document.getElementById('pw-entropy-section');
  section.style.display = 'block';
  
  let fillColor, note;
  if (entropy < 40) {
    fillColor = '#ff4466';
    note = currentLang === 'tr' ? 'Çok zayıf. Daha uzun veya daha karmaşık bir şifre kullanın.' : 'Very weak. Use a longer or more complex password.';
  } else if (entropy < 60) {
    fillColor = '#ff8800';
    note = currentLang === 'tr' ? 'Zayıf. Uzunluğu artırın.' : 'Weak. Increase the length.';
  } else if (entropy < 80) {
    fillColor = '#ffd60a';
    note = currentLang === 'tr' ? 'Orta. Sembol eklemek güvenliği artırır.' : 'Fair. Adding symbols improves security.';
  } else if (entropy < 100) {
    fillColor = '#88dd00';
    note = currentLang === 'tr' ? 'Güçlü. Çoğu amaç için yeterli.' : 'Strong. Sufficient for most purposes.';
  } else {
    fillColor = '#00ff88';
    note = currentLang === 'tr' ? 'Mükemmel! Bu şifre son derece güvenli.' : 'Excellent! This password is extremely secure.';
  }
  
  const pct = Math.min((entropy / 128) * 100, 100);
  document.getElementById('pw-entropy-fill').style.cssText = `width:${pct}%;background:${fillColor}`;
  document.getElementById('pw-entropy-val').textContent = entropy + ' bits';
  document.getElementById('pw-entropy-val').style.color = fillColor;
  document.getElementById('pw-entropy-note').textContent = note;
  document.getElementById('pw-entropy-note').style.color = fillColor;
}

function copyPw() {
  const text = document.getElementById('pw-value').textContent;
  navigator.clipboard?.writeText(text).catch(() => {});
  const btn = event.target;
  const orig = btn.textContent;
  btn.textContent = currentLang === 'tr' ? 'Kopyalandı!' : 'Copied!';
  setTimeout(() => btn.textContent = orig, 1500);
}

let pwVisible = false;
function togglePwVisibility() {
  pwVisible = !pwVisible;
  const input = document.getElementById('pw-check-input');
  const btn = document.getElementById('pw-eye');
  input.type = pwVisible ? 'text' : 'password';
  const eyeOpen = '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
  const eyeOff = '<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
  btn.innerHTML = pwVisible ? eyeOpen : eyeOff;
}

let breachVisible = false;
function toggleBreachVisibility() {
  breachVisible = !breachVisible;
  const input = document.getElementById('breach-input');
  const btn = document.getElementById('breach-eye');
  input.type = breachVisible ? 'text' : 'password';  
  const eyeOpen = '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
  const eyeOff = '<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
  btn.innerHTML = breachVisible ? eyeOpen : eyeOff;
}

function checkPassword(pw) {
  const meter = document.getElementById('pw-meter');
  const label = document.getElementById('pw-strength-label');
  const result = document.getElementById('pw-check-result');
  
  if (!pw) {
    meter.style.width = '0%';
    label.textContent = currentLang === 'tr' ? 'Şifre yazın...' : 'Type a password...';
    result.classList.remove('show');
    return;
  }
  
  let score = 0;
  const checks = [
    { ok: /[a-z]/.test(pw), en: 'Contains lowercase letters', tr: 'Küçük harf içeriyor' },
    { ok: /[A-Z]/.test(pw), en: 'Contains uppercase letters', tr: 'Büyük harf içeriyor' },
    { ok: /\d/.test(pw), en: 'Contains numbers', tr: 'Rakam içeriyor' },
    { ok: /[^a-zA-Z0-9]/.test(pw), en: 'Contains symbols (!@#...)', tr: 'Sembol içeriyor (!@#...)' },
    { ok: pw.length >= 8, en: 'At least 8 characters', tr: 'En az 8 karakter' },
    { ok: pw.length >= 12, en: 'At least 12 characters (recommended)', tr: 'En az 12 karakter (önerilen)' },
    { ok: pw.length >= 20, en: '20+ characters (excellent)', tr: '20+ karakter (mükemmel)' },
    { ok: !/(.)\1{2,}/.test(pw), en: 'No repeated characters (aaa...)', tr: 'Tekrarlanan karakter yok (aaa...)' },
  ];
  
  checks.forEach((c, i) => {
    if (c.ok) score += [15, 15, 15, 20, 0, 20, 15, 0][i] || 0;
  });
  
  const levels = [
    { min: 85, color: '#00ff88', label: { en: 'Very Strong', tr: 'Çok Güçlü' } },
    { min: 65, color: '#88dd00', label: { en: 'Strong', tr: 'Güçlü' } },
    { min: 45, color: '#ffd60a', label: { en: 'Fair', tr: 'Orta' } },
    { min: 25, color: '#ff8800', label: { en: 'Weak', tr: 'Zayıf' } },
    { min: 0, color: '#ff4466', label: { en: 'Very Weak', tr: 'Çok Zayıf' } },
  ];
  
  const level = levels.find(l => score >= l.min);
  meter.style.cssText = `width:${score}%;background:${level.color}`;
  label.style.color = level.color;
  label.textContent = level.label[currentLang] || level.label.en;
  
  document.getElementById('pw-analysis').innerHTML = checks.map(c => `
    <div class="check-item ${c.ok ? 'ok' : 'fail'}">
      <span class="check-item-icon">${c.ok ? '✅' : '❌'}</span>
      <span class="check-item-text">${c[currentLang === 'tr' ? 'tr' : 'en']}</span>
    </div>
  `).join('');
  
  result.classList.add('show');
}

async function checkBreach(pw) {
  if (!pw || pw.trim() === '') {
    alert(currentLang === 'tr' ? 'Lütfen bir şifre girin.' : 'Please enter a password.');
    return;
  }
  
  const resultEl = document.getElementById('pw-breach-result') || document.getElementById('breach-email-result');
  const btn = document.getElementById('breach-btn');
  
  if (btn) {
    btn.innerHTML = `<span class="spinner spinner-light"></span> ${currentLang === 'tr' ? 'HIBP veritabanı kontrol ediliyor...' : 'Checking HIBP database...'}`;
    btn.disabled = true;
  }
  
  resultEl.innerHTML = `<div class="breach-box checking">
    <div class="breach-icon">🔍</div>
    <div>
      <div class="breach-title" style="color:var(--accent);">${currentLang === 'tr' ? 'Kontrol ediliyor...' : 'Checking...'}</div>
      <div class="breach-sub">${currentLang === 'tr' ? 'k-Anonimlik modeli ile güvenli sorgu yapılıyor.' : 'Querying securely using k-Anonymity model.'}</div>
    </div>
  </div>`;
  
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(pw);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);
    
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' }
    });
    
    if (!res.ok) throw new Error('HIBP API error');
    
    const text = await res.text();
    const lines = text.split('\n');
    const match = lines.find(l => l.startsWith(suffix));
    const count = match ? parseInt(match.split(':')[1].trim()) : 0;
    
    if (count > 0) {
      const formatted = count.toLocaleString();
      resultEl.innerHTML = `<div class="breach-box pwned">
        <div class="breach-icon">🚨</div>
        <div>
          <div class="breach-title" style="color:var(--red);">${currentLang === 'tr' ? 'Bu Şifre İhlal Edildi!' : 'This Password Was Breached!'}</div>
          <div class="breach-sub">${currentLang === 'tr' ? `Bu şifre veri ihlallerinde <strong style="color:var(--red)">${formatted} kez</strong> görüldü. Hemen değiştirin!` : `This password appeared <strong style="color:var(--red)">${formatted} times</strong> in data breaches. Change it immediately!`}</div>
        </div>
      </div>`;
    } else {
      resultEl.innerHTML = `<div class="breach-box clean">
        <div class="breach-icon">✅</div>
        <div>
          <div class="breach-title" style="color:var(--green);">${currentLang === 'tr' ? 'Temiz — İhlal Veritabanında Yok' : 'Clean — Not Found in Breach Database'}</div>
          <div class="breach-sub">${currentLang === 'tr' ? 'Bu şifre bilinen veri ihlallerinde görülmedi. Yine de güçlü bir şifre kullanmaya devam edin.' : 'This password was not found in known data breaches. Continue using strong, unique passwords.'}</div>
        </div>
      </div>`;
    }
  } catch (err) {
    resultEl.innerHTML = `<div class="breach-box" style="background:rgba(255,208,10,0.06);border:1px solid rgba(255,208,10,0.2);">
      <div class="breach-icon">⚠️</div>
      <div>
        <div class="breach-title" style="color:var(--yellow);">${currentLang === 'tr' ? 'HIBP API\'ye Ulaşılamadı' : 'Could Not Reach HIBP API'}</div>
        <div class="breach-sub">${currentLang === 'tr' ? 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.' : 'Check your internet connection and try again.'}</div>
      </div>
    </div>`;
  }
  
  if (btn) {
    btn.innerHTML = `<span>${currentLang === 'tr' ? 'HIBP Veritabanını Kontrol Et' : 'Check HIBP Database'}</span>`;
    btn.disabled = false;
  }
}

// ══════════════════════════════════════════════════════════════════════════
// TEMP EMAIL
// ══════════════════════════════════════════════════════════════════════════
let currentEmail = '';
let emailRefreshTimer = null;

async function generateEmail(event) {
  const btn = event.target.closest('button');
  const origText = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="border-top-color:#000;"></span>';
  
  const display = document.getElementById('email-display');
  const inboxList = document.getElementById('inbox-list');
  const emptyEl = document.getElementById('inbox-empty');
  
  // Temizlik
  emptyEl.style.color = 'var(--text3)';
  inboxList.querySelectorAll('.inbox-item, .inbox-error').forEach(el => el.remove());
  
  try {
    const response = await fetch('http://127.0.0.1:5002/generate');
    
    // ═══ RATE LIMIT KONTROLÜ ═══
    if (response.status === 429) {
      const data = await response.json();
      const minutes = Math.floor(data.reset_in_seconds / 60);
      const seconds = data.reset_in_seconds % 60;
      
      // ═══ ESKİ EMAIL'İ TEMİZLE ═══
      currentEmail = null;
      display.style.display = 'none';
      
      // ═══ INBOX'U TEMİZLE ═══
      inboxList.innerHTML = '';
      
      // ═══ AUTO-REFRESH DURDUR ═══
      clearInterval(emailRefreshTimer);
      
      // ═══ HATA MESAJI GÖSTER ═══
      const err = document.createElement('div');
      err.className = 'inbox-error';
      err.innerHTML = `
        ⏱️ <strong>${currentLang === 'tr' ? 'Rate Limit Aşıldı' : 'Rate Limit Exceeded'}</strong><br><br>
        ${currentLang === 'tr' 
          ? `Saatte <strong>2 email</strong> oluşturabilirsiniz.<br>Sonraki email: <strong>${minutes}dk ${seconds}sn</strong> sonra`
          : `You can generate <strong>2 emails per hour</strong>.<br>Next email available in: <strong>${minutes}m ${seconds}s</strong>`
        }
      `;
      inboxList.appendChild(err);
      inboxList.style.display = 'block';
      emptyEl.style.display = 'none';
      
      btn.disabled = false;
      btn.textContent = origText;
      return;
    }
    
    if (!response.ok) throw new Error();
    
    const data = await response.json();
    currentEmail = data.address;
    
    document.getElementById('email-value').textContent = currentEmail;
    display.style.display = 'flex';
    inboxList.style.display = 'block';
    
    // Inbox refresh başlat
    await refreshInbox();
    clearInterval(emailRefreshTimer);
    emailRefreshTimer = setInterval(refreshInbox, 10000);
    
  } catch {
    // ═══ BACKEND OFFLINE ═══
    currentEmail = null;
    display.style.display = 'none';
    clearInterval(emailRefreshTimer);
    
    inboxList.innerHTML = '';
    const err = document.createElement('div');
    err.className = 'inbox-error';
    err.textContent = currentLang === 'tr'
      ? '❌ Servis çevrimdışı. Backend çalışıyor mu? (python temp_email.py)'
      : '❌ Service offline. Is the backend running? (python temp_email.py)';
    inboxList.appendChild(err);
    inboxList.style.display = 'block';
    emptyEl.style.display = 'none';
  }
  
  btn.disabled = false;
  btn.textContent = origText;
}

async function refreshInbox() {
  if (!currentEmail) return;
  
  const emptyEl = document.getElementById('inbox-empty');
  const listCont = document.getElementById('inbox-list');
  listCont.querySelectorAll('.inbox-item, .inbox-error').forEach(el => el.remove());
  
  emptyEl.style.color = 'var(--text3)';
  emptyEl.textContent = currentLang === 'tr' ? 'Kontrol ediliyor...' : 'Checking...';
  emptyEl.style.display = 'block';
  
  try {
    const res = await fetch(`http://127.0.0.1:5002/inbox/${encodeURIComponent(currentEmail)}`);
    if (!res.ok) throw new Error();
    
    const data = await res.json();
    
    if (data.message_count === 0) {
      emptyEl.textContent = currentLang === 'tr' 
        ? 'Henüz mesaj yok. Gelen kutunuz temiz.'
        : 'No messages yet. Your inbox is clean.';
    } else {
      emptyEl.style.display = 'none';
      data.messages.forEach(msg => {
        const item = document.createElement('div');
        item.className = 'inbox-item';
        let dateStr = '—';
        try {
          if (msg.date) dateStr = new Date(msg.date).toLocaleString();
        } catch {}
        item.innerHTML = `
          <div>
            <div class="inbox-from">${msg.from || '—'}</div>
            <div class="inbox-subj">${msg.subject || '(konu yok)'}</div>
          </div>
          <div class="inbox-time">${dateStr}</div>
        `;
        listCont.appendChild(item);
      });
    }
  } catch {
    emptyEl.style.display = 'none';
    const err = document.createElement('div');
    err.className = 'inbox-error';
    err.textContent = currentLang === 'tr' 
      ? '❌ Gelen kutusu yüklenemedi.'
      : '❌ Could not load inbox.';
    listCont.appendChild(err);
  }
}


// ══════════════════════════════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════════════════════════════
function copyResult(id) {
  const text = (document.getElementById(id).innerText || '').trim();
  (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
  
  document.querySelectorAll('.copy-btn').forEach(btn => {
    if (btn.getAttribute('onclick')?.includes(id)) {
      const orig = btn.textContent;
      btn.textContent = currentLang === 'tr' ? 'Kopyalandı!' : 'Copied!';
      setTimeout(() => btn.textContent = orig, 1500);
    }
  });
}

// ══════════════════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════════════════
generatePassword();

// ══════════════════════════════════════════════════════════════════════════
// BROWSER FINGERPRINT ANALYZER
// ══════════════════════════════════════════════════════════════════════════

async function analyzeFingerprint() {
  const resultBox = document.getElementById('fingerprint-result');
  const outputDiv = document.getElementById('fingerprint-output');
  
  outputDiv.innerHTML = '<p style="color: var(--text2);">🔍 Collecting browser fingerprint... This may take a few seconds.</p>';
  resultBox.style.display = 'block';
  
  try {
    console.log('🔍 Starting fingerprint collection...');
    const fingerprint = await collectFingerprint();
    console.log('📡 Sending to backend for analysis...');
    
    const response = await fetch('http://127.0.0.1:5004/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fingerprint)
    });
    
    const data = await response.json();
    
    if (data.error) {
      outputDiv.innerHTML = `<p style="color: var(--red);">❌ ${data.error}</p>`;
      return;
    }
    
    console.log('✅ Analysis complete!');
    
    let html = `
      <div style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <div style="font-size: 13px; color: var(--text3);">UNIQUENESS SCORE</div>
            <div style="font-size: 32px; font-weight: 700; color: ${
              data.risk_level === 'low' ? 'var(--green)' : 
              data.risk_level === 'medium' ? 'var(--yellow)' : 
              data.risk_level === 'high' ? 'var(--red)' : 'var(--red)'
            };">${data.uniqueness_score}/100</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; color: var(--text3);">ENTROPY</div>
            <div style="font-size: 20px; font-weight: 700;">${data.total_entropy.toFixed(1)} bits</div>
          </div>
        </div>
        <div class="score-row">
          <div class="score-bar-wrap">
            <div class="progress-bar" style="width: ${data.uniqueness_score}%; background: ${
              data.risk_level === 'low' ? 'var(--green)' : 
              data.risk_level === 'medium' ? 'var(--yellow)' : 'var(--red)'
            };"></div>
          </div>
        </div>
        <p style="font-size: 13px; color: var(--text); margin-top: 12px; font-weight: 500;">${data.risk_message}</p>
      </div>
    `;
    
    html += '<div style="font-size: 11px; color: var(--text3); margin-bottom: 12px; letter-spacing: 1px;">FINGERPRINT COMPONENTS</div>';
    html += '<div style="display: grid; gap: 10px; margin-bottom: 20px;">';
    
    data.components.forEach(component => {
      const rarityColor = 
        component.rarity === 'very_rare' ? 'var(--red)' :
        component.rarity === 'rare' ? 'var(--yellow)' :
        component.rarity === 'uncommon' ? 'var(--accent)' : 'var(--green)';
      
      html += `
        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="font-size: 12px; font-weight: 700; color: var(--text);">${component.name}</div>
            <div style="font-size: 11px; color: ${rarityColor}; font-weight: 600;">${component.rarity.toUpperCase().replace('_', ' ')}</div>
          </div>
          <div style="font-size: 11px; color: var(--text3); font-family: var(--font-mono); margin-bottom: 8px; word-break: break-all;">
            ${component.value.length > 80 ? component.value.substring(0, 80) + '...' : component.value}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 10px; color: var(--text3);">
              Entropy: <strong style="color: var(--accent);">${component.entropy.toFixed(1)} bits</strong>
            </div>
            <div style="font-size: 10px; color: var(--text3);">
              Users: <strong>${component.percentage.toFixed(2)}%</strong>
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    
    if (data.risks && data.risks.length > 0) {
      html += `
        <div style="background: rgba(255, 68, 102, 0.08); border: 1px solid rgba(255, 68, 102, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <div style="font-size: 12px; font-weight: 700; color: var(--red); margin-bottom: 10px;">⚠️ DETECTED PRIVACY RISKS</div>
      `;
      data.risks.forEach(risk => {
        html += `<div style="font-size: 11px; color: var(--text2); margin-bottom: 4px;">• ${risk}</div>`;
      });
      html += '</div>';
    }
    
    html += `
      <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px;">
        <div style="font-size: 12px; font-weight: 700; color: var(--accent); margin-bottom: 10px;">💡 PRIVACY RECOMMENDATIONS</div>
    `;
    data.recommendations.forEach(rec => {
      html += `<div style="font-size: 11px; color: var(--text2); margin-bottom: 4px;">✓ ${rec}</div>`;
    });
    html += '</div>';
    
    outputDiv.innerHTML = html;
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    outputDiv.innerHTML = `<p style="color: var(--red);">❌ Error: ${error.message}<br><small>Make sure backend is running on port 5004</small></p>`;
  }
}

// ─── EMAIL BREACH CHECKER ───
async function checkEmailBreach() {
  const email = document.getElementById('breach-email-input').value.trim();
  const resultBox = document.getElementById('breach-email-result');
  
  if (!email) {
    resultBox.innerHTML = '<p style="color: var(--red);">Please enter an email address.</p>';
    resultBox.style.display = 'block';
    return;
  }
  
  resultBox.innerHTML = '<p style="color: var(--text2);">⏳ Checking breaches...</p>';
  resultBox.style.display = 'block';
  
  try {
    const response = await fetch('http://127.0.0.1:5003/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    if (data.error) {
      resultBox.innerHTML = `<p style="color: var(--red);">❌ ${data.error}</p>`;
      return;
    }
    
    if (!data.breached) {
      resultBox.innerHTML = `
        <div class="breach-box clean">
          <div class="breach-icon">✅</div>
          <div>
            <div class="breach-title" style="color: var(--green);">All Clear!</div>
            <div class="breach-sub">${data.message}</div>
          </div>
        </div>
      `;
    } else {
      let breachesHTML = `
        <div class="breach-box pwned">
          <div class="breach-icon">🔴</div>
          <div>
            <div class="breach-title" style="color: var(--red);">Breached!</div>
            <div class="breach-sub">${data.message}</div>
          </div>
        </div>
        <div style="margin-top: 20px;">
          <h3 style="font-size: 14px; margin-bottom: 12px; color: var(--text);">Data Breaches Found:</h3>
      `;
      
      data.breaches.forEach(breach => {
        const date = breach.breach_date || 'Unknown';
        const count = breach.pwn_count ? (breach.pwn_count / 1000000).toFixed(1) + 'M' : 'Unknown';
        breachesHTML += `
          <div class="breach-item">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
              <div>
                <div style="font-weight: 700; font-size: 13px; color: var(--text);">${breach.title}</div>
                <div style="font-size: 11px; color: var(--text3); margin-top: 2px;">
                  ${breach.domain} • ${date} • ${count} affected
                </div>
              </div>
              ${breach.is_verified ? '<span style="font-size: 10px; color: var(--green);">✓ Verified</span>' : ''}
            </div>
            <div style="font-size: 11px; color: var(--text2); line-height: 1.5;">${breach.description.substring(0, 150)}...</div>
            <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px;">
              ${breach.data_classes.map(dc => `<span class="pii-tag entity">${dc}</span>`).join('')}
            </div>
          </div>
        `;
      });
      
      breachesHTML += '</div>';
      resultBox.innerHTML = breachesHTML;
    }
    
  } catch (error) {
    resultBox.innerHTML = `<p style="color: var(--red);">❌ Error: ${error.message}</p>`;
  }
}

// ─── IMAGE METADATA CLEANER ───
function setMetadataTab(tab) {
  document.getElementById('tab-analyze-meta').classList.toggle('active', tab === 'analyze');
  document.getElementById('tab-clean-meta').classList.toggle('active', tab === 'clean');
  document.getElementById('metadata-analyze').style.display = tab === 'analyze' ? 'block' : 'none';
  document.getElementById('metadata-clean').style.display = tab === 'clean' ? 'block' : 'none';
  document.getElementById('metadata-analyze-result').style.display = 'none';
  document.getElementById('metadata-clean-result').style.display = 'none';
}

async function analyzeMetadata() {
  const fileInput = document.getElementById('metadata-analyze-input');
  const resultBox = document.getElementById('metadata-analyze-result');
  
  if (!fileInput.files || !fileInput.files[0]) {
    resultBox.innerHTML = '<p style="color: var(--red);">Please select an image file.</p>';
    resultBox.style.display = 'block';
    return;
  }
  
  const file = fileInput.files[0];
  resultBox.innerHTML = '<p style="color: var(--text2);">🔍 Analyzing image metadata...</p>';
  resultBox.style.display = 'block';
  
  try {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch('http://127.0.0.1:5005/analyze', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.error) {
      resultBox.innerHTML = `<p style="color: var(--red);">❌ ${data.error}</p>`;
      return;
    }
    
    if (!data.has_metadata) {
      resultBox.innerHTML = `
        <div style="text-align: center; padding: 30px;">
          <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
          <div style="font-size: 18px; font-weight: 700; color: var(--green); margin-bottom: 8px;">Clean Image!</div>
          <div style="font-size: 13px; color: var(--text2);">${data.message}</div>
        </div>
      `;
      return;
    }
    
    const risk = data.privacy_risk;
    const riskColor = risk.risk_level === 'critical' ? 'var(--red)' : 
                      risk.risk_level === 'warning' ? 'var(--yellow)' : 
                      risk.risk_level === 'info' ? 'var(--accent)' : 'var(--green)';
    
    let html = `
      <div style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <div style="font-size: 11px; color: var(--text3);">PRIVACY RISK SCORE</div>
            <div style="font-size: 24px; font-weight: 700; color: ${riskColor};">${risk.risk_score}/100</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; color: var(--text3);">METADATA FOUND</div>
            <div style="font-size: 20px; font-weight: 700;">${data.metadata_count} tags</div>
          </div>
        </div>
        <div class="score-row">
          <div class="score-bar-wrap">
            <div class="progress-bar" style="width: ${risk.risk_score}%; background: ${riskColor};"></div>
          </div>
        </div>
        <p style="font-size: 12px; color: var(--text2); margin-top: 8px;">${risk.risk_message}</p>
      </div>
    `;
    
    if (risk.risks.length > 0) {
      html += '<div style="margin-bottom: 20px;"><div style="font-size: 11px; color: var(--text3); margin-bottom: 10px;">DETECTED RISKS</div>';
      risk.risks.forEach(r => {
        const icon = r.type === 'critical' ? '🔴' : r.type === 'warning' ? '🟡' : '🔵';
        html += `<div style="font-size: 12px; color: var(--text2); margin-bottom: 6px;">${icon} ${r.message}</div>`;
      });
      html += '</div>';
    }
    
    if (data.parsed_data && Object.keys(data.parsed_data).length > 0) {
      html += '<div style="margin-bottom: 20px;"><div style="font-size: 11px; color: var(--text3); margin-bottom: 10px;">EXTRACTED DATA</div>';
      html += '<div style="display: grid; gap: 10px;">';
      const parsed = data.parsed_data;
      if (parsed.gps) {
        html += `
          <div style="background: rgba(255, 68, 102, 0.08); border: 1px solid rgba(255, 68, 102, 0.3); border-radius: 8px; padding: 12px;">
            <div style="font-weight: 700; font-size: 12px; color: var(--red); margin-bottom: 6px;">📍 GPS LOCATION</div>
            <div style="font-size: 11px; color: var(--text2); margin-bottom: 4px;">Latitude: ${parsed.gps.latitude}°, Longitude: ${parsed.gps.longitude}°</div>
            <a href="${parsed.gps.maps_url}" target="_blank" style="font-size: 10px; color: var(--accent); text-decoration: none;">View on Google Maps →</a>
          </div>`;
      }
      if (parsed.camera_make || parsed.camera_model) {
        html += `<div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px;"><div style="font-weight: 700; font-size: 12px; margin-bottom: 4px;">📷 CAMERA</div><div style="font-size: 11px; color: var(--text2);">${parsed.camera_make || ''} ${parsed.camera_model || ''}</div></div>`;
      }
      if (parsed.date_time || parsed.date_original) {
        html += `<div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px;"><div style="font-weight: 700; font-size: 12px; margin-bottom: 4px;">📅 DATE/TIME</div><div style="font-size: 11px; color: var(--text2);">${parsed.date_time || parsed.date_original}</div></div>`;
      }
      if (parsed.software) {
        html += `<div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px;"><div style="font-weight: 700; font-size: 12px; margin-bottom: 4px;">💻 SOFTWARE</div><div style="font-size: 11px; color: var(--text2);">${parsed.software}</div></div>`;
      }
      html += '</div></div>';
    }
    
    html += `
      <div style="margin-top: 20px; padding: 16px; background: rgba(0, 255, 170, 0.04); border: 1px solid rgba(0, 255, 170, 0.15); border-radius: 8px;">
        <div style="font-size: 13px; font-weight: 700; color: var(--accent); margin-bottom: 6px;">💡 Recommendation</div>
        <div style="font-size: 11px; color: var(--text2); line-height: 1.6; margin-bottom: 12px;">Remove this metadata before sharing online to protect your privacy.</div>
        <button class="btn btn-primary btn-sm" onclick="setMetadataTab('clean')" style="width: 100%;">Clean This Image →</button>
      </div>
    `;
    
    resultBox.innerHTML = html;
    
  } catch (error) {
    resultBox.innerHTML = `<p style="color: var(--red);">❌ Error: ${error.message}</p>`;
  }
}

async function cleanMetadata() {
  const fileInput = document.getElementById('metadata-clean-input');
  const resultBox = document.getElementById('metadata-clean-result');
  
  if (!fileInput.files || !fileInput.files[0]) {
    resultBox.innerHTML = '<p style="color: var(--red);">Please select an image file.</p>';
    resultBox.style.display = 'block';
    return;
  }
  
  const file = fileInput.files[0];
  resultBox.innerHTML = '<p style="color: var(--text2);">🧹 Cleaning metadata...</p>';
  resultBox.style.display = 'block';
  
  try {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch('http://127.0.0.1:5005/clean', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      resultBox.innerHTML = `<p style="color: var(--red);">❌ ${error.error}</p>`;
      return;
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name.replace(/(\.\w+)$/, '_cleaned$1');
    a.click();
    window.URL.revokeObjectURL(url);
    
    resultBox.innerHTML = `
      <div style="text-align: center; padding: 30px;">
        <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
        <div style="font-size: 18px; font-weight: 700; color: var(--green); margin-bottom: 8px;">Metadata Removed!</div>
        <div style="font-size: 13px; color: var(--text2); margin-bottom: 16px;">Your cleaned image has been downloaded. All EXIF data removed.</div>
        <button class="btn btn-secondary btn-sm" onclick="cleanMetadata()">Clean Another Image</button>
      </div>
    `;
    
  } catch (error) {
    resultBox.innerHTML = `<p style="color: var(--red);">❌ Error: ${error.message}</p>`;
  }
}

// ─── WEBRTC LEAK TEST ───
async function runWebRTCTest() {
  const resultBox = document.getElementById('webrtc-result');
  resultBox.innerHTML = '<p style="color: var(--text2);">🔍 Testing for WebRTC leaks...</p>';
  resultBox.style.display = 'block';
  
  const detectedIPs = new Set();
  
  try {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    
    pc.createDataChannel('');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    pc.onicecandidate = (event) => {
      if (!event || !event.candidate || !event.candidate.candidate) return;
      const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/g;
      const ips = event.candidate.candidate.match(ipRegex);
      if (ips) {
        ips.forEach(ip => {
          if (!ip.startsWith('0.') && !ip.startsWith('127.')) detectedIPs.add(ip);
        });
      }
    };
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    pc.close();
    
    let publicIP = null;
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      publicIP = data.ip;
    } catch (e) {
      console.log('Could not fetch public IP');
    }
    
    displayWebRTCResults(detectedIPs, publicIP);
    
  } catch (error) {
    resultBox.innerHTML = `<p style="color: var(--red);">❌ Error: ${error.message}</p>`;
  }
}

function displayWebRTCResults(detectedIPs, publicIP) {
  const resultBox = document.getElementById('webrtc-result');
  
  const localIPs = Array.from(detectedIPs).filter(ip => 
    ip.startsWith('192.168.') || ip.startsWith('10.') || 
    (ip.startsWith('172.') && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31)
  );
  
  const leakedIPs = Array.from(detectedIPs).filter(ip => {
    const isPrivate = ip.startsWith('192.168.') || ip.startsWith('10.') || 
                      (ip.startsWith('172.') && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31);
    return !isPrivate && ip !== publicIP;
  });
  
  let hasLeak = leakedIPs.length > 0;
  let leakSeverity = 'safe';
  let leakMessage = '';
  
  if (hasLeak) {
    leakSeverity = 'critical';
    leakMessage = 'CRITICAL: Your real IP is leaking through WebRTC while using VPN!';
  } else if (localIPs.length > 0 && detectedIPs.size > localIPs.length) {
    leakSeverity = 'safe';
    leakMessage = 'SAFE: WebRTC showing VPN IP (no leak detected)';
  } else if (localIPs.length > 0) {
    leakSeverity = 'info';
    leakMessage = 'INFO: Only local IP exposed (normal for home networks)';
  } else {
    leakSeverity = 'safe';
    leakMessage = 'SAFE: No WebRTC leaks detected';
  }
  
  const statusColor = leakSeverity === 'critical' ? 'var(--red)' : leakSeverity === 'info' ? 'var(--accent)' : 'var(--green)';
  const statusIcon = hasLeak ? '🔴' : '✅';
  
  let html = `
    <div style="text-align: center; padding: 30px; margin-bottom: 24px;">
      <div style="font-size: 64px; margin-bottom: 16px;">${statusIcon}</div>
      <div style="font-size: 20px; font-weight: 700; color: ${statusColor}; margin-bottom: 8px;">${hasLeak ? 'WebRTC Leak Detected' : 'No WebRTC Leak'}</div>
      <div style="font-size: 13px; color: var(--text2);">${leakMessage}</div>
    </div>
  `;
  
  if (publicIP) {
    html += `
      <div style="margin-bottom: 16px;">
        <div style="font-size: 11px; color: var(--text3); margin-bottom: 8px;">YOUR PUBLIC IP</div>
        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px;">
          <div style="font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--accent);">${publicIP}</div>
          <div style="font-size: 10px; color: var(--text3); margin-top: 4px;">This is the IP address websites see</div>
        </div>
      </div>
    `;
  }
  
  const allPublicIPs = Array.from(detectedIPs).filter(ip => 
    !ip.startsWith('192.168.') && !ip.startsWith('10.') && 
    !(ip.startsWith('172.') && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31)
  );
  
  if (allPublicIPs.length > 0) {
    html += `<div style="margin-bottom: 16px;"><div style="font-size: 11px; color: var(--text3); margin-bottom: 8px;">WebRTC DETECTED IPs</div><div style="display: grid; gap: 8px;">`;
    allPublicIPs.forEach(ip => {
      const isLeak = ip !== publicIP;
      html += `
        <div style="background: ${isLeak ? 'rgba(255,68,102,0.08)' : 'rgba(0,255,136,0.08)'}; border: 1px solid ${isLeak ? 'rgba(255,68,102,0.3)' : 'rgba(0,255,136,0.3)'}; border-radius: 8px; padding: 10px;">
          <div style="font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: ${isLeak ? 'var(--red)' : 'var(--green)'};">${ip}</div>
          <div style="font-size: 10px; color: var(--text3); margin-top: 2px;">${isLeak ? '⚠️ Different from public IP - LEAK!' : '✅ Matches public IP - Safe'}</div>
        </div>`;
    });
    html += '</div></div>';
  }
  
  if (localIPs.length > 0) {
    html += `<div style="margin-bottom: 16px;"><div style="font-size: 11px; color: var(--text3); margin-bottom: 8px;">LOCAL IPs (Private Network)</div><div style="display: grid; gap: 8px;">`;
    localIPs.forEach(ip => {
      html += `<div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 10px;"><div style="font-family: var(--font-mono); font-size: 14px; color: var(--text);">${ip}</div><div style="font-size: 10px; color: var(--text3); margin-top: 2px;">Private network IP (not a leak)</div></div>`;
    });
    html += '</div></div>';
  }
  
  html += `
    <div style="padding: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; margin-top: 20px;">
      <div style="font-size: 12px; font-weight: 700; margin-bottom: 12px;">💡 ${hasLeak ? 'How to Fix' : 'Good to Know'}</div>
      <div style="font-size: 11px; color: var(--text2); line-height: 1.6;">
        ${hasLeak 
          ? 'Your VPN is active but WebRTC is leaking your real IP:<br>• Use a VPN with built-in WebRTC leak protection<br>• Disable WebRTC in browser settings<br>• Install WebRTC leak prevention extensions<br>• Switch to browsers with WebRTC protection (Brave)'
          : `${detectedIPs.size > 0 ? 'WebRTC is working but not leaking your real IP. ' : ''}${localIPs.length > 0 ? "Local IPs are normal for home networks and don't reveal your location." : 'No IPs detected through WebRTC.'}`
        }
      </div>
    </div>
  `;
  
  resultBox.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════
// FILE INPUT - Show selected filename
// ═══════════════════════════════════════════════════════════════════
document.querySelectorAll('input[type="file"]').forEach(input => {
  input.addEventListener('change', function() {
    const label = this.nextElementSibling;
    if (this.files && this.files[0]) {
      const fileName = this.files[0].name;
      const fileSize = (this.files[0].size / 1024).toFixed(1) + ' KB';
      label.innerHTML = `<span class="file-input-icon">✅</span><span>${fileName} (${fileSize})</span>`;
      label.classList.add('file-selected');
    }
  });
});