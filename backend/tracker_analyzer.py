import sys
sys.stdout = __import__('io').TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
import re

app = Flask(__name__)
CORS(app, origins="*", allow_headers=["Content-Type"], methods=["GET", "POST", "OPTIONS"])

# ═══════════════════════════════════════════════════════════════
#  TRACKER DATABASE
# ═══════════════════════════════════════════════════════════════

TRACKERS = {
    "Meta / Facebook": {
        "category": "advertising", "risk": "high",
        "domains": ["connect.facebook.net", "facebook.com/tr", "facebook.pixel", "fbcdn.net"],
        "description": "Tracks your activity across all sites with Facebook Like/Share buttons or Pixel.",
        "company": "Meta Platforms Inc."
    },
    "Google Analytics": {
        "category": "analytics", "risk": "medium",
        "domains": ["google-analytics.com", "googletagmanager.com", "gtag", "analytics.js", "ga.js"],
        "description": "Collects detailed browsing behavior, session data, and demographic info.",
        "company": "Google LLC"
    },
    "Google Ads": {
        "category": "advertising", "risk": "high",
        "domains": ["googleadservices.com", "googlesyndication.com", "doubleclick.net", "adservice.google.com"],
        "description": "Tracks conversions and builds ad targeting profiles.",
        "company": "Google LLC"
    },
    "TikTok Pixel": {
        "category": "advertising", "risk": "high",
        "domains": ["analytics.tiktok.com", "tiktok.com/i18n", "byteoversea.com", "tiktokcdn.com"],
        "description": "Tracks user behavior for TikTok ad targeting. Data may be shared with ByteDance.",
        "company": "ByteDance Ltd."
    },
    "Twitter / X Pixel": {
        "category": "advertising", "risk": "medium",
        "domains": ["static.ads-twitter.com", "analytics.twitter.com", "t.co/"],
        "description": "Tracks conversions and activity for Twitter/X ad campaigns.",
        "company": "X Corp."
    },
    "LinkedIn Insight": {
        "category": "advertising", "risk": "medium",
        "domains": ["snap.licdn.com", "linkedin.com/li/track", "platform.linkedin.com"],
        "description": "Tracks professional profile data and site visits for LinkedIn ads.",
        "company": "LinkedIn Corp. (Microsoft)"
    },
    "Hotjar": {
        "category": "fingerprinting", "risk": "high",
        "domains": ["static.hotjar.com", "vars.hotjar.com", "hotjar.com"],
        "description": "Records mouse movements, clicks, scrolls, and session replays.",
        "company": "Hotjar Ltd."
    },
    "FullStory": {
        "category": "fingerprinting", "risk": "high",
        "domains": ["fullstory.com", "rs.fullstory.com", "edge.fullstory.com"],
        "description": "Full session recording — captures everything you type and click.",
        "company": "FullStory Inc."
    },
    "Mixpanel": {
        "category": "analytics", "risk": "medium",
        "domains": ["cdn.mxpnl.com", "api.mixpanel.com", "mixpanel.com"],
        "description": "Tracks detailed user events and behavioral analytics.",
        "company": "Mixpanel Inc."
    },
    "Amplitude": {
        "category": "analytics", "risk": "medium",
        "domains": ["cdn.amplitude.com", "api.amplitude.com", "amplitude.com"],
        "description": "Product analytics platform tracking user journeys and events.",
        "company": "Amplitude Inc."
    },
    "Segment": {
        "category": "analytics", "risk": "medium",
        "domains": ["cdn.segment.com", "api.segment.io", "segment.com"],
        "description": "Data pipeline that sends your activity to dozens of other trackers.",
        "company": "Twilio Inc."
    },
    "Intercom": {
        "category": "analytics", "risk": "low",
        "domains": ["widget.intercom.io", "js.intercom.io", "intercom.com"],
        "description": "Customer messaging platform that tracks user behavior for support targeting.",
        "company": "Intercom Inc."
    },
    "Crisp": {
        "category": "analytics", "risk": "low",
        "domains": ["client.crisp.chat", "crisp.chat"],
        "description": "Live chat widget that tracks visitor sessions.",
        "company": "Crisp IM SAS"
    },
    "Cloudflare": {
        "category": "infrastructure", "risk": "low",
        "domains": ["cloudflareinsights.com", "beacon.min.js"],
        "description": "Web performance analytics. Generally privacy-respecting.",
        "company": "Cloudflare Inc."
    },
    "Sentry": {
        "category": "analytics", "risk": "low",
        "domains": ["browser.sentry-cdn.com", "sentry.io"],
        "description": "Error tracking — may capture stack traces with user data.",
        "company": "Functional Software Inc."
    },
    "Oracle BlueKai": {
        "category": "data_broker", "risk": "critical",
        "domains": ["bluekai.com", "bkrtx.com", "oracleinfinity.io"],
        "description": "Data broker — builds and sells detailed consumer profiles.",
        "company": "Oracle Corp."
    },
    "Criteo": {
        "category": "advertising", "risk": "high",
        "domains": ["static.criteo.net", "cas.criteo.com", "criteo.com"],
        "description": "Retargeting platform — tracks purchases and browsing to serve ads.",
        "company": "Criteo SA"
    },
    "LogRocket": {
        "category": "fingerprinting", "risk": "high",
        "domains": ["cdn.logrocket.io", "logrocket.com"],
        "description": "Session replay and logging — records user interactions in detail.",
        "company": "LogRocket Inc."
    },
    "Mouseflow": {
        "category": "fingerprinting", "risk": "high",
        "domains": ["cdn.mouseflow.com", "mouseflow.com"],
        "description": "Heatmaps and session recordings of mouse movements.",
        "company": "Mouseflow Inc."
    },
    "Klaviyo": {
        "category": "advertising", "risk": "medium",
        "domains": ["static.klaviyo.com", "a.klaviyo.com", "klaviyo.com"],
        "description": "Email marketing platform that tracks browsing for targeted campaigns.",
        "company": "Klaviyo Inc."
    },
    "Adobe Analytics": {
        "category": "analytics", "risk": "medium",
        "domains": ["omtrdc.net", "2o7.net", "sc.omtrdc.net", "adobedtm.com"],
        "description": "Enterprise analytics suite tracking user behavior across digital properties.",
        "company": "Adobe Inc."
    },
    "Quantcast": {
        "category": "data_broker", "risk": "critical",
        "domains": ["quantserve.com", "quantcount.com", "edge.quantserve.com"],
        "description": "Audience measurement and data broker — builds demographic profiles.",
        "company": "Quantcast Corp."
    },
    "Chartbeat": {
        "category": "analytics", "risk": "medium",
        "domains": ["static.chartbeat.com", "ping.chartbeat.net"],
        "description": "Real-time analytics tracking what content users engage with.",
        "company": "Chartbeat Inc."
    },
    "Taboola": {
        "category": "advertising", "risk": "high",
        "domains": ["cdn.taboola.com", "trc.taboola.com", "taboola.com"],
        "description": "Content recommendation and native advertising network.",
        "company": "Taboola Inc."
    },
    "Outbrain": {
        "category": "advertising", "risk": "high",
        "domains": ["widgets.outbrain.com", "log.outbrain.com", "outbrain.com"],
        "description": "Content recommendation ad network tracking reading behavior.",
        "company": "Outbrain Inc."
    },
    "Yandex Metrica": {
        "category": "analytics", "risk": "high",
        "domains": ["mc.yandex.ru", "mc.webvisor.org", "yandex.ru/metrika"],
        "description": "Russian analytics platform with session recording. Data subject to Russian law.",
        "company": "Yandex LLC"
    },
    "Smartlook": {
        "category": "fingerprinting", "risk": "high",
        "domains": ["rec.smartlook.com", "smartlook.com"],
        "description": "Session recording and heatmap tool capturing all user interactions.",
        "company": "Smartlook s.r.o."
    },
    "Heap Analytics": {
        "category": "analytics", "risk": "medium",
        "domains": ["cdn.heapanalytics.com", "heapanalytics.com"],
        "description": "Auto-captures every user interaction without manual event tracking.",
        "company": "Heap Inc."
    },
    "Braze": {
        "category": "advertising", "risk": "medium",
        "domains": ["js.appboycdn.com", "sdk.iad-01.braze.com", "braze.com"],
        "description": "Customer engagement platform tracking behavior for targeted messaging.",
        "company": "Braze Inc."
    },
    "Insider": {
        "category": "advertising", "risk": "high",
        "domains": ["useinsider.com", "ins.cdn.useinsider.com"],
        "description": "AI-powered marketing platform used heavily by Turkish e-commerce sites.",
        "company": "Insider Inc."
    },
    "Adjust": {
        "category": "analytics", "risk": "medium",
        "domains": ["app.adjust.com", "cdn.adjust.com", "adjust.com"],
        "description": "Mobile attribution and analytics platform.",
        "company": "Adjust GmbH"
    },
    "Appsflyer": {
        "category": "analytics", "risk": "medium",
        "domains": ["appsflyer.com", "cdn.appsflyer.com"],
        "description": "Mobile attribution tracking user acquisition sources.",
        "company": "AppsFlyer Ltd."
    },
}

