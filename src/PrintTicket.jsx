// ============================================================
// KENPRO STORE — Impression ticket de caisse
// Usage :
//   <PrintTicket invoice={inv} onClose={() => ...} />
//   ou : printInvoice(inv)  (impression directe)
// ============================================================
import { useRef } from 'react';

const STORE_INFO = {
  name:    'KENPRO STORE',
  address: 'Yaoundé, Cameroun',
  phone:   '+237 6XX XXX XXX',
  footer:  'Merci pour votre confiance !',
};

function formatFCFA(n) {
  return Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
}

function formatDate(str) {
  if (!str) return new Date().toLocaleDateString('fr-FR');
  return new Date(str).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function PrintTicket({ invoice, onClose, paidAmount = null }) {
  const printRef = useRef(null);

  if (!invoice) return null;

  const items   = invoice.items || [];
  const total   = invoice.total || 0;
  const monnaie = paidAmount !== null ? Math.max(0, paidAmount - total) : null;

  const handlePrint = () => {
    const content  = printRef.current?.innerHTML;
    const printWin = window.open('', '_blank', 'width=400,height=700');
    printWin.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>Ticket ${invoice.number}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          width: 80mm;
          color: #000;
          background: #fff;
        }
        .ticket { padding: 8px; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .large { font-size: 16px; }
        .xlarge { font-size: 20px; }
        hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
        .row { display: flex; justify-content: space-between; padding: 2px 0; }
        .total-row { font-size: 14px; font-weight: bold; }
        .footer { text-align: center; margin-top: 8px; font-size: 11px; }
        @media print {
          body { width: 80mm; }
          @page { margin: 0; size: 80mm auto; }
        }
      </style>
      </head><body><div class="ticket">${content}</div>
      <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }<\/script>
      </body></html>
    `);
    printWin.document.close();
  };

  const handlePDF = () => {
    handlePrint(); // Le dialogue d'impression système permet de sauvegarder en PDF
  };

  const handleDownloadText = () => {
    const lines = [
      '================================',
      `      ${STORE_INFO.name}`,
      `  ${STORE_INFO.address}`,
      `  Tel: ${STORE_INFO.phone}`,
      '================================',
      `Facture N° : ${invoice.number}`,
      `Date       : ${formatDate(invoice.created_at)}`,
      `Client     : ${invoice.client_name}`,
      '--------------------------------',
      ...items.map(it =>
        `${it.product_name}`.padEnd(18).slice(0,18) +
        `${it.quantity}x`.padStart(4) +
        `${formatFCFA(it.unit_price)}`.padStart(14)
      ),
      '--------------------------------',
      `TOTAL      : ${formatFCFA(total)}`.padStart(32),
      paidAmount !== null ? `Payé       : ${formatFCFA(paidAmount)}`.padStart(32) : '',
      monnaie !== null ? `Monnaie    : ${formatFCFA(monnaie)}`.padStart(32) : '',
      '================================',
      `   ${STORE_INFO.footer}`,
      '================================',
    ].filter(Boolean).join('\n');

    const blob = new Blob([lines], { type: 'text/plain; charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `ticket_${invoice.number}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
      zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#141827', border: '1px solid #252a3a', borderRadius: 14,
        padding: 24, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ color: '#eaedf3', margin: 0 }}>Aperçu du ticket</h3>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'#7a8094',fontSize:22,cursor:'pointer' }}>×</button>
        </div>

        {/* Prévisualisation du ticket */}
        <div ref={printRef} style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 13,
          background: '#fff',
          color: '#000',
          padding: '16px 12px',
          borderRadius: 8,
          maxWidth: 300,
          margin: '0 auto',
          lineHeight: 1.6,
        }}>
          {/* En-tête */}
          <div style={{ textAlign:'center', marginBottom:8 }}>
            <div style={{ fontSize:18, fontWeight:'bold' }}>{STORE_INFO.name}</div>
            <div style={{ fontSize:11 }}>{STORE_INFO.address}</div>
            <div style={{ fontSize:11 }}>{STORE_INFO.phone}</div>
          </div>

          <hr style={{ borderTop:'1px dashed #000', margin:'8px 0' }} />

          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
            <span><b>N° :</b> {invoice.number}</span>
            <span>{formatDate(invoice.created_at)}</span>
          </div>
          <div style={{ fontSize:11 }}><b>Client :</b> {invoice.client_name || '—'}</div>
          <div style={{ fontSize:11 }}><b>Mode :</b> {invoice.payment_method || 'Espèces'}</div>

          <hr style={{ borderTop:'1px dashed #000', margin:'8px 0' }} />

          {/* Articles */}
          <div style={{ fontSize:11 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontWeight:'bold', marginBottom:4 }}>
              <span>Article</span><span>Qté</span><span>Montant</span>
            </div>
            {items.map((it, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                <span style={{ flex:1, fontSize:10 }}>{it.product_name?.slice(0,18) || '?'}</span>
                <span style={{ minWidth:24, textAlign:'center' }}>×{it.quantity}</span>
                <span style={{ minWidth:70, textAlign:'right' }}>{formatFCFA(it.total)}</span>
              </div>
            ))}
          </div>

          <hr style={{ borderTop:'1px dashed #000', margin:'8px 0' }} />

          {/* Totaux */}
          <div style={{ display:'flex', justifyContent:'space-between', fontWeight:'bold', fontSize:14 }}>
            <span>TOTAL</span>
            <span>{formatFCFA(total)}</span>
          </div>
          {paidAmount !== null && (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginTop:2 }}>
                <span>Payé</span><span>{formatFCFA(paidAmount)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#e55' }}>
                <span>Monnaie</span><span>{formatFCFA(monnaie)}</span>
              </div>
            </>
          )}

          <hr style={{ borderTop:'1px dashed #000', margin:'8px 0' }} />
          <div style={{ textAlign:'center', fontSize:11 }}>{STORE_INFO.footer}</div>
          <div style={{ textAlign:'center', fontSize:10, marginTop:4, color:'#888' }}>
            Powered by KENPRO STORE v6
          </div>
        </div>

        {/* Boutons d'action */}
        <div style={{ display:'flex', gap:10, marginTop:20, flexWrap:'wrap' }}>
          <button onClick={handlePrint} style={{
            flex:1, padding:'12px', background:'#d4a12e', border:'none',
            borderRadius:8, color:'#000', fontWeight:700, cursor:'pointer', fontSize:13,
          }}>
            🖨️ Imprimer
          </button>
          <button onClick={handlePDF} style={{
            flex:1, padding:'12px', background:'#5b9cf6', border:'none',
            borderRadius:8, color:'#fff', fontWeight:600, cursor:'pointer', fontSize:13,
          }}>
            📄 Télécharger PDF
          </button>
          <button onClick={handleDownloadText} style={{
            flex:1, padding:'12px', background:'#252a3a', border:'1px solid #333',
            borderRadius:8, color:'#eaedf3', cursor:'pointer', fontSize:13,
          }}>
            📝 Texte (.txt)
          </button>
        </div>
      </div>
    </div>
  );
}

