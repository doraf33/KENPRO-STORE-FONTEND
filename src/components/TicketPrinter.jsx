// ============================================================
// KENPRO STORE — Ticket caisse (popup HTML généré backend)
// Usage :  <TicketPrinter invoice={inv} onClose={() => ...} />
// ============================================================
import { useState, useEffect } from 'react';
import { settingsAPI, ticketsAPI } from '../api';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000';

const S = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,.8)', zIndex:9600,
             display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
  card:    { background:'#141827', border:'1px solid #252a3a', borderRadius:12, padding:22,
             width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto' },
  btnPri:  { background:'#d4a12e', color:'#000', border:'none', borderRadius:8,
             padding:'10px 16px', cursor:'pointer', fontWeight:700, fontSize:13 },
  btnSec:  { background:'#252a3a', color:'#eaedf3', border:'none', borderRadius:8,
             padding:'10px 16px', cursor:'pointer', fontSize:13 },
  btnGrn:  { background:'#1c3b2a', color:'#2dd4a0', border:'1px solid #2dd4a0', borderRadius:8,
             padding:'10px 16px', cursor:'pointer', fontSize:13 },
};

const fmt = n => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';

// ── Aperçu ticket en React (fidèle au template ESC/POS) ──────
function TicketPreview({ invoice: inv, settings }) {
  const items = inv.items || [];
  const subtotal = parseFloat(inv.total || 0);
  const w = settings.paper_format === '80mm' ? 280 : 200;

  return (
    <div style={{
      width: w, background:'#fff', fontFamily:"'Courier New', monospace",
      fontSize: 11, color:'#000', padding:'6mm 4mm', borderRadius:4,
      boxShadow:'0 4px 16px rgba(0,0,0,.3)', margin:'0 auto',
    }}>
      {/* En-tête */}
      <div style={{ textAlign:'center', marginBottom:8 }}>
        {settings.logo_url && (
          <img src={`${API_BASE}${settings.logo_url}`} alt="Logo"
               style={{ maxHeight:32, maxWidth:40, objectFit:'contain', marginBottom:4 }}
               onError={e => e.target.style.display='none'} />
        )}
        <div style={{ fontWeight:700, fontSize:13, letterSpacing:1 }}>
          {settings.shop_name || 'KENPRO STORE'}
        </div>
        {settings.phone   && <div style={{ fontSize:10 }}>{settings.phone}</div>}
        {settings.address && <div style={{ fontSize:10 }}>{settings.address}</div>}
      </div>

      <div style={{ borderTop:'1px dashed #000', margin:'4px 0' }}/>

      {/* Infos facture */}
      <table style={{ width:'100%', fontSize:10 }}>
        <tbody>
          <tr><td>Facture N°</td><td style={{ textAlign:'right', fontWeight:700 }}>{inv.number}</td></tr>
          <tr><td>Date</td><td style={{ textAlign:'right' }}>{inv.created_at || '—'}</td></tr>
          {inv.client_name && <tr><td>Client</td><td style={{ textAlign:'right' }}>{inv.client_name}</td></tr>}
          {inv.created_by  && <tr><td>Caissier</td><td style={{ textAlign:'right' }}>{inv.created_by}</td></tr>}
        </tbody>
      </table>

      <div style={{ borderTop:'1px dashed #000', margin:'4px 0' }}/>

      {/* Articles */}
      {items.map((it, i) => {
        const qty = it.quantity || 1;
        const price = parseFloat(it.unit_price || 0);
        const total = parseFloat(it.total || price * qty);
        return (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:10, padding:'2px 0' }}>
            <span style={{ flex:1, paddingRight:4 }}>
              {(it.product_name || '—').slice(0, 22)}{qty > 1 ? ` ×${qty}` : ''}
            </span>
            <span style={{ whiteSpace:'nowrap', fontWeight:600 }}>{fmt(total)}</span>
          </div>
        );
      })}

      <div style={{ borderTop:'1px dashed #000', margin:'4px 0' }}/>

      {/* Total */}
      <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, fontSize:13, padding:'2px 0' }}>
        <span>TOTAL</span>
        <span>{fmt(subtotal)}</span>
      </div>

      {/* Statut */}
      {inv.status === 'payee' && (
        <div style={{ textAlign:'center', color:'#00a050', fontWeight:700, fontSize:11, marginTop:4 }}>
          ✅ PAYÉE
        </div>
      )}

      <div style={{ borderTop:'1px dashed #000', margin:'6px 0' }}/>

      {/* Message remerciement */}
      <div style={{ textAlign:'center', fontSize:10, lineHeight:1.6, marginTop:4 }}>
        {(settings.thank_you_message || 'Merci pour votre visite !').split('\n').map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────
export default function TicketPrinter({ invoice, onClose }) {
  const [settings,  setSettings]  = useState({ shop_name:'KENPRO STORE', paper_format:'58mm', logo_url:'', phone:'', address:'', thank_you_message:'Merci pour votre visite !' });
  const [printing,  setPrinting]  = useState(false);
  const [copied,    setCopied]    = useState(false);

  useEffect(() => {
    settingsAPI.getShop().then(r => setSettings(r.data)).catch(() => {});
  }, []);

  // Ouvre le ticket HTML généré par le backend dans une popup
  const handlePrint = () => {
    setPrinting(true);
    const token = localStorage.getItem('kenpro_token');
    const url   = ticketsAPI.invoiceUrl(invoice.id);
    const w = window.open('', '_blank', 'width=420,height=650,left=300,top=80');
    if (!w) { alert('Autorisez les popups.'); setPrinting(false); return; }
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.text())
      .then(html => { w.document.write(html); w.document.close(); })
      .catch(() => w.close())
      .finally(() => setPrinting(false));
  };

  // WhatsApp — message texte avec le résumé de la facture
  const handleWhatsApp = () => {
    if (!invoice.client_phone) { alert('Ce client n\'a pas de numéro de téléphone.'); return; }
    const phone = invoice.client_phone.replace(/\D/g, '');
    const items = (invoice.items || []).map(it =>
      `  ${it.product_name} ×${it.quantity} = ${fmt(it.total)}`
    ).join('\n');
    const msg = [
      `Bonjour ${invoice.client_name || ''},`,
      ``,
      `🧾 *${settings.shop_name}*`,
      `Facture N° *${invoice.number}*`,
      `Date : ${invoice.created_at || '—'}`,
      ``,
      `Articles :`,
      items,
      ``,
      `*TOTAL : ${fmt(invoice.total)}*`,
      ``,
      (settings.thank_you_message || 'Merci pour votre visite !').split('\n').join('\n'),
    ].join('\n');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Copier le résumé en texte
  const handleCopy = () => {
    const items = (invoice.items || []).map(it =>
      `${it.product_name} ×${it.quantity} : ${fmt(it.total)}`
    ).join('\n');
    const text = `${settings.shop_name}\n${invoice.number}\n${invoice.created_at || ''}\n\n${items}\n\nTOTAL : ${fmt(invoice.total)}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={S.overlay}>
      <div style={S.card}>

        {/* En-tête */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div>
            <h3 style={{ margin:0, color:'#eaedf3' }}>🖨️ Ticket caisse</h3>
            <div style={{ color:'#7a8094', fontSize:12, marginTop:2 }}>
              {invoice.number} — {fmt(invoice.total)}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#7a8094', fontSize:22, cursor:'pointer' }}>×</button>
        </div>

        {/* Aperçu */}
        <div style={{ background:'#0f1420', borderRadius:8, padding:16, marginBottom:16,
                      overflowX:'auto', display:'flex', justifyContent:'center' }}>
          <TicketPreview invoice={invoice} settings={settings} />
        </div>

        {/* Format info */}
        <div style={{ color:'#7a8094', fontSize:12, marginBottom:16, textAlign:'center' }}>
          Format : {settings.paper_format} · Boutique : {settings.shop_name}
        </div>

        {/* Actions */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          <button onClick={handlePrint} disabled={printing}
            style={{ ...S.btnPri, flex:1, minWidth:140 }}>
            {printing ? '⏳ Ouverture...' : '🖨️ Imprimer'}
          </button>
          <button onClick={handleWhatsApp} style={{ ...S.btnGrn, flex:1, minWidth:140 }}>
            📱 WhatsApp
          </button>
          <button onClick={handleCopy} style={{ ...S.btnSec, flex:1, minWidth:120 }}>
            {copied ? '✅ Copié !' : '📋 Copier texte'}
          </button>
          <button onClick={onClose} style={{ ...S.btnSec, flex:0.5 }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
