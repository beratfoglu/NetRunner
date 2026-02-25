"""
NetRunner — Browser Fingerprint Analyzer API
---------------------------------------------
Entropy-based browser uniqueness analysis with mathematical model.

Endpoints:
    GET  /           Health check
    POST /analyze    Analyze browser fingerprint and calculate entropy

Run:
    python fingerprint_analyzer.py
    → http://localhost:5004
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import io
from entropy_model import (
    calculate_total_entropy,
    entropy_to_uniqueness_score,
    determine_risk_level,
    generate_risk_message,
    generate_privacy_risks,
    generate_recommendations
)

# UTF-8 encoding fix for Windows Turkish
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=False)

print("🚀 Starting NetRunner Fingerprint Analyzer...")
print("🔬 Entropy-based mathematical model loaded")
print("🎯 Production-ready fingerprint analysis")
print("-" * 60)

# ═══════════════════════════════════════════════════════════════
# HEALTH CHECK
# ═══════════════════════════════════════════════════════════════

@app.route("/", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "online",
        "service": "NetRunner Fingerprint Analyzer",
        "version": "5.0",
        "model": "entropy-based",
        "components": [
            "Canvas fingerprint",
            "WebGL fingerprint",
            "Audio fingerprint",
            "Screen resolution",
            "Timezone",
            "Platform",
            "Language",
            "Hardware info"
        ]
    })

# ═══════════════════════════════════════════════════════════════
# ANALYZE FINGERPRINT
# ═══════════════════════════════════════════════════════════════

@app.route("/analyze", methods=["POST"])
def analyze_fingerprint():
    """
    Analyze browser fingerprint and calculate uniqueness score.
    
    Request Body:
    {
        "user_agent": "Mozilla/5.0...",
        "platform": "Win32",
        "language": "en-US",
        "screen_resolution": "1920x1080",
        "timezone": "Europe/Istanbul",
        "timezone_offset": -180,
        "canvas_hash": "a3f8d9e2...",
        "webgl": {
            "vendor": "Google Inc.",
            "renderer": "ANGLE (NVIDIA GeForce RTX 3060)",
            "version": "WebGL 1.0",
            "shading_language": "WebGL GLSL ES 1.0"
        },
        "audio_hash": "b7c3e4f1...",
        "fonts": ["Arial", "Verdana", ...],
        "plugins": ["Chrome PDF Plugin", ...],
        "hardware_concurrency": 8,
        "device_memory": 8
    }
    
    Response:
    {
        "uniqueness_score": 87.3,
        "total_entropy": 28.4,
        "risk_level": "high",
        "risk_message": "...",
        "components": [...],
        "risks": [...],
        "recommendations": [...]
    }
    """
    
    try:
        # Get fingerprint data from request
        fingerprint_data = request.get_json()
        
        if not fingerprint_data:
            return jsonify({"error": "No fingerprint data provided"}), 400
        
        print(f"🔍 Analyzing fingerprint...")
        print(f"  Platform: {fingerprint_data.get('platform', 'Unknown')}")
        print(f"  Resolution: {fingerprint_data.get('screen_resolution', 'Unknown')}")
        print(f"  Timezone: {fingerprint_data.get('timezone', 'Unknown')}")
        
        # ═══════════════════════════════════════════════════════════
        # STEP 1: Calculate total entropy and analyze components
        # ═══════════════════════════════════════════════════════════
        
        entropy_result = calculate_total_entropy(fingerprint_data)
        total_entropy = entropy_result["total_entropy"]
        components = entropy_result["components"]
        
        print(f"  Total Entropy: {total_entropy} bits")
        
        # ═══════════════════════════════════════════════════════════
        # STEP 2: Convert entropy to uniqueness score (0-100)
        # ═══════════════════════════════════════════════════════════
        
        uniqueness_score = entropy_to_uniqueness_score(total_entropy)
        print(f"  Uniqueness Score: {uniqueness_score}/100")
        
        # ═══════════════════════════════════════════════════════════
        # STEP 3: Determine risk level
        # ═══════════════════════════════════════════════════════════
        
        risk_level = determine_risk_level(uniqueness_score)
        risk_message = generate_risk_message(risk_level, uniqueness_score)
        print(f"  Risk Level: {risk_level.upper()}")
        
        # ═══════════════════════════════════════════════════════════
        # STEP 4: Generate privacy risks and recommendations
        # ═══════════════════════════════════════════════════════════
        
        risks = generate_privacy_risks(components, uniqueness_score)
        recommendations = generate_recommendations(risk_level, components)
        
        print(f"  Detected {len(risks)} privacy risks")
        print(f"✅ Analysis complete!")
        
        # ═══════════════════════════════════════════════════════════
        # STEP 5: Return comprehensive analysis
        # ═══════════════════════════════════════════════════════════
        
        response = {
            "uniqueness_score": uniqueness_score,
            "total_entropy": total_entropy,
            "risk_level": risk_level,
            "risk_message": risk_message,
            "components": components,
            "risks": risks,
            "recommendations": recommendations,
            
            # Additional metadata
            "fingerprint_summary": {
                "browser": extract_browser_from_ua(fingerprint_data.get("user_agent", "")),
                "os": fingerprint_data.get("platform", "Unknown"),
                "resolution": fingerprint_data.get("screen_resolution", "Unknown"),
                "timezone": fingerprint_data.get("timezone", "Unknown"),
                "language": fingerprint_data.get("language", "Unknown")
            }
        }
        
        return jsonify(response)
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({
            "error": "Analysis failed",
            "details": str(e)
        }), 500

# ═══════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def extract_browser_from_ua(user_agent):
    """Extract browser name from User-Agent string"""
    ua_lower = user_agent.lower()
    
    if "edg/" in ua_lower:
        return "Microsoft Edge"
    elif "chrome" in ua_lower and "edg" not in ua_lower:
        return "Google Chrome"
    elif "firefox" in ua_lower:
        return "Mozilla Firefox"
    elif "safari" in ua_lower and "chrome" not in ua_lower:
        return "Apple Safari"
    elif "opera" in ua_lower or "opr/" in ua_lower:
        return "Opera"
    elif "brave" in ua_lower:
        return "Brave"
    else:
        return "Unknown Browser"

# ═══════════════════════════════════════════════════════════════
# COMPARISON ENDPOINT (Optional - for future)
# ═══════════════════════════════════════════════════════════════

@app.route("/compare", methods=["POST"])
def compare_fingerprints():
    """
    Compare multiple fingerprints (Chrome vs Brave vs Tor, etc.)
    
    Request Body:
    {
        "fingerprints": [
            {"name": "Chrome", "data": {...}},
            {"name": "Brave", "data": {...}},
            {"name": "Tor", "data": {...}}
        ]
    }
    """
    
    try:
        data = request.get_json()
        fingerprints = data.get("fingerprints", [])
        
        if not fingerprints or len(fingerprints) < 2:
            return jsonify({"error": "Need at least 2 fingerprints to compare"}), 400
        
        results = []
        
        for fp in fingerprints:
            name = fp.get("name", "Unknown")
            fp_data = fp.get("data", {})
            
            # Analyze each fingerprint
            entropy_result = calculate_total_entropy(fp_data)
            uniqueness_score = entropy_to_uniqueness_score(entropy_result["total_entropy"])
            risk_level = determine_risk_level(uniqueness_score)
            
            results.append({
                "name": name,
                "uniqueness_score": uniqueness_score,
                "total_entropy": entropy_result["total_entropy"],
                "risk_level": risk_level,
                "component_count": len(entropy_result["components"])
            })
        
        # Sort by uniqueness score (ascending = more private)
        results.sort(key=lambda x: x["uniqueness_score"])
        
        return jsonify({
            "comparison": results,
            "most_private": results[0]["name"],
            "least_private": results[-1]["name"],
            "recommendation": f"Use {results[0]['name']} for better privacy"
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ═══════════════════════════════════════════════════════════════
# RUN SERVER
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("🎯 NetRunner Fingerprint Analyzer Ready!")
    print("📡 Listening on http://127.0.0.1:5004")
    print("🔬 Entropy-based mathematical model")
    print("✅ Production-ready analysis")
    print("=" * 60)
    app.run(port=5004, debug=True)