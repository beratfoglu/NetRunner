"""
NetRunner — Email Breach Checker API
-------------------------------------
Check if an email has been compromised in data breaches.
Uses BreachDirectory API via RapidAPI (100 requests/day free tier)

Endpoints:
    GET  /           Health check
    POST /check      Check email breaches

Setup:
    1. Sign up at https://rapidapi.com/auth/sign-up
    2. Subscribe to BreachDirectory API (free tier)
    3. Copy your API key
    4. Set RAPIDAPI_KEY environment variable or paste below

Run:
    python breach_checker.py
    → http://localhost:5003
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import sys
import io

# UTF-8 encoding fix for Windows Turkish
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


app = Flask(__name__)
CORS(app, origins="*", supports_credentials=False)

print("🚀 Starting NetRunner Breach Checker...")

# RapidAPI Configuration
# Get your free key: https://rapidapi.com/rohan-patra/api/breachdirectory/
RAPIDAPI_KEY = os.environ.get("RAPIDAPI_KEY", "YOUR_RAPIDAPI_KEY_HERE")

@app.route("/", methods=["GET"])
def health():
    return jsonify({
        "status": "online",
        "service": "NetRunner Breach Checker",
        "api": "BreachDirectory (RapidAPI)",
        "api_configured": RAPIDAPI_KEY != "SIGN_UP_AT_RAPIDAPI_DOT_COM"
    })

@app.route("/check", methods=["POST"])
def check_breach():
    data = request.get_json()
    
    if not data or "email" not in data:
        return jsonify({"error": "No email provided"}), 400
    
    email = data["email"].strip().lower()
    
    # Validate email format
    if "@" not in email or "." not in email:
        return jsonify({"error": "Invalid email format"}), 400
    
    # Check if API key is configured
    if RAPIDAPI_KEY == "SIGN_UP_AT_RAPIDAPI_DOT_COM":
        return jsonify({
            "error": "API key not configured. Sign up at https://rapidapi.com and set RAPIDAPI_KEY",
            "demo_mode": True,
            "email": email,
            "breached": False,
            "breach_count": 0,
            "breaches": [],
            "message": "⚠️ API key required. This is demo mode only."
        }), 200
    
    try:
        # Call BreachDirectory API
        url = "https://breachdirectory.p.rapidapi.com/"
        
        querystring = {"func": "auto", "term": email}
        
        headers = {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": "breachdirectory.p.rapidapi.com"
        }
        
        print(f"🔍 Checking breaches for: {email}")
        response = requests.get(url, headers=headers, params=querystring, timeout=15)
        
        if response.status_code == 429:
            return jsonify({
                "error": "Rate limit exceeded. Free tier allows 100 requests/day."
            }), 429
        
        if response.status_code == 401:
            return jsonify({
                "error": "Invalid API key. Check your RapidAPI credentials."
            }), 401
        
        if response.status_code != 200:
            return jsonify({
                "error": f"API error: {response.status_code}"
            }), 500
        
        result = response.json()
        
        # Check if email was found
        if not result.get("found"):
            print(f"✅ Clean: {email}")
            return jsonify({
                "email": email,
                "breached": False,
                "breach_count": 0,
                "breaches": [],
                "message": "Good news! This email hasn't been found in any known data breaches."
            })
        
        # Parse breach results
        print(f"🔴 Breached: {email} - {result.get('sources', 0)} source(s)")
        
        breaches = []
        
        # Get breach sources if available
        if result.get("result"):
            for breach_data in result["result"]:
                # Each breach entry
                source = breach_data.get("sources", ["Unknown"])[0] if breach_data.get("sources") else "Unknown"
                
                # Determine what data was leaked
                data_classes = []
                if breach_data.get("password"):
                    data_classes.append("Passwords")
                if breach_data.get("hash"):
                    data_classes.append("Password Hashes")
                if "@" in breach_data.get("email", ""):
                    data_classes.append("Email addresses")
                if breach_data.get("username"):
                    data_classes.append("Usernames")
                if breach_data.get("name"):
                    data_classes.append("Names")
                if breach_data.get("ip"):
                    data_classes.append("IP Addresses")
                
                breaches.append({
                    "name": source,
                    "title": f"{source} Data Breach",
                    "domain": "",
                    "breach_date": "Unknown",
                    "added_date": "Unknown",
                    "pwn_count": 0,
                    "description": f"Your email was found in the {source} data breach. Compromised data includes: {', '.join(data_classes) if data_classes else 'Email'}.",
                    "data_classes": data_classes if data_classes else ["Email addresses"],
                    "is_verified": True,
                    "is_sensitive": "password" in str(breach_data).lower()
                })
        
        # If no detailed breach info, create a generic one
        if not breaches:
            breaches.append({
                "name": "Multiple Sources",
                "title": "Data Breach Collection",
                "domain": "",
                "breach_date": "Various",
                "added_date": "Unknown",
                "pwn_count": result.get("sources", 1),
                "description": f"Your email was found in {result.get('sources', 'multiple')} data breach source(s). The exact breach details are not available, but your email address has been exposed.",
                "data_classes": ["Email addresses"],
                "is_verified": True,
                "is_sensitive": False
            })
        
        return jsonify({
            "email": email,
            "breached": True,
            "breach_count": len(breaches),
            "breaches": breaches,
            "message": f"⚠️ Warning! This email was found in {len(breaches)} data breach(es)."
        })
    
    except requests.exceptions.Timeout:
        return jsonify({
            "error": "Request timeout. The breach database is taking too long to respond. Try again."
        }), 504
    
    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": f"Network error: {str(e)}"
        }), 500
    
    except Exception as e:
        print(f"❌ Error checking {email}: {str(e)}")
        return jsonify({
            "error": f"Unexpected error: {str(e)}"
        }), 500

if __name__ == "__main__":
    app.run(port=5003, debug=True)