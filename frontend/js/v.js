/* ═══════════════════════════════════════════════════════════════
   V — NetRunner AI Handler (GROQ VERSION)
   ═══════════════════════════════════════════════════════════════ */

// ═══ GROQ API CONFIG ═══
const GROQ_API_KEY = 'YOUR_GROQ_API_KEY';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile'; // The best groq

// ── PIXEL ART GRID ───────────────────────────────────────────────
const _=0,B=1,D=2,M=3,G=4,C=5,P=6,L=7,S=8;
const V_GRID = [
  [_,_,B,B,B,B,B,B,B,B,B,B,_,_],
  [_,B,D,D,D,D,D,D,D,D,D,D,B,_],
  [B,D,D,D,D,D,D,D,D,D,D,D,D,B],
  [B,D,D,S,S,S,S,S,S,S,S,D,D,B],
  [B,D,S,M,M,M,M,M,M,M,M,S,D,B],
  [B,D,S,M,_,M,M,M,M,_,M,S,D,B],
  [B,D,S,M,G,M,M,M,M,C,M,S,D,B],
  [B,D,S,M,_,M,L,M,M,_,M,S,D,B],
  [B,D,S,M,M,M,M,M,M,M,M,S,D,B],
  [_,B,D,D,S,S,S,S,S,S,D,D,B,_],
  [_,_,B,B,D,D,D,D,D,D,B,B,_,_],
  [_,B,D,D,D,D,D,D,D,D,D,D,B,_],
  [B,D,D,D,P,D,D,D,D,P,D,D,D,B],
  [B,D,D,P,G,P,D,D,P,G,P,D,D,B],
  [B,D,D,D,P,D,D,D,D,P,D,D,D,B],
  [B,D,D,D,D,D,D,D,D,D,D,D,D,B],
  [_,B,D,D,D,D,D,D,D,D,D,D,B,_],
  [_,_,B,B,B,D,D,D,D,B,B,B,_,_],
];

const V_PAL = {
  0:null, 1:'#000000', 2:'#0d1a0d', 3:'#0a1a10',
  4:'#00ffaa', 5:'#00e5ff', 6:'#8338ec', 7:'#00ff88', 8:'#061206'
};
const V_GLOW = { 4:'#00ffaa', 5:'#00e5ff', 6:'#8338ec' };

function vDraw(id, sc) {
  const cv = document.getElementById(id); if (!cv) return;
  const cx = cv.getContext('2d');
  cx.clearRect(0, 0, cv.width, cv.height);
  V_GRID.forEach((row, y) => row.forEach((i, x) => {
    const col = V_PAL[i]; if (!col) return;
    if (V_GLOW[i]) { cx.shadowColor = V_GLOW[i]; cx.shadowBlur = sc * 3; }
    else cx.shadowBlur = 0;
    cx.fillStyle = col;
    cx.fillRect(x*sc, y*sc, sc, sc);
    cx.shadowBlur = 0;
  }));
}

// ── HTML INJECTION ───────────────────────────────────────────────
document.body.insertAdjacentHTML('beforeend', `
<div id="v-container">
  <div id="v-trigger" onclick="vToggle()" title="Talk to V">
    <canvas id="v-art" width="42" height="54"></canvas>
    <div id="v-dot"></div>
    <div id="v-lbl">V</div>
  </div>
  <div id="v-chat" class="v-hide">
    <div id="v-scan"></div>
    <div id="v-head">
      <div style="display:flex;align-items:center;gap:10px;">
        <canvas id="v-mini" width="28" height="36"></canvas>
        <div>
          <div id="v-nm">V <span id="v-on">● ONLINE</span></div>
          <div id="v-sub">NetRunner AI Handler</div>
        </div>
      </div>
      <div style="display:flex;gap:5px;">
        <button onclick="vToggle()">─</button>
        <button onclick="vClose()">✕</button>
      </div>
    </div>
    <div id="v-msgs"></div>
    <div id="v-qa">
      <button class="vq" onclick="vQuick('anonymize')">🔏 Anonymize</button>
      <button class="vq" onclick="vQuick('phishing')">🎣 Email Scan</button>
      <button class="vq" onclick="vQuick('url')">🔗 URL Check</button>
      <button class="vq" onclick="vQuick('breach')">🔴 Breach</button>
      <button class="vq" onclick="vQuick('metadata')">📸 Metadata</button>
    </div>
    <div id="v-bar">
      <span id="v-pr">▸</span>
      <input id="v-in" type="text" placeholder="Type a command or ask V anything..." autocomplete="off"/>
      <button id="v-go" onclick="vSend()">↵</button>
    </div>
  </div>
</div>
`);

