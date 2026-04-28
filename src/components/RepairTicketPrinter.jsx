// ============================================================
// KENPRO STORE — Ticket de réparation (réception + retrait)
// Usage :
//   <RepairTicketPrinter repair={r} onClose={() => ...} />
// ============================================================
import { useState, useEffect } from 'react';
import { settingsAPI, ticketsAPI } from '../api';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000';

const STATUS_LABELS = {
  recu: 'Reçu', diagnostic: 'Diagnostic', attente_piece: 'Att. pièce',
  en_reparation: 'En réparation', termine: 'Terminé', livre: 'Livré',
};
const PRIORITY_COLORS = {
  basse: '#7a8094', normal: '#5b9cf6', haute: '#f0923c', urgente: '#ef6461',
};

const S = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,.8)', zIndex:9700,
             display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
  card:    { background:'#141827', border:'1px solid #252a3a', borderRadius:12, padding:22,
             width:'100%', maxWidth:560, maxHeight:'92vh', overflowY:'auto' },
  btnPri:  { background:'#d4a12e', color:'#000', border:'none', borderRadius:8,
             padding:'9px 16px', cursor:'pointer', fontWeight:700, fontSize:13 },
  btnSec:  { background:'#252a3a', color:'#eaedf3', border:'none', borderRadius:8,
             padding:'9px 16px', cursor:'pointer', fontSize:13 },
  btnGrn:  { background:'#1c3b2a', color:'#2dd4a0', border:'1px solid #2dd4a0',
             borderRadius:8, padding:'9px 16px', cursor:'pointer', fontSize:13 },
  btnRed:  { background:'#3b1c1c', color:'#ef6461', border:'1px solid #ef6461',
             borderRadius:8, padding:'9px 16px', cursor:'pointer', fontSize:13 },
};

