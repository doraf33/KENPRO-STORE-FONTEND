import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { invoicesAPI, clientsAPI, productsAPI } from '../api';
import { BarcodeScanner } from '../BarcodeScanner';
import TicketPrinter from '../components/TicketPrinter';
import { useToast } from '../context/AppContext';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';

function Invoices() {
  const { t } = useTranslation(['invoices', 'common']);
  const [invoices, setInvoices]     = useState([]);
  const [stats, setStats]           = useState({});
  const [filter, setFilter]         = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [clients, setClients]       = useState([]);
  const [products, setProducts]     = useState([]);
  const [form, setForm]             = useState({ client_id: '', invoice_type: 'facture', status: 'en_attente', items: [{ product_id: '', quantity: 1, price: '' }], notes: '' });
  const [loading, setLoading]       = useState(true);
  const [showScanner, setShowScanner]         = useState(false);
  const [scanningItemIdx, setScanningItemIdx] = useState(null);
  const [ticketInvoice, setTicketInvoice]     = useState(null);  // facture pour TicketPrinter
  const quantityRefs = useRef({});
  const { show: showToast } = useToast();

  const load = async () => {
    try {
      const res = await invoicesAPI.getAll(filter ? { type: filter } : {});
      setInvoices(res.data.invoices); setStats(res.data.stats || {});
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadFormData = async () => {
    try {
      const [cRes, pRes] = await Promise.all([clientsAPI.getAll(), productsAPI.getAll()]);
      setClients(cRes.data.clients); setProducts(pRes.data.products);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { load(); }, [filter]);

  const openForm = () => { loadFormData(); setShowForm(true); };

  const addItem = () => setForm({ ...form, items: [...form.items, { product_id: '', quantity: 1, price: '' }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const updateItem = (i, field, val) => {
    const items = [...form.items];
    if (field === 'product_id') {
      const prod = products.find(p => p.id === Number(val));
      items[i] = { ...items[i], product_id: val, price: prod ? String(prod.price) : '' };
    } else {
      items[i] = { ...items[i], [field]: val };
    }
    setForm({ ...form, items });
  };

  // Scanner → ajouter/compléter une ligne de facture
  const handleInvoiceScan = async (code) => {
    setShowScanner(false);
    try {
      const res = await productsAPI.getByBarcode(code);
      const prod = res.data.product;
      const targetIdx = scanningItemIdx;
      setScanningItemIdx(null);
      setForm(prev => {
        const items = [...prev.items];
        if (targetIdx !== null && !items[targetIdx].product_id) {
          // Remplir la ligne vide ciblée
          items[targetIdx] = { product_id: String(prod.id), quantity: 1, price: String(prod.price) };
        } else {
          // Chercher si le produit est déjà dans la liste
          const existingIdx = items.findIndex(it => Number(it.product_id) === prod.id);
          if (existingIdx >= 0) {
            items[existingIdx] = { ...items[existingIdx], quantity: Number(items[existingIdx].quantity) + 1 };
          } else {
            items.push({ product_id: String(prod.id), quantity: 1, price: String(prod.price) });
          }
        }
        return { ...prev, items };
      });
      showToast('Produit ajouté', prod.name, 'success');
      // Focus quantité après ajout
      setTimeout(() => {
        const idx = scanningItemIdx !== null ? scanningItemIdx : form.items.length;
        quantityRefs.current[idx]?.focus();
      }, 100);
    } catch {
      showToast('Code-barres inconnu', code, 'error');
    }
  };

  const getTotal = () => form.items.reduce((s, it) => {
    const price = it.price ? Number(it.price) : 0;
    return s + price * Number(it.quantity || 1);
  }, 0);

  const handleCreate = async () => {
    if (!form.client_id || form.items.some(i => !i.product_id)) { alert('Selectionnez un client et des produits'); return; }
    try {
      await invoicesAPI.create({
        client_id: Number(form.client_id), invoice_type: form.invoice_type, status: form.status, notes: form.notes,
        items: form.items.map(i => ({ product_id: Number(i.product_id), quantity: Number(i.quantity), price: i.price ? Number(i.price) : undefined }))
      });
      setForm({ client_id: '', invoice_type: 'facture', status: 'en_attente', items: [{ product_id: '', quantity: 1, price: '' }], notes: '' });
      setShowForm(false); load();
    } catch (err) { alert(err?.response?.data?.detail || err?.response?.data?.error || 'Erreur'); }
  };

  const handlePay = async (id) => {
    try {
      await invoicesAPI.pay(id);
      await load();
      // Impression automatique du ticket après paiement
      const paid = (await invoicesAPI.getAll()).data.invoices.find(i => i.id === id);
      if (paid) setTicketInvoice(paid);
    } catch (err) { alert(err.response?.data?.error || err.response?.data?.detail || 'Erreur'); }
  };

  const handleConvert = async (id) => {
    try { await invoicesAPI.convert(id); load(); } catch (err) { alert(err?.response?.data?.detail || err?.response?.data?.error || 'Erreur'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ?')) return;
    try { await invoicesAPI.delete(id); load(); } catch (err) { alert(err?.response?.data?.detail || err?.response?.data?.error || 'Erreur'); }
  };

  const printInvoice = (inv) => {
    const itemsHtml = (inv.items || []).map(it => `<tr><td>${it.product_name}</td><td style="text-align:center">${it.quantity}</td><td style="text-align:right">${fmt(it.unit_price)}</td><td style="text-align:right">${fmt(it.total)}</td></tr>`).join('');
    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) { alert('Autorisez les popups'); return; }
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${inv.number}</title><style>
      *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;padding:30px;color:#1a1a1a;font-size:13px}
      .hdr{text-align:center;margin-bottom:24px;border-bottom:3px solid #d4a12e;padding-bottom:16px}.hdr img{width:70px;height:70px;border-radius:50%;margin-bottom:8px}.hdr h1{font-size:22px;color:#d4a12e;margin:0}
      table{width:100%;border-collapse:collapse;margin:16px 0}th{background:#f0f0f0;padding:10px 12px;text-align:left;font-size:12px;border-bottom:2px solid #ddd}td{padding:10px 12px;border-bottom:1px solid #eee}
      .tot{font-weight:700;font-size:16px;text-align:right;padding:16px 0;border-top:3px solid #d4a12e;margin-top:8px}
      .sig{margin-top:50px;display:flex;justify-content:space-between}.sig div{width:200px;text-align:center;border-top:1px solid #333;padding-top:8px;font-size:12px}
      .ft{margin-top:40px;text-align:center;color:#aaa;font-size:11px;border-top:1px solid #eee;padding-top:16px}
      @media print{body{padding:20px}}
    </style></head><body>
      <div class="hdr"><img src="${window.location.origin}/logo.png" alt="KENPRO"/><h1>KENPRO STORE</h1></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:20px">
        <div><strong style="font-size:18px">${inv.invoice_type === 'facture' ? 'FACTURE' : 'DEVIS'}</strong><br/><span style="color:#d4a12e;font-weight:700">${inv.number}</span></div>
        <div style="text-align:right"><strong>Date:</strong> ${inv.created_at}<br/><strong>Statut:</strong> ${inv.status === 'payee' ? '✅ Payee' : '⏳ En attente'}</div>
      </div>
      <div style="background:#f8f8f8;padding:12px;border-radius:6px;margin-bottom:16px"><strong>Client:</strong> 👤 ${inv.client_name} ${inv.client_phone ? '📱 ' + inv.client_phone : ''}</div>
      <table><thead><tr><th>Produit</th><th style="text-align:center">Qte</th><th style="text-align:right">Prix unit.</th><th style="text-align:right">Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>
      <div class="tot">TOTAL: ${fmt(inv.total)}</div>
      <div class="sig"><div>Le vendeur</div><div>Le client</div></div>
      <div class="ft">KENPRO STORE — Document genere le ${new Date().toLocaleDateString('fr-FR')}</div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const sendWhatsApp = (inv) => {
    if (!inv.client_phone) { alert('Ce client n\'a pas de numero de telephone'); return; }
    const phone = inv.client_phone.replace(/\D/g, '');
    const msg = `Bonjour ${inv.client_name},\nVoici votre ${inv.invoice_type} N°${inv.number} de KENPRO STORE.\nMontant: ${fmt(inv.total)}\nMerci pour votre confiance !`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) return <div className="loading">{t('common:loading')}</div>;

  return (
    <div>
      {/* Modales */}
      {showScanner && (
        <BarcodeScanner
          onDetect={handleInvoiceScan}
          onClose={() => { setShowScanner(false); setScanningItemIdx(null); }}
          title={t('products:scan')}
        />
      )}
      {ticketInvoice && (
        <TicketPrinter invoice={ticketInvoice} onClose={() => setTicketInvoice(null)} />
      )}

      <div className="page-header"><h2>🧾 Factures / Devis ({invoices.length})</h2><button className="btn-primary" onClick={openForm}>+ Facture</button></div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card"><span className="stat-icon">🧾</span><span className="stat-label">Factures</span><span className="stat-value blue">{stats.nb_factures || 0}</span></div>
        <div className="stat-card"><span className="stat-icon">📋</span><span className="stat-label">Devis</span><span className="stat-value purple">{stats.nb_devis || 0}</span></div>
        <div className="stat-card"><span className="stat-icon">💰</span><span className="stat-label">Factures payées</span><span className="stat-value green">{fmt(stats.total_factures_payees)}</span></div>
      </div>

      <div className="filter-bar">
        <button className={`btn-filter ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>Tout</button>
        <button className={`btn-filter ${filter === 'facture' ? 'active' : ''}`} onClick={() => setFilter('facture')}>Factures</button>
        <button className={`btn-filter ${filter === 'devis' ? 'active' : ''}`} onClick={() => setFilter('devis')}>Devis</button>
      </div>

      {showForm && (
        <div className="form-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>{t('invoices:new_invoice')} / {t('invoices:new_quote')}</h3>
            <button
              className="btn-secondary"
              style={{ fontSize: 13, padding: '7px 14px' }}
              onClick={() => { setScanningItemIdx(null); setShowScanner(true); }}
            >
              📷 Scanner produit
            </button>
          </div>
          <div className="form-grid">
            <select value={form.invoice_type} onChange={e => setForm({ ...form, invoice_type: e.target.value })}>
              <option value="facture">{t('invoices:facture')}</option><option value="devis">{t('invoices:devis')}</option>
            </select>
            <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
              <option value="">— Choisir un client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
            </select>
            {form.invoice_type === 'facture' && (
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="en_attente">{t('invoices:pending')}</option><option value="payee">{t('invoices:paid')}</option>
              </select>
            )}
          </div>
          <div className="muted small" style={{ marginBottom: 8, marginTop: 8 }}>Articles :</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <span style={{ flex: 2, fontSize: 11, color: '#7a8094' }}>Produit</span>
            <span style={{ flex: 0.7, fontSize: 11, color: '#7a8094', textAlign: 'center' }}>Prix</span>
            <span style={{ flex: 0.5, fontSize: 11, color: '#7a8094', textAlign: 'center' }}>Qté</span>
            <span style={{ width: 60 }}></span>
          </div>
          {form.items.map((it, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <select value={it.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)} style={{ flex: 2 }}>
                <option value="">— Produit —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({fmt(p.price)})</option>)}
              </select>
              <input type="number" value={it.price} placeholder="Prix" onChange={e => updateItem(i, 'price', e.target.value)} style={{ flex: 0.7, textAlign: 'center' }} />
              <input
                type="number" value={it.quantity} min={1}
                ref={el => quantityRefs.current[i] = el}
                onChange={e => updateItem(i, 'quantity', e.target.value)}
                style={{ flex: 0.5, textAlign: 'center' }}
              />
              <button
                onClick={() => { setScanningItemIdx(i); setShowScanner(true); }}
                title="Scanner un produit pour cette ligne"
                style={{ background: 'none', border: '1px solid #252a3a', borderRadius: 6, color: '#d4a12e', cursor: 'pointer', fontSize: 16, padding: '4px 8px' }}
              >📷</button>
              {form.items.length > 1 && <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: '#ef6461', cursor: 'pointer', fontSize: 16 }}>✕</button>}
            </div>
          ))}
          <button className="btn-secondary btn-small" onClick={addItem} style={{ marginBottom: 12 }}>+ Article</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderTop: '1px solid #252a3a' }}>
            <span className="muted bold">Total</span><span className="gold bold" style={{ fontSize: 18 }}>{fmt(getTotal())}</span>
          </div>
          <div className="form-actions">
            <button className="btn-primary" onClick={handleCreate}>Créer</button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
          </div>
        </div>
      )}

      <div className="cards-list">{invoices.map(inv => (
        <div key={inv.id} className="list-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span className="gold bold">{inv.number}</span>
                <span className={`badge ${inv.invoice_type === 'facture' ? 'badge-recu' : 'badge-diagnostic'}`}>{inv.invoice_type === 'facture' ? 'Facture' : 'Devis'}</span>
                <span className={`badge ${inv.status === 'payee' ? 'badge-ok' : inv.status === 'converti' ? 'badge-livre' : 'badge-bas'}`}>
                  {inv.status === 'payee' ? 'Payee' : inv.status === 'converti' ? 'Converti' : 'En attente'}
                </span>
              </div>
              <div>👤 {inv.client_name} — {inv.created_at}</div>
            </div>
            <span className="gold bold" style={{ fontSize: 18 }}>{fmt(inv.total)}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn-small btn-secondary" onClick={() => setTicketInvoice(inv)} title="Ticket caisse">🧾 Ticket</button>
            <button className="btn-small btn-secondary" onClick={() => printInvoice(inv)} title="Facture complète">🖨️ Facture</button>
            <button className="btn-small btn-secondary" style={{ background: '#1c3b2a', color: '#2dd4a0', border: '1px solid #2dd4a0' }} onClick={() => sendWhatsApp(inv)}>📱 WhatsApp</button>
            {inv.status === 'en_attente' && inv.invoice_type === 'facture' && <button className="btn-small btn-primary" onClick={() => handlePay(inv.id)}>✅ Payer</button>}
            {inv.invoice_type === 'devis' && inv.status !== 'converti' && <button className="btn-small btn-primary" onClick={() => handleConvert(inv.id)}>→ Convertir en facture</button>}
            {inv.status !== 'payee' && <button className="btn-icon red" onClick={() => handleDelete(inv.id)}>🗑️</button>}
          </div>
          <div className="muted small">
            {inv.items?.map((it, i) => <span key={i}>{it.product_name} x{it.quantity} ({fmt(it.unit_price)}) {i < inv.items.length - 1 ? ' | ' : ''}</span>)}
          </div>
        </div>
      ))}</div>
    </div>
  );
}

// ============================================================
// REPARATIONS
// ============================================================

export default Invoices;