// ── CSS INJECTION ────────────────────────────────────────────────
document.head.insertAdjacentHTML('beforeend', `<style>
#v-container{position:fixed;bottom:24px;right:60px;z-index:9999;font-family:'JetBrains Mono',monospace}
#v-trigger{width:56px;height:72px;cursor:pointer;position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;gap:4px;filter:drop-shadow(0 0 10px rgba(0,255,170,.35));transition:filter .3s}
#v-trigger:hover{filter:drop-shadow(0 0 20px rgba(0,255,170,.75))}
#v-trigger:hover #v-art{animation:vgl .25s steps(2) infinite}
#v-dot{position:absolute;top:0;right:4px;width:7px;height:7px;background:#00ffaa;border-radius:50%;box-shadow:0 0 6px #00ffaa;animation:vpulse 2s ease-in-out infinite}
#v-lbl{font-size:10px;font-weight:700;color:#00ffaa;letter-spacing:4px;text-shadow:0 0 8px #00ffaa;animation:vbl 3s ease-in-out infinite}
#v-chat{position:absolute;bottom:82px;right:0;width:380px;height:530px;background:rgba(4,7,14,.97);border:1px solid rgba(0,255,170,.22);border-radius:3px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 0 40px rgba(0,255,170,.1);transition:opacity .2s,transform .2s;cursor:default}
#v-chat.v-hide{opacity:0;pointer-events:none;transform:translateY(8px)}
#v-scan{position:absolute;inset:0;pointer-events:none;z-index:10;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,170,.012) 2px,rgba(0,255,170,.012) 4px)}
#v-head{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(0,255,170,.04);border-bottom:1px solid rgba(0,255,170,.14);flex-shrink:0}
#v-nm{font-size:12px;font-weight:700;color:#00ffaa;letter-spacing:1px}
#v-on{font-size:9px;color:#00ff88;margin-left:6px;animation:vbl 2s ease-in-out infinite}
#v-sub{font-size:9px;color:rgba(0,255,170,.4);letter-spacing:1px;margin-top:2px}
#v-head button{background:none;border:1px solid rgba(0,255,170,.15);color:rgba(0,255,170,.4);width:20px;height:20px;border-radius:2px;font-size:9px;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center}
#v-head button:hover{background:rgba(0,255,170,.08);color:#00ffaa}
#v-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;scrollbar-width:thin;scrollbar-color:rgba(0,255,170,.15) transparent}
#v-msgs::-webkit-scrollbar{width:3px}
#v-msgs::-webkit-scrollbar-thumb{background:rgba(0,255,170,.15)}
.vm{display:flex;flex-direction:column;gap:3px;animation:vmi .2s ease}
.vf{font-size:9px;letter-spacing:1px;color:rgba(0,255,170,.35);text-transform:uppercase}
.vt{font-size:12px;line-height:1.65;padding:9px 12px;border-radius:2px;max-width:92%}
.vfv .vt{background:rgba(0,255,170,.05);border:1px solid rgba(0,255,170,.12);border-left:2px solid #00ffaa;color:#c8fce8;align-self:flex-start}
.vfu .vt{background:rgba(131,56,236,.07);border:1px solid rgba(131,56,236,.18);border-right:2px solid #8338ec;color:#d4b8ff;align-self:flex-end;text-align:right}
.vfu .vf{text-align:right;color:rgba(131,56,236,.4)}
.vc{background:rgba(0,255,170,.03);border:1px solid rgba(0,255,170,.12);border-radius:2px;padding:10px 12px;font-size:11px;color:#b8f0d4;line-height:1.8}
.rh{color:#ff4466;font-weight:700}.rm{color:#ffd60a;font-weight:700}.rl{color:#00ff88;font-weight:700}
.vtyp .vt{display:flex;gap:4px;align-items:center}
.vd{width:5px;height:5px;background:#00ffaa;border-radius:50%;animation:vbo 1.2s ease-in-out infinite}
.vd:nth-child(2){animation-delay:.2s}.vd:nth-child(3){animation-delay:.4s}
#v-qa{display:flex;gap:5px;padding:8px 14px;flex-wrap:wrap;border-top:1px solid rgba(0,255,170,.08);flex-shrink:0}
.vq{background:rgba(0,255,170,.04);border:1px solid rgba(0,255,170,.12);color:rgba(0,255,170,.55);font-family:'JetBrains Mono',monospace;font-size:10px;padding:4px 8px;border-radius:2px;cursor:pointer;transition:all .2s}
.vq:hover{background:rgba(0,255,170,.1);color:#00ffaa;border-color:rgba(0,255,170,.35);box-shadow:0 0 8px rgba(0,255,170,.15)}
#v-bar{display:flex;align-items:center;gap:8px;padding:10px 14px;border-top:1px solid rgba(0,255,170,.15);background:rgba(0,0,0,.25);flex-shrink:0}
#v-pr{color:#00ffaa;font-size:13px;animation:vbl 1s step-end infinite}
#v-in{flex:1;background:none;border:none;color:#00ffaa;font-family:'JetBrains Mono',monospace;font-size:12px;outline:none;caret-color:#00ffaa}
#v-in::placeholder{color:rgba(0,255,170,.2)}
#v-go{background:rgba(0,255,170,.08);border:1px solid rgba(0,255,170,.25);color:#00ffaa;font-size:13px;width:26px;height:26px;border-radius:2px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
#v-go:hover{background:rgba(0,255,170,.18);box-shadow:0 0 8px rgba(0,255,170,.25)}
@keyframes vpulse{0%,100%{opacity:1;box-shadow:0 0 6px #00ffaa}50%{opacity:.4;box-shadow:0 0 14px #00ffaa}}
@keyframes vbl{0%,89%,100%{opacity:1}92%{opacity:.2}}
@keyframes vgl{0%{transform:translate(0)}33%{transform:translate(-2px,1px)}66%{transform:translate(2px,-1px)}100%{transform:translate(0)}}
@keyframes vmi{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
@keyframes vbo{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-4px);opacity:1}}
</style>`);

