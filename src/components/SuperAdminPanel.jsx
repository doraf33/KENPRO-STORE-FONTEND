// ============================================================
// KENPRO STORE — Panneau Super Admin (gestion multi-tenant)
// Visible uniquement si is_super_admin = true
// ============================================================
import { useState, useEffect } from 'react';
import { superAdminAPI } from '../api';

const S = {
  card:   { background:'#141827', border:'1px solid #252a3a', borderRadius:10, padding:20, marginBottom:14 },
  btnPri: { background:'#d4a12e', color:'#000', border:'none', borderRadius:8, padding:'8px 16px', cursor:'pointer', fontWeight:700, fontSize:13 },
  btnSec: { background:'#252a3a', color:'#eaedf3', border:'none', borderRadius:8, padding:'8px 14px', cursor:'pointer', fontSize:13 },
  btnRed: { background:'transparent', color:'#ef6461', border:'1px solid #ef6461', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:11 },
  input:  { width:'100%', background:'#1b1f30', border:'1px solid #252a3a', borderRadius:7, padding:'8px 12px', color:'#eaedf3', fontSize:13, outline:'none', boxSizing:'border-box' },
};

const PLAN_COLORS = { free:'#7a8094', starter:'#5b9cf6', business:'#2dd4a0', enterprise:'#d4a12e' };
const STATUS_COLORS = { trial:'#f0923c', active:'#2dd4a0', suspended:'#ef6461', cancelled:'#7a8094' };
const COUNTRIES = ['CM','SN','CI','NG','KE','GH','BF','ML','RW','TZ','ET'];
const CURRENCIES = ['XAF','XOF','NGN','GHS','KES','RWF','TZS','ETB'];

