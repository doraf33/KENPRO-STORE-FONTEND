// ============================================================
// KENPRO STORE — Scanner code-barres (ZXing)
//
// Garanties :
//   ✅ onDetect appelé UNE SEULE fois par ouverture
//   ✅ Caméra libérée immédiatement après détection
//   ✅ Aucun spam de notifications
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react';

export function BarcodeScanner({ onDetect, onClose, title = 'Scanner un code-barres' }) {
  const videoRef      = useRef(null);
  const readerRef     = useRef(null);
  const streamRef     = useRef(null);
  const hasDetected   = useRef(false);   // Verrou — jamais réinitialisé après 1ère détection

  const [error,    setError]    = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameras,  setCameras]  = useState([]);
  const [camIdx,   setCamIdx]   = useState(0);
  const [detected, setDetected] = useState('');  // Affichage code détecté

  // ── Arrêt caméra + reader ──────────────────────────────────
  const stopAll = useCallback(() => {
    // 1. Stopper ZXing en premier (annule les callbacks pendants)
    try { readerRef.current?.reset(); readerRef.current = null; } catch {}
    // 2. Couper les tracks caméra (éteint le voyant)
    try {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    } catch {}
    // 3. Détacher la vidéo
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }, []);

  // ── Démarrage scan ─────────────────────────────────────────
  const startScan = useCallback(async (deviceId) => {
    stopAll();
    hasDetected.current = false;

    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      if (!devices.length) { setError('Aucune caméra détectée.'); return; }
      setCameras(devices);

      const targetId = deviceId ?? devices[camIdx]?.deviceId;

      // Obtenir le stream manuellement pour pouvoir l'arrêter proprement
      const constraints = targetId
        ? { video: { deviceId: { exact: targetId } } }
        : { video: { facingMode: 'environment' } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setScanning(true);
      setError('');

      // Callback appelé à chaque frame où ZXing décode quelque chose
      reader.decodeFromStream(stream, videoRef.current, (result) => {
        if (!result) return;

        // ━━ VERROU ━━ — doit être la 1ère vérification
        if (hasDetected.current) return;
        hasDetected.current = true;   // Pose le verrou AVANT toute autre opération

        // Stopper ZXing immédiatement (annule callbacks futurs dans la même boucle)
        try { readerRef.current?.reset(); readerRef.current = null; } catch {}
        // Couper la caméra
        try {
          streamRef.current?.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        } catch {}
        if (videoRef.current) videoRef.current.srcObject = null;
        setScanning(false);

        const code = result.getText();
        if (navigator.vibrate) navigator.vibrate(80);
        setDetected(code);

        // Appeler le parent (une seule fois, garantie)
        onDetect(code);
      });

    } catch (e) {
      setScanning(false);
      if (e.name === 'NotAllowedError') {
        setError("Permission caméra refusée. Autorisez l'accès dans les paramètres.");
      } else if (e.name === 'NotFoundError') {
        setError('Aucune caméra disponible.');
      } else if (e.name !== 'AbortError') {
        setError(`Erreur caméra : ${e.message}`);
      }
    }
  }, [camIdx, stopAll, onDetect]);

  useEffect(() => {
    startScan();
    return stopAll;          // Cleanup au démontage
  }, []);                    // eslint-disable-line react-hooks/exhaustive-deps

  const switchCamera = () => {
    const next = (camIdx + 1) % cameras.length;
    setCamIdx(next);
    startScan(cameras[next]?.deviceId);
  };

  const handleClose = () => { stopAll(); onClose(); };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)',
      zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#141827', borderRadius: 16, padding: 24,
        width: '100%', maxWidth: 460, margin: 16,
        border: '1px solid #252a3a',
      }}>
        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: '#eaedf3', fontSize: 16 }}>{title}</h3>
          <button onClick={handleClose} style={{
            background: 'none', border: 'none', color: '#7a8094',
            fontSize: 24, cursor: 'pointer', lineHeight: 1, padding: '0 4px',
          }}>×</button>
        </div>

        {/* Vidéo */}
        <div style={{ position: 'relative', background: '#000', borderRadius: 10, overflow: 'hidden', aspectRatio: '4/3' }}>
          <video ref={videoRef} autoPlay muted playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />

          {/* Réticule */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ width: 200, height: 140, border: '2px solid #d4a12e', borderRadius: 8, boxShadow: '0 0 0 9999px rgba(0,0,0,.45)', position: 'relative' }}>
              {/* Coins */}
              {[
                { top: 0, left: 0,   borderTop: '3px solid #d4a12e', borderLeft: '3px solid #d4a12e' },
                { top: 0, right: 0,  borderTop: '3px solid #d4a12e', borderRight: '3px solid #d4a12e' },
                { bottom: 0, left: 0,  borderBottom: '3px solid #d4a12e', borderLeft: '3px solid #d4a12e' },
                { bottom: 0, right: 0, borderBottom: '3px solid #d4a12e', borderRight: '3px solid #d4a12e' },
              ].map((s, i) => <div key={i} style={{ position: 'absolute', width: 18, height: 18, ...s }} />)}
              {/* Ligne animée */}
              {scanning && (
                <div style={{
                  position: 'absolute', left: 4, right: 4, height: 2,
                  background: 'rgba(212,161,46,.8)', top: '50%',
                  animation: 'scanLine 2s linear infinite',
                }} />
              )}
            </div>
          </div>

          {scanning && (
            <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', color: '#d4a12e', fontSize: 12 }}>
              📷 Pointez vers le code-barres…
            </div>
          )}

          {detected && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(45,212,160,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#141827', borderRadius: 8, padding: '8px 16px', color: '#2dd4a0', fontWeight: 700, fontFamily: 'monospace' }}>
                ✅ {detected}
              </div>
            </div>
          )}
        </div>

        {/* Erreur */}
        {error && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,100,97,.1)', borderRadius: 8, color: '#ef6461', fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Boutons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {cameras.length > 1 && (
            <button onClick={switchCamera} style={{
              flex: 1, padding: '10px', background: '#1b1f30', border: '1px solid #252a3a',
              borderRadius: 8, color: '#eaedf3', cursor: 'pointer', fontSize: 13,
            }}>
              🔄 Caméra {camIdx + 1}/{cameras.length}
            </button>
          )}
          <button onClick={handleClose} style={{
            flex: 1, padding: '10px', background: '#252a3a', border: 'none',
            borderRadius: 8, color: '#eaedf3', cursor: 'pointer', fontSize: 13,
          }}>
            Fermer
          </button>
        </div>

        <p style={{ marginTop: 10, fontSize: 11, color: '#7a8094', textAlign: 'center', margin: '10px 0 0' }}>
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
        JsBarcode(canvasRef.current, value, {
          format, height, displayValue, fontSize: 12, margin: 8,
          background: 'transparent', lineColor: '#000',
        });
      } catch {}
    });
  }, [value, format, height, displayValue]);

  if (!value) return null;
  return <canvas ref={canvasRef} style={{ maxWidth: '100%' }} />;
}
