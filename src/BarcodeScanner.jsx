// ============================================================
// KENPRO STORE — Scan code-barres (ZXing + caméra)
// Fixes Phase 5 :
//   - Debounce via useRef (pas de stale closure)
//   - Libération caméra immédiate après détection
//   - Une seule notification par code
//   - Auto-fermeture après détection réussie
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react';

export function BarcodeScanner({ onDetect, onClose, title = 'Scanner un code-barres' }) {
  const videoRef     = useRef(null);
  const readerRef    = useRef(null);
  const streamRef    = useRef(null);          // Pour stopper les tracks caméra
  const lastCodeRef  = useRef('');            // Ref (pas state) → pas de stale closure
  const lastTimeRef  = useRef(0);             // Timestamp dernière détection
  const detectedRef  = useRef(false);         // Empêche détections multiples après onDetect
  const DEBOUNCE_MS  = 2500;                  // Même code ignoré pendant 2,5s

  const [error,    setError]    = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameras,  setCameras]  = useState([]);
  const [camIdx,   setCamIdx]   = useState(0);
  const [lastCode, setLastCode] = useState(''); // Uniquement pour affichage

  // ── Libère la caméra proprement ────────────────────────────
  const releaseCamera = useCallback(() => {
    try { readerRef.current?.reset?.(); } catch {}
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    } catch {}
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  }, []);

  // ── Démarre le scan ────────────────────────────────────────
  const startScan = useCallback(async (deviceId) => {
    releaseCamera();
    detectedRef.current  = false;
    lastCodeRef.current  = '';
    lastTimeRef.current  = 0;

    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      if (devices.length === 0) {
        setError('Aucune caméra détectée.');
        return;
      }
      setCameras(devices);
      const selectedId = deviceId || devices[camIdx]?.deviceId;

      // Capturer le stream pour pouvoir l'arrêter proprement
      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedId ? { deviceId: { exact: selectedId } } : { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setScanning(true);
      setError('');

      // ZXing decode loop
      await reader.decodeFromStream(stream, videoRef.current, (result) => {
        if (!result) return;
        if (detectedRef.current) return;  // Déjà détecté → ignorer

        const code = result.getText();
        const now  = Date.now();

        // Debounce : ignorer si même code dans les 2,5s
        if (code === lastCodeRef.current && now - lastTimeRef.current < DEBOUNCE_MS) return;

        lastCodeRef.current = code;
        lastTimeRef.current = now;
        detectedRef.current = true;   // Bloquer nouvelles détections

        if (navigator.vibrate) navigator.vibrate(100);
        setLastCode(code);

        // Libérer caméra AVANT d'appeler onDetect
        releaseCamera();
        onDetect(code);
      });
    } catch (e) {
      setScanning(false);
      if (e.name === 'NotAllowedError') {
        setError("Permission caméra refusée. Autorisez l'accès dans les paramètres du navigateur.");
      } else if (e.name === 'NotFoundError') {
        setError('Aucune caméra disponible.');
      } else if (e.name !== 'AbortError') {
        setError(`Erreur caméra : ${e.message}`);
      }
    }
  }, [camIdx, releaseCamera, onDetect]);

  useEffect(() => {
    startScan();
    return () => { releaseCamera(); };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const switchCamera = () => {
    const next = (camIdx + 1) % cameras.length;
    setCamIdx(next);
    startScan(cameras[next]?.deviceId);
  };

  const handleClose = () => {
    releaseCamera();
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)',
      zIndex: 9000, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#141827', borderRadius: 16, padding: 24,
        width: '100%', maxWidth: 480, margin: 16,
        border: '1px solid #252a3a',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: '#eaedf3' }}>{title}</h3>
          <button onClick={handleClose} style={{
            background: 'none', border: 'none', color: '#7a8094',
            fontSize: 22, cursor: 'pointer', lineHeight: 1,
          }}>×</button>
        </div>

        {/* Flux vidéo */}
        <div style={{ position: 'relative', background: '#000', borderRadius: 10, overflow: 'hidden', aspectRatio: '4/3' }}>
          <video
            ref={videoRef}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            autoPlay muted playsInline
          />
          {/* Réticule */}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
          }}>
            <div style={{
              width: 200, height: 140, border: '2px solid #d4a12e',
              borderRadius: 8, boxShadow: '0 0 0 9999px rgba(0,0,0,.4)',
            }}>
              {[
                { top:0, left:0,  borderTop:'3px solid #d4a12e', borderLeft:'3px solid #d4a12e' },
                { top:0, right:0, borderTop:'3px solid #d4a12e', borderRight:'3px solid #d4a12e' },
                { bottom:0, left:0,  borderBottom:'3px solid #d4a12e', borderLeft:'3px solid #d4a12e' },
                { bottom:0, right:0, borderBottom:'3px solid #d4a12e', borderRight:'3px solid #d4a12e' },
              ].map((s, i) => <div key={i} style={{ position:'absolute', width:20, height:20, ...s }} />)}
              <div style={{
                position:'absolute', left:4, right:4, height:2,
                background:'rgba(212,161,46,.8)', top:'50%',
                animation: scanning ? 'scanLine 2s linear infinite' : 'none',
              }} />
            </div>
          </div>
          {scanning && (
            <div style={{ position:'absolute', bottom:8, left:0, right:0, textAlign:'center', color:'#d4a12e', fontSize:12 }}>
              📷 Pointez vers le code-barres...
            </div>
          )}
        </div>

        {error && (
          <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(239,100,97,.1)', borderRadius:8, color:'#ef6461', fontSize:13 }}>
            {error}
          </div>
        )}

        {lastCode && (
          <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(45,212,160,.1)', borderRadius:8 }}>
            <div style={{ fontSize:12, color:'#7a8094', marginBottom:4 }}>✅ Code détecté :</div>
            <div style={{ fontWeight:700, color:'#2dd4a0', fontFamily:'monospace', fontSize:15 }}>{lastCode}</div>
          </div>
        )}

        <div style={{ display:'flex', gap:10, marginTop:16 }}>
          {cameras.length > 1 && (
            <button onClick={switchCamera} style={{
              flex:1, padding:'10px', background:'#1b1f30',
              border:'1px solid #252a3a', borderRadius:8, color:'#eaedf3',
              cursor:'pointer', fontSize:13,
            }}>
              🔄 Caméra {camIdx + 1}/{cameras.length}
            </button>
          )}
          <button onClick={handleClose} style={{
            flex:1, padding:'10px', background:'#252a3a',
            border:'none', borderRadius:8, color:'#eaedf3',
            cursor:'pointer', fontSize:13,
          }}>
            Fermer
          </button>
        </div>

        <p style={{ marginTop:12, fontSize:11, color:'#7a8094', textAlign:'center', margin:'12px 0 0' }}>
          EAN-13 · EAN-8 · QR Code · Code128 · Code39
        </p>
      </div>

      <style>{`
        @keyframes scanLine {
          0%   { top: 10%; }
          50%  { top: 80%; }
          100% { top: 10%; }
        }
      `}</style>
    </div>
  );
}

// ── Hook simplifié ────────────────────────────────────────────
export function useBarcodeScanner({ onDetect } = {}) {
  const [open, setOpen] = useState(false);
  const handleDetect = useCallback((code) => {
    setOpen(false);
    onDetect?.(code);
  }, [onDetect]);

  const Scanner = open
    ? <BarcodeScanner onDetect={handleDetect} onClose={() => setOpen(false)} />
    : null;

  return { open, setOpen, Scanner };
}

// ── Affichage code-barres (JsBarcode) ────────────────────────
export function BarcodeDisplay({ value, format = 'EAN13', height = 60, displayValue = true }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    import('jsbarcode').then(({ default: JsBarcode }) => {
      try {
        JsBarcode(canvasRef.current, value, { format, height, displayValue, fontSize: 12, margin: 8, background: 'transparent', lineColor: '#000' });
      } catch {}
    });
  }, [value, format, height, displayValue]);

  if (!value) return null;
  return <canvas ref={canvasRef} style={{ maxWidth: '100%' }} />;
}
