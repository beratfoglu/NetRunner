"""
NetRunner — Privacy Cloak (v2)
Fetches faces from thispersondoesnotexist.com + crops watermark + strips metadata.
Port: 5009
"""

import io
import time
import base64
import random
import requests
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

HEADERS_LIST = [
    {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"},
    {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15"},
    {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36"},
]

def fetch_face():
    """thispersondoesnotexist.com'dan yeni yüz çek."""
    headers = random.choice(HEADERS_LIST)
    headers["Cache-Control"] = "no-cache"
    headers["Pragma"] = "no-cache"
    # Cache'i kırmak için random parametre
    url = f"https://thispersondoesnotexist.com/?v={random.randint(1, 9999999)}"
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.content

def crop_watermark(image_bytes):
    """
    StyleGAN2 watermark sağ alt köşede ~200x30px alanda.
    1024x1024 görselin altından 40px kırpıyoruz — yüze dokunmuyor.
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    w, h = img.size
    # Alt 40px kırp (watermark bölgesi)
    cropped = img.crop((0, 0, w, h - 40))
    return cropped

def strip_metadata(img):
    """PIL Image'den metadata temizle, yeni temiz image döndür."""
    clean = Image.new(img.mode, img.size)
    clean.putdata(list(img.getdata()))
    return clean

def encode_b64(img):
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=92)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

# ══════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "online",
        "engine": "thispersondoesnotexist.com (StyleGAN2)",
        "port": 5009
    })

@app.route("/generate", methods=["POST"])
def generate():
    start = time.time()
    try:
        raw_bytes   = fetch_face()
        cropped_img = crop_watermark(raw_bytes)
        clean_img   = strip_metadata(cropped_img)
        elapsed     = round(time.time() - start, 2)
        w, h        = clean_img.size

        return jsonify({
            "success":           True,
            "image":             encode_b64(clean_img),
            "dimensions":        f"{w}x{h}",
            "elapsed":           elapsed,
            "metadata_stripped": True,
            "engine":            "StyleGAN2",
            "source":            "thispersondoesnotexist.com (watermark removed)"
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    print("🎭 Privacy Cloak v2 — StyleGAN2 backend running on port 5009")
    app.run(host="0.0.0.0", port=5009, debug=True)