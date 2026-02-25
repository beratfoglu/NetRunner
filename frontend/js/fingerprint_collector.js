/**
 * NetRunner — Browser Fingerprint Collector
 */

async function collectFingerprint() {
    console.log('🔍 Collecting browser fingerprint...');
    
    const fingerprint = {
        user_agent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        languages: navigator.languages ? navigator.languages.join(',') : navigator.language,
        screen_resolution: `${screen.width}x${screen.height}`,
        screen_color_depth: screen.colorDepth,
        pixel_ratio: window.devicePixelRatio || 1,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezone_offset: new Date().getTimezoneOffset(),
        hardware_concurrency: navigator.hardwareConcurrency || 'unknown',
        device_memory: navigator.deviceMemory || 'unknown',
        cookies_enabled: navigator.cookieEnabled,
        do_not_track: navigator.doNotTrack || 'unknown',
        canvas_hash: await getCanvasFingerprint(),
        webgl: getWebGLFingerprint(),
        audio_hash: await getAudioFingerprint(),
        plugins: getPlugins(),
        fonts: detectFonts()
    };
    
    console.log('✅ Fingerprint collected');
    return fingerprint;
}

async function getCanvasFingerprint() {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 60;
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.font = '11pt Arial';
        ctx.fillText('NetRunner 🔒', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.font = '18pt Arial';
        ctx.fillText('Canvas 123', 4, 45);
        const gradient = ctx.createLinearGradient(0, 0, 240, 60);
        gradient.addColorStop(0, 'red');
        gradient.addColorStop(0.5, 'green');
        gradient.addColorStop(1, 'blue');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 240, 60);
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(0, 30);
        ctx.bezierCurveTo(50, 0, 150, 60, 240, 30);
        ctx.stroke();
        const hash = await sha256(canvas.toDataURL());
        return hash;
    } catch (e) {
        return null;
    }
}

function getWebGLFingerprint() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return null;
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        return {
            vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown',
            renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown',
            version: gl.getParameter(gl.VERSION),
            shading_language: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
        };
    } catch (e) {
        return null;
    }
}

// Audio fingerprint with 3 second timeout — prevents infinite hang
async function getAudioFingerprint() {
    try {
        const AudioCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        if (!AudioCtx) return null;

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Audio timeout')), 3000)
        );

        const audioPromise = (async () => {
            const context = new AudioCtx(1, 44100, 44100);
            const oscillator = context.createOscillator();
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(10000, context.currentTime);
            const compressor = context.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(-50, context.currentTime);
            compressor.knee.setValueAtTime(40, context.currentTime);
            compressor.ratio.setValueAtTime(12, context.currentTime);
            compressor.attack.setValueAtTime(0, context.currentTime);
            compressor.release.setValueAtTime(0.25, context.currentTime);
            oscillator.connect(compressor);
            compressor.connect(context.destination);
            oscillator.start(0);
            const buffer = await context.startRendering();
            const samples = Array.from(buffer.getChannelData(0).slice(4500, 5000));
            return await sha256(samples.join(','));
        })();

        return await Promise.race([audioPromise, timeoutPromise]);
    } catch (e) {
        console.log('  Audio fingerprint skipped:', e.message);
        return null;
    }
}

function getPlugins() {
    try {
        const plugins = [];
        for (let i = 0; i < navigator.plugins.length; i++) {
            plugins.push(navigator.plugins[i].name);
        }
        return plugins;
    } catch (e) {
        return [];
    }
}

function detectFonts() {
    try {
        const baseFonts = ['monospace', 'sans-serif', 'serif'];
        const testFonts = [
            'Arial', 'Verdana', 'Times New Roman', 'Courier New',
            'Georgia', 'Palatino', 'Garamond', 'Bookman',
            'Comic Sans MS', 'Trebuchet MS', 'Arial Black', 'Impact',
            'Lucida Sans Unicode', 'Tahoma', 'Lucida Console',
            'Monaco', 'Courier', 'Helvetica', 'Century Gothic'
        ];
        const detectedFonts = [];
        const span = document.createElement('span');
        span.style.fontSize = '72px';
        span.style.position = 'absolute';
        span.style.left = '-9999px';
        span.innerHTML = 'mmmmmmmmmmlli';
        document.body.appendChild(span);
        const baselines = {};
        baseFonts.forEach(f => {
            span.style.fontFamily = f;
            baselines[f] = { width: span.offsetWidth, height: span.offsetHeight };
        });
        testFonts.forEach(font => {
            let detected = false;
            baseFonts.forEach(base => {
                span.style.fontFamily = `${font}, ${base}`;
                if (span.offsetWidth !== baselines[base].width || span.offsetHeight !== baselines[base].height) {
                    detected = true;
                }
            });
            if (detected) detectedFonts.push(font);
        });
        document.body.removeChild(span);
        return detectedFonts;
    } catch (e) {
        return [];
    }
}

async function sha256(message) {
    try {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        let hash = 0;
        for (let i = 0; i < message.length; i++) {
            hash = ((hash << 5) - hash) + message.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }
}

console.log('✅ Fingerprint collector loaded');