// ── STATE ────────────────────────────────────────────────────────
let vOpen = false;
let vWait = null;
const vHist = [];  // Groq conversation history (OpenAI format)

// ── TOGGLE / CLOSE ───────────────────────────────────────────────
function vToggle() {
  vOpen = !vOpen;
  document.getElementById('v-chat').classList.toggle('v-hide', !vOpen);
  const cur = document.getElementById('cursor');
  const ring = document.getElementById('cursor-ring');
  if (cur) cur.style.zIndex = vOpen ? '99999' : '';
  if (ring) ring.style.zIndex = vOpen ? '99999' : '';
  if (vOpen) {
    document.getElementById('v-in').focus();
    if (!document.getElementById('v-msgs').children.length) vBoot();
  }
}
function vClose() {
  vOpen = false;
  document.getElementById('v-chat').classList.add('v-hide');
}

// ── BOOT SEQUENCE ────────────────────────────────────────────────
async function vBoot() {
  for (const l of ['> Initializing V...', '> NetRunner modules loaded.', '> Secure channel established.']) {
    vMsg('v', l, true);
    await vSlp(380);
  }
  await vSlp(250);
  vMsg('v', `What's up, choom. I'm **V** — your NetRunner handler.\n\nDrop a suspicious email, paste a URL, or just ask. I've got all tools jacked in.`);
}

// ── MESSAGE RENDERING ────────────────────────────────────────────
function vMsg(from, text, raw = false) {
  const box = document.getElementById('v-msgs');
  const d = document.createElement('div');
  d.className = `vm vf${from === 'v' ? 'v' : 'u'}`;
  const f = document.createElement('div');
  f.className = 'vf';
  f.textContent = from === 'v' ? 'V / AI' : 'You';
  const t = document.createElement('div');
  t.className = 'vt';
  if (raw) {
    t.textContent = text;
  } else {
    t.innerHTML = text
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#00ffaa">$1</strong>')
      .replace(/\n/g, '<br>');
  }
  d.appendChild(f);
  d.appendChild(t);
  box.appendChild(d);
  box.scrollTop = box.scrollHeight;
}

