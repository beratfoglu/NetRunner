"""
NetRunner — Entropy Model (Enhanced)
-------------------------------------
Mathematical model for browser fingerprint entropy calculation.

Entropy formula: H = -log2(probability)
Higher entropy = More unique = More trackable

IMPROVEMENTS:
- Correlation awareness between components
- Dynamic distribution support (future-ready)
- Anti-fingerprint paradox detection
"""

import math
import json

# ═══════════════════════════════════════════════════════════════
# DISTRIBUTION DATABASE (Sample realistic data)
# ═══════════════════════════════════════════════════════════════

# NOTE: In production, these distributions should be updated dynamically
# based on real user data from NetRunner scans.

DISTRIBUTIONS = {
    "screen_resolution": {
        "1920x1080": 0.38,      # 38% of users
        "1366x768": 0.21,       # 21%
        "1536x864": 0.08,       # 8%
        "2560x1440": 0.07,      # 7%
        "1440x900": 0.05,       # 5%
        "1280x720": 0.04,       # 4%
        "3840x2160": 0.03,      # 3% (4K)
        "1600x900": 0.02,       # 2%
        "2560x1600": 0.01,      # 1%
        # Others < 1%
    },
    
    "timezone": {
        "UTC+0": 0.15,          # GMT
        "UTC-5": 0.18,          # EST
        "UTC-8": 0.12,          # PST
        "UTC+1": 0.10,          # CET
        "UTC+3": 0.08,          # Turkey, East Europe
        "UTC+8": 0.15,          # China
        "UTC+9": 0.05,          # Japan
        "UTC+5:30": 0.07,       # India
        # Others < 5%
    },
    
    "platform": {
        "Win32": 0.65,          # Windows
        "MacIntel": 0.20,       # macOS
        "Linux x86_64": 0.08,   # Linux
        "iPhone": 0.04,         # iOS
        "Android": 0.03,        # Android
    },
    
    "language": {
        "en-US": 0.35,
        "en-GB": 0.08,
        "zh-CN": 0.15,
        "es-ES": 0.06,
        "fr-FR": 0.05,
        "de-DE": 0.05,
        "tr-TR": 0.03,
        "ja-JP": 0.04,
        "pt-BR": 0.03,
    },
    
    "hardware_concurrency": {
        "2": 0.10,
        "4": 0.35,
        "6": 0.15,
        "8": 0.25,
        "12": 0.08,
        "16": 0.05,
        "24": 0.01,
    },
    
    "device_memory": {
        "2": 0.05,
        "4": 0.25,
        "8": 0.45,
        "16": 0.20,
        "32": 0.04,
        "64": 0.01,
    }
}

# ═══════════════════════════════════════════════════════════════
# CORRELATION MATRIX (Platform-Resolution correlation)
# ═══════════════════════════════════════════════════════════════

# Known correlations between platform and screen resolution
# Used to apply correlation discount to entropy

PLATFORM_RESOLUTION_CORRELATIONS = {
    "MacIntel": {
        # Apple Retina displays
        "2560x1600": 0.15,   # Common on MacBooks
        "2880x1800": 0.10,   # MacBook Pro Retina
        "3024x1964": 0.05,   # MacBook Air
        "5120x2880": 0.02,   # 5K iMac
    },
    "Win32": {
        # Common Windows resolutions
        "1920x1080": 0.50,   # Very common on Windows
        "1366x768": 0.25,    # Common on laptops
    }
}

def apply_correlation_discount(components):
    """
    Apply correlation discount to entropy when components are correlated.
    
    In reality, components are not independent. For example:
    - MacIntel platform + 2560x1600 resolution is VERY common
    - This combination is less unique than independent probabilities suggest
    
    Formula: H(X,Y) ≤ H(X) + H(Y)
    
    Returns correlation discount factor (0-1)
    """
    
    platform_comp = next((c for c in components if c["name"] == "Platform"), None)
    resolution_comp = next((c for c in components if c["name"] == "Screen Resolution"), None)
    
    if platform_comp and resolution_comp:
        platform = platform_comp["value"]
        resolution = resolution_comp["value"]
        
        # Check if this combination is known to be correlated
        if platform in PLATFORM_RESOLUTION_CORRELATIONS:
            correlations = PLATFORM_RESOLUTION_CORRELATIONS[platform]
            if resolution in correlations:
                # This combination is common, reduce entropy contribution
                correlation_strength = correlations[resolution]
                discount = 0.7  # Reduce combined entropy by 30%
                return discount
    
    return 1.0  # No correlation, no discount

# ═══════════════════════════════════════════════════════════════
# ENTROPY CALCULATION
# ═══════════════════════════════════════════════════════════════

