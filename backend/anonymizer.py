"""
NetRunner — spaCy NER Anonymizer API (Hybrid: AI + Regex)
----------------------------------------------------------
Endpoints:
    GET  /           Health check
    POST /anonymize  Anonymize text using spaCy NER + Regex

Run:
    python anonymizer.py
    → http://localhost:5001
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import spacy
import re
import sys
import io

# UTF-8 encoding fix for Windows Turkish
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
app = Flask(__name__)
CORS(app, origins="*", supports_credentials=False)

print("🚀 Starting NetRunner Anonymizer...")

# ─── 1. Load spaCy model (Smart Fallback) ─────────────────────
try:
    nlp = spacy.load("en_core_web_md")
    model_name = "en_core_web_md (High Accuracy)"
    print(f"✅ Loaded: {model_name}")
except OSError:
    print("⚠️ 'en_core_web_md' not found. Falling back to 'en_core_web_sm'.")
    try:
        nlp = spacy.load("en_core_web_sm")
        model_name = "en_core_web_sm (Fast)"
        print(f"✅ Loaded: {model_name}")
    except OSError:
        print("❌ Error: No spaCy model found. Please install one.")
        exit(1)

# ─── 2. Regex patterns (Production-Grade) ────────────────────────────
REGEX_PATTERNS = [
    # High priority patterns (specific formats)
    {"type": "EMAIL", "regex": r"\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b", "priority": 10},
    {"type": "CREDIT_CARD", "regex": r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b", "priority": 10},
    {"type": "SSN", "regex": r"\b\d{3}[-\s]\d{2}[-\s]\d{4}\b", "priority": 10},
    {"type": "IBAN", "regex": r"\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b", "priority": 9},
    {"type": "TC_ID", "regex": r"\b[1-9]\d{10}\b", "priority": 9},
    {"type": "PHONE", "regex": r"(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}", "priority": 8},
    {"type": "IP", "regex": r"\b(?:\d{1,3}\.){3}\d{1,3}\b", "priority": 7},
    {"type": "URL", "regex": r"https?://[^\s]+", "priority": 6},
    {"type": "DATE", "regex": r"\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b", "priority": 5},
    
    # Context-aware patterns (capture groups)
    {"type": "PASSWORD", "regex": r"(?i)(?:password|pwd|pass|şifre)[\s:=]+(\S+)", "capture": True, "priority": 10},
    {"type": "CVV", "regex": r"(?i)(?:cvv|cvc|security\s*code|güvenlik\s*kodu)[\s:]+(\d{3,4})", "capture": True, "priority": 10},
]

# spaCy entity types we care about
SPACY_TYPES = ["PERSON", "ORG", "GPE", "LOC", "DATE", "MONEY"]

@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "online", "model": model_name, "service": "NetRunner Anonymizer"})

@app.route("/anonymize", methods=["POST"])
def anonymize():
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "No text provided"}), 400

    text = data["text"]
    mode = data.get("mode", "mask")  # 'mask', 'redact', 'analyze'
    
    # ─── Step A: Regex First (Priority-Based) ───
    entities = []
    
    # Sort patterns by priority (highest first)
    sorted_patterns = sorted(REGEX_PATTERNS, key=lambda x: x.get("priority", 0), reverse=True)
    
    for pattern in sorted_patterns:
        for match in re.finditer(pattern["regex"], text, flags=re.IGNORECASE):
            # Handle capture groups (for context-aware patterns like PASSWORD, CVV)
            if pattern.get("capture") and match.groups():
                value = match.group(1)  # Get captured group
                start = match.start(1)
                end = match.end(1)
            else:
                value = match.group(0)
                start, end = match.span()
            
            # Check for overlap with existing entities
            is_overlap = False
            for e in entities:
                if (start >= e["start"] and start < e["end"]) or \
                   (end > e["start"] and end <= e["end"]):
                    is_overlap = True
                    break
            
            if not is_overlap:
                entities.append({
                    "type": pattern["type"],
                    "value": value,
                    "start": start,
                    "end": end,
                    "confidence": 1.0,
                    "source": "Regex"
                })
    
    # ─── Step B: AI Analysis (spaCy) ───
    doc = nlp(text)
    
    for ent in doc.ents:
        if ent.label_ in SPACY_TYPES:
            # Conflict Check: Don't add if overlaps with regex match
            is_overlap = False
            for e in entities:
                if (ent.start_char >= e["start"] and ent.start_char < e["end"]) or \
                   (ent.end_char > e["start"] and ent.end_char <= e["end"]):
                    is_overlap = True
                    break
            
            if not is_overlap:
                entities.append({
                    "type": ent.label_,
                    "value": ent.text,
                    "start": ent.start_char,
                    "end": ent.end_char,
                    "confidence": 0.95,
                    "source": "AI"
                })

    # ─── Step C: Processing & Replacement ───
    
    # Sort entities in reverse order (by start index)
    entities.sort(key=lambda x: x["start"], reverse=True)
    
    anonymized_text = text

    # Only apply changes if mode is NOT 'analyze'
    if mode in ["mask", "redact"]:
        for ent in entities:
            replacement = f"[{ent['type']}]" if mode == "redact" else f"⟨{ent['type']}⟩"
            
            start = ent["start"]
            end = ent["end"]
            anonymized_text = anonymized_text[:start] + replacement + anonymized_text[end:]

    return jsonify({
        "original": text,
        "anonymized": anonymized_text,
        "entities": entities,
        "entities_found": len(entities),
        "mode": mode,
        "model": model_name
    })

if __name__ == "__main__":
    app.run(port=5001, debug=True)