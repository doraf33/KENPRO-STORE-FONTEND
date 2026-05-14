// ============================================================
// KENPRO STORE — Étiquettes autocollantes pour réparations
// Formats : small (40×25mm) | medium (58×30mm) | qr (30×30mm) | all
// ============================================================
import { useState } from 'react';
import { ticketsAPI } from '../api';

const FORMATS = [
  { id: 'small',  label: '📏 Petit',    desc: '40×25mm — REP + barcode + client' },
  { id: 'medium', label: '📋 Détaillé', desc: '58×30mm — logo + détails complets' },
  { id: 'qr',     label: '📱 QR Code',  desc: '30×30mm — lien suivi client' },
  { id: 'all',    label: '✨ Tous',      desc: 'Les 3 formats côte à côte' },
];

const PRIORITY_COLOR = { basse:'#22c55e', normal:'#22c55e', haute:'#f59e0b', urgente:'#ef4444' };
const PRIORITY_LABEL = { basse:'🟢 Normal', normal:'🟢 Normal', haute:'🟡 Haute', urgente:'🔴 URGENT ⚡' };

const S = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,.82)', zIndex:9800,
             display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
  card:    { background:'#141827', border:'1px solid #252a3a', borderRadius:14, padding:24,
             width:'100%', maxWidth:520, maxHeight:'92vh', overflowY:'auto' },
  btnPri:  { background:'#d4a12e', color:'#000', border:'none', borderRadius:8,
             padding:'9px 18px', cursor:'pointer', fontWeight:700, fontSize:13 },
  btnSec:  { background:'#252a3a', color:'#eaedf3', border:'none', borderRadius:8,
             padding:'9px 16px', cursor:'pointer', fontSize:13 },
  fmt:     (active) => ({
    border: `2px solid ${active ? '#d4a12e' : '#252a3a'}`,
    borderRadius:10, padding:'10px 14px', cursor:'pointer',
    background: active ? 'rgba(212,161,46,.08)' : '#1b1f30',
    flex: '1 1 calc(50% - 6px)',
  }),
};

export default function RepairLabelPrinter({ repair, onClose }) {
  const [format, setFormat] = useState('medium');
  const [qty,    setQty]    = useState(1);
  const [frame,  setFrame]  = useState(null);  // iframe preview

  if (!repair) return null;

  const ticket    = repair.ticket || `REP-${repair.id}`;
  const priority  = repair.priority || 'normal';
  const labelUrl  = ticketsAPI.repairLabelUrl(repair.id, format, qty);
  const trackingUrl = ticketsAPI.trackingUrl(ticket);

  const openPrint = () => {
    const win = window.open(labelUrl, '_blank', 'width=700,height=500');
    if (win) setTimeout(() => win.print(), 1200);
  };

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.card}>
        {/* ── En-tête ─────────────────────────────── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
          <div>
            <h3 style={{ color:'#eaedf3', margin:0, fontSize:16 }}>🏷️ Étiquettes réparation</h3>
            <div style={{ color:'#d4a12e', fontWeight:700, fontSize:18, marginTop:2 }}>{ticket}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#7a8094', fontSize:22, cursor:'pointer' }}>×</button>
        </div>

        {/* ── Résumé réparation ────────────────────── */}
        <div style={{ background:'#1b1f30', borderRadius:8, padding:'10px 14px', marginBottom:16,
                      display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ color:'#eaedf3', fontWeight:600, fontSize:13 }}>
              {repair.brand} {repair.model} — {repair.device_type}
            </div>
            <div style={{ color:'#7a8094', fontSize:12 }}>
              {repair.client_name} · {repair.client_phone}
            </div>
          </div>
          <span style={{ fontSize:11, padding:'3px 10px', borderRadius:12, fontWeight:700,
                          background:(PRIORITY_COLOR[priority]||'#7a8094')+'20',
                          color:PRIORITY_COLOR[priority]||'#7a8094' }}>
            {PRIORITY_LABEL[priority]||priority}
          </span>
        </div>

        {/* ── Sélecteur format ─────────────────────── */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, color:'#7a8094', marginBottom:8, fontWeight:600 }}>FORMAT D'ÉTIQUETTE</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {FORMATS.map(f => (
              <div key={f.id} style={S.fmt(format === f.id)} onClick={() => setFormat(f.id)}>
                <div style={{ color: format === f.id ? '#d4a12e' : '#eaedf3', fontWeight:700, fontSize:13 }}>
                  {f.label}
                </div>
                <div style={{ color:'#7a8094', fontSize:11, marginTop:2 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Aperçu ──────────────────────────────── */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, color:'#7a8094', marginBottom:8, fontWeight:600 }}>APERÇU</div>
          <div style={{ background:'#0b0d14', border:'1px solid #252a3a', borderRadius:8,
                        padding:8, display:'flex', justifyContent:'center', minHeight:120 }}>
            <iframe
              key={`${format}-${qty}`}
              src={labelUrl}
              title="Aperçu étiquette"
              style={{ width:'100%', minHeight:140, border:'none', borderRadius:4, background:'#fff' }}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>

        {/* ── Copies ──────────────────────────────── */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <span style={{ color:'#eaedf3', fontSize:13 }}>Copies :</span>
          <div style={{ display:'flex', alignItems:'center', border:'1px solid #252a3a', borderRadius:8, overflow:'hidden' }}>
            <button onClick={() => setQty(q => Math.max(1, q-1))}
                    style={{ ...S.btnSec, padding:'7px 14px', borderRadius:0 }}>−</button>
            <span style={{ padding:'7px 16px', color:'#eaedf3', fontWeight:700, minWidth:40, textAlign:'center' }}>{qty}</span>
            <button onClick={() => setQty(q => Math.min(10, q+1))}
                    style={{ ...S.btnSec, padding:'7px 14px', borderRadius:0 }}>+</button>
          </div>
          <span style={{ color:'#7a8094', fontSize:12 }}>max 10</span>
        </div>

        {/* ── Actions ─────────────────────────────── */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <button style={S.btnPri} onClick={openPrint}>
            🖨️ Imprimer
          </button>
          <a href={labelUrl} target="_blank" rel="noopener noreferrer"
             style={{ ...S.btnSec, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:5 }}>
            🔗 Ouvrir
          </a>
          <a href={trackingUrl} target="_blank" rel="noopener noreferrer"
             style={{ ...S.btnSec, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:5,
                      color:'#5b9cf6', border:'1px solid rgba(91,156,246,.3)' }}>
            📡 Suivi client
          </a>
          <button style={S.btnSec} onClick={onClose}>✕ Fermer</button>
        </div>

        <p style={{ marginTop:12, fontSize:11, color:'#3a3f50', textAlign:'center' }}>
          Compatible imprimante thermique 58mm · QR code = lien de suivi client
        </p>
      </div>
    </div>
  );
}