def calculate_entropy(component_type, value):
    """
    Calculate entropy for a single component.
    
    Entropy = -log2(probability)
    
    Args:
        component_type: str (e.g., "screen_resolution")
        value: str (e.g., "1920x1080")
    
    Returns:
        float: Entropy in bits
    """
    
    # Get distribution for this component type
    distribution = DISTRIBUTIONS.get(component_type, {})
    
    # Get probability (default to very rare if not found)
    probability = distribution.get(str(value), 0.001)  # 0.1% if unknown
    
    # Calculate entropy: H = -log2(p)
    if probability > 0:
        entropy = -math.log2(probability)
    else:
        entropy = 10.0  # Very high entropy for impossible values
    
    return entropy


def classify_rarity(probability):
    """
    Classify how rare a value is based on probability.
    
    Args:
        probability: float (0-1)
    
    Returns:
        str: "common", "uncommon", "rare", "very_rare"
    """
    if probability >= 0.20:
        return "common"       # 20%+ of users
    elif probability >= 0.05:
        return "uncommon"     # 5-20%
    elif probability >= 0.01:
        return "rare"         # 1-5%
    else:
        return "very_rare"    # <1%


def calculate_total_entropy(fingerprint_data):
    """
    Calculate total entropy across all fingerprint components.
    
    NOTE: Applies correlation discount for known correlated components.
    
    Args:
        fingerprint_data: dict with component values
    
    Returns:
        dict: {
            "total_entropy": float,
            "components": list of analyzed components
        }
    """
    
    total_entropy = 0.0
    components = []
    
    # Component mapping (fingerprint key -> distribution key)
    COMPONENT_MAP = {
        "screen_resolution": "screen_resolution",
        "timezone": "timezone",
        "platform": "platform",
        "language": "language",
        "hardware_concurrency": "hardware_concurrency",
        "device_memory": "device_memory"
    }
    
    # Analyze each component
    for fp_key, dist_key in COMPONENT_MAP.items():
        if fp_key in fingerprint_data:
            value = fingerprint_data[fp_key]
            
            # Calculate entropy
            entropy = calculate_entropy(dist_key, value)
            
            # Get probability
            distribution = DISTRIBUTIONS.get(dist_key, {})
            probability = distribution.get(str(value), 0.001)
            percentage = probability * 100
            
            # Classify rarity
            rarity = classify_rarity(probability)
            
            # Add to total
            total_entropy += entropy
            
            # Store component info
            components.append({
                "name": fp_key.replace("_", " ").title(),
                "value": str(value),
                "entropy": round(entropy, 2),
                "probability": probability,
                "percentage": round(percentage, 2),
                "rarity": rarity
            })
    
    # Apply correlation discount
    correlation_discount = apply_correlation_discount(components)
    if correlation_discount < 1.0:
        # Some components are correlated, adjust total entropy
        total_entropy *= correlation_discount
    
    # Special components (always high entropy)
    
    # Canvas hash (always unique)
    if "canvas_hash" in fingerprint_data:
        canvas_entropy = 16.0  # Very high
        total_entropy += canvas_entropy
        components.append({
            "name": "Canvas Fingerprint",
            "value": fingerprint_data["canvas_hash"][:32] + "...",
            "entropy": canvas_entropy,
            "probability": 0.0001,
            "percentage": 0.01,
            "rarity": "very_rare"
        })
    
    # WebGL (GPU info - moderately unique)
    if "webgl" in fingerprint_data and fingerprint_data["webgl"]:
        webgl = fingerprint_data["webgl"]
        renderer = webgl.get("renderer", "Unknown")
        webgl_entropy = 8.0  # High but not as unique as canvas
        total_entropy += webgl_entropy
        components.append({
            "name": "WebGL Renderer",
            "value": renderer,
            "entropy": webgl_entropy,
            "probability": 0.005,
            "percentage": 0.5,
            "rarity": "rare"
        })
    
    # Audio fingerprint (moderately unique)
    if "audio_hash" in fingerprint_data:
        audio_entropy = 6.0
        total_entropy += audio_entropy
        components.append({
            "name": "Audio Fingerprint",
            "value": fingerprint_data["audio_hash"][:32] + "...",
            "entropy": audio_entropy,
            "probability": 0.01,
            "percentage": 1.0,
            "rarity": "rare"
        })
    
    return {
        "total_entropy": round(total_entropy, 2),
        "components": components,
        "correlation_applied": correlation_discount < 1.0
    }


def entropy_to_uniqueness_score(total_entropy):
    """
    Convert total entropy to a 0-100 uniqueness score.
    
    Entropy ranges (approximate):
    - < 10 bits:  Low uniqueness (score 20-40)
    - 10-20 bits: Medium uniqueness (score 40-60)
    - 20-30 bits: High uniqueness (score 60-80)
    - 30+ bits:   Extremely unique (score 80-100)
    
    Args:
        total_entropy: float (bits)
    
    Returns:
        float: Uniqueness score (0-100)
    """
    
    if total_entropy < 10:
        score = 20 + (total_entropy * 2)
    elif total_entropy < 20:
        score = 40 + ((total_entropy - 10) * 2)
    elif total_entropy < 30:
        score = 60 + ((total_entropy - 20) * 2)
    else:
        score = 80 + ((total_entropy - 30) * 0.67)
        score = min(score, 100)
    
    return round(score, 1)


