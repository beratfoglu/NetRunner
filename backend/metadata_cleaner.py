"""
NetRunner — Image Metadata Cleaner API
--------------------------------------
Extract and remove EXIF metadata from images (GPS, camera, date, etc.)

Endpoints:
    GET  /              Health check
    POST /analyze       Extract EXIF data from image
    POST /clean         Remove EXIF data and return cleaned image

Run:
    python metadata_cleaner.py
    → http://localhost:5005
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import io
import base64
from datetime import datetime
import os
import sys
import io

# UTF-8 encoding fix for Windows Turkish
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


app = Flask(__name__)
CORS(app, origins="*", supports_credentials=False)

print("🚀 Starting NetRunner Metadata Cleaner...")

def extract_exif(image):
    """Extract EXIF data from image"""
    try:
        exif_data = image._getexif()
        if not exif_data:
            return {}
        
        extracted = {}
        
        for tag_id, value in exif_data.items():
            tag = TAGS.get(tag_id, tag_id)
            
            # Handle GPS data specially
            if tag == "GPSInfo":
                gps_data = {}
                for gps_tag_id in value:
                    gps_tag = GPSTAGS.get(gps_tag_id, gps_tag_id)
                    gps_data[gps_tag] = value[gps_tag_id]
                extracted[tag] = gps_data
            else:
                # Convert to string if not serializable
                try:
                    str(value)
                    extracted[tag] = value
                except:
                    extracted[tag] = str(value)
        
        return extracted
    
    except Exception as e:
        print(f"Error extracting EXIF: {e}")
        return {}

def parse_gps(gps_data):
    """Parse GPS coordinates from EXIF"""
    try:
        if not gps_data:
            return None
        
        def convert_to_degrees(value):
            d, m, s = value
            return d + (m / 60.0) + (s / 3600.0)
        
        lat = gps_data.get('GPSLatitude')
        lat_ref = gps_data.get('GPSLatitudeRef')
        lon = gps_data.get('GPSLongitude')
        lon_ref = gps_data.get('GPSLongitudeRef')
        
        if lat and lon:
            lat_degrees = convert_to_degrees(lat)
            lon_degrees = convert_to_degrees(lon)
            
            if lat_ref == 'S':
                lat_degrees = -lat_degrees
            if lon_ref == 'W':
                lon_degrees = -lon_degrees
            
            return {
                "latitude": round(lat_degrees, 6),
                "longitude": round(lon_degrees, 6),
                "maps_url": f"https://www.google.com/maps?q={lat_degrees},{lon_degrees}"
            }
    except Exception as e:
        print(f"Error parsing GPS: {e}")
    
    return None

def analyze_privacy_risk(exif_data):
    """Calculate privacy risk score based on metadata"""
    risk_score = 0
    risks = []
    
    # GPS location (HIGH RISK)
    if 'GPSInfo' in exif_data:
        risk_score += 40
        risks.append({
            "type": "critical",
            "message": "GPS coordinates exposed (reveals exact location)"
        })
    
    # Camera make/model (MEDIUM RISK)
    if 'Make' in exif_data or 'Model' in exif_data:
        risk_score += 20
        risks.append({
            "type": "warning",
            "message": "Camera/phone model exposed"
        })
    
    # Date/time (MEDIUM RISK)
    if 'DateTime' in exif_data or 'DateTimeOriginal' in exif_data:
        risk_score += 15
        risks.append({
            "type": "warning",
            "message": "Photo timestamp exposed"
        })
    
    # Software (LOW RISK)
    if 'Software' in exif_data:
        risk_score += 10
        risks.append({
            "type": "info",
            "message": "Editing software info exposed"
        })
    
    # Copyright/Artist (MEDIUM RISK)
    if 'Copyright' in exif_data or 'Artist' in exif_data:
        risk_score += 15
        risks.append({
            "type": "warning",
            "message": "Author/copyright info exposed"
        })
    
    # Determine risk level
    if risk_score >= 60:
        risk_level = "critical"
        risk_message = "HIGH RISK: Sensitive location and device data exposed"
    elif risk_score >= 30:
        risk_level = "warning"
        risk_message = "MEDIUM RISK: Device and metadata exposed"
    elif risk_score > 0:
        risk_level = "info"
        risk_message = "LOW RISK: Minor metadata present"
    else:
        risk_level = "safe"
        risk_message = "SAFE: No sensitive metadata found"
    
    return {
        "risk_score": min(risk_score, 100),
        "risk_level": risk_level,
        "risk_message": risk_message,
        "risks": risks
    }

@app.route("/", methods=["GET"])
def health():
    return jsonify({
        "status": "online",
        "service": "NetRunner Metadata Cleaner"
    })

@app.route("/analyze", methods=["POST"])
def analyze():
    """Analyze image metadata without cleaning"""
    try:
        # Get image from request
        if 'image' not in request.files:
            return jsonify({"error": "No image provided"}), 400
        
        image_file = request.files['image']
        
        # Open image
        image = Image.open(image_file)
        
        # Extract EXIF
        exif_data = extract_exif(image)
        
        if not exif_data:
            return jsonify({
                "has_metadata": False,
                "message": "No EXIF metadata found in this image",
                "metadata": {},
                "privacy_risk": {
                    "risk_score": 0,
                    "risk_level": "safe",
                    "risk_message": "SAFE: No metadata found"
                }
            })
        
        # Parse important fields
        parsed_data = {}
        
        # GPS
        if 'GPSInfo' in exif_data:
            gps = parse_gps(exif_data['GPSInfo'])
            if gps:
                parsed_data['gps'] = gps
        
        # Camera info
        if 'Make' in exif_data:
            parsed_data['camera_make'] = exif_data['Make']
        if 'Model' in exif_data:
            parsed_data['camera_model'] = exif_data['Model']
        
        # Dates
        if 'DateTime' in exif_data:
            parsed_data['date_time'] = str(exif_data['DateTime'])
        if 'DateTimeOriginal' in exif_data:
            parsed_data['date_original'] = str(exif_data['DateTimeOriginal'])
        
        # Software
        if 'Software' in exif_data:
            parsed_data['software'] = exif_data['Software']
        
        # Image specs
        if 'ImageWidth' in exif_data:
            parsed_data['width'] = exif_data['ImageWidth']
        if 'ImageLength' in exif_data:
            parsed_data['height'] = exif_data['ImageLength']
        
        # Copyright
        if 'Copyright' in exif_data:
            parsed_data['copyright'] = exif_data['Copyright']
        if 'Artist' in exif_data:
            parsed_data['artist'] = exif_data['Artist']
        
        # Analyze privacy risk
        privacy_risk = analyze_privacy_risk(exif_data)
        
        return jsonify({
            "has_metadata": True,
            "metadata_count": len(exif_data),
            "parsed_data": parsed_data,
            "privacy_risk": privacy_risk,
            "raw_exif": {k: str(v) for k, v in list(exif_data.items())[:20]}  # First 20 tags
        })
    
    except Exception as e:
        return jsonify({"error": f"Error analyzing image: {str(e)}"}), 500

@app.route("/clean", methods=["POST"])
def clean():
    """Remove metadata and return cleaned image"""
    try:
        # Get image from request
        if 'image' not in request.files:
            return jsonify({"error": "No image provided"}), 400
        
        image_file = request.files['image']
        original_filename = image_file.filename
        
        # Open image
        image = Image.open(image_file)
        
        # Check if had metadata
        had_metadata = bool(extract_exif(image))
        
        # Create new image without EXIF
        # Method 1: Create new image with same data
        if image.mode in ('RGBA', 'LA'):
            background = Image.new(image.mode[:-1], image.size, (255, 255, 255))
            background.paste(image, image.split()[-1])
            cleaned_image = background
        else:
            cleaned_image = Image.new(image.mode, image.size)
            cleaned_image.putdata(list(image.getdata()))
        
        # Save to bytes
        img_byte_arr = io.BytesIO()
        
        # Determine format
        format = image.format or 'JPEG'
        if format == 'JPEG':
            cleaned_image.save(img_byte_arr, format='JPEG', quality=95)
        elif format == 'PNG':
            cleaned_image.save(img_byte_arr, format='PNG')
        else:
            cleaned_image.save(img_byte_arr, format=format)
        
        img_byte_arr.seek(0)
        
        # Generate filename
        name, ext = os.path.splitext(original_filename)
        clean_filename = f"{name}_cleaned{ext}"
        
        return send_file(
            img_byte_arr,
            mimetype=f'image/{format.lower()}',
            as_attachment=True,
            download_name=clean_filename
        )
    
    except Exception as e:
        return jsonify({"error": f"Error cleaning image: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(port=5005, debug=True)