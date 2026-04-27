// ============================================================
// KENPRO STORE — Imprimante d'étiquettes (58×30 mm)
// Usage :
//   <LabelPrinter product={p} onClose={() => ...} />
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { productsAPI } from '../api';

const DARK_CARD = { background: '#141827', border: '1px solid #252a3a', borderRadius: 12, padding: 20 };
const BTN_PRI   = { background: '#d4a12e', color: '#000', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 13 };
const BTN_SEC   = { background: '#252a3a', color: '#eaedf3', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 13 };

// ── Génère le SVG code-barres via JsBarcode ─────────────────
function BarcodeCanvas({ value, height = 50 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    import('jsbarcode').then(({ default: JsBarcode }) => {
      try {
        JsBarcode(ref.current, value, {
          format: value.length === 13 ? 'EAN13' : value.length === 8 ? 'EAN8' : 'CODE128',
          height,
          displayValue: true,
          fontSize: 11,
          margin: 6,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch { /* valeur invalide */ }
    });
  }, [value, height]);
  if (!value) return <div style={{ color: '#7a8094', fontSize: 12, padding: 8 }}>Aucun code-barres</div>;
  return <canvas ref={ref} style={{ maxWidth: '100%' }} />;
}

// ── Aperçu d'une étiquette ────────────────────────────────────
function LabelPreview({ product, copies }) {
  const labels = Array.from({ length: Math.min(copies, 4) });   // max 4 en aperçu
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
      {labels.map((_, i) => (
        <div key={i} style={{
          width: 200, height: 100, background: '#fff', borderRadius: 6,
          padding: '6px 8px', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,.15)',
          border: '1px solid #e0e0e0', overflow: 'hidden',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#111', lineHeight: 1.2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {product.name}
          </div>
          <div style={{ fontSize: 9, color: '#555' }}>{product.category || ''}</div>
          {product.barcode
            ? <BarcodeCanvas value={product.barcode} height={34} />
            : <div style={{ fontSize: 9, color: '#aaa', textAlign: 'center', padding: '4px 0' }}>
                Générer un code-barres d'abord
              </div>
          }
          <div style={{ fontSize: 11, fontWeight: 700, color: '#000', textAlign: 'right' }}>
            {Number(product.price || 0).toLocaleString('fr-FR')} FCFA
          </div>
        </div>
      ))}
      {copies > 4 && (
        <div style={{ color: '#7a8094', fontSize: 12, alignSelf: 'center' }}>
          + {copies - 4} autres à l'impression
        </div>
      )}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────
export default function LabelPrinter({ product: initialProduct, onClose }) {
  const [product, setProduct]   = useState(initialProduct);
  const [copies, setCopies]     = useState(1);
  const [generating, setGen]    = useState(false);
  const [printing, setPrinting] = useState(false);

  const handleGenerateBarcode = async () => {
    setGen(true);
    try {
      const res = await productsAPI.generateBarcode(product.id);
      setProduct(res.data.product);
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur lors de la génération');
    } finally {
      setGen(false);
    }
  };

  const handlePrint = () => {
    if (!product.barcode) {
      alert('Générez d\'abord un code-barres pour ce produit.');
      return;
    }
    setPrinting(true);

    const labelHtml = `
      <div style="width:58mm;height:30mm;background:#fff;padding:3mm 4mm;
                  display:flex;flex-direction:column;justify-content:space-between;
                  font-family:Arial,sans-serif;box-sizing:border-box;overflow:hidden;">
        <div style="font-size:8pt;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${product.name}
        </div>
        <div id="bc_${product.id}"></div>
        <div style="font-size:9pt;font-weight:700;text-align:right">
          ${Number(product.price || 0).toLocaleString('fr-FR')} FCFA
        </div>
      </div>`;

    const labelsHtml = Array.from({ length: copies })
      .map(() => `<div class="label">${labelHtml}</div>`)
      .join('');

    const w = window.open('', '_blank', 'width=600,height=400');
    if (!w) { alert('Autorisez les popups pour imprimer.'); setPrinting(false); return; }

    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Étiquettes — ${product.name}</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11/dist/JsBarcode.all.min.js"></script>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#f5f5f5;display:flex;flex-wrap:wrap;gap:4mm;padding:4mm}
        .label{width:58mm;height:30mm;background:#fff;border:1px solid #ddd;border-radius:2mm;overflow:hidden}
        @media print{body{background:white;padding:0;gap:2mm}.label{border:none;break-inside:avoid}}
      </style>
    </head><body>${labelsHtml}
      <script>
        window.onload = function() {
          document.querySelectorAll('[id^="bc_"]').forEach(function(el) {
            var svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
            el.appendChild(svg);
            try {
              JsBarcode(svg, "${product.barcode}", {
                format: "${product.barcode.length === 13 ? 'EAN13' : product.barcode.length === 8 ? 'EAN8' : 'CODE128'}",
                height: 28, displayValue: true, fontSize: 8, margin: 2,
                width: 1.2,
              });
            } catch(e) {}
          });
          setTimeout(function(){ window.print(); window.close(); }, 600);
        };
      </script>
    </body></html>`);
    w.document.close();
    setPrinting(false);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:9500,
                  display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ ...DARK_CARD, width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto' }}>

        {/* En-tête */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ margin:0, color:'#eaedf3' }}>🏷️ Imprimer étiquette</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#7a8094', fontSize:22, cursor:'pointer' }}>×</button>
        </div>

        {/* Infos produit */}
        <div style={{ background:'#1b1f30', borderRadius:8, padding:'12px 16px', marginBottom:16 }}>
          <div style={{ fontWeight:700, color:'#eaedf3', marginBottom:4 }}>{product.name}</div>
          <div style={{ color:'#7a8094', fontSize:13 }}>
            {product.category && <span style={{ marginRight:12 }}>📦 {product.category}</span>}
            <span style={{ color:'#d4a12e', fontWeight:600 }}>
              {Number(product.price).toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>

        {/* Code-barres actuel */}
        <div style={{ background:'#fff', borderRadius:8, padding:12, textAlign:'center', marginBottom:16, minHeight:80 }}>
          {product.barcode
            ? <BarcodeCanvas value={product.barcode} height={55} />
            : <div style={{ color:'#999', padding:20 }}>Aucun code-barres — cliquez « Générer »</div>
          }
        </div>

        {/* Contrôles */}
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
          <button onClick={handleGenerateBarcode} disabled={generating} style={{ ...BTN_SEC, flex:1 }}>
            {generating ? '⏳ Génération...' : product.barcode ? '🔄 Régénérer EAN-13' : '✨ Générer EAN-13'}
          </button>
        </div>

        {/* Nombre de copies */}
        <div style={{ marginBottom:16 }}>
          <label style={{ color:'#7a8094', fontSize:13, display:'block', marginBottom:6 }}>
            Nombre d'étiquettes à imprimer
          </label>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button onClick={() => setCopies(c => Math.max(1, c-1))}
              style={{ ...BTN_SEC, padding:'8px 14px', fontSize:16 }}>−</button>
            <span style={{ color:'#eaedf3', fontWeight:700, fontSize:18, minWidth:40, textAlign:'center' }}>
              {copies}
            </span>
            <button onClick={() => setCopies(c => Math.min(100, c+1))}
              style={{ ...BTN_SEC, padding:'8px 14px', fontSize:16 }}>+</button>
            {[5,10,20].map(n => (
              <button key={n} onClick={() => setCopies(n)}
                style={{ ...BTN_SEC, padding:'6px 12px', fontSize:12 }}>{n}</button>
            ))}
          </div>
        </div>

        {/* Aperçu */}
        <div style={{ marginBottom:16 }}>
          <div style={{ color:'#7a8094', fontSize:13, marginBottom:8 }}>
            Aperçu (étiquette 58×30 mm) :
          </div>
          <LabelPreview product={product} copies={copies} />
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={handlePrint} disabled={printing || !product.barcode}
            style={{ ...BTN_PRI, flex:1, opacity: product.barcode ? 1 : 0.5 }}>
            {printing ? '⏳ Ouverture...' : `🖨️ Imprimer ${copies} étiquette${copies > 1 ? 's' : ''}`}
          </button>
          <button onClick={onClose} style={{ ...BTN_SEC, flex:0.4 }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