function GlobalStats({ stats }) {
  if (!stats) return null;
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:16 }}>
      {[
        { label:'Boutiques totales', value: stats.tenants?.total || 0, color:'#5b9cf6' },
        { label:'Actives',           value: stats.tenants?.active || 0, color:'#2dd4a0' },
        { label:'Produits',          value: stats.products || 0, color:'#d4a12e' },
        { label:'Clients',           value: stats.clients || 0, color:'#eaedf3' },
        { label:'CA total (FCFA)',   value: Number(stats.revenue || 0).toLocaleString('fr-FR'), color:'#d4a12e' },
      ].map(s => (
        <div key={s.label} style={{ background:'#1b1f30', border:'1px solid #252a3a', borderRadius:10, padding:'10px 14px' }}>
          <div style={{ fontSize:11, color:'#7a8094', marginBottom:4 }}>{s.label}</div>
          <div style={{ fontSize:20, fontWeight:700, color: s.color }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

function CreateTenantForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({ slug:'', name:'', owner_email:'', owner_phone:'', country_code:'CM', country_name:'Cameroun', currency:'XAF', language:'fr', subscription_plan:'free' });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  const handleCreate = async () => {
    if (!form.slug || !form.name || !form.owner_email) { alert('Slug, nom et email obligatoires'); return; }
    setLoading(true);
    try {
      const r = await superAdminAPI.createTenant(form);
      onCreated(r.data.tenant);
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
    finally { setLoading(false); }
  };

  return (
    <div style={S.card}>
      <h3 style={{ color:'#eaedf3', margin:'0 0 16px' }}>➕ Nouvelle boutique</h3>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
        <div><label style={{ fontSize:11, color:'#7a8094', display:'block', marginBottom:4 }}>Slug * (ex: boutique-marie)</label>
          <input style={S.input} value={form.slug} onChange={e => set('slug',e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} placeholder="boutique-marie" /></div>
        <div><label style={{ fontSize:11, color:'#7a8094', display:'block', marginBottom:4 }}>Nom *</label>
          <input style={S.input} value={form.name} onChange={e => set('name',e.target.value)} placeholder="Boutique Marie" /></div>
        <div><label style={{ fontSize:11, color:'#7a8094', display:'block', marginBottom:4 }}>Email propriétaire *</label>
          <input style={S.input} value={form.owner_email} onChange={e => set('owner_email',e.target.value)} placeholder="marie@example.com" /></div>
        <div><label style={{ fontSize:11, color:'#7a8094', display:'block', marginBottom:4 }}>Téléphone</label>
          <input style={S.input} value={form.owner_phone} onChange={e => set('owner_phone',e.target.value)} placeholder="+237 6XX XX XX XX" /></div>
        <div><label style={{ fontSize:11, color:'#7a8094', display:'block', marginBottom:4 }}>Pays</label>
          <select style={S.input} value={form.country_code} onChange={e => set('country_code',e.target.value)}>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select></div>
        <div><label style={{ fontSize:11, color:'#7a8094', display:'block', marginBottom:4 }}>Devise</label>
          <select style={S.input} value={form.currency} onChange={e => set('currency',e.target.value)}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select></div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={handleCreate} disabled={loading} style={S.btnPri}>{loading ? '⏳...' : '✓ Créer'}</button>
        <button onClick={onCancel} style={S.btnSec}>Annuler</button>
      </div>
    </div>
  );
}

export default function SuperAdminPanel() {
  const [tenants,     setTenants]     = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [search,      setSearch]      = useState('');
  const [impersonating, setImpersonating] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [tRes, sRes] = await Promise.all([
        superAdminAPI.getTenants({ per_page: 50 }),
        superAdminAPI.getStats(),
      ]);
      setTenants(tRes.data.tenants || []);
      setStats(sRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSuspend = async (t) => {
    if (!confirm(`Suspendre "${t.name}" ?`)) return;
    try { await superAdminAPI.suspendTenant(t.id); load(); } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
  };
  const handleActivate = async (t) => {
    try { await superAdminAPI.activateTenant(t.id); load(); } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
  };
  const handleDelete = async (t) => {
    if (!confirm(`Supprimer définitivement "${t.name}" ?`)) return;
    try { await superAdminAPI.deleteTenant(t.id); load(); } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
  };
  const handleImpersonate = async (t) => {
    try {
      const r = await superAdminAPI.impersonate(t.id);
      const newToken = r.data.token;
      // Stocker le token d'impersonation temporairement
      localStorage.setItem('kenpro_impersonate_token', localStorage.getItem('kenpro_token'));
      localStorage.setItem('kenpro_token', newToken);
      localStorage.setItem('kenpro_tenant_slug', t.slug);
      setImpersonating(t.slug);
      window.location.reload();
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
  };

  const filtered = tenants.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.includes(search)
  );

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>🏢 Super Administration</h2>
        <button style={S.btnPri} onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? '✕ Annuler' : '+ Nouvelle boutique'}
        </button>
      </div>

      <GlobalStats stats={stats} />

      {showCreate && (
        <CreateTenantForm
          onCreated={t => { setTenants(prev => [t, ...prev]); setShowCreate(false); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <input type="text" placeholder="🔍 Rechercher une boutique..." value={search}
             onChange={e => setSearch(e.target.value)} className="search-input" style={{ marginBottom:12 }} />

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Boutique</th><th>Pays / Devise</th><th>Plan</th><th>Statut</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id}>
                <td>
                  <div style={{ fontWeight:700, color:'#eaedf3' }}>{t.name}</div>
                  <div style={{ fontSize:11, color:'#7a8094', fontFamily:'monospace' }}>{t.slug}</div>
                  <div style={{ fontSize:11, color:'#7a8094' }}>{t.owner_email}</div>
                </td>
                <td><div>{t.country_code}</div><div style={{ fontSize:11, color:'#7a8094' }}>{t.currency}</div></td>
                <td>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:12, fontWeight:700,
                                 background: (PLAN_COLORS[t.subscription_plan]||'#7a8094')+'22',
                                 color: PLAN_COLORS[t.subscription_plan]||'#7a8094' }}>
                    {t.subscription_plan}
                  </span>
                </td>
                <td>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:12,
                                 background: (STATUS_COLORS[t.subscription_status]||'#7a8094')+'22',
                                 color: STATUS_COLORS[t.subscription_status]||'#7a8094' }}>
                    {t.subscription_status}
                  </span>
                </td>
                <td>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                    <button onClick={() => handleImpersonate(t)} title="Se connecter en tant que cette boutique"
                            style={{ ...S.btnSec, fontSize:11, padding:'4px 8px' }}>
                      🔑 Login
                    </button>
                    {t.subscription_status === 'suspended'
                      ? <button onClick={() => handleActivate(t)} style={{ ...S.btnSec, fontSize:11, padding:'4px 8px', color:'#2dd4a0' }}>▶ Activer</button>
                      : t.slug !== 'kenpro-store' && <button onClick={() => handleSuspend(t)} style={{ ...S.btnRed }}>⏸ Suspendre</button>
                    }
                    {t.slug !== 'kenpro-store' && (
                      <button onClick={() => handleDelete(t)} style={{ ...S.btnRed, borderColor:'#ef6461' }}>🗑️</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
