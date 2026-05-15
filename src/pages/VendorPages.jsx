import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { vendorAPI, dashboardAPI } from '../api';
import { useToast } from '../context/AppContext';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';

function VendorDashboard() {
  const { t } = useTranslation(['dashboard', 'common']);
  const [data, setData]     = useState(null);
  const [myMod, setMyMod]   = useState(null);
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();

  const load = async () => {
    try {
      const [dRes, mRes] = await Promise.all([vendorAPI.getDashboard(), modulesAPI.myModule()]);
      setData(dRes.data);
      setMyMod(mRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); const id = setInterval(load, 60000); return () => clearInterval(id); }, []);

  if (loading) return <div className="loading">{t('common:loading')}</div>;
  if (!data) return <div>Erreur de chargement.</div>;

  const pct     = data.today?.progress_pct || 0;
  const target  = myMod?.daily_target || 0;
  const gridColor = isDark ? '#252a3a' : '#e2e8f0';
  const axisColor = isDark ? '#7a8094' : '#94a3b8';
  const tipStyle  = { background: isDark ? '#1b1f30' : '#fff', border: `1px solid ${gridColor}`, borderRadius: 10, fontSize: 12 };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h2>🛒 Mon tableau de bord vendeur</h2>
        <span style={{ fontSize: 13, color: '#7a8094' }}>
          {data.today?.report_submitted
            ? `Rapport soumis ✓ (${data.today.report_status})`
            : '⚠ Rapport non soumis aujourd\'hui'}
        </span>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-icon">💰</span></div>
          <div className="kpi-value gold">{Number(data.today?.total || 0).toLocaleString('fr-FR')} FCFA</div>
          <div className="kpi-label">Ventes du jour</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-icon">🎯</span></div>
          <div className="kpi-value blue">{Number(target).toLocaleString('fr-FR')} FCFA</div>
          <div className="kpi-label">Objectif journalier</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-icon">📈</span></div>
          <div className={`kpi-value ${pct >= 100 ? 'green' : pct >= 50 ? 'gold' : 'orange'}`}>{pct.toFixed(1)} %</div>
          <div className="kpi-label">Progression</div>
          <div style={{ marginTop: 8, height: 6, background: '#252a3a', borderRadius: 3 }}>
            <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? '#2dd4a0' : '#d4a12e', borderRadius: 3, transition: 'width .5s' }} />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-icon">📅</span></div>
          <div className="kpi-value purple">{Number(data.week_total || 0).toLocaleString('fr-FR')} FCFA</div>
          <div className="kpi-label">Total semaine</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-icon">🗓️</span></div>
          <div className="kpi-value blue">{Number(data.month_total || 0).toLocaleString('fr-FR')} FCFA</div>
          <div className="kpi-label">Total mois</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-icon">✅</span></div>
          <div className="kpi-value green">{data.validated || 0} / {data.total_reports || 0}</div>
          <div className="kpi-label">Rapports validés</div>
        </div>
      </div>

      <div className="chart-card chart-full" style={{ marginTop: 20 }}>
        <h3>📊 Mes ventes — 30 derniers jours</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.chart || []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => v.slice(5)} />
            <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} width={45}
              tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <Tooltip contentStyle={tipStyle} formatter={v => [Number(v).toLocaleString('fr-FR') + ' FCFA', 'Ventes']} />
            <Bar dataKey="total" fill="#d4a12e" radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {(data.top_products || []).length > 0 && (
        <div className="analytics-card" style={{ marginTop: 16 }}>
          <h3>🏆 Mes meilleurs produits</h3>
          <div className="top-list">
            {data.top_products.slice(0, 5).map((p, i) => (
              <div key={i} className="top-item">
                <span className={`top-rank rank-${i+1}`}>#{i+1}</span>
                <div className="top-info">
                  <div className="top-row">
                    <span className="top-name">{p.name}</span>
                    <span className="top-rev gold">{Number(p.total).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div className="top-meta"><span className="muted">{p.qty} vendu(s)</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// FORMULAIRE RAPPORT JOURNALIER VENDEUR
// ============================================================

function VendorReportForm({ onSubmitted }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    report_date: today,
    payment_method: 'especes',
    customers_count: '',
    observations: '',
  });
  const [items, setItems]   = useState([{ product_name: '', quantity: '', unit_price: '' }]);
  const [products, setProducts] = useState([]);
  const [submitted, setSubmitted] = useState(null);
  const [loading, setLoading]  = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const r = await vendorAPI.checkToday();
        if (r.data.submitted) setSubmitted(r.data);
      } catch {}
      setChecking(false);
    };
    check();
    productsAPI.getAll({}).then(r => setProducts(r.data.products || [])).catch(() => {});
  }, []);

  const addItem  = () => setItems(p => [...p, { product_name: '', quantity: '', unit_price: '' }]);
  const rmItem   = (i) => setItems(p => p.filter((_, j) => j !== i));
  const setItem  = (i, field, val) => setItems(p => p.map((it, j) => j === i ? { ...it, [field]: val } : it));

  const total = items.reduce((s, it) => s + (Number(it.quantity) * Number(it.unit_price) || 0), 0);

  const handleSubmit = async () => {
    const validItems = items.filter(it => it.product_name && Number(it.quantity) > 0);
    if (!validItems.length) { alert('Ajoutez au moins un produit vendu.'); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        customers_count: Number(form.customers_count) || 0,
        items: validItems.map(it => {
          const prod = products.find(p => p.name === it.product_name);
          return {
            product_id: prod?.id, product_name: it.product_name,
            quantity: Number(it.quantity), unit_price: Number(it.unit_price),
            total: Number(it.quantity) * Number(it.unit_price),
          };
        }),
      };
      await vendorAPI.submitReport(payload);
      if (onSubmitted) onSubmitted();
      setSubmitted({ submitted: true, total, status: 'soumis' });
    } catch (e) { alert(e?.response?.data?.detail || e?.response?.data?.error || 'Erreur lors de la soumission'); }
    setLoading(false);
  };

  if (checking) return <div className="loading">Vérification...</div>;

  if (submitted) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 60, marginBottom: 12 }}>✅</div>
      <h2 style={{ color: '#2dd4a0', marginBottom: 8 }}>Rapport soumis !</h2>
      <p style={{ color: '#7a8094' }}>
        Total : {Number(submitted.total || 0).toLocaleString('fr-FR')} FCFA — Statut : {submitted.status}
      </p>
      <p style={{ color: '#7a8094', marginTop: 8 }}>L'admin examinera votre rapport prochainement.</p>
    </div>
  );

  return (
    <div>
      <div className="page-header"><h2>📝 Rapport journalier</h2></div>
      <div className="form-card" style={{ maxWidth: 700 }}>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={{ fontSize: 12, color: '#7a8094' }}>Date du rapport</label>
            <input type="date" value={form.report_date} onChange={e => setForm({ ...form, report_date: e.target.value })}
              max={today} className="form-input" style={{ marginTop: 4 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#7a8094' }}>Mode de paiement</label>
            <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}
              className="form-input" style={{ marginTop: 4 }}>
              <option value="especes">Espèces</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="mixte">Mixte</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#7a8094' }}>Nombre de clients servis</label>
            <input type="number" min="0" value={form.customers_count}
              onChange={e => setForm({ ...form, customers_count: e.target.value })}
              className="form-input" style={{ marginTop: 4 }} placeholder="0" />
          </div>
        </div>

        <h4 style={{ marginTop: 20, marginBottom: 10 }}>Produits vendus</h4>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}>
            <input list={`prods-${i}`} placeholder="Nom du produit *" value={it.product_name}
              onChange={e => setItem(i, 'product_name', e.target.value)} className="form-input" />
            <datalist id={`prods-${i}`}>
              {products.map(p => <option key={p.id} value={p.name} />)}
            </datalist>
            <input type="number" min="1" placeholder="Qté *" value={it.quantity}
              onChange={e => setItem(i, 'quantity', e.target.value)} className="form-input" />
            <input type="number" min="0" placeholder="Prix unit." value={it.unit_price}
              onChange={e => setItem(i, 'unit_price', e.target.value)} className="form-input" />
            <button onClick={() => rmItem(i)} style={{ background: 'rgba(239,100,97,.15)', color: '#ef6461', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '0 10px' }}>×</button>
          </div>
        ))}
        <button onClick={addItem} className="btn-secondary" style={{ marginTop: 4 }}>+ Ajouter un produit</button>

        <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(212,161,46,.08)', borderRadius: 8 }}>
          <span style={{ fontWeight: 600 }}>Total calculé : </span>
          <span style={{ color: '#d4a12e', fontWeight: 700, fontSize: 18 }}>{total.toLocaleString('fr-FR')} FCFA</span>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 12, color: '#7a8094' }}>Observations / remarques</label>
          <textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })}
            className="form-input" style={{ marginTop: 4, minHeight: 80, resize: 'vertical', width: '100%', fontFamily: 'inherit' }}
            placeholder="Problèmes rencontrés, produits manquants, remarques clients..." />
        </div>

        <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ marginTop: 16, width: '100%', padding: '13px' }}>
          {loading ? 'Envoi en cours...' : '📤 Soumettre le rapport'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// VUE ADMIN — RAPPORTS VENDEURS
// ============================================================

function AdminReports() {
  const [summary, setSummary]   = useState(null);
  const { t } = useTranslation(['common']);
  const [reports, setReports]   = useState([]);
  const [period, setPeriod]     = useState('month');
  const [selected, setSelected] = useState(null);
  const [comment, setComment]   = useState('');
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const { isDark } = useTheme();

  const load = async () => {
    try {
      const [sRes, rRes] = await Promise.all([
        adminReportsAPI.getSummary(period),
        adminReportsAPI.getAll({ limit: 50 }),
      ]);
      setSummary(sRes.data);
      setReports(rRes.data.reports || []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, [period]);

  const review = async (rid, status) => {
    try {
      await adminReportsAPI.review(rid, { status, comment });
      setSelected(null); setComment(''); load();
    } catch (e) { alert(e?.response?.data?.detail || e?.response?.data?.error || 'Erreur'); }
  };

  const exportCsv = async () => {
    try {
      const res = await adminReportsAPI.exportCsv({});
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href = url; a.download = 'rapports_vendeurs.csv';
      a.click(); URL.revokeObjectURL(url);
    } catch {}
  };

  const STATUS_COLOR = { soumis: '#5b9cf6', valide: '#2dd4a0', rejete: '#ef6461' };
  const gridColor = isDark ? '#252a3a' : '#e2e8f0';
  const axisColor = isDark ? '#7a8094' : '#94a3b8';
  const tipStyle  = { background: isDark ? '#1b1f30' : '#fff', border: `1px solid ${gridColor}`, borderRadius: 10, fontSize: 12 };

  if (loading) return <div className="loading">{t('common:loading')}</div>;

  return (
    <div>
      <div className="page-header">
        <h2>📋 Rapports vendeurs</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="period-tabs">
            {[['day','Auj.'],['week','Sem.'],['month','Mois'],['year','Année']].map(([k,l]) => (
              <button key={k} className={`period-tab${period === k ? ' active' : ''}`} onClick={() => setPeriod(k)}>{l}</button>
            ))}
          </div>
          <button className="btn-csv" onClick={exportCsv}>⬇ CSV</button>
        </div>
      </div>

      {(summary?.missing_today || []).length > 0 && (
        <div className="alert-banner">
          ⚠ {summary.missing_today.length} vendeur(s) n'ont pas soumis leur rapport aujourd'hui :
          {' '}{summary.missing_today.map(v => v.name).join(', ')}
        </div>
      )}

      <div className="period-tabs" style={{ marginBottom: 16 }}>
        {[['summary','Vue d\'ensemble'],['reports','Tous les rapports'],['chart','Graphique']].map(([k,l]) => (
          <button key={k} className={`period-tab${activeTab === k ? ' active' : ''}`} onClick={() => setActiveTab(k)}>{l}</button>
        ))}
      </div>

      {activeTab === 'summary' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {(summary?.vendors || []).map(v => (
            <div key={v.user_id} className="kpi-card">
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{v.name}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#d4a12e' }}>{Number(v.total_sales).toLocaleString('fr-FR')} FCFA</div>
              <div style={{ fontSize: 12, color: '#7a8094', marginTop: 4 }}>
                {v.nb_reports} rapport(s) sur {v.target_days} jours — {v.completion_pct}% complétion
              </div>
              <div style={{ height: 4, background: '#252a3a', borderRadius: 2, marginTop: 8 }}>
                <div style={{ height: '100%', width: `${Math.min(v.completion_pct, 100)}%`, background: '#5b9cf6', borderRadius: 2 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, fontSize: 12 }}>
                <span style={{ color: '#2dd4a0' }}>✓ {v.validated}</span>
                <span style={{ color: '#5b9cf6' }}>◎ {v.pending}</span>
                <span style={{ color: '#ef6461' }}>✗ {v.rejected}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'chart' && (
        <div className="chart-card chart-full">
          <h3>📊 Ventes globales — 30 jours</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={summary?.chart || []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} width={48} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip contentStyle={tipStyle} formatter={v => [Number(v).toLocaleString('fr-FR') + ' FCFA']} />
              <Bar dataKey="total" fill="#d4a12e" radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'reports' && (
        <div>
          {reports.map(r => (
            <div key={r.id} className="form-card" style={{ marginBottom: 10, padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <span style={{ fontWeight: 700 }}>{r.user_name}</span>
                  <span style={{ color: '#7a8094', fontSize: 13, marginLeft: 10 }}>{r.report_date}</span>
                  <span style={{ marginLeft: 10, fontSize: 20, fontWeight: 700, color: '#d4a12e' }}>
                    {Number(r.total_sales).toLocaleString('fr-FR')} FCFA
                  </span>
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#7a8094' }}>
                    {r.customers_count} client(s) · {r.payment_method}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: STATUS_COLOR[r.status] + '20', color: STATUS_COLOR[r.status] }}>
                    {r.status}
                  </span>
                  {r.status === 'soumis' && (
                    <button onClick={() => { setSelected(r); setComment(''); }} className="btn-primary" style={{ fontSize: 12, padding: '5px 12px' }}>
                      Examiner
                    </button>
                  )}
                </div>
              </div>
              {r.admin_comment && <p style={{ fontSize: 12, color: '#7a8094', marginTop: 6 }}>💬 {r.admin_comment}</p>}
            </div>
          ))}
          {reports.length === 0 && <p style={{ color: '#7a8094' }}>Aucun rapport.</p>}
        </div>
      )}

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="form-card" style={{ width: 480 }}>
            <h3>Rapport de {selected.user_name} — {selected.report_date}</h3>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#d4a12e', marginTop: 8 }}>{Number(selected.total_sales).toLocaleString('fr-FR')} FCFA</p>
            <p style={{ fontSize: 13, color: '#7a8094' }}>{selected.customers_count} client(s) · {selected.payment_method}</p>
            {selected.observations && <p style={{ marginTop: 8, fontSize: 13 }}>📝 {selected.observations}</p>}
            <div style={{ marginTop: 12, maxHeight: 140, overflowY: 'auto' }}>
              {(selected.items || []).map((it, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span>{it.product_name} × {it.quantity}</span>
                  <span style={{ color: '#d4a12e' }}>{Number(it.total || 0).toLocaleString('fr-FR')}</span>
                </div>
              ))}
            </div>
            <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Commentaire admin (optionnel)"
              className="form-input" style={{ marginTop: 14, minHeight: 70, width: '100%', fontFamily: 'inherit', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button className="btn-primary" style={{ flex: 1, background: '#2dd4a0' }} onClick={() => review(selected.id, 'valide')}>✓ Valider</button>
              <button className="btn-primary" style={{ flex: 1, background: '#ef6461' }} onClick={() => review(selected.id, 'rejete')}>✗ Rejeter</button>
              <button className="btn-secondary" onClick={() => setSelected(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// APP PRINCIPAL
// ============================================================
// labelKey = clé dans le namespace 'nav' → traduit dans la sidebar
const ADMIN_TABS = [
  { id: 'dashboard',        labelKey: 'dashboard',       icon: '📊' },
  { id: 'products',         labelKey: 'products',        icon: '📦' },
  { id: 'clients',          labelKey: 'clients',         icon: '👥' },
  { id: 'invoices',         labelKey: 'invoices',        icon: '🧾' },
  { id: 'repairs',          labelKey: 'repairs',         icon: '🔧' },
  { id: 'suppliers',        labelKey: 'suppliers',       icon: '🚚' },
  { id: 'journals',         labelKey: 'journals',        icon: '📒' },
  { id: 'modules',          labelKey: 'modules',         icon: '🔩' },
  { id: 'admin_reports',    labelKey: 'vendor_reports',  icon: '📋' },
  { id: 'shop_settings',    labelKey: 'shop_settings',   icon: '⚙️' },
  { id: 'online_store',     labelKey: 'online_store',    icon: '🛒' },
  { id: 'payment_settings', labelKey: 'payments',        icon: '💳' },
  { id: 'revenue',          labelKey: 'revenue',         icon: '💰', highlight: true },
  { id: 'billing',          labelKey: 'subscription',    icon: '📋' },
  { id: 'super_admin',      labelKey: 'super_admin',     icon: '🏢', superOnly: true },
  { id: 'security',         labelKey: 'security',        icon: '🔐', superOnly: true },
  { id: 'compliance',       labelKey: 'compliance',      icon: '🛡️' },
];
const VENDOR_TABS = [
  { id: 'vendor_dashboard', labelKey: 'vendor_dashboard', icon: '🏠' },
  { id: 'my_report',        labelKey: 'my_report',        icon: '📝' },
  { id: 'my_reports',       labelKey: 'my_reports',       icon: '📋' },
];

// Composant "Mes rapports" (liste des rapports du vendeur)

function MyReports() {
  const [reports, setReports] = useState([]);
  const { t } = useTranslation(['common']);
  const [loading, setLoading] = useState(true);
  const STATUS_COLOR = { soumis: '#5b9cf6', valide: '#2dd4a0', rejete: '#ef6461' };

  useEffect(() => {
    vendorAPI.getReports().then(r => { setReports(r.data.reports || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">{t('common:loading')}</div>;
  return (
    <div>
      <div className="page-header"><h2>📋 Mes rapports</h2></div>
      {reports.length === 0 && <p style={{ color: '#7a8094' }}>Aucun rapport soumis.</p>}
      {reports.map(r => (
        <div key={r.id} className="form-card" style={{ marginBottom: 10, padding: '12px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <span style={{ fontWeight: 700 }}>{r.report_date}</span>
              <span style={{ marginLeft: 12, fontSize: 18, fontWeight: 700, color: '#d4a12e' }}>
                {Number(r.total_sales).toLocaleString('fr-FR')} FCFA
              </span>
              <span style={{ marginLeft: 8, fontSize: 12, color: '#7a8094' }}>
                {r.customers_count} client(s) · {r.payment_method}
              </span>
            </div>
            <span style={{ fontSize: 12, padding: '3px 12px', borderRadius: 20, background: STATUS_COLOR[r.status] + '20', color: STATUS_COLOR[r.status] }}>
              {r.status}
            </span>
          </div>
          {r.admin_comment && <p style={{ marginTop: 6, fontSize: 12, color: '#7a8094' }}>💬 Admin : {r.admin_comment}</p>}
        </div>
      ))}
    </div>
  );
}

// ── Composant interne qui a accès aux deux contextes (Theme + Toast) ──────────
export { VendorDashboard, VendorReportForm, AdminReports, MyReports };