def determine_risk_level(uniqueness_score):
    """
    Determine risk level based on uniqueness score.
    
    Args:
        uniqueness_score: float (0-100)
    
    Returns:
        str: "low", "medium", "high", "critical"
    """
    if uniqueness_score < 40:
        return "low"
    elif uniqueness_score < 60:
        return "medium"
    elif uniqueness_score < 80:
        return "high"
    else:
        return "critical"


def generate_risk_message(risk_level, uniqueness_score):
    """Generate risk message based on level."""
    messages = {
        "low": f"Your browser has low uniqueness ({uniqueness_score}/100). Good privacy posture!",
        "medium": f"Your browser has moderate uniqueness ({uniqueness_score}/100). Consider privacy tools.",
        "high": f"Your browser is highly unique ({uniqueness_score}/100). You can be easily tracked!",
        "critical": f"Your browser is extremely unique ({uniqueness_score}/100). Maximum trackability risk!"
    }
    return messages.get(risk_level, "Unknown risk level")


def detect_anti_fingerprint_spoofing(components):
    """
    Detect if user is using anti-fingerprint tools that might INCREASE uniqueness.
    
    THE ANTI-FINGERPRINT PARADOX:
    Many anti-fingerprint extensions randomize browser data so aggressively that
    they create impossible/nonsensical combinations, making the browser MORE unique
    rather than less. This can actually INCREASE tracking risk.
    
    Returns:
        bool: True if spoofing detected
    """
    
    # Check for impossible combinations
    platform_comp = next((c for c in components if c["name"] == "Platform"), None)
    resolution_comp = next((c for c in components if c["name"] == "Screen Resolution"), None)
    
    if platform_comp and resolution_comp:
        platform = platform_comp["value"]
        resolution = resolution_comp["value"]
        
        # Impossible combinations that indicate spoofing
        impossible_combinations = [
            ("iPhone", "1920x1080"),      # iPhone doesn't have this resolution
            ("Android", "2560x1600"),     # Android phones rarely have this
            ("Linux x86_64", "2880x1800") # No Linux machine commonly has MacBook resolution
        ]
        
        if (platform, resolution) in impossible_combinations:
            return True
    
    # Check if too many "very_rare" components
    very_rare_count = sum(1 for c in components if c["rarity"] == "very_rare")
    if very_rare_count >= 4:
        # Having 4+ very rare components is suspicious
        # Could indicate randomization tool
        return True
    
    return False


def generate_privacy_risks(components, uniqueness_score):
    """Generate list of detected privacy risks."""
    risks = []
    
    # Check for anti-fingerprint paradox
    if detect_anti_fingerprint_spoofing(components):
        risks.append("⚠️ ANTI-FINGERPRINT PARADOX: Your browser data appears randomized/spoofed, which can make you MORE unique and trackable")
    
    # Check for very rare components
    very_rare_count = sum(1 for c in components if c["rarity"] == "very_rare")
    if very_rare_count >= 2:
        risks.append(f"{very_rare_count} highly unique identifiers detected")
    
    # Check specific components
    for component in components:
        if component["name"] == "Canvas Fingerprint":
            risks.append("Unique Canvas fingerprint (can be used for cross-site tracking)")
        
        if component["name"] == "WebGL Renderer" and component["rarity"] in ["rare", "very_rare"]:
            risks.append("GPU information exposed via WebGL")
        
        if component["name"] == "Screen Resolution" and component["rarity"] == "very_rare":
            risks.append("Uncommon screen resolution makes you easier to identify")
    
    if uniqueness_score > 80:
        risks.append("Overall fingerprint is extremely unique across all components")
    
    return risks


def generate_recommendations(risk_level, components):
    """Generate privacy recommendations."""
    recommendations = []
    
    # Check for spoofing first
    if detect_anti_fingerprint_spoofing(components):
        recommendations.append("⚠️ DISABLE aggressive fingerprint randomization tools - they may be making you MORE trackable")
        recommendations.append("Use privacy browsers with built-in fingerprint protection instead of extensions")
    else:
        if risk_level in ["high", "critical"]:
            recommendations.append("Use privacy-focused browsers (Brave with Shields, Firefox with Enhanced Tracking Protection)")
            recommendations.append("⚠️ Be cautious with fingerprint randomization - it can backfire if too aggressive")
    
    # Check for specific issues
    has_webgl = any(c["name"] == "WebGL Renderer" for c in components)
    has_canvas = any(c["name"] == "Canvas Fingerprint" for c in components)
    
    if has_webgl:
        recommendations.append("Disable WebGL in browser settings if not needed for your work")
    
    if has_canvas:
        recommendations.append("Use built-in browser protections rather than canvas blocking extensions")
    
    recommendations.append("Consider using Tor Browser for maximum anonymity (but expect usability tradeoffs)")
    recommendations.append("Use incognito/private mode and regularly clear browser data")
    
    return recommendations