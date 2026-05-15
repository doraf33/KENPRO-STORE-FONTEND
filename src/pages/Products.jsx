import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { productsAPI } from '../api';
import { BarcodeScanner, BarcodeDisplay } from '../BarcodeScanner';
import LabelPrinter from '../components/LabelPrinter';
import ProductStorePanel from '../components/ProductStorePanel';
import RepairLabelPrinter from '../components/RepairLabelPrinter';
import { useToast } from '../context/AppContext';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';

function Products() {
  const { t } = useTranslation(['products', 'common']);
  const [products, setProducts]     = useState([]);
  const [search, setSearch]         = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState(null);
  const [form, setForm]             = useState({ name: '', category: '', price: '', cost_price: '', quantity: '', min_stock: '5', barcode: '' });
  const [loading, setLoading]       = useState(true);
  const [showScanner,   setShowScanner]  = useState(false);
  const [labelProduct,  setLabelProduct] = useState(null);
  const [storeProduct,  setStoreProduct] = useState(null);  // pour ProductStorePanel
  const [scanResult,    setScanResult]   = useState(null);
  const { show: showToast } = useToast();

  const load = async () => {
    try { const res = await productsAPI.getAll({ search }); setProducts(res.data.products); } catch (err) { console.error(err); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [search]);

  const resetForm = () => {
    setForm({ name: '', category: '', price: '', cost_price: '', quantity: '', min_stock: '5', barcode: '' });
    setEditId(null); setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    const data = { ...form, price: Number(form.price), cost_price: Number(form.cost_price || 0), quantity: Number(form.quantity || 0), min_stock: Number(form.min_stock || 5) };
    try {
      if (editId) { await productsAPI.update(editId, data); }
      else { await productsAPI.create(data); }
      resetForm(); load();
    } catch (err) { alert(err.response?.data?.error || err.response?.data?.detail || 'Erreur'); }
  };

  const handleEdit = (p) => {
    setForm({ name: p.name, category: p.category || '', price: String(p.price), cost_price: String(p.cost_price || ''), quantity: String(p.quantity), min_stock: String(p.min_stock || 5), barcode: p.barcode || '' });
    setEditId(p.id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm(t('products:delete_confirm'))) return;
    try { await productsAPI.delete(id); load(); } catch (err) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  // Scan → recherche produit par code-barres
  const handleBarcodeDetected = async (code) => {
    // caméra déjà libérée par BarcodeScanner avant cet appel
    setShowScanner(false);
    try {
      const res = await productsAPI.getByBarcode(code);
      setScanResult({ found: true, product: res.data.product });
      showToast('Produit trouvé', res.data.product.name, 'success');
    } catch {
      setScanResult({ found: false, code });
      // Pré-remplir le code dans le formulaire et ouvrir pour ajouter le produit
      setForm(f => ({ ...f, barcode: code }));
      setShowForm(true);
      showToast('Code inconnu', `Ajoutez ce produit (code: ${code})`, 'warning');
    }
  };

  if (loading) return <div className="loading">{t('common:loading')}</div>;

  return (
    <div>
      {/* Modales */}
      {showScanner  && <BarcodeScanner   onDetect={handleBarcodeDetected} onClose={() => setShowScanner(false)} title={t('products:scan')} />}
      {labelProduct && <LabelPrinter    product={labelProduct}  onClose={() => { setLabelProduct(null);  load(); }} />}
      {storeProduct && <ProductStorePanel product={storeProduct} onClose={() => { setStoreProduct(null); load(); }}
                          onSave={updated => setProducts(ps => ps.map(p => p.id === updated.id ? { ...p, ...updated } : p))} />}

      <div className="page-header">
        <h2>📦 {t('products:title')} ({products.length})</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => { setScanResult(null); setShowScanner(true); }}>📷 {t('products:scan')}</button>
          <button className="btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>+ {t('products:title')}</button>
        </div>
      </div>

      {/* Résultat scan */}
      {scanResult && (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 10,
          background: scanResult.found ? 'rgba(45,212,160,.1)' : 'rgba(240,146,60,.1)',
          border: `1px solid ${scanResult.found ? '#2dd4a0' : '#f0923c'}` }}>
          {scanResult.found ? (
            <div>
              <div style={{ fontWeight: 700, color: '#2dd4a0', marginBottom: 8 }}>
                ✅ Produit trouvé : {scanResult.product.name}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <BarcodeDisplay value={scanResult.product.barcode} height={45} />
                <div style={{ flex: 1, marginLeft: 12 }}>
                  <div style={{ color: '#d4a12e', fontWeight: 700 }}>{fmt(scanResult.product.price)}</div>
                  <div style={{ color: '#7a8094', fontSize: 13 }}>Stock : {scanResult.product.quantity}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                      onClick={() => handleEdit(scanResult.product)}>✏️ Modifier</button>
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                      onClick={() => setLabelProduct(scanResult.product)}>🏷️ Étiquette</button>
                    <button onClick={() => setScanResult(null)} style={{ background: 'none', border: 'none', color: '#7a8094', cursor: 'pointer', fontSize: 18 }}>×</button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 700, color: '#f0923c', marginBottom: 8 }}>
                ⚠️ Code inconnu : <code style={{ fontFamily: 'monospace' }}>{scanResult.code}</code>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" style={{ fontSize: 12 }}
                  onClick={() => {
                    const code = scanResult.code;
                    setScanResult(null);
                    setEditId(null);
                    setForm({ name: '', category: '', price: '', cost_price: '', quantity: '', min_stock: '5', barcode: code });
                    setShowForm(true);
                  }}>
                  + Créer ce produit
                </button>
                <button onClick={() => setScanResult(null)} style={{ ...{background:'#252a3a',color:'#eaedf3',border:'none',borderRadius:8,padding:'6px 12px',cursor:'pointer',fontSize:12} }}>
                  Ignorer
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <input type="text" placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="search-input" />

      {showForm && (
        <div className="form-card">
          <h3>{editId ? 'Modifier le produit' : 'Nouveau produit'}</h3>
          <div className="form-grid">
            <input placeholder="Nom *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input placeholder="Catégorie" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
            <input type="number" placeholder="Prix vente *" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            <input type="number" placeholder="Prix achat" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} />
            <input type="number" placeholder="Quantité" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
            <input type="number" placeholder="Stock min" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })} />
            <input placeholder="Code-barres (optionnel)" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })}
              style={{ gridColumn: 'span 2' }} />
          </div>
          <div className="form-actions">
            <button className="btn-primary" onClick={handleSave}>{editId ? 'Enregistrer' : 'Ajouter'}</button>
            <button className="btn-secondary" onClick={resetForm}>Annuler</button>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead><tr><th>{t('products:product_name')}</th><th>{t('common:category')}</th><th>{t('products:barcode')}</th><th>{t('common:price')}</th><th>{t('products:stock')}</th><th>{t('common:status')}</th><th></th></tr></thead>
          <tbody>{products.map(p => (
            <tr key={p.id}>
              <td className="bold">{p.name}</td>
              <td className="muted">{p.category || '—'}</td>
              <td>
                {p.barcode
                  ? <code style={{ fontSize: 11, color: '#7a8094', fontFamily: 'monospace' }}>{p.barcode}</code>
                  : <span style={{ color: '#3a3f52', fontSize: 11 }}>—</span>}
              </td>
              <td className="gold bold">{fmt(p.price)}</td>
              <td className={p.status === 'rupture' ? 'red bold' : p.status === 'bas' ? 'orange bold' : 'bold'}>{p.quantity}</td>
              <td><span className={`badge badge-${p.status}`}>{p.status === 'rupture' ? 'Rupture' : p.status === 'bas' ? 'Bas' : 'OK'}</span></td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-icon" onClick={() => handleEdit(p)}>✏️</button>
                  <button className="btn-icon" onClick={() => setStoreProduct(p)} title="Boutique en ligne">🛒</button>
                  <button className="btn-icon" onClick={() => setLabelProduct(p)} title="Imprimer étiquette">🏷️</button>
                  <button className="btn-icon red" onClick={() => handleDelete(p.id)}>🗑️</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// CLIENTS
// ============================================================

export default Products;