function vCard(html) {
  const box = document.getElementById('v-msgs');
  const d = document.createElement('div');
  d.className = 'vc';
  d.innerHTML = html;
  box.appendChild(d);
  box.scrollTop = box.scrollHeight;
}

function vTypOn() {
  const box = document.getElementById('v-msgs');
  const d = document.createElement('div');
  d.id = 'vtyp';
  d.className = 'vm vfv vtyp';
  d.innerHTML = '<div class="vf">V / AI</div><div class="vt"><div class="vd"></div><div class="vd"></div><div class="vd"></div></div>';
  box.appendChild(d);
  box.scrollTop = box.scrollHeight;
}
function vTypOff() { document.getElementById('vtyp')?.remove(); }

// ── QUICK ACTIONS ────────────────────────────────────────────────
function vQuick(a) {
  if (a === 'metadata') {
    vMsg('v', '📸 Opening Metadata Cleaner...');
    setTimeout(() => { if (typeof openTool === 'function') openTool('metadata'); }, 700);
    return;
  }
  const prompts = {
    anonymize: 'Paste the text to anonymize.',
    phishing:  'Paste the email content to scan.',
    url:       'Drop the URL.',
    breach:    'Give me the email address.',
  };
  vWait = a;
  vMsg('v', prompts[a]);
  document.getElementById('v-in').focus();
}

// ── SEND & ROUTING ───────────────────────────────────────────────
async function vSend() {
  const inp = document.getElementById('v-in');
  const text = inp.value.trim();
  if (!text) return;
  inp.value = '';
  vMsg('user', text);

  if (vWait) { const a = vWait; vWait = null; await vDo(a, text); return; }

  const t = text.toLowerCase();

  if (/(anonymi|mask|redact|gizle|anonimle|pii)/.test(t)) {
    text.length > 30 ? await vDo('anonymize', text) : (vWait = 'anonymize', vMsg('v', 'Paste the text to anonymize.'));
    return;
  }
  if (/(https?:\/\/|check.*url|url.*check|sentinel)/.test(t)) {
    const url = text.match(/https?:\/\/[^\s]+/)?.[0];
    url ? await vDo('url', url) : (vWait = 'url', vMsg('v', 'Drop the URL.'));
    return;
  }
  if (/(phishing|mail.*analiz|analiz.*mail|postwatch|email.*scan|suspicious|şüpheli)/.test(t)) {
    text.length > 50 ? await vDo('phishing', text) : (vWait = 'phishing', vMsg('v', 'Paste the email content.'));
    return;
  }
  if (/(breach|sızıntı|pwned|ihlal|hacked)/.test(t)) {
    const em = text.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i)?.[0];
    em ? await vDo('breach', em) : (vWait = 'breach', vMsg('v', 'Give me the email address.'));
    return;
  }
  if (/(open|aç|show|metadata|fingerprint|webrtc|temp.*mail|geçici|password|şifre)/.test(t)) {
    vOpenTool(t);
    return;
  }

  await vGroq(text);
}

// ── TOOL OPENER ──────────────────────────────────────────────────
function vOpenTool(t) {
  const map = [
    [/(metadata|exif|photo|fotoğraf)/, 'metadata',    'Metadata Cleaner'],
    [/(fingerprint|parmak)/,           'fingerprint',  'Fingerprint Analyzer'],
    [/(webrtc|vpn.*leak)/,             'webrtc',       'WebRTC Leak Test'],
    [/(temp.*mail|geçici|disposable)/, 'email',        'Temp Email'],
    [/(password|şifre)/,               'password',     'Password Manager'],
    [/(anonymi|anonimle)/,             'anonymizer',   'Text Anonymizer'],
    [/(phishing|sentinel)/,            'phishing',     'Phishing Detector'],
  ];
  for (const [re, tool, name] of map) {
    if (re.test(t)) {
      vMsg('v', `Opening **${name}**...`);
      setTimeout(() => { if (typeof openTool === 'function') openTool(tool); }, 600);
      return;
    }
  }
  vMsg('v', 'Available: Anonymizer, Phishing, Password, Temp Email, Metadata, WebRTC, Fingerprint. Which one?');
}