RISK_WEIGHTS = {"critical": 40, "high": 20, "medium": 10, "low": 3}
CATEGORY_LABELS = {
    "advertising":    "🎯 Advertising",
    "analytics":      "📊 Analytics",
    "fingerprinting": "🔬 Fingerprinting / Session Recording",
    "data_broker":    "💀 Data Broker",
    "infrastructure": "⚙️ Infrastructure"
}

STEALTH_SCRIPT = """
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });

    window.chrome = {
        runtime: { connect: () => {}, sendMessage: () => {} },
        loadTimes: () => {},
        csi: () => {},
    };

    Object.defineProperty(navigator, 'plugins', {
        get: () => {
            const arr = [
                { name: 'Chrome PDF Plugin',  filename: 'internal-pdf-viewer',               description: 'Portable Document Format' },
                { name: 'Chrome PDF Viewer',  filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',  description: '' },
                { name: 'Native Client',      filename: 'internal-nacl-plugin',               description: '' },
            ];
            arr.__proto__ = PluginArray.prototype;
            return arr;
        }
    });

    Object.defineProperty(navigator, 'languages',           { get: () => ['tr-TR', 'tr', 'en-US', 'en'] });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory',        { get: () => 8 });
    Object.defineProperty(navigator, 'platform',            { get: () => 'Win32' });
    Object.defineProperty(navigator, 'maxTouchPoints',      { get: () => 0 });

    const origQuery = window.navigator.permissions.query.bind(navigator.permissions);
    window.navigator.permissions.query = (p) =>
        p.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission })
            : origQuery(p);

    const getParam = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(p) {
        if (p === 37445) return 'Intel Inc.';
        if (p === 37446) return 'Intel Iris OpenGL Engine';
        return getParam.call(this, p);
    };

    Object.defineProperty(screen, 'colorDepth', { get: () => 24 });
    Object.defineProperty(screen, 'pixelDepth',  { get: () => 24 });
"""

