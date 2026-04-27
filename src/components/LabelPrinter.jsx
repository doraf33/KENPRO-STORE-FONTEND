// ============================================================
// KENPRO STORE — Imprimante d'étiquettes (58mm / 80mm)
// Usage :  <LabelPrinter product={p} onClose={() => ...} />
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { productsAPI, settingsAPI, ticketsAPI } from '../api';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000';

const S = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:9500,
             display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
  card:    { background:'#141827', border:'1px solid #252a3a', borderRadius:12, padding:20,
             width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto' },
  btnPri:  { background:'#d4a12e', color:'#000', border:'none', borderRadius:8,
             padding:'10px 18px', cursor:'pointer', fontWeight:700, fontSize:13 },
  btnSec:  { background:'#252a3a', color:'#eaedf3', border:'none', borderRadius:8,
             padding:'10px 18px', cursor:'pointer', fontSize:13 },
};

// ── Aperçu d'une étiquette (React, fidèle au rendu imprimé) ──
function LabelPreview({ product, shopName, logoUrl, format }) {
  const bcRef  = useRef(null);
  const w      = format === '80mm' ? 220 : 160;
  const h      = 85;

  useEffect(() => {
    if (!bcRef.current || !product.barcode) return;
    import('jsbarcode').then(({ default: JsBarcode }) => {
      try {
        const fmt = product.barcode.length === 13 ? 'EAN13'
                  : product.barcode.length === 8  ? 'EAN8' : 'CODE128';
        JsBarcode(bcRef.current, product.barcode, {
          format: fmt, height: 28, displayValue: true,
          fontSize: 8, margin: 2, width: 1.3,
          background: '#fff', lineColor: '#000',
        });
      } catch { /* barcode invalide */ }
    });
  }, [product.barcode, format]);

  return (
    <div style={{ width:w, height:h, background:'#fff', borderRadius:4,
                  padding:'4px 6px', display:'flex', flexDirection:'column',
                  justifyContent:'space-between', border:'1px solid #ccc',
                  overflow:'hidden', boxShadow:'0 2px 6px rgba(0,0,0,.2)', flexShrink:0 }}>
      {/* En-tête boutique */}
      <div style={{ display:'flex', alignItems:'center', gap:3 }}>
        {logoUrl && (
          <img src={logoUrl} alt="" style={{ maxHeight:14, maxWidth:18, objectFit:'contain' }}
               onError={e => e.target.style.display='none'} />
        )}
        <span style={{ fontSize:7, fontWeight:700, color:'#222', letterSpacing:.3 }}>
          {shopName}
        </span>
      </div>
      {/* Nom produit */}
      <div style={{ fontSize:8, fontWeight:700, color:'#000', lineHeight:1.2,
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
        {product.name}
      </div>
      {/* Code-barres ou placeholder */}
      {product.barcode
        ? <canvas ref={bcRef} style={{ maxWidth:'100%' }} />
        : <div style={{ fontSize:8, color:'#aaa', textAlign:'center', padding:'4px 0' }}>
            Pas de code-barres
          </div>
      }
      {/* Prix */}
      <div style={{ fontSize:10, fontWeight:700, color:'#000', textAlign:'right' }}>
        {Number(product.price || 0).toLocaleString('fr-FR')} FCFA
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────
export default function LabelPrinter({ product: initialProduct, onClose }) {
  const [product,    setProduct]   = useState(initialProduct);
  const [copies,     setCopies]    = useState(1);
  const [format,     setFormat]    = useState('58mm');
  const [shopName,   setShopName]  = useState('KENPRO STORE');
  const [logoUrl,    setLogoUrl]   = useState('');
  const [generating, setGen]       = useState(false);
  const [printing,   setPrinting]  = useState(false);
  const showCopies = [1, 5, 10, 20, 50];

  // Charger les paramètres boutique
  useEffect(() => {
    settingsAPI.getShop().then(r => {
      setShopName(r.data.shop_name || 'KENPRO STORE');
      if (r.data.logo_url) setLogoUrl(`${API_BASE}${r.data.logo_url}`);
    }).catch(() => {});
  }, []);

  const handleGenerateBarcode = async () => {
    setGen(true);
    try {
      const res = await productsAPI.generateBarcode(product.id);
      setProduct(res.data.product);
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur génération EAN-13');
    } finally { setGen(false); }
  };

  const handlePrint = () => {
    if (!product.barcode && copies > 0) {
      if (!confirm('Ce produit n\'a pas de code-barres. Imprimer quand même ?')) return;
    }
    setPrinting(true);
    // Ouvrir le HTML généré par le backend dans une popup
    const token = localStorage.getItem('kenpro_token');
    const url   = ticketsAPI.labelUrl(product.id, copies, format);
    const w = window.open('', '_blank', `width=700,height=500,left=200,top=100`);
    if (!w) { alert('Autorisez les popups pour imprimer.'); setPrinting(false); return; }
    // On charge via fetch (token JWT requis) puis on écrit dans la fenêtre
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.text())
      .then(html => { w.document.write(html); w.document.close(); })
      .catch(() => w.close())
      .finally(() => setPrinting(false));
  };

  const maxPreview = Math.min(copies, format === '58mm' ? 4 : 3);

  return (
    <div style={S.overlay}>
      <div style={S.card}>

        {/* En-tête */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ margin:0, color:'#eaedf3' }}>🏷️ Imprimer étiquettes</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#7a8094', fontSize:22, cursor:'pointer' }}>×</button>
        </div>

        {/* Infos produit */}
        <div style={{ background:'#1b1f30', borderRadius:8, padding:'10px 14px', marginBottom:14 }}>
          <div style={{ fontWeight:700, color:'#eaedf3' }}>{product.name}</div>
          <div style={{ color:'#7a8094', fontSize:12, marginTop:2 }}>
            {product.category && <span style={{ marginRight:10 }}>📦 {product.category}</span>}
            <span style={{ color:'#d4a12e', fontWeight:600 }}>
              {Number(product.price).toLocaleString('fr-FR')} FCFA
            </span>
            {product.barcode && (
              <span style={{ marginLeft:10, fontFamily:'monospace', fontSize:11 }}>
                {product.barcode}
              </span>
            )}
          </div>
        </div>

        {/* Format papier */}
        <div style={{ marginBottom:14 }}>
          <div style={{ color:'#7a8094', fontSize:12, marginBottom:6 }}>Format papier</div>
          <div style={{ display:'flex', gap:8 }}>
            {['58mm', '80mm'].map(f => (
              <button key={f} onClick={() => setFormat(f)}
                style={{ ...S.btnSec, flex:1, fontWeight: format===f ? 700 : 400,
                         border: format===f ? '1px solid #d4a12e' : '1px solid transparent',
                         color: format===f ? '#d4a12e' : '#eaedf3' }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Code-barres */}
        {!product.barcode && (
          <div style={{ marginBottom:14, padding:'10px 14px', background:'rgba(240,146,60,.1)',
                        border:'1px solid #f0923c', borderRadius:8 }}>
            <div style={{ color:'#f0923c', fontSize:13, marginBottom:8 }}>
              ⚠️ Aucun code-barres — générez-en un pour un meilleur résultat.
            </div>
            <button onClick={handleGenerateBarcode} disabled={generating} style={S.btnSec}>
              {generating ? '⏳ Génération...' : '✨ Générer EAN-13'}
            </button>
          </div>
        )}
        {product.barcode && (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                        marginBottom:14 }}>
            <span style={{ color:'#2dd4a0', fontSize:12 }}>✅ Code-barres présent</span>
            <button onClick={handleGenerateBarcode} disabled={generating}
              style={{ ...S.btnSec, fontSize:12, padding:'5px 12px' }}>
              {generating ? '⏳' : '🔄 Régénérer'}
            </button>
          </div>
        )}

        {/* Nombre de copies */}
        <div style={{ marginBottom:16 }}>
          <div style={{ color:'#7a8094', fontSize:12, marginBottom:6 }}>Nombre d'étiquettes</div>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <button onClick={() => setCopies(c => Math.max(1, c-1))}
              style={{ ...S.btnSec, padding:'7px 13px', fontSize:16 }}>−</button>
            <span style={{ color:'#eaedf3', fontWeight:700, fontSize:18, minWidth:36, textAlign:'center' }}>
              {copies}
            </span>
            <button onClick={() => setCopies(c => Math.min(100, c+1))}
              style={{ ...S.btnSec, padding:'7px 13px', fontSize:16 }}>+</button>
            <div style={{ display:'flex', gap:6 }}>
              {showCopies.map(n => (
                <button key={n} onClick={() => setCopies(n)}
                  style={{ ...S.btnSec, padding:'6px 11px', fontSize:12,
                           border: copies===n ? '1px solid #d4a12e' : '1px solid transparent',
                           color:  copies===n ? '#d4a12e' : '#eaedf3' }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Aperçu */}
        <div style={{ marginBottom:16 }}>
          <div style={{ color:'#7a8094', fontSize:12, marginBottom:8 }}>
            Aperçu — format {format} &nbsp;
            {copies > maxPreview && <span style={{ color:'#5b9cf6' }}>({maxPreview} sur {copies} affichées)</span>}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, padding:10,
                        background:'#1b1f30', borderRadius:8, minHeight:100,
                        alignItems:'flex-start' }}>
            {Array.from({ length: maxPreview }).map((_, i) => (
              <LabelPreview key={i} product={product}
                shopName={shopName} logoUrl={logoUrl} format={format} />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={handlePrint} disabled={printing}
            style={{ ...S.btnPri, flex:1 }}>
            {printing ? '⏳ Ouverture...'
                      : `🖨️ Imprimer ${copies} étiquette${copies > 1 ? 's' : ''} (${format})`}
          </button>
          <button onClick={onClose} style={{ ...S.btnSec, flex:0.35 }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
