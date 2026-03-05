"""
NetRunner — Digital Footprint Analyzer
=======================================
Uses Holehe CLI via subprocess, parses output.
121 platforms, ~10-15 second scan time.
Port: 5006
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import subprocess
import shutil
import hashlib
import time
import re

from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ══════════════════════════════════════════════════════════════════════════
# HOLEHE CHECK
# ══════════════════════════════════════════════════════════════════════════

HOLEHE_PATH      = shutil.which('holehe')
HOLEHE_AVAILABLE = HOLEHE_PATH is not None

if HOLEHE_AVAILABLE:
    print(f"✅ Holehe found: {HOLEHE_PATH}")
else:
    print("❌ Holehe not found — run: pip install holehe")

# ══════════════════════════════════════════════════════════════════════════
# PLATFORM METADATA
# ══════════════════════════════════════════════════════════════════════════

PLATFORM_META = {
    # Social Media
    "twitter":       {"icon": "🐦", "category": "Social Media",  "risk": "high"},
    "instagram":     {"icon": "📸", "category": "Social Media",  "risk": "high"},
    "facebook":      {"icon": "👤", "category": "Social Media",  "risk": "high"},
    "reddit":        {"icon": "🤖", "category": "Social Media",  "risk": "medium"},
    "tiktok":        {"icon": "🎵", "category": "Social Media",  "risk": "high"},
    "tumblr":        {"icon": "📝", "category": "Social Media",  "risk": "low"},
    "discord":       {"icon": "🎮", "category": "Social Media",  "risk": "high"},
    "snapchat":      {"icon": "👻", "category": "Social Media",  "risk": "high"},
    "pinterest":     {"icon": "📌", "category": "Social Media",  "risk": "medium"},
    "flickr":        {"icon": "📷", "category": "Social Media",  "risk": "low"},
    "vimeo":         {"icon": "🎬", "category": "Social Media",  "risk": "low"},
    "plurk":         {"icon": "💬", "category": "Social Media",  "risk": "low"},
    "rambler":       {"icon": "🌐", "category": "Social Media",  "risk": "low"},
    "myspace":       {"icon": "🎸", "category": "Social Media",  "risk": "low"},
    # Developer
    "github":        {"icon": "💻", "category": "Developer",     "risk": "high"},
    "gitlab":        {"icon": "🦊", "category": "Developer",     "risk": "high"},
    "stackoverflow": {"icon": "📚", "category": "Developer",     "risk": "medium"},
    "replit":        {"icon": "⚡", "category": "Developer",     "risk": "medium"},
    "codepen":       {"icon": "✏️", "category": "Developer",     "risk": "low"},
    "devrant":       {"icon": "😤", "category": "Developer",     "risk": "low"},
    "teamtreehouse": {"icon": "🌳", "category": "Developer",     "risk": "low"},
    "seoclerks":     {"icon": "🔍", "category": "Developer",     "risk": "low"},
    "bitbucket":     {"icon": "🪣", "category": "Developer",     "risk": "medium"},
    "npmjs":         {"icon": "📦", "category": "Developer",     "risk": "medium"},
    "pypi":          {"icon": "🐍", "category": "Developer",     "risk": "medium"},
    # Gaming
    "steam":         {"icon": "🎮", "category": "Gaming",        "risk": "high"},
    "twitch":        {"icon": "🟣", "category": "Gaming",        "risk": "high"},
    "roblox":        {"icon": "🧱", "category": "Gaming",        "risk": "low"},
    # Streaming
    "spotify":       {"icon": "🎵", "category": "Streaming",     "risk": "high"},
    "soundcloud":    {"icon": "🔊", "category": "Streaming",     "risk": "medium"},
    "lastfm":        {"icon": "🎸", "category": "Streaming",     "risk": "low"},
    "deezer":        {"icon": "🎶", "category": "Streaming",     "risk": "medium"},
    "netflix":       {"icon": "🎬", "category": "Streaming",     "risk": "high"},
    "disneyplus":    {"icon": "✨", "category": "Streaming",     "risk": "medium"},
    # Finance
    "paypal":        {"icon": "💳", "category": "Finance",       "risk": "critical"},
    "venmo":         {"icon": "💸", "category": "Finance",       "risk": "high"},
    "lastpass":      {"icon": "🔑", "category": "Finance",       "risk": "critical"},
    # Shopping
    "amazon":        {"icon": "📦", "category": "Shopping",      "risk": "critical"},
    "ebay":          {"icon": "🛒", "category": "Shopping",      "risk": "high"},
    "etsy":          {"icon": "🎨", "category": "Shopping",      "risk": "medium"},
    "envato":        {"icon": "🟢", "category": "Shopping",      "risk": "medium"},
    # Professional
    "linkedin":      {"icon": "💼", "category": "Professional",  "risk": "high"},
    "freelancer":    {"icon": "💼", "category": "Professional",  "risk": "medium"},
    "fiverr":        {"icon": "🟢", "category": "Professional",  "risk": "medium"},
    "upwork":        {"icon": "💼", "category": "Professional",  "risk": "medium"},
    "500px":         {"icon": "📷", "category": "Professional",  "risk": "low"},
    "coroflot":      {"icon": "🎨", "category": "Professional",  "risk": "low"},
    # Productivity
    "notion":        {"icon": "📋", "category": "Productivity",  "risk": "medium"},
    "slack":         {"icon": "💬", "category": "Productivity",  "risk": "high"},
    "dropbox":       {"icon": "📁", "category": "Productivity",  "risk": "high"},
    "zoom":          {"icon": "📹", "category": "Productivity",  "risk": "medium"},
    "zoho":          {"icon": "🟠", "category": "Productivity",  "risk": "medium"},
    "office365":     {"icon": "🪟", "category": "Productivity",  "risk": "critical"},
    "evernote":      {"icon": "📓", "category": "Productivity",  "risk": "medium"},
    "mailchimp":     {"icon": "📧", "category": "Productivity",  "risk": "medium"},
    "insightly":     {"icon": "📊", "category": "Productivity",  "risk": "medium"},
    "canva":         {"icon": "🎨", "category": "Productivity",  "risk": "low"},
    "hubspot":       {"icon": "🟠", "category": "Productivity",  "risk": "medium"},
    # Education
    "duolingo":      {"icon": "🦉", "category": "Education",     "risk": "low"},
    "coursera":      {"icon": "📚", "category": "Education",     "risk": "medium"},
    "udemy":         {"icon": "🎓", "category": "Education",     "risk": "medium"},
    "quora":         {"icon": "❓", "category": "Education",     "risk": "low"},
    "academia":      {"icon": "🎓", "category": "Education",     "risk": "medium"},
    # Dating
    "tinder":        {"icon": "🔥", "category": "Dating",        "risk": "high"},
    "badoo":         {"icon": "💘", "category": "Dating",        "risk": "high"},
    # Other
    "gravatar":      {"icon": "🖼️", "category": "Other",         "risk": "low"},
    "medium":        {"icon": "✍️",  "category": "Other",         "risk": "low"},
    "patreon":       {"icon": "🎭", "category": "Other",         "risk": "medium"},
    "airbnb":        {"icon": "🏠", "category": "Other",         "risk": "medium"},
    "kickstarter":   {"icon": "🚀", "category": "Other",         "risk": "low"},
    "eventbrite":    {"icon": "🎟️", "category": "Other",         "risk": "low"},
    "archive":       {"icon": "🗄️", "category": "Other",         "risk": "low"},
    "imgur":         {"icon": "🖼️", "category": "Other",         "risk": "low"},
    "deviantart":    {"icon": "🎨", "category": "Other",         "risk": "low"},
    "wordpress":     {"icon": "📝", "category": "Other",         "risk": "medium"},
    "adobe":         {"icon": "🎨", "category": "Other",         "risk": "high"},
    "naturabuy":     {"icon": "🌿", "category": "Other",         "risk": "low"},
    "firefox":       {"icon": "🦊", "category": "Other",         "risk": "low"},
    "any":           {"icon": "✅", "category": "Productivity",  "risk": "low"},
}

DEFAULT_META = {"icon": "🌐", "category": "Other", "risk": "low"}
RISK_WEIGHTS = {"critical": 15, "high": 8, "medium": 4, "low": 2}
RISK_ORDER   = {"critical": 0, "high": 1, "medium": 2, "low": 3}
ANSI_ESCAPE  = re.compile(r'\x1b\[[0-9;]*m')

# Filter out holehe's legend line
LEGEND_SKIP = {"email used", "email not used", "rate limit", "[+]", "[-]", "[x]"}


def get_meta(name: str) -> dict:
    key = re.sub(r'[\s.\-_()\[\]]', '', name.lower())
    if key in PLATFORM_META:
        return PLATFORM_META[key]
    for k, v in PLATFORM_META.items():
        if k in key or key in k:
            return v
    return DEFAULT_META


def email_hash(email: str) -> str:
    return hashlib.md5(email.strip().lower().encode()).hexdigest()


def calc_exposure_score(found: list) -> int:
    if not found:
        return 0
    raw = sum(RISK_WEIGHTS.get(r["risk"], 2) for r in found)
    return min(int((raw / 120) * 100), 100)


def calc_exposure_label(score: int) -> str:
    if score >= 75: return "CRITICAL"
    if score >= 50: return "HIGH"
    if score >= 25: return "MEDIUM"
    if score > 0:   return "LOW"
    return "CLEAN"


def build_summary(found: list, score: int) -> str:
    if not found:
        return "No accounts found. Minimal digital footprint detected."
    critical = [r for r in found if r["risk"] == "critical"]
    high     = [r for r in found if r["risk"] == "high"]
    parts    = [f"Found on {len(found)} platform(s)."]
    if critical:
        parts.append(f"Critical exposure: {', '.join(r['name'] for r in critical[:3])}.")
    if high:
        parts.append(f"High-risk accounts: {', '.join(r['name'] for r in high[:3])}.")
    if score >= 75:
        parts.append("Significant footprint — consider account cleanup.")
    elif score >= 50:
        parts.append("Moderate exposure across multiple services.")
    return " ".join(parts)


# ══════════════════════════════════════════════════════════════════════════
# HOLEHE CLI
# ══════════════════════════════════════════════════════════════════════════

def run_holehe(email: str) -> str:
    def _run(args):
        return subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=120,
            encoding='utf-8',
            errors='ignore'
        )
    try:
        r = _run(['holehe', '--only-used', '--no-color', email])
        # Fallback if --only-used flag is not supported by this holehe version
        if 'no such option' in (r.stderr or '').lower():
            r = _run(['holehe', '--no-color', email])
        return (r.stdout or '') + (r.stderr or '')
    except subprocess.TimeoutExpired:
        print("⚠️  Holehe timed out")
        return ""
    except FileNotFoundError:
        print("❌ holehe binary not found")
        return ""
    except Exception as e:
        print(f"❌ Subprocess error: {e}")
        return ""


def parse_output(raw: str):
    """
    Holehe output format:
    [+] platform.com  → account found
    [-] platform.com  → not found (ignored)
    [x] platform.com  → rate limited

    Returns: found[], errors[], total_scanned
    """
    found  = []
    errors = []
    total  = 0

    m = re.search(r'(\d+) websites? checked', raw)
    if m:
        total = int(m.group(1))

    for line in raw.splitlines():
        line = ANSI_ESCAPE.sub('', line).strip()

        if line.startswith('[+]'):
            platform_raw = line[3:].strip()

            # Skip holehe's own legend line: "[+] Email used, [-] Email not used..."
            platform_lower = platform_raw.lower()
            if any(skip in platform_lower for skip in LEGEND_SKIP):
                continue

            platform_slug = platform_raw.split('.')[0]
            meta = get_meta(platform_slug)
            found.append({
                "name":     platform_raw,
                "icon":     meta["icon"],
                "category": meta["category"],
                "risk":     meta["risk"],
                "found":    True,
            })

        elif line.startswith('[x]'):
            platform_raw  = line[3:].strip()
            platform_slug = platform_raw.split('.')[0]
            meta = get_meta(platform_slug)
            errors.append({
                "name":         platform_raw,
                "icon":         meta["icon"],
                "category":     meta["category"],
                "risk":         meta["risk"],
                "found":        False,
                "rate_limited": True,
            })

    found.sort(key=lambda x: RISK_ORDER.get(x["risk"], 4))
    return found, errors, total


# ══════════════════════════════════════════════════════════════════════════
# FLASK ROUTES
# ══════════════════════════════════════════════════════════════════════════

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status":    "online",
        "service":   "Digital Footprint Analyzer",
        "engine":    "holehe-cli" if HOLEHE_AVAILABLE else "unavailable",
        "holehe":    HOLEHE_PATH or "not found",
        "port":      5006
    })


@app.route('/scan', methods=['POST'])
def scan():
    if not HOLEHE_AVAILABLE:
        return jsonify({"error": "Holehe not found. Run: pip install holehe"}), 503

    data = request.get_json(silent=True)
    if not data or not data.get('email'):
        return jsonify({"error": "Email address is required"}), 400

    email = data['email'].strip().lower()

    if '@' not in email or '.' not in email.split('@')[-1]:
        return jsonify({"error": "Invalid email format"}), 400

    if len(email) > 254:
        return jsonify({"error": "Email too long"}), 400

    print(f"\n🔍 Scanning: {email}")
    t0 = time.time()

    raw = run_holehe(email)

    if not raw.strip():
        return jsonify({"error": "Holehe returned no output. Is it installed correctly?"}), 500

    found, errors, total_scanned = parse_output(raw)
    elapsed = round(time.time() - t0, 2)

    print(f"✅ Done in {elapsed}s — {len(found)} found / {total_scanned or '?'} scanned")

    # Group by category
    by_category: dict = {}
    for r in found:
        by_category.setdefault(r["category"], []).append(r)

    score = calc_exposure_score(found)

    return jsonify({
        "email":             email,
        "scan_time":         elapsed,
        "platforms_scanned": total_scanned or 121,
        "found_count":       len(found),
        "exposure_score":    score,
        "exposure_label":    calc_exposure_label(score),
        "summary":           build_summary(found, score),
        "risk_breakdown": {
            "critical": sum(1 for r in found if r["risk"] == "critical"),
            "high":     sum(1 for r in found if r["risk"] == "high"),
            "medium":   sum(1 for r in found if r["risk"] == "medium"),
            "low":      sum(1 for r in found if r["risk"] == "low"),
        },
        "by_category":   by_category,
        "found":         found,
        "errors_count":  len(errors),
        "gravatar_hash": email_hash(email),
    })


@app.route('/platforms', methods=['GET'])
def platforms():
    return jsonify({
        "engine":    "holehe-cli",
        "available": HOLEHE_AVAILABLE,
        "platforms": list(PLATFORM_META.keys()),
        "count":     len(PLATFORM_META),
    })


if __name__ == '__main__':
    print("=" * 50)
    print("  NetRunner — Digital Footprint Analyzer")
    if HOLEHE_AVAILABLE:
        print(f"  Engine : Holehe CLI")
        print(f"  Binary : {HOLEHE_PATH}")
    else:
        print("  ⚠️  Holehe not found — pip install holehe")
    print("  URL    : http://0.0.0.0:5006")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5006, debug=False)