# ═══════════════════════════════════════════════════════════════
#  URL NORMALIZATION
# ═══════════════════════════════════════════════════════════════

def normalize_url(url: str) -> str:
    url = url.strip()
    if not url:
        return url
    if re.match(r'^https?://', url, re.IGNORECASE):
        return url
    if url.startswith('//'):
        return 'https:' + url
    return 'https://' + url

# ═══════════════════════════════════════════════════════════════
#  HEADLESS BROWSER — Playwright + Stealth
# ═══════════════════════════════════════════════════════════════

def _try_playwright(url: str):
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return None

    network_urls = []
    final_url    = url
    resp_headers = {}

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,BlockInsecurePrivateNetworkRequests',
                    '--disable-blink-features=AutomationControlled',
                    '--window-size=1280,800',
                ]
            )

            context = browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1280, "height": 800},
                locale="tr-TR,tr;q=0.9,en-US;q=0.8",
                timezone_id="Europe/Istanbul",
                java_script_enabled=True,
                bypass_csp=True,
                extra_http_headers={
                    "Accept":                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                    "Accept-Encoding":           "gzip, deflate, br",
                    "Accept-Language":           "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
                    "Cache-Control":             "max-age=0",
                    "Sec-Ch-Ua":                 '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                    "Sec-Ch-Ua-Mobile":          "?0",
                    "Sec-Ch-Ua-Platform":        '"Windows"',
                    "Sec-Fetch-Dest":            "document",
                    "Sec-Fetch-Mode":            "navigate",
                    "Sec-Fetch-Site":            "none",
                    "Sec-Fetch-User":            "?1",
                    "Upgrade-Insecure-Requests": "1",
                }
            )

            page = context.new_page()

            # Stealth: önce kütüphane dene, yoksa manuel script
            try:
                from playwright_stealth import stealth_sync
                stealth_sync(page)
                print("[Playwright] playwright-stealth aktif", file=sys.stderr)
            except ImportError:
                page.add_init_script(STEALTH_SCRIPT)
                print("[Playwright] Manuel stealth aktif", file=sys.stderr)

            # Tüm ağ isteklerini yakala
            page.on("request", lambda req: network_urls.append(req.url))

            # Sayfayı yükle
            resp = page.goto(url, wait_until="domcontentloaded", timeout=30_000)

            if resp:
                final_url    = page.url
                resp_headers = dict(resp.headers)

            # networkidle bekle (timeout'a düşse de devam et)
            try:
                page.wait_for_load_state("networkidle", timeout=12_000)
            except Exception:
                pass

            # Scroll → lazy-load tracker'ları tetikle
            try:
                page.evaluate("""
                    () => new Promise(resolve => {
                        let total = 0;
                        const step = 300;
                        const max  = Math.min(document.body.scrollHeight, 3000);
                        const t = setInterval(() => {
                            window.scrollBy(0, step);
                            total += step;
                            if (total >= max) { clearInterval(t); resolve(); }
                        }, 120);
                    })
                """)
            except Exception:
                pass

            page.wait_for_timeout(2000)
            html_content = page.content()
            browser.close()

        return {
            "html":         html_content,
            "network_urls": network_urls,
            "final_url":    final_url,
            "headers":      resp_headers,
            "engine":       "playwright",
        }

    except Exception as e:
        print(f"[Playwright] Hata: {e}", file=sys.stderr)
        return None