// ── Aperçu ticket (fidèle au rendu thermique) ─────────────────
function TicketPreview({ repair: r, settings, mode }) {
  const w       = settings.paper_format === '80mm' ? 280 : 200;
  const isExit  = mode === 'exit';
  const title   = isExit ? 'TICKET DE RETRAIT' : 'TICKET DE RÉCEPTION';
  const partsC  = parseFloat(r.parts_cost || 0);
  const laborC  = parseFloat(r.labor_cost || 0);
  const totalC  = partsC + laborC;
  const fmtFCFA = n => Number(n||0).toLocaleString('fr-FR') + ' FCFA';

  return (
    <div style={{
      width:w, background:'#fff', fontFamily:"'Courier New',monospace",
      fontSize:11, color:'#000', padding:'6mm 4mm', borderRadius:4,
      boxShadow:'0 4px 16px rgba(0,0,0,.3)', margin:'0 auto',
    }}>
      {/* En-tête boutique */}
      <div style={{ textAlign:'center', marginBottom:6 }}>
        {settings.logo_url && (
          <img src={`${API_BASE}${settings.logo_url}`} alt="Logo"
               style={{ maxHeight:28, maxWidth:36, objectFit:'contain', marginBottom:3 }}
               onError={e => e.target.style.display='none'} />
        )}
        <div style={{ fontWeight:700, fontSize:13 }}>{settings.shop_name || 'KENPRO STORE'}</div>
        {settings.phone && <div style={{ fontSize:10 }}>{settings.phone}</div>}
      </div>
      <hr style={{ border:'1px dashed #000', margin:'4px 0' }}/>

      {/* Titre + numéro */}
      <div style={{ textAlign:'center', fontWeight:700, fontSize:12, margin:'3px 0' }}>{title}</div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
        <span>N°</span><span style={{ fontWeight:700 }}>{r.ticket}</span>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
        <span>Date</span><span>{r.received_at || '—'}</span>
      </div>
      <hr style={{ border:'1px dashed #000', margin:'4px 0' }}/>

      {/* Client */}
      <div style={{ fontWeight:700, fontSize:10, letterSpacing:.5, color:'#333' }}>CLIENT</div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
        <span>Nom</span><span style={{ fontWeight:700 }}>{r.client_name}</span>
      </div>
      {r.client_phone && (
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
          <span>Tél</span><span>{r.client_phone}</span>
        </div>
      )}
      <hr style={{ border:'1px dashed #000', margin:'4px 0' }}/>

      {/* Appareil */}
      <div style={{ fontWeight:700, fontSize:10, letterSpacing:.5, color:'#333' }}>APPAREIL</div>
      {[['Type', r.device_type], ['Marque', r.brand], ['Modèle', r.model], ['N° Série', r.serial_number]]
        .filter(([, v]) => v)
        .map(([l, v]) => (
          <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
            <span>{l}</span><span>{v}</span>
          </div>
        ))
      }
      <hr style={{ border:'1px dashed #000', margin:'4px 0' }}/>

      {isExit ? (
        <>
          {/* Travail effectué */}
          <div style={{ fontWeight:700, fontSize:10, letterSpacing:.5, color:'#333' }}>TRAVAIL EFFECTUÉ</div>
          <div style={{ fontSize:10, lineHeight:1.5, padding:'2px 0' }}>
            {r.solution || r.diagnostic || '—'}
          </div>
          <hr style={{ border:'1px dashed #000', margin:'4px 0' }}/>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
            <span>Pièces</span><span>{fmtFCFA(partsC)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
            <span>Main d'œuvre</span><span>{fmtFCFA(laborC)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:700 }}>
            <span>TOTAL</span><span>{fmtFCFA(totalC)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginTop:2 }}>
            <span>Garantie</span><span>3 mois</span>
          </div>
        </>
      ) : (
        <>
          {/* Problème */}
          <div style={{ fontWeight:700, fontSize:10, letterSpacing:.5, color:'#333' }}>PROBLÈME</div>
          <div style={{ fontSize:10, lineHeight:1.5, padding:'2px 0' }}>{r.problem}</div>
          <hr style={{ border:'1px dashed #000', margin:'4px 0' }}/>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
            <span>Statut</span>
            <span style={{ fontWeight:700 }}>{STATUS_LABELS[r.status] || r.status}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
            <span>Priorité</span>
            <span style={{ color: PRIORITY_COLORS[r.priority], fontWeight:700 }}>
              {r.priority?.toUpperCase()}
            </span>
          </div>
          {r.estimated_cost > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
              <span>Coût estimé</span><span>{fmtFCFA(r.estimated_cost)}</span>
            </div>
          )}
        </>
      )}

      {/* Code-barres placeholder */}
      <hr style={{ border:'1px dashed #000', margin:'4px 0' }}/>
      <div style={{ textAlign:'center', fontSize:10, color:'#666', padding:'4px 0' }}>
        ▌▌▌ {r.ticket} ▌▌▌
      </div>

      {/* Message pied */}
      <hr style={{ border:'1px dashed #000', margin:'4px 0' }}/>
      <div style={{ textAlign:'center', fontSize:10, lineHeight:1.8 }}>
        {isExit
          ? 'Merci pour votre confiance !\nBonne utilisation !'
          : 'GARDEZ CE TICKET\nPrésentez-le lors de la récupération'
        }
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────
export default function RepairTicketPrinter({ repair, onClose }) {
  const [settings, setSettings] = useState({
    shop_name:'KENPRO STORE', paper_format:'58mm', logo_url:'', phone:'',
  });
  const [mode,    setMode]    = useState('reception');  // 'reception' | 'exit'
  const [printing, setPrinting] = useState(false);
  const [copied,   setCopied]   = useState(false);

  const isTerminated = ['termine', 'livre'].includes(repair.status);

  useEffect(() => {
    settingsAPI.getShop().then(r => setSettings(r.data)).catch(() => {});
    // Si terminé, proposer directement le ticket de retrait
    if (isTerminated) setMode('exit');
  }, [repair.status]);

  const openPopup = (url) => {
    setPrinting(true);
    const token = localStorage.getItem('kenpro_token');
    const w = window.open('', '_blank', 'width=420,height=700,left=300,top=50');
    if (!w) { alert('Autorisez les popups.'); setPrinting(false); return; }
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.text())
      .then(html => { w.document.write(html); w.document.close(); })
      .catch(() => w.close())
      .finally(() => setPrinting(false));
  };

  const handlePrint = () => {
    const url = mode === 'exit'
      ? ticketsAPI.repairExitUrl(repair.id)
      : ticketsAPI.repairUrl(repair.id);
    openPopup(url);
  };

  const handleWhatsApp = () => {
    if (!repair.client_phone) { alert('Ce client n\'a pas de numéro de téléphone.'); return; }
    const phone = repair.client_phone.replace(/\s/g, '').replace(/^\+/, '');
    const msg = mode === 'exit'
      ? [
          `Bonjour ${repair.client_name || ''},`,
          ``,
          `✅ *Votre appareil est prêt !*`,
          `N° ${repair.ticket} — ${settings.shop_name}`,
          `Appareil : ${repair.brand || ''} ${repair.model || ''}`,
          ``,
          `Venez le récupérer muni de votre ticket.`,
          `Merci pour votre confiance !`,
        ].join('\n')
      : [
          `Bonjour ${repair.client_name || ''},`,
          ``,
          `📋 *Accusé de réception — ${settings.shop_name}*`,
          `Votre appareil (${repair.brand || repair.device_type}) a bien été reçu.`,
          `N° de ticket : *${repair.ticket}*`,
          ``,
          `Statut : ${STATUS_LABELS[repair.status] || repair.status}`,
          repair.estimated_cost > 0
            ? `Coût estimé : ${Number(repair.estimated_cost).toLocaleString('fr-FR')} FCFA`
            : '',
          ``,
          `Gardez ce numéro pour le suivi.`,
        ].filter(Boolean).join('\n');

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleCopy = () => {
    const text = [
      `${settings.shop_name} — Ticket ${repair.ticket}`,
      `Client : ${repair.client_name}`,
      `Appareil : ${repair.device_type} ${repair.brand || ''} ${repair.model || ''}`,
      `Problème : ${repair.problem}`,
      `Statut : ${STATUS_LABELS[repair.status] || repair.status}`,
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={S.overlay}>
      <div style={S.card}>
        {/* En-tête */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div>
            <h3 style={{ margin:0, color:'#eaedf3' }}>🔧 Ticket Réparation</h3>
            <div style={{ color:'#7a8094', fontSize:12, marginTop:2 }}>
              {repair.ticket} — {repair.client_name}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#7a8094', fontSize:22, cursor:'pointer' }}>×</button>
        </div>

        {/* Sélecteur de type */}
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          <button onClick={() => setMode('reception')}
            style={{ ...S.btnSec, flex:1,
                     border: mode==='reception' ? '1px solid #d4a12e' : '1px solid transparent',
                     color:  mode==='reception' ? '#d4a12e' : '#eaedf3',
                     fontWeight: mode==='reception' ? 700 : 400 }}>
            📋 Réception
          </button>
          <button onClick={() => setMode('exit')}
            style={{ ...S.btnSec, flex:1,
                     border: mode==='exit' ? '1px solid #2dd4a0' : '1px solid transparent',
                     color:  mode==='exit' ? '#2dd4a0' : '#eaedf3',
                     fontWeight: mode==='exit' ? 700 : 400,
                     opacity: isTerminated ? 1 : 0.6 }}
            title={!isTerminated ? 'Disponible quand la réparation est terminée' : ''}>
            ✅ Retrait{!isTerminated && ' 🔒'}
          </button>
        </div>

        {/* Aperçu */}
        <div style={{ background:'#0f1420', borderRadius:8, padding:16,
                      marginBottom:14, overflowX:'auto', display:'flex', justifyContent:'center' }}>
          <TicketPreview repair={repair} settings={settings} mode={mode} />
        </div>

        <div style={{ color:'#7a8094', fontSize:12, textAlign:'center', marginBottom:14 }}>
          Format : {settings.paper_format} · {settings.shop_name}
        </div>

        {/* Actions */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          <button onClick={handlePrint} disabled={printing}
            style={{ ...S.btnPri, flex:1, minWidth:130 }}>
            {printing ? '⏳...' : '🖨️ Imprimer'}
          </button>
          <button onClick={handleWhatsApp} style={{ ...S.btnGrn, flex:1, minWidth:130 }}>
            📱 WhatsApp
          </button>
          <button onClick={handleCopy} style={{ ...S.btnSec, flex:1, minWidth:110 }}>
            {copied ? '✅ Copié !' : '📋 Copier'}
          </button>
          <button onClick={onClose} style={{ ...S.btnSec, flex:0.4 }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