// ── BACKEND DISPATCHER ───────────────────────────────────────────
async function vDo(action, data) {
  vTypOn();
  try {
    await ({ anonymize: vAnon, phishing: vPost, url: vSent, breach: vBre }[action]?.(data));
  } catch (e) {
    vTypOff();
    vMsg('v', '⚠️ Backend unreachable. Is the service running?');
  }
}

async function vAnon(text) {
  try {
    const r = await fetch('http://127.0.0.1:5001/anonymize', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, mode: 'mask' })
    });
    const d = await r.json();
    vTypOff();
    vMsg('v', `Scrub complete. **${d.entities_found || 0} PII entities** masked.`);
    if (d.anonymized) vCard(`<strong style="color:#00ffaa">OUTPUT:</strong><br><br>${d.anonymized.replace(/\[([A-Z_]+)\]/g, '<span class="rh">[$1]</span>')}`);
  } catch { vTypOff(); vMsg('v', '⚠️ Anonymizer offline — run `backend/anonymizer.py`'); }
}

async function vPost(text) {
  try {
    const r = await fetch('http://127.0.0.1:5007/classify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const d = await r.json();
    vTypOff();
    const p = d.prediction, pr = d.probabilities;
    const rc = p.risk_score >= 70 ? 'rh' : p.risk_score >= 40 ? 'rm' : 'rl';
    vMsg('v', p.is_phishing
      ? `That email is **${p.risk_level.toUpperCase()} RISK**. Don't click anything in it, choom.`
      : `Looks clean. Stay sharp anyway.`);
    vCard(`<strong>${p.is_phishing ? '🚨 PHISHING DETECTED' : '✅ CLEAN'}</strong><br><br>
      Risk: <span class="${rc}">${p.risk_score}%</span> &nbsp;|&nbsp; Confidence: ${p.confidence}%<br>
      Phishing: <span class="rh">${(pr.phishing * 100).toFixed(1)}%</span> &nbsp;|&nbsp; Safe: <span class="rl">${(pr.safe * 100).toFixed(1)}%</span><br>
      Level: <span class="${rc}">${p.risk_level.toUpperCase()}</span>
      <br><br><span style="opacity:.4;font-size:10px;">📬 PostWatch AI — DistilBERT</span>`);
  } catch { vTypOff(); vMsg('v', '⚠️ PostWatch AI offline — run `postwatch_ai/app.py`'); }
}

async function vSent(url) {
  try {
    const r = await fetch('http://127.0.0.1:5000/predict', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const d = await r.json();
    vTypOff();
    const sc = Math.round(d.risk_score), rc = sc >= 60 ? 'rh' : sc >= 30 ? 'rm' : 'rl';
    vMsg('v', sc >= 60 ? `That URL is **hot**. High phishing risk.`
               : sc >= 30 ? `Suspicious. Proceed with caution.`
               : `Sentinel gives it the green light.`);
    vCard(`<strong>${sc >= 60 ? '🚨 PHISHING' : sc >= 30 ? '⚠️ SUSPICIOUS' : '✅ CLEAN'}</strong><br><br>
      Risk: <span class="${rc}">${sc}%</span><br>
      <span style="opacity:.5;font-size:10px;">${url}</span>
      <br><br><span style="opacity:.4;font-size:10px;">🛡️ Sentinel AI</span>`);
  } catch { vTypOff(); vMsg('v', '⚠️ Sentinel AI offline — run `sentinel_ai/app.py`'); }
}

async function vBre(email) {
  try {
    const r = await fetch('http://127.0.0.1:5003/check', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const d = await r.json();
    vTypOff();
    if (d.breached) {
      vMsg('v', `Bad news. **${email}** has been in known breaches.`);
      vCard(`<span class="rh">🔴 BREACHED</span><br><br>${d.message}<br><br>
        ${d.breaches?.slice(0, 3).map(b => `• <strong>${b.title}</strong>`).join('<br>') || ''}
        <br><br><span style="opacity:.4;font-size:10px;">Source: BreachDirectory</span>`);
    } else {
      vMsg('v', `**${email}** is clean. No known breaches.`);
      vCard(`<span class="rl">✅ NO BREACHES</span><br><br>${d.message}`);
    }
  } catch { vTypOff(); vMsg('v', '⚠️ Breach checker offline — run `backend/breach_checker.py`'); }
}

// ═══ GROQ API (OpenAI-compatible format) ═══
async function vGroq(text) {
  if (!GROQ_API_KEY || GROQ_API_KEY === 'YOUR_GROQ_API_KEY') {
    vMsg('v', 'Groq API key not set. Edit `js/v.js` → GROQ_API_KEY.\n\nI can still run all NetRunner tools directly.');
    return;
  }

  vTypOn();
  
  // ═══ SYSTEM MESSAGE (only once, at start) ═══
  if (vHist.length === 0) {
    vHist.push({
      role: 'system',
      content: `You are V, an elite AI handler embedded in NetRunner — a cyberpunk-themed digital privacy platform.
Personality: cold, efficient, professional. Light cyberpunk slang ("choom", "flatline", "jack in") but minimal.
Expert in cybersecurity, phishing, privacy, anonymization. Responses: concise and sharp, no fluff.

NetRunner tools available:
- Text Anonymizer: Detects and masks PII (emails, phones, IDs, names)
- Sentinel AI: URL phishing detection with ML
- PostWatch AI: Email phishing detection using DistilBERT (97.6% accuracy)
- Temp Email: Disposable email addresses
- Breach Checker: Check if email was in data breaches
- Metadata Cleaner: Removes EXIF/GPS from images
- WebRTC Leak Test: Detects IP leaks while using VPN
- Fingerprint Analyzer: Browser fingerprinting analysis

CRITICAL LANGUAGE RULE:
- If user writes in Turkish → respond ENTIRELY in Turkish
- If user writes in English → respond ENTIRELY in English
- NEVER mix languages in a single response
- Detect language from the user's most recent message
- Tool names can stay in English but descriptions must match user's language

NEVER mention port numbers (5000, 5001, etc.) to users - these are internal technical details.`
    });
  }

  // ═══ DETECT USER LANGUAGE ═══
  const isTurkish = /[çğıöşüÇĞİÖŞÜ]/.test(text) || 
                    /(merhaba|selam|nasıl|nedir|ne|yap|aç|kontrol|analiz|göster)/i.test(text);
  
  const langHint = isTurkish 
    ? ' [RESPOND IN TURKISH ONLY]' 
    : ' [RESPOND IN ENGLISH ONLY]';

  // ═══ ADD USER MESSAGE ═══
  vHist.push({ role: 'user', content: text + langHint });

  try {
    const r = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`  // ← Groq requires Authorization header!
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: vHist,
        max_tokens: 350,
        temperature: 0.7,
        top_p: 1,
        stream: false
      })
    });

    const d = await r.json();
    vTypOff();

    // ═══ ERROR HANDLING ═══
    if (d.error) {
      const msg = d.error.message || d.error.type || '';
      if (msg.includes('rate_limit') || msg.includes('quota')) {
        vMsg('v', '⏳ Groq rate limit hit. Wait a few seconds.');
      } else if (msg.includes('invalid_api_key')) {
        vMsg('v', '🔑 Invalid Groq API key. Check your key in v.js');
      } else {
        vMsg('v', `API error: ${msg}`);
      }
      vHist.pop(); // Remove failed user message
      return;
    }

    // ═══ EXTRACT RESPONSE ═══
    const rep = d.choices?.[0]?.message?.content || 'Signal lost. Try again.';
    
    // ═══ ADD ASSISTANT MESSAGE TO HISTORY ═══
    vHist.push({ role: 'assistant', content: rep });
    
    vMsg('v', rep);

  } catch (e) {
    vTypOff();
    vMsg('v', `Connection error: ${e.message}`);
    vHist.pop(); // Remove failed user message
  }
}

// ── UTILITIES ────────────────────────────────────────────────────
const vSlp = ms => new Promise(r => setTimeout(r, ms));

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.activeElement?.id === 'v-in') vSend();
});

// ── INITIALIZE ───────────────────────────────────────────────────
setTimeout(() => {
  vDraw('v-art',  3);
  vDraw('v-mini', 2);
}, 150);