# ═══════════════════════════════════════════════════════════════
#  STATIC FALLBACK — requests
# ═══════════════════════════════════════════════════════════════

def _fetch_static(url: str):
    hdrs = {
        "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    resp = requests.get(url, headers=hdrs, timeout=15, allow_redirects=True)
    return {
        "html":         resp.text,
        "network_urls": [],
        "final_url":    resp.url,
        "headers":      dict(resp.headers),
        "engine":       "static",
    }

def fetch_page(url: str):
    result = _try_playwright(url)
    return result if result else _fetch_static(url)

# ═══════════════════════════════════════════════════════════════
#  ANALYSIS HELPERS
# ═══════════════════════════════════════════════════════════════

def extract_scripts(html, base_url, network_urls=None):
    soup    = BeautifulSoup(html, "html.parser")
    sources = set()

    for tag in soup.find_all("script", src=True):
        src = tag["src"]
        if src.startswith("//"):
            src = "https:" + src
        elif src.startswith("/"):
            src = urljoin(base_url, src)
        sources.add(src)

    if network_urls:
        for u in network_urls:
            sources.add(u)

    inline_scripts = [
        tag.string for tag in soup.find_all("script", src=False)
        if tag.string
    ]

    return sources, inline_scripts, soup


def detect_trackers(script_sources, inline_scripts, html):
    found = {}

    for name, info in TRACKERS.items():
        detected   = False
        matched_on = []

        for domain in info["domains"]:
            dl = domain.lower()

            for src in script_sources:
                if dl in src.lower():
                    detected = True
                    matched_on.append(src[:120])
                    break

            if not detected:
                for script in inline_scripts:
                    if dl in script.lower():
                        detected = True
                        matched_on.append(f"inline script ({domain})")
                        break

            if not detected and dl in html.lower():
                detected = True
                matched_on.append(f"HTML reference ({domain})")

            if detected:
                break

        if detected:
            found[name] = {**info, "matched_on": matched_on[:3]}

    return found


def calculate_risk_score(found_trackers):
    return min(sum(RISK_WEIGHTS.get(i["risk"], 0) for i in found_trackers.values()), 100)


def extract_cookies_info(response_headers):
    raw = ""
    if isinstance(response_headers, dict):
        raw = response_headers.get("set-cookie") or response_headers.get("Set-Cookie", "")
    if not raw:
        return []
    return [{
        "raw":      raw[:200],
        "httponly": "httponly"  in raw.lower(),
        "secure":   "secure"   in raw.lower(),
        "samesite": "samesite" in raw.lower(),
    }]


def get_risk_label(score):
    if score >= 70: return "CRITICAL"
    if score >= 40: return "HIGH"
    if score >= 20: return "MEDIUM"
    if score >  0:  return "LOW"
    return "CLEAN"

# ═══════════════════════════════════════════════════════════════
#  ROUTES
# ═══════════════════════════════════════════════════════════════

@app.route('/analyze', methods=['POST'])
def analyze():
    data    = request.get_json()
    raw_url = data.get('url', '').strip()

    if not raw_url:
        return jsonify({"error": "No URL provided"}), 400

    url = normalize_url(raw_url)

    try:
        page_data = fetch_page(url)
    except requests.exceptions.Timeout:
        return jsonify({"error": "Request timed out."}), 408
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Could not connect to the site."}), 502
    except Exception as e:
        return jsonify({"error": f"Failed to fetch page: {str(e)}"}), 500

    html         = page_data["html"]
    headers      = page_data["headers"]
    final_url    = page_data["final_url"]
    network_urls = page_data["network_urls"]
    engine       = page_data["engine"]

    script_sources, inline_scripts, _ = extract_scripts(html, final_url, network_urls)
    found_trackers = detect_trackers(script_sources, inline_scripts, html)
    risk_score     = calculate_risk_score(found_trackers)
    cookies_info   = extract_cookies_info(headers)
    risk_label     = get_risk_label(risk_score)

    by_category = {}
    for name, info in found_trackers.items():
        cat = info["category"]
        by_category.setdefault(cat, []).append({
            "name":        name,
            "risk":        info["risk"],
            "description": info["description"],
            "company":     info["company"],
            "matched_on":  info["matched_on"],
        })

    domain = urlparse(final_url).netloc

    return jsonify({
        "url":                       final_url,
        "domain":                    domain,
        "risk_score":                risk_score,
        "risk_label":                risk_label,
        "tracker_count":             len(found_trackers),
        "trackers_by_category":      by_category,
        "category_labels":           CATEGORY_LABELS,
        "cookies":                   cookies_info,
        "scripts_scanned":           len(script_sources),
        "network_requests_captured": len(network_urls),
        "analysis_engine":           engine,
        "summary": (
            f"Found {len(found_trackers)} tracker{'s' if len(found_trackers) != 1 else ''} "
            f"on {domain} ({'full render' if engine == 'playwright' else 'static scan'})."
        )
    })


@app.route('/health', methods=['GET'])
def health():
    pw = False
    try:
        import playwright; pw = True  # noqa
    except ImportError:
        pass
    return jsonify({
        "status":           "ok",
        "service":          "tracker_analyzer",
        "trackers_in_db":   len(TRACKERS),
        "playwright_ready": pw,
        "analysis_mode":    "headless_browser" if pw else "static_fallback",
    })

# ═══════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════

if __name__ == '__main__':
    print("🚀 Starting NetRunner Tracker Analyzer...")
    print(f"🕵️  Tracker database: {len(TRACKERS)} known trackers")
    try:
        from playwright.sync_api import sync_playwright  # noqa
        print("✅ Playwright kurulu — Headless Browser modu AKTİF")
        try:
            from playwright_stealth import stealth_sync  # noqa
            print("✅ playwright-stealth kurulu — Maksimum gizlilik modu AKTİF")
        except ImportError:
            print("⚠️  playwright-stealth yok — Manuel stealth kullanılıyor")
            print("   Daha iyi sonuç için: pip install playwright-stealth")
    except ImportError:
        print("⚠️  Playwright bulunamadı — Statik mod kullanılıyor")
        print("   pip install playwright && playwright install chromium")
    print("📡 Listening on http://0.0.0.0:5008")
    app.run(host='0.0.0.0', port=5008, debug=True)