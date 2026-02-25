"""
Phishing URL Detector - Flask API
---------------------------------
This script runs a web server (Flask) that serves the trained machine learning model.
It accepts URL data via POST requests and returns a JSON response indicating
whether the URL is Phishing or Legitimate.

Endpoints:
    /         (GET) : Checks if the API is running.
    /predict (POST) : Takes {'url': '...'} and returns prediction.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import pandas as pd
import numpy as np
import re
import math
import sys
import io

# UTF-8 encoding fix for Windows Turkish
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from sklearn.base import BaseEstimator, TransformerMixin
from scipy.sparse import hstack, csr_matrix
app = Flask(__name__)
CORS(app, origins="*", supports_credentials=False)

# --- CONFIGURATION ---
MODEL_FILE = 'phishing_model_ultimate.pkl'
VECTORIZER_FILE = 'tfidf_vectorizer.pkl'

# --- RE-DEFINING CUSTOM FUNCTIONS ---
def make_tokens(f):
    tokens = re.split(r'[/\-\.]', str(f))
    tokens = [t for t in tokens if t and t != 'com']
    return list(set(tokens))

def calculate_entropy(url):
    s = str(url).strip()
    if not s: return 0.0
    prob = [float(s.count(c)) / len(s) for c in dict.fromkeys(list(s))]
    return -sum([p * math.log(p) / math.log(2.0) for p in prob])

class NumericFeatures(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None): return self
    def transform(self, X):
        X = pd.Series(X) if isinstance(X, list) else X
        X = X.reset_index(drop=True)
        data = pd.DataFrame(index=range(len(X)))
        X_str = X.astype(str)
        
        data['len'] = X_str.apply(len)
        data['dots'] = X_str.apply(lambda x: x.count('.'))
        data['hyphens'] = X_str.apply(lambda x: x.count('-'))
        data['slashes'] = X_str.apply(lambda x: x.count('/'))
        data['digits'] = X_str.apply(lambda x: sum(c.isdigit() for c in x))
        data['entropy'] = X_str.apply(calculate_entropy)
        data['has_ip'] = X_str.apply(lambda x: 1 if re.search(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', x) else 0)
        return data.fillna(0)

# --- INITIALIZE APP ---
app = Flask(__name__)
CORS(app)

print("🚀 Starting Server...")

# Load Model
try:
    with open(MODEL_FILE, 'rb') as f:
        model = pickle.load(f)
    with open(VECTORIZER_FILE, 'rb') as f:
        vectorizer = pickle.load(f)
    print("✅ Model loaded successfully.")
except FileNotFoundError:
    print("❌ ERROR: Model files not found. Please train the model first.")
    exit()

# --- ROUTES ---

@app.route('/', methods=['GET'])
def home():
    """Health check endpoint."""
    return jsonify({
        "status": "online",
        "message": "Phishing Detection API is running. Use /predict endpoint to analyze URLs."
    })

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        if not data or 'url' not in data:
            return jsonify({"error": "No URL provided"}), 400
            
        url = data['url']
        
        # Preprocessing
        url_df = pd.Series([url])
        url_tfidf = vectorizer.transform(url_df)
        extractor = NumericFeatures()
        url_numeric = extractor.transform(url_df)
        url_numeric_matrix = csr_matrix(url_numeric.values)
        url_final = hstack([url_tfidf, url_numeric_matrix])
        
        # Prediction
        prediction = model.predict(url_final)[0]
        probability = model.predict_proba(url_final)[0]
        risk_score = float(probability[1] * 100)
        
        result = {
            "url": url,
            "is_phishing": int(prediction),
            "risk_score": round(risk_score, 2),
            "status": "PHISHING" if prediction == 1 else "LEGITIMATE"
        }
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)