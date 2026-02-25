/*
  NetRunner — WIRE Feed
  ----------------------
  Bottom-left fixed button, panel opens upward.
  Like V chatbot but on the left side.
*/

(function () {

const FEEDS = [
  { url: 'https://feeds.feedburner.com/TheHackersNews', source: 'THN' },
  { url: 'https://www.bleepingcomputer.com/feed/', source: 'BC' },
  { url: 'https://www.schneier.com/feed/atom/', source: 'SCHNEIER' },
];

async function fetchWithProxy(feedUrl) {
  const proxies = [
    u => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(u)}&count=10`,
    u => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
    u => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  ];
  for (const proxy of proxies) {
    try {
      const res = await fetch(proxy(feedUrl), { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (json.status === 'ok' && json.items?.length) return { type: 'json', data: json.items };
      } catch {}
      let xmlStr = text;
      try { const j = JSON.parse(text); if (j.contents) xmlStr = j.contents; } catch {}
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlStr, 'text/xml');
      const entries = xml.querySelectorAll('item, entry');
      if (entries.length > 0) return { type: 'xml', data: entries };
    } catch {}
  }
  return null;
}

let isOpen = false;
let items  = [];
let loaded = false;
const getLang = () => window.currentLang || 'en';

const T = {
  en: { title:'WIRE FEED', sub:'Live Cybersecurity Intel', loading:'Fetching intel...', empty:'No articles found.', tab_all:'ALL', tab_thn:'THN', tab_bc:'BC', ago_s:'s ago', ago_m:'m ago', ago_h:'h ago', ago_d:'d ago' },
  tr: { title:'WIRE FEED', sub:'Canlı Siber İstihbarat', loading:'Haberler alınıyor...', empty:'Makale bulunamadı.', tab_all:'HEPSİ', tab_thn:'THN', tab_bc:'BC', ago_s:'s önce', ago_m:'dk önce', ago_h:'s önce', ago_d:'g önce' }
};
const t = k => (T[getLang()] || T.en)[k] || k;

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return Math.floor(diff) + t('ago_s');
  if (diff < 3600)  return Math.floor(diff/60) + t('ago_m');
  if (diff < 86400) return Math.floor(diff/3600) + t('ago_h');
  return Math.floor(diff/86400) + t('ago_d');
}

function getTag(title) {
  const s = title.toLowerCase();
  if (/(ransomware|malware|trojan|rat|backdoor)/.test(s)) return { label:'MALWARE', color:'#ff4444' };
  if (/(vulnerability|cve|zero.?day|exploit|patch|rce)/.test(s)) return { label:'VULN', color:'#ff8800' };
  if (/(breach|leak|stolen|exposed|database)/.test(s)) return { label:'BREACH', color:'#cc44ff' };
  if (/(phishing|social engineering|scam|fraud)/.test(s)) return { label:'PHISH', color:'#ffdd00' };
  if (/(apt|nation.?state|espionage|spy|attack)/.test(s)) return { label:'APT', color:'#ff4488' };
  if (/(ai|llm|deepfake|gpt|artificial)/.test(s)) return { label:'AI', color:'#00ffaa' };
  if (/(law|arrest|fbi|cisa|doj|sanction)/.test(s)) return { label:'LAW', color:'#44aaff' };
  return { label:'NEWS', color:'#888' };
}

const css = document.createElement('style');
css.textContent = `
/* ── WIRE container: sol alt, V gibi ── */
#wire-container {
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 9000;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  font-family: 'JetBrains Mono', monospace;
}

/* ── Panel: yukarı doğru açılır ── */
#wire-panel {
  width: 380px;
  height: 620px;
  background: rgba(4, 7, 14, .97);
  border: 1px solid rgba(255,140,0,.22);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 -8px 40px rgba(255,140,0,.1), 0 0 0 1px rgba(255,140,0,.05);
  margin-bottom: 10px;
  transform: translateY(20px) scale(0.97);
  transform-origin: bottom left;
  opacity: 0;
  pointer-events: none;
  transition: opacity .25s, transform .25s cubic-bezier(.4,0,.2,1);
}
#wire-panel.wire-open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: all;
}
#wire-panel::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.025) 2px, rgba(0,0,0,.025) 4px);
  pointer-events: none;
  z-index: 1;
}

/* ── Trigger button: sol altta sabit ── */
#wire-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: linear-gradient(135deg, rgba(255,140,0,.12) 0%, rgba(255,80,0,.06) 100%);
  border: 1px solid rgba(255,140,0,.3);
  border-radius: 8px;
  cursor: pointer;
  transition: all .25s;
  backdrop-filter: blur(8px);
  filter: drop-shadow(0 0 10px rgba(255,140,0,.2));
}
#wire-trigger:hover {
  background: linear-gradient(135deg, rgba(255,140,0,.2) 0%, rgba(255,80,0,.12) 100%);
  border-color: rgba(255,140,0,.5);
  filter: drop-shadow(0 0 18px rgba(255,140,0,.4));
}
#wire-trigger-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ff8c00;
  box-shadow: 0 0 8px #ff8c00;
  animation: wire-dot-blink 2s infinite;
  flex-shrink: 0;
}
@keyframes wire-dot-blink {
  0%,85%,100% { opacity:1; box-shadow:0 0 8px #ff8c00; }
  90%          { opacity:.2; box-shadow:none; }
}
#wire-trigger-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2.5px;
  color: #ff8c00;
  text-shadow: 0 0 8px rgba(255,140,0,.6);
}
#wire-trigger-count {
  background: #ff3300;
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 8px;
  opacity: 0;
  transition: opacity .3s;
}
#wire-trigger-count.visible { opacity: 1; }

/* ── Header ── */
#wire-header {
  padding: 14px 16px 10px;
  border-bottom: 1px solid rgba(255,140,0,.12);
  flex-shrink: 0;
  background: linear-gradient(180deg, rgba(255,140,0,.06) 0%, transparent 100%);
  position: relative;
  z-index: 2;
}
#wire-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
#wire-header-left { display:flex; align-items:center; gap:8px; }
#wire-header-icon { font-size:16px; }
#wire-title { font-size:12px; font-weight:700; letter-spacing:3px; color:#ff8c00; text-shadow:0 0 10px rgba(255,140,0,.5); line-height:1; }
#wire-sub { font-size:9px; color:rgba(255,140,0,.4); letter-spacing:1.5px; margin-top:2px; }
#wire-close-btn {
  width:24px; height:24px;
  background:rgba(255,140,0,.08);
  border:1px solid rgba(255,140,0,.2);
  border-radius:3px;
  color:rgba(255,140,0,.5);
  font-size:12px;
  cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:all .2s; flex-shrink:0;
}
#wire-close-btn:hover { background:rgba(255,140,0,.15); color:#ff8c00; }

/* ── Tabs ── */
#wire-tabs { display:flex; gap:4px; margin-bottom:6px; }
.wire-tab-btn {
  padding:3px 9px;
  font-family:'JetBrains Mono',monospace;
  font-size:9px; font-weight:700; letter-spacing:1.5px;
  background:transparent;
  border:1px solid rgba(255,140,0,.15);
  border-radius:3px;
  color:rgba(255,140,0,.4);
  cursor:pointer;
  transition:all .2s;
}
.wire-tab-btn:hover { border-color:rgba(255,140,0,.4); color:rgba(255,140,0,.7); }
.wire-tab-btn.active { background:rgba(255,140,0,.12); border-color:rgba(255,140,0,.4); color:#ff8c00; }

/* ── Refresh row ── */
#wire-refresh-row { display:flex; align-items:center; gap:6px; margin-top:4px; }
#wire-refresh-dot { width:4px; height:4px; border-radius:50%; background:#00ffaa; box-shadow:0 0 4px #00ffaa; }
#wire-refresh-dot.loading { background:#ff8c00; box-shadow:0 0 4px #ff8c00; animation:wire-spin-dot .8s linear infinite; }
@keyframes wire-spin-dot { 0%,100%{opacity:1} 50%{opacity:.2} }
#wire-refresh-text { font-size:9px; color:rgba(255,255,255,.18); letter-spacing:1px; }

/* ── Feed ── */
#wire-feed { flex:1; overflow-y:auto; padding:6px 0; position:relative; z-index:2; }
#wire-feed::-webkit-scrollbar { width:3px; }
#wire-feed::-webkit-scrollbar-thumb { background:rgba(255,140,0,.2); border-radius:2px; }
#wire-feed::-webkit-scrollbar-thumb:hover { background:rgba(255,140,0,.4); }

/* ── Items ── */
.wire-item { padding:9px 16px; border-bottom:1px solid rgba(255,140,0,.06); display:block; text-decoration:none; position:relative; overflow:hidden; transition:background .15s; }
.wire-item::before { content:''; position:absolute; left:0; top:0; bottom:0; width:2px; background:transparent; transition:background .2s; }
.wire-item:hover { background:rgba(255,140,0,.04); }
.wire-item:hover::before { background:#ff8c00; box-shadow:0 0 6px rgba(255,140,0,.5); }
.wire-item-meta { display:flex; align-items:center; gap:6px; margin-bottom:4px; }
.wire-item-tag { font-size:8px; font-weight:700; letter-spacing:1.5px; padding:1px 5px; border-radius:2px; border:1px solid; opacity:.85; }
.wire-item-source { font-size:9px; color:rgba(255,255,255,.2); }
.wire-item-time { font-size:9px; color:rgba(255,140,0,.35); margin-left:auto; }
.wire-item-title { font-size:11px; font-weight:500; color:rgba(255,255,255,.75); line-height:1.5; transition:color .2s; }
.wire-item:hover .wire-item-title { color:rgba(255,255,255,.95); }
.wire-item-desc { font-size:10px; color:rgba(255,255,255,.25); line-height:1.5; margin-top:3px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }

/* ── State ── */
#wire-state { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:12px; color:rgba(255,140,0,.35); font-size:11px; letter-spacing:1px; padding:20px; text-align:center; position:relative; z-index:2; }
.wire-spinner { width:20px; height:20px; border:2px solid rgba(255,140,0,.15); border-top-color:#ff8c00; border-radius:50%; animation:wire-spin .7s linear infinite; }
@keyframes wire-spin { to { transform:rotate(360deg); } }

/* ── Footer ── */
#wire-footer { padding:8px 16px; border-top:1px solid rgba(255,140,0,.08); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; position:relative; z-index:2; }
#wire-footer-left { font-size:9px; color:rgba(255,255,255,.12); letter-spacing:1px; }
#wire-refresh-btn {
  font-family:'JetBrains Mono',monospace;
  font-size:9px; font-weight:700; letter-spacing:1.5px;
  color:rgba(255,140,0,.4); background:transparent;
  border:1px solid rgba(255,140,0,.15); border-radius:3px;
  padding:3px 9px; cursor:pointer; transition:all .2s;
}
#wire-refresh-btn:hover { border-color:rgba(255,140,0,.4); color:#ff8c00; background:rgba(255,140,0,.05); }
`;
document.head.appendChild(css);

// ── DOM ───────────────────────────────────────────────────────────────────
const container = document.createElement('div');
container.id = 'wire-container';
container.innerHTML = `
  <div id="wire-panel">
    <div id="wire-header">
      <div id="wire-header-top">
        <div id="wire-header-left">
          <div id="wire-header-icon">📡</div>
          <div>
            <div id="wire-title">WIRE FEED</div>
            <div id="wire-sub">Live Cybersecurity Intel</div>
          </div>
        </div>
        <button id="wire-close-btn" onclick="wireToggle()">✕</button>
      </div>
      <div id="wire-tabs">
        <button class="wire-tab-btn active" onclick="wireSetTab(this,'all')">ALL</button>
        <button class="wire-tab-btn" onclick="wireSetTab(this,'THN')">THN</button>
        <button class="wire-tab-btn" onclick="wireSetTab(this,'BC')">BC</button>
        <button class="wire-tab-btn" onclick="wireSetTab(this,'SCHNEIER')">SCHNEIER</button>
      </div>
      <div id="wire-refresh-row">
        <div id="wire-refresh-dot"></div>
        <div id="wire-refresh-text">LIVE</div>
      </div>
    </div>
    <div id="wire-feed">
      <div id="wire-state"><div style="font-size:28px;opacity:.3">📡</div><div>Waiting...</div></div>
    </div>
    <div id="wire-footer">
      <div id="wire-footer-left">SOURCE: THN + BC + SCHNEIER</div>
      <button id="wire-refresh-btn" onclick="wireFetch()">↻ REFRESH</button>
    </div>
  </div>
  <div id="wire-trigger" onclick="wireToggle()">
    <div id="wire-trigger-dot"></div>
    <span id="wire-trigger-label">📡 WIRE</span>
    <span id="wire-trigger-count">0</span>
  </div>
`;
document.body.appendChild(container);

// ── Toggle ────────────────────────────────────────────────────────────────
window.wireToggle = function () {
  isOpen = !isOpen;
  document.getElementById('wire-panel').classList.toggle('wire-open', isOpen);
  if (isOpen && !loaded) wireFetch();
  if (isOpen) wireUpdateLang();
};

// ── Tab filter ────────────────────────────────────────────────────────────
let currentTab = 'all';
window.wireSetTab = function (btn, src) {
  document.querySelectorAll('.wire-tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentTab = src;
  wireRender();
};

// ── Language update ───────────────────────────────────────────────────────
function wireUpdateLang() {
  document.getElementById('wire-title').textContent = t('title');
  document.getElementById('wire-sub').textContent   = t('sub');
  const tabs = document.querySelectorAll('.wire-tab-btn');
  if (tabs[0]) tabs[0].textContent = t('tab_all');
  if (tabs[1]) tabs[1].textContent = t('tab_thn');
  if (tabs[2]) tabs[2].textContent = t('tab_bc');
  wireRender();
}

// ── Fetch ─────────────────────────────────────────────────────────────────
window.wireFetch = async function () {
  const dot  = document.getElementById('wire-refresh-dot');
  const txt  = document.getElementById('wire-refresh-text');
  const feed = document.getElementById('wire-feed');

  dot.classList.add('loading');
  txt.textContent = t('loading');
  feed.innerHTML = `<div id="wire-state"><div class="wire-spinner"></div><div>${t('loading')}</div></div>`;

  const allItems = [];

  await Promise.allSettled(
    FEEDS.map(async ({ url, source }) => {
      try {
        const result = await fetchWithProxy(url);
        if (!result) { console.warn(`[WIRE] ${source}: all proxies failed`); return; }
        if (result.type === 'json') {
          result.data.forEach(item => {
            allItems.push({ title:item.title, link:item.link, desc:(item.description||'').replace(/<[^>]*>/g,'').slice(0,120), date:item.pubDate, source });
          });
        } else {
          result.data.forEach(el => {
            const get = tag => el.querySelector(tag)?.textContent?.trim() || '';
            const title = get('title');
            const link  = get('link') || el.querySelector('link')?.getAttribute('href') || '';
            const date  = get('pubDate') || get('published') || get('updated') || '';
            const desc  = (get('description')||get('summary')||get('content')).replace(/<[^>]*>/g,'').slice(0,120);
            if (title && link) allItems.push({ title, link, desc, date, source });
          });
        }
        console.log(`[WIRE] ${source}: ${allItems.filter(i=>i.source===source).length} items`);
      } catch (e) { console.error(`[WIRE] ${source} error:`, e); }
    })
  );

  allItems.sort((a,b) => new Date(b.date) - new Date(a.date));
  items  = allItems;
  loaded = true;
  dot.classList.remove('loading');
  txt.textContent = 'LIVE';

  const count = document.getElementById('wire-trigger-count');
  if (items.length > 0) {
    count.textContent = items.length > 99 ? '99+' : items.length;
    count.classList.add('visible');
  }

  wireRender();
  clearTimeout(window._wireTimer);
  window._wireTimer = setTimeout(wireFetch, 5 * 60 * 1000);
};

// ── Render ────────────────────────────────────────────────────────────────
function wireRender() {
  const feed = document.getElementById('wire-feed');
  const filtered = currentTab === 'all' ? items : items.filter(i => i.source === currentTab);

  if (filtered.length === 0) {
    feed.innerHTML = `<div id="wire-state"><div style="font-size:28px;opacity:.3">🔌</div><div>${loaded ? t('empty') : t('loading')}</div></div>`;
    return;
  }

  feed.innerHTML = filtered.map(item => {
    const tag = getTag(item.title);
    return `<a class="wire-item" href="${item.link}" target="_blank" rel="noopener">
      <div class="wire-item-meta">
        <span class="wire-item-tag" style="color:${tag.color};border-color:${tag.color}44;background:${tag.color}11">${tag.label}</span>
        <span class="wire-item-source">${item.source}</span>
        <span class="wire-item-time">${timeAgo(item.date)}</span>
      </div>
      <div class="wire-item-title">${item.title}</div>
      ${item.desc ? `<div class="wire-item-desc">${item.desc}</div>` : ''}
    </a>`;
  }).join('');
}

// ── Sadece landing page'de göster ────────────────────────────────────────
function wireCheckPage() {
  const landing   = document.getElementById('landing');
  const isLanding = landing && landing.classList.contains('active');
  document.getElementById('wire-container').style.display = isLanding ? 'flex' : 'none';
}

const _origShowPage = window.showPage;
window.showPage = function(page) {
  if (_origShowPage) _origShowPage(page);
  setTimeout(wireCheckPage, 50);
};

let _lastLang = getLang();
setInterval(() => {
  const l = getLang();
  if (l !== _lastLang) { _lastLang = l; wireUpdateLang(); }
  wireCheckPage();
}, 500);

wireUpdateLang();
wireCheckPage();

})();