// Impression directe (sans modal)
export function printInvoice(invoice, paidAmount = null) {
  // Crée un iframe caché pour l'impression
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none';
  document.body.appendChild(iframe);

  const items   = invoice.items || [];
  const total   = invoice.total || 0;
  const monnaie = paidAmount !== null ? Math.max(0, paidAmount - total) : null;

  iframe.contentDocument.write(`
    <!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <style>
      body { font-family: 'Courier New',monospace; font-size:12px; width:80mm; }
      .center { text-align:center; }
      hr { border:none; border-top:1px dashed #000; margin:4px 0; }
      .row { display:flex; justify-content:space-between; }
      @media print { @page { margin:0; size:80mm auto; } }
    </style>
    </head><body>
    <div class="center"><b>KENPRO STORE</b></div>
    <hr>
    <div class="row"><span>N° ${invoice.number}</span><span>${new Date().toLocaleDateString('fr-FR')}</span></div>
    <div>Client: ${invoice.client_name || '—'}</div>
    <hr>
    ${items.map(it => `<div class="row"><span>${(it.product_name||'').slice(0,18)} ×${it.quantity}</span><span>${formatFCFA(it.total)}</span></div>`).join('')}
    <hr>
    <div class="row"><b>TOTAL</b><b>${formatFCFA(total)}</b></div>
    ${monnaie !== null ? `<div class="row"><span>Monnaie</span><span>${formatFCFA(monnaie)}</span></div>` : ''}
    <hr>
    <div class="center">Merci pour votre confiance !</div>
    <script>window.onload=()=>{window.print();setTimeout(()=>document.body.parentElement.parentElement.remove(),500)}<\/script>
    </body></html>
  `);
  iframe.contentDocument.close();
}
