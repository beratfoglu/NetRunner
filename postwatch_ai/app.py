"""
PostWatch AI — Email Phishing Detector Flask API
-------------------------------------------------
DistilBERT tabanlı e-posta phishing tespit servisi.
Sentinel AI (URL) ile paralel çalışır.

Endpoints:
    GET  /          Health check
    POST /classify  E-posta metnini analiz et

Port: 5007
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import io
import os

# UTF-8 encoding fix for Windows Turkish
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=False)

# ─── CONFIG ────────────────────────────────────────────────────
# ✅ DÜZELTME: Doğrudan bu dosyanın olduğu klasördeki email_phishing_model
MODEL_DIR = os.path.join(os.path.dirname(__file__), "email_phishing_model")

# ─── MODEL LOAD ────────────────────────────────────────────────
print("🚀 Starting PostWatch AI...")
print(f"📂 Model path: {MODEL_DIR}")

try:
    from transformers import DistilBertTokenizerFast, DistilBertForSequenceClassification
    import torch

    tokenizer = DistilBertTokenizerFast.from_pretrained(MODEL_DIR)
    model = DistilBertForSequenceClassification.from_pretrained(MODEL_DIR)
    model.eval()

    # GPU varsa kullan, yoksa CPU
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)

    print(f"✅ PostWatch AI model loaded! Device: {device}")
    print(f"   Labels: {model.config.id2label}")

except Exception as e:
    print(f"❌ Model load failed: {e}")
    print("   email_phishing_model/ içinde şu dosyalar olmalı:")
    print("   config.json, model.safetensors, tokenizer.json, tokenizer_config.json")
    model = None
    tokenizer = None
    device = None

# ─── HELPERS ───────────────────────────────────────────────────

def get_risk_level(risk_score: float, is_phishing: bool) -> str:
    """Risk skoruna göre seviye belirle."""
    if not is_phishing:
        return "safe"
    if risk_score >= 90:
        return "critical"
    elif risk_score >= 70:
        return "high"
    elif risk_score >= 50:
        return "medium"
    else:
        return "low"

def classify_text(text: str) -> dict:
    """
    Metni DistilBERT ile sınıflandır.
    Maksimum 512 token — uzun e-postalar truncate edilir.
    """
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=512,
        padding=True
    )

    # Device'a taşı
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        probs = torch.softmax(logits, dim=1).squeeze().tolist()

    # id2label mapping'e göre hangi index phishing?
    id2label = model.config.id2label

    # Olası label formatları: {0: 'LABEL_0', 1: 'LABEL_1'} veya {0: 'safe', 1: 'phishing'}
    phishing_idx = None
    safe_idx = None

    for idx, label in id2label.items():
        label_lower = str(label).lower()
        if any(kw in label_lower for kw in ['phish', 'spam', 'malicious', '1', 'label_1']):
            phishing_idx = int(idx)
        elif any(kw in label_lower for kw in ['safe', 'legit', 'ham', '0', 'label_0']):
            safe_idx = int(idx)

    # Fallback: eğer bulamazsa 1 = phishing, 0 = safe kabul et
    if phishing_idx is None:
        phishing_idx = 1
    if safe_idx is None:
        safe_idx = 0

    phishing_prob = probs[phishing_idx] if isinstance(probs, list) else float(probs)
    safe_prob = probs[safe_idx] if isinstance(probs, list) else 1 - float(probs)

    is_phishing = phishing_prob > safe_prob
    risk_score = round(phishing_prob * 100, 2)
    confidence = round(max(phishing_prob, safe_prob) * 100, 2)
    risk_level = get_risk_level(risk_score, is_phishing)

    return {
        "is_phishing": is_phishing,
        "risk_score": risk_score,
        "confidence": confidence,
        "risk_level": risk_level,
        "probabilities": {
            "phishing": round(phishing_prob, 4),
            "safe": round(safe_prob, 4)
        }
    }

# ─── ROUTES ────────────────────────────────────────────────────

@app.route("/", methods=["GET"])
def health():
    return jsonify({
        "status": "online" if model else "error",
        "service": "PostWatch AI",
        "model": "DistilBERT (email phishing)",
        "device": str(device) if device else "N/A",
        "model_loaded": model is not None
    })


@app.route("/classify", methods=["POST"])
def classify():
    """
    E-posta içeriğini analiz et.

    Request:
        { "text": "Dear customer, click here to verify your account..." }

    Response:
        {
            "prediction": {
                "is_phishing": true,
                "risk_score": 94.2,
                "confidence": 94.2,
                "risk_level": "critical"
            },
            "probabilities": {
                "phishing": 0.942,
                "safe": 0.058
            }
        }
    """
    if model is None:
        return jsonify({
            "error": "Model yüklenemedi. email_phishing_model klasörünü kontrol et.",
            "model_dir": MODEL_DIR
        }), 503

    data = request.get_json()

    if not data or "text" not in data:
        return jsonify({"error": "Request body'de 'text' alanı gerekli."}), 400

    text = data["text"].strip()

    if not text:
        return jsonify({"error": "Metin boş olamaz."}), 400

    # Çok kısa metin kontrolü
    if len(text) < 10:
        return jsonify({"error": "Metin çok kısa (min 10 karakter)."}), 400

    try:
        result = classify_text(text)

        print(f"📧 Classified: risk={result['risk_score']}% | level={result['risk_level']} | phishing={result['is_phishing']}")

        return jsonify({
            "prediction": result,
            "probabilities": result.pop("probabilities"),
            "input_length": len(text),
            "model": "PostWatch AI (DistilBERT)"
        })

    except Exception as e:
        print(f"❌ Classification error: {e}")
        return jsonify({"error": str(e)}), 500


# ─── RUN ───────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 55)
    print("📬 PostWatch AI — Email Phishing Detector")
    print(f"📡 http://127.0.0.1:5007")
    print(f"📂 Model: {MODEL_DIR}")
    print("=" * 55)
    app.run(port=5007, debug=False)