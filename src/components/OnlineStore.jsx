// ============================================================
// KENPRO STORE Admin — Gestion boutique en ligne
// Deux onglets : Produits (publication) + Commandes
// ============================================================
import { useState, useEffect } from 'react';
import { publicStoreAPI } from '../api';

const fmt = n => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';

const ORDER_STATUS = {
  nouveau:  { label: 'Nouveau',   color: '#5b9cf6' },
  contacte: { label: 'Contacté',  color: '#f0923c' },
  confirme: { label: 'Confirmé',  color: '#2dd4a0' },
  livre:    { label: 'Livré',     color: '#7a8094' },
  annule:   { label: 'Annulé',    color: '#ef6461' },
};

// ── Onglet Produits ───────────────────────────────────────────
function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [stats,    setStats]    = useState({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState({});
  const [search,   setSearch]   = useState('');

  const load = () => {
    publicStoreAPI.getAdminProducts()
      .then(r => { setProducts(r.data.products || []); setStats({ total: r.data.total, published: r.data.published }); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const toggle = async (product, field) => {
    setSaving(s => ({ ...s, [product.id]: true }));
    try {
      await publicStoreAPI.updateProduct(product.id, { [field]: !product[field] });
      setProducts(ps => ps.map(p => p.id === product.id ? { ...p, [field]: !p[field] } : p));
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
    setSaving(s => ({ ...s, [product.id]: false }));
  };

  const setDiscount = async (product, val) => {
    const discount = Math.max(0, Math.min(100, parseInt(val, 10) || 0));
    try {
      await publicStoreAPI.updateProduct(product.id, { discount_percent: discount });
      setProducts(ps => ps.map(p => p.id === product.id ? { ...p, discount_percent: discount } : p));
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
  };

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading">Chargement…</div>;

  return (
    <div>
      {/* Stats */}
      <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        {[
          { label:'Total produits', value: stats.total || 0, color:'#eaedf3' },
          { label:'Publiés',        value: stats.published || 0, color:'#2dd4a0' },
          { label:'Non publiés',    value: (stats.total||0) - (stats.published||0), color:'#7a8094' },
        ].map(s => (
          <div key={s.label} style={{ background:'#1b1f30', border:'1px solid #252a3a', borderRadius:10, padding:'10px 16px', minWidth:120 }}>
            <div style={{ fontSize:11, color:'#7a8094', marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:22, fontWeight:700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Recherche */}
      <input
        type="text" placeholder="🔍 Filtrer les produits…" value={search}
        onChange={e => setSearch(e.target.value)}
        className="search-input" style={{ marginBottom:12 }}
      />

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Prix</th>
              <th style={{ textAlign:'center' }}>Publié</th>
              <th style={{ textAlign:'center' }}>Vedette</th>
              <th style={{ textAlign:'center' }}>Remise %</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} style={{ opacity: saving[p.id] ? 0.6 : 1 }}>
                <td>
                  <div className="bold" style={{ fontSize:13 }}>{p.name}</div>
                  {p.category && <div className="muted" style={{ fontSize:11 }}>{p.category}</div>}
                </td>
                <td className="gold bold">{fmt(p.price)}</td>
                <td style={{ textAlign:'center' }}>
                  <label style={{ cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 }}>
                    <input type="checkbox" checked={!!p.is_published}
                           onChange={() => toggle(p, 'is_published')}
                           style={{ accentColor:'#2dd4a0', width:16, height:16 }} />
                    <span style={{ fontSize:12, color: p.is_published ? '#2dd4a0' : '#7a8094' }}>
                      {p.is_published ? 'Oui' : 'Non'}
                    </span>
                  </label>
                </td>
                <td style={{ textAlign:'center' }}>
                  <label style={{ cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 }}>
                    <input type="checkbox" checked={!!p.is_featured}
                           onChange={() => toggle(p, 'is_featured')}
                           style={{ accentColor:'#d4a12e', width:16, height:16 }} />
                    <span style={{ fontSize:12, color: p.is_featured ? '#d4a12e' : '#7a8094' }}>
                      {p.is_featured ? '⭐' : '—'}
                    </span>
                  </label>
                </td>
                <td style={{ textAlign:'center' }}>
                  <input type="number" min="0" max="100"
                         defaultValue={p.discount_percent || 0}
                         onBlur={e => setDiscount(p, e.target.value)}
                         style={{ width:60, background:'#141827', border:'1px solid #252a3a',
                                  borderRadius:6, padding:'4px 6px', color:'#eaedf3',
                                  textAlign:'center', fontSize:12 }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ color:'#7a8094', fontSize:12, marginTop:8 }}>
        💡 Un produit doit être "Publié" pour apparaître dans la boutique publique (localhost:5174).
      </p>
    </div>
  );
}

// ── Onglet Commandes ──────────────────────────────────────────
function OrdersTab() {
  const [orders,  setOrders]  = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('');
  const [detail,  setDetail]  = useState(null);

  const load = () => {
    setLoading(true);
    publicStoreAPI.getOrders(filter ? { status: filter } : {})
      .then(r => { setOrders(r.data.orders || []); setTotal(r.data.total || 0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filter]);

  const changeStatus = async (order, newStatus) => {
    try {
      await publicStoreAPI.updateOrderStatus(order.id, { status: newStatus });
      load();
      if (detail?.id === order.id) setDetail({ ...detail, status: newStatus });
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
  };

  const openWhatsApp = (order) => {
    if (!order.customer_phone) return;
    const phone = order.customer_phone.replace(/\D/g,'');
    const msg = `Bonjour ${order.customer_name},\n\nVotre commande *${order.order_number}* (${fmt(order.total_amount)}) est en cours de traitement.\nNous vous contactons pour confirmer la livraison.\n\nMerci !`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) return <div className="loading">Chargement…</div>;

  return (
    <div style={{ display:'flex', gap:16 }}>
      {/* Liste */}
      <div style={{ flex:1 }}>
        {/* Filtres statut */}
        <div className="filter-bar" style={{ marginBottom:12 }}>
          <button className={`btn-filter ${!filter ? 'active' : ''}`} onClick={() => setFilter('')}>Tout ({total})</button>
          {Object.entries(ORDER_STATUS).map(([k, v]) => (
            <button key={k} className={`btn-filter ${filter===k ? 'active' : ''}`}
                    onClick={() => setFilter(k)} style={{ color: filter===k ? v.color : undefined }}>
              {v.label}
            </button>
          ))}
        </div>

        {orders.length === 0 ? (
          <div style={{ textAlign:'center', padding:40, color:'#7a8094' }}>
            Aucune commande {filter ? `avec le statut "${ORDER_STATUS[filter]?.label}"` : ''}
          </div>
        ) : (
          <div className="cards-list">
            {orders.map(o => {
              const st = ORDER_STATUS[o.status] || { label: o.status, color: '#7a8094' };
              return (
                <div key={o.id} className="list-card" style={{ flexDirection:'column', gap:8, cursor:'pointer' }}
                     onClick={() => setDetail(o)}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                        <span className="gold bold">{o.order_number}</span>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20,
                                       background: st.color + '22', color: st.color }}>
                          {st.label}
                        </span>
                      </div>
                      <div style={{ fontSize:13 }}>👤 {o.customer_name} — 📱 {o.customer_phone}</div>
                      {o.customer_city && <div className="muted small">📍 {o.customer_city}</div>}
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div className="gold bold">{fmt(o.total_amount)}</div>
                      <div className="muted small">{(o.items || []).length} article{(o.items||[]).length>1?'s':''}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    <button className="btn-small btn-secondary"
                            onClick={e => { e.stopPropagation(); openWhatsApp(o); }}>
                      📱 WhatsApp
                    </button>
                    {o.status === 'nouveau' && (
                      <button className="btn-small btn-primary"
                              onClick={e => { e.stopPropagation(); changeStatus(o, 'contacte'); }}>
                        Marquer contacté
                      </button>
                    )}
                    {o.status === 'contacte' && (
                      <button className="btn-small btn-primary"
                              onClick={e => { e.stopPropagation(); changeStatus(o, 'confirme'); }}>
                        Confirmer
                      </button>
                    )}
                    {o.status === 'confirme' && (
                      <button className="btn-small btn-primary"
                              onClick={e => { e.stopPropagation(); changeStatus(o, 'livre'); }}>
                        ✅ Livré
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Détail commande */}
      {detail && (
        <div style={{ width:280, flexShrink:0 }}>
          <div className="form-card" style={{ position:'sticky', top:80 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
              <span className="bold">{detail.order_number}</span>
              <button onClick={() => setDetail(null)} style={{ background:'none', border:'none', color:'#7a8094', cursor:'pointer', fontSize:18 }}>×</button>
            </div>
            <div style={{ fontSize:12, color:'#7a8094', marginBottom:8 }}>CLIENT</div>
            <div style={{ marginBottom:12, fontSize:13 }}>
              <div className="bold">{detail.customer_name}</div>
              <div className="muted">{detail.customer_phone}</div>
              {detail.customer_email && <div className="muted">{detail.customer_email}</div>}
              {detail.customer_city && <div className="muted">📍 {detail.customer_city}</div>}
              {detail.customer_address && <div className="muted">{detail.customer_address}</div>}
            </div>
            <div style={{ fontSize:12, color:'#7a8094', marginBottom:8 }}>ARTICLES</div>
            {(detail.items || []).map((it, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                <span>{it.product_name} ×{it.quantity}</span>
                <span className="gold">{fmt(it.total)}</span>
              </div>
            ))}
            <div style={{ borderTop:'1px solid #252a3a', marginTop:8, paddingTop:8, display:'flex', justifyContent:'space-between' }}>
              <span className="bold">Total</span>
              <span className="gold bold">{fmt(detail.total_amount)}</span>
            </div>
            {detail.notes_customer && (
              <div style={{ marginTop:10, fontSize:12, color:'#7a8094' }}>
                <div style={{ marginBottom:4 }}>Notes client :</div>
                <div style={{ color:'#eaedf3' }}>{detail.notes_customer}</div>
              </div>
            )}
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:12, color:'#7a8094', marginBottom:6 }}>Changer statut :</div>
              <select onChange={e => changeStatus(detail, e.target.value)}
                      defaultValue={detail.status}
                      style={{ width:'100%', background:'#141827', border:'1px solid #252a3a',
                               borderRadius:8, padding:'8px 10px', color:'#eaedf3', fontSize:12 }}>
                {Object.entries(ORDER_STATUS).map(([k,v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <button onClick={() => openWhatsApp(detail)}
                    style={{ marginTop:10, width:'100%', background:'#1c3b2a', border:'1px solid #2dd4a0',
                             color:'#2dd4a0', borderRadius:8, padding:'8px 0', cursor:'pointer', fontSize:12 }}>
              📱 Contacter sur WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────
export default function OnlineStore() {
  const [tab, setTab] = useState('products');
  return (
    <div>
      <div className="page-header">
        <h2>🛒 Boutique en ligne</h2>
        <a href="http://localhost:5174" target="_blank" rel="noopener noreferrer"
           style={{ background:'#252a3a', color:'#eaedf3', border:'none', borderRadius:8,
                    padding:'8px 14px', cursor:'pointer', fontSize:13, textDecoration:'none' }}>
          👁️ Voir la boutique →
        </a>
      </div>

      {/* Onglets */}
      <div className="filter-bar" style={{ marginBottom:16 }}>
        <button className={`btn-filter ${tab==='products' ? 'active' : ''}`} onClick={() => setTab('products')}>
          📦 Publication produits
        </button>
        <button className={`btn-filter ${tab==='orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>
          📋 Commandes en ligne
        </button>
      </div>

      {tab === 'products' ? <ProductsTab /> : <OrdersTab />}
    </div>
  );
}
