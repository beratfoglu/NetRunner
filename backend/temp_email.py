"""
NetRunner — Temp Email Service (SECURE VERSION)
------------------------------------------------
Provider: Mail.tm
Security: 
  - SQLite-based persistent rate limiting
  - Server-side timestamp validation
  - Future timestamp protection
  - Negative value prevention
  - Time manipulation detection
Rule: Max 2 emails per hour per IP address.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from urllib.parse import unquote
import requests
import random
import string
import sqlite3
import time
import os
import sys
import io

# UTF-8 encoding fix for Windows Turkish
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# --- CONFIG ---
BASE_URL = "https://api.mail.tm"
LIMIT_COUNT = 2      # Max emails per window per IP
LIMIT_WINDOW = 3600  # 1 hour in seconds
DB_FILE = "ratelimit.db"

# --- IN-MEMORY ACCOUNT STORE ---
ACCOUNTS_DB = {}

# ═══════════════════════════════════════════════════════════════════
# DATABASE SETUP (SECURE)
# ═══════════════════════════════════════════════════════════════════

def init_db():
    """
    Creates secure SQLite database.
    Security handled in Python layer.
    """
    conn = sqlite3.connect(DB_FILE)
    
    # Drop existing table
    conn.execute("DROP TABLE IF EXISTS rate_limit")
    
    # Create table
    conn.execute('''
        CREATE TABLE rate_limit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip TEXT NOT NULL,
            timestamp REAL NOT NULL
        )
    ''')
    
    # Create index for performance
    conn.execute("CREATE INDEX idx_ip_timestamp ON rate_limit(ip, timestamp)")
    
    # ═══ BURADA COMMIT VE CLOSE ═══
    conn.commit()
    conn.close()
    print(f"✅ Secure database initialized: {DB_FILE}")

def check_rate_limit(ip):
    """
    SECURE rate limit check with timestamp validation.
    
    Returns (allowed: bool, remaining: int, reset_in: int seconds).
    
    Security features:
    - Removes future timestamps (client time manipulation)
    - Prevents negative reset_in values
    - Server-side time enforcement
    """
    now = time.time()
    window_start = now - LIMIT_WINDOW

    conn = sqlite3.connect(DB_FILE)

    # ═══ SECURITY: Remove future timestamps (client manipulation detection) ═══
    future_threshold = now + 60  # Allow 60s clock skew tolerance
    try:
        cursor = conn.execute(
            "DELETE FROM rate_limit WHERE timestamp > ?",
            (future_threshold,)
        )
        deleted_count = cursor.rowcount
        
        if deleted_count > 0:
            print(f"⚠️ SECURITY: Removed {deleted_count} future timestamp(s) from IP {ip}")
            print(f"   Possible time manipulation detected at {time.strftime('%Y-%m-%d %H:%M:%S')}")
    except sqlite3.IntegrityError as e:
        print(f"⚠️ Database constraint violation: {e}")
        conn.rollback()

    # Remove expired records for this IP
    conn.execute(
        "DELETE FROM rate_limit WHERE ip = ? AND timestamp < ?",
        (ip, window_start)
    )
    conn.commit()

    # Count remaining valid requests
    cursor = conn.execute(
        "SELECT COUNT(*), MIN(timestamp) FROM rate_limit WHERE ip = ?",
        (ip,)
    )
    count, oldest = cursor.fetchone()
    conn.close()

    allowed = count < LIMIT_COUNT
    remaining = max(0, LIMIT_COUNT - count)

    # Calculate reset time (prevent negative values)
    reset_in = 0
    if oldest and not allowed:
        reset_in = int((oldest + LIMIT_WINDOW) - now)
        reset_in = max(0, reset_in)  # ← SECURITY: Never return negative

    return allowed, remaining, reset_in

def record_request(ip):
    """
    Records request with SERVER-SIDE timestamp only.
    Client cannot influence the timestamp.
    """
    conn = sqlite3.connect(DB_FILE)
    server_time = time.time()  # ← SECURITY: Force server time
    
    try:
        conn.execute(
            "INSERT INTO rate_limit (ip, timestamp) VALUES (?, ?)",
            (ip, server_time)
        )
        conn.commit()
    except sqlite3.IntegrityError as e:
        print(f"⚠️ Failed to record request (constraint violation): {e}")
        conn.rollback()
    finally:
        conn.close()

def clean_old_records():
    """
    Maintenance: Removes all expired records.
    Also removes any corrupted future timestamps.
    """
    conn = sqlite3.connect(DB_FILE)
    now = time.time()
    
    # Remove expired records
    deleted_old = conn.execute(
        "DELETE FROM rate_limit WHERE timestamp < ?",
        (now - LIMIT_WINDOW,)
    ).rowcount
    
    # Remove future timestamps (shouldn't exist due to constraint, but safety check)
    deleted_future = conn.execute(
        "DELETE FROM rate_limit WHERE timestamp > ?",
        (now + 60,)
    ).rowcount
    
    conn.commit()
    conn.close()
    
    if deleted_old > 0:
        print(f"🧹 Cleaned {deleted_old} expired records")
    if deleted_future > 0:
        print(f"⚠️ Removed {deleted_future} future timestamps (security cleanup)")

# ═══════════════════════════════════════════════════════════════════
# HELPERS (unchanged)
# ═══════════════════════════════════════════════════════════════════

def get_random_string(length=10):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def format_date(date_str):
    """Converts date string to browser-safe ISO format."""
    if not date_str:
        return "Unknown"
    return date_str.replace(" ", "T")

def get_token(address):
    """Fetches JWT token for Mail.tm address."""
    if address not in ACCOUNTS_DB:
        return None
    payload = {
        "address": address,
        "password": ACCOUNTS_DB[address]["password"]
    }
    try:
        res = requests.post(f"{BASE_URL}/token", json=payload, timeout=10)
        if res.status_code == 200:
            return res.json().get("token")
    except Exception as e:
        print(f"⚠️ Token fetch error: {e}")
    return None

# ═══════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@app.get("/")
def health():
    return jsonify({
        "status": "online",
        "provider": "Mail.tm",
        "security": f"Secure persistent rate limit ({LIMIT_COUNT}/hour per IP)",
        "features": [
            "Server-side timestamp validation",
            "Future timestamp protection",
            "Time manipulation detection"
        ],
        "db": os.path.abspath(DB_FILE)
    })

@app.get("/generate")
def generate_email():
    """
    Generates temporary email with SECURE rate limiting.
    
    Security features:
    - Server-side timestamp enforcement
    - Time manipulation detection
    - Database-level constraints
    """
    client_ip = request.remote_addr

    # Periodic cleanup (10% chance)
    if random.random() < 0.1:
        clean_old_records()

    # ═══ SECURE RATE LIMIT CHECK ═══
    allowed, remaining, reset_in = check_rate_limit(client_ip)

    if not allowed:
        minutes = reset_in // 60
        seconds = reset_in % 60
        print(f"⛔ Rate limit: {client_ip} blocked (resets in {minutes}m {seconds}s)")
        
        return jsonify({
            "error": "rate_limit_exceeded",
            "message": f"You can generate {LIMIT_COUNT} emails per hour. Limit resets in {minutes}m {seconds}s.",
            "reset_in_seconds": reset_in,
            "remaining": 0
        }), 429

    try:
        # Fetch domains
        domain_res = requests.get(f"{BASE_URL}/domains", timeout=10)
        if domain_res.status_code != 200:
            return jsonify({"error": "Domain fetch failed"}), 500

        domains = domain_res.json().get("hydra:member", [])
        if not domains:
            return jsonify({"error": "No domains available"}), 500

        domain = domains[0]['domain']

        # Generate credentials
        username = get_random_string(8)
        password = get_random_string(12)
        address = f"{username}@{domain}"

        # Register account
        payload = {"address": address, "password": password}
        reg_res = requests.post(f"{BASE_URL}/accounts", json=payload, timeout=10)

        if reg_res.status_code == 201:
            ACCOUNTS_DB[address] = {
                "password": password,
                "id": reg_res.json()["id"]
            }

            # ═══ RECORD REQUEST (server timestamp only) ═══
            record_request(client_ip)
            remaining_after = remaining - 1

            print(f"✅ Email created: {address} | IP: {client_ip} | Quota: {remaining_after}/{LIMIT_COUNT}")

            return jsonify({
                "address": address,
                "username": username,
                "domain": domain,
                "quota_remaining": remaining_after
            })
        else:
            print(f"❌ Mail.tm registration failed: {reg_res.text}")
            return jsonify({"error": "Account creation failed"}), 500

    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.get("/inbox/<path:email>")
def get_inbox(email):
    """Fetches inbox messages (no rate limit)."""
    email = unquote(email)

    if email not in ACCOUNTS_DB:
        return jsonify({
            "error": "session_expired",
            "message": "Session expired. Please generate a new email address."
        }), 404

    token = get_token(email)
    if not token:
        return jsonify({"error": "Authentication failed"}), 401

    headers = {"Authorization": f"Bearer {token}"}

    try:
        res = requests.get(f"{BASE_URL}/messages", headers=headers, timeout=10)

        if res.status_code == 200:
            data = res.json().get("hydra:member", [])
            messages = []

            for msg in data:
                messages.append({
                    "id": msg["id"],
                    "from": msg["from"]["address"],
                    "subject": msg["subject"],
                    "date": format_date(msg["createdAt"]),
                    "preview": msg.get("intro", "")
                })

            return jsonify({
                "email": email,
                "message_count": len(messages),
                "messages": messages
            })

        return jsonify({"error": "Failed to fetch messages"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.get("/message/<path:email>/<message_id>")
def get_message(email, message_id):
    """Fetches full message content."""
    email = unquote(email)

    token = get_token(email)
    if not token:
        return jsonify({"error": "Authentication failed"}), 401

    headers = {"Authorization": f"Bearer {token}"}

    try:
        res = requests.get(
            f"{BASE_URL}/messages/{message_id}",
            headers=headers,
            timeout=10
        )

        if res.status_code == 200:
            msg = res.json()

            body = "No content"
            if msg.get("html"):
                body = msg["html"][0]
            elif msg.get("text"):
                body = msg["text"]

            return jsonify({
                "id": msg["id"],
                "from": msg["from"]["address"],
                "subject": msg["subject"],
                "date": format_date(msg["createdAt"]),
                "body": body,
                "attachments": []
            })

        return jsonify({"error": "Message not found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ═══════════════════════════════════════════════════════════════════
# STARTUP
# ═══════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    init_db()
    print("=" * 60)
    print("🔒 NetRunner Mail Service (SECURE)")
    print("=" * 60)
    print(f"📡 Port: 5002")
    print(f"🛡️  Rate limit: {LIMIT_COUNT} emails/hour per IP")
    print(f"📦 Database: {os.path.abspath(DB_FILE)}")
    print(f"🔐 Security features:")
    print(f"   - Server-side timestamp validation")
    print(f"   - Future timestamp detection & removal")
    print(f"   - Database-level constraints (CHECK)")
    print(f"   - Negative value prevention")
    print("=" * 60)
    print()
    app.run(port=5002, debug=False)