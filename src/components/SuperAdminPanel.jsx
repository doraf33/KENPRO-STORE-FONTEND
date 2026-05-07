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

// Pays supportés avec métadonnées (miroir du backend SUPPORTED_COUNTRIES)
const SUPPORTED_COUNTRIES = [
  { code:'CM', flag:'🇨🇲', name:'Cameroun',       currency:'XAF', language:'fr', timezone:'Africa/Douala' },
  { code:'SN', flag:'🇸🇳', name:'Sénégal',        currency:'XOF', language:'fr', timezone:'Africa/Dakar' },
  { code:'CI', flag:'🇨🇮', name:'Côte d\'Ivoire', currency:'XOF', language:'fr', timezone:'Africa/Abidjan' },
  { code:'NG', flag:'🇳🇬', name:'Nigeria',        currency:'NGN', language:'en', timezone:'Africa/Lagos' },
  { code:'KE', flag:'🇰🇪', name:'Kenya',          currency:'KES', language:'en', timezone:'Africa/Nairobi' },
  { code:'GH', flag:'🇬🇭', name:'Ghana',          currency:'GHS', language:'en', timezone:'Africa/Accra' },
  { code:'BJ', flag:'🇧🇯', name:'Bénin',          currency:'XOF', language:'fr', timezone:'Africa/Porto-Novo' },
  { code:'TG', flag:'🇹🇬', name:'Togo',           currency:'XOF', language:'fr', timezone:'Africa/Lome' },
  { code:'ML', flag:'🇲🇱', name:'Mali',           currency:'XOF', language:'fr', timezone:'Africa/Bamako' },
  { code:'NE', flag:'🇳🇪', name:'Niger',          currency:'XOF', language:'fr', timezone:'Africa/Niamey' },
  { code:'BF', flag:'🇧🇫', name:'Burkina Faso',   currency:'XOF', language:'fr', timezone:'Africa/Ouagadougou' },
  { code:'RW', flag:'🇷🇼', name:'Rwanda',         currency:'RWF', language:'fr', timezone:'Africa/Kigali' },
  { code:'TZ', flag:'🇹🇿', name:'Tanzanie',       currency:'TZS', language:'en', timezone:'Africa/Dar_es_Salaam' },
  { code:'ZA', flag:'🇿🇦', name:'Afrique du Sud', currency:'ZAR', language:'en', timezone:'Africa/Johannesburg' },
];

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
  const EMPTY = { slug:'', name:'', owner_email:'', owner_phone:'',
                  owner_full_name:'', country_code:'', subscription_plan:'free' };
  const [form,    setForm]    = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Quand le pays change → auto-remplir devise, langue, timezone
  const handleCountryChange = (code) => {
    const meta = SUPPORTED_COUNTRIES.find(c => c.code === code);
    setForm(f => ({
      ...f,
      country_code: code,
      // On laisse le backend compléter les autres champs via SUPPORTED_COUNTRIES
    }));
    setError('');
  };

  const selectedCountry = SUPPORTED_COUNTRIES.find(c => c.code === form.country_code);

  const handleCreate = async () => {
    if (!form.slug)         { setError('Le slug est obligatoire'); return; }
    if (!form.name)         { setError('Le nom est obligatoire');  return; }
    if (!form.owner_email)  { setError('L\'email est obligatoire'); return; }
    if (!form.country_code) { setError('Le pays est OBLIGATOIRE — il détermine les moyens de paiement'); return; }

    setLoading(true); setError('');
    try {
      const r = await superAdminAPI.createTenant(form);
      onCreated(r.data.tenant);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(Array.isArray(detail)
        ? detail.map(d => d.msg).join(' · ')
        : detail || 'Erreur lors de la création');
    } finally { setLoading(false); }
  };

  const lbl = { fontSize:11, color:'#7a8094', display:'block', marginBottom:4 };
  const req  = { ...lbl, color:'#d4a12e' };  // champs obligatoires en or

  return (
    <div style={S.card}>
      <h3 style={{ color:'#eaedf3', margin:'0 0 4px' }}>➕ Nouvelle boutique</h3>
      <p style={{ fontSize:12, color:'#7a8094', marginBottom:16 }}>
        Le pays est <strong style={{ color:'#d4a12e' }}>obligatoire</strong> — il détermine les moyens de paiement disponibles.
      </p>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>

        {/* Slug */}
        <div>
          <label style={req}>Slug * (identifiant unique)</label>
          <input style={S.input} value={form.slug} placeholder="boutique-marie"
            onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} />
          <div style={{ fontSize:10, color:'#7a8094', marginTop:2 }}>Lettres, chiffres, tirets uniquement</div>
        </div>

        {/* Nom */}
        <div>
          <label style={req}>Nom de la boutique *</label>
          <input style={S.input} value={form.name} placeholder="Boutique Marie Tech"
            onChange={e => set('name', e.target.value)} />
        </div>

        {/* Email */}
        <div>
          <label style={req}>Email propriétaire *</label>
          <input style={S.input} type="email" value={form.owner_email} placeholder="marie@example.com"
            onChange={e => set('owner_email', e.target.value)} />
        </div>

        {/* Téléphone */}
        <div>
          <label style={lbl}>Téléphone propriétaire</label>
          <input style={S.input} value={form.owner_phone} placeholder="+237 6XX XX XX XX"
            onChange={e => set('owner_phone', e.target.value)} />
        </div>

        {/* NOM COMPLET */}
        <div style={{ gridColumn:'span 2' }}>
          <label style={lbl}>Nom complet propriétaire</label>
          <input style={S.input} value={form.owner_full_name} placeholder="Marie Dupont"
            onChange={e => set('owner_full_name', e.target.value)} />
        </div>

        {/* PAYS — OBLIGATOIRE */}
        <div>
          <label style={{ ...req, fontSize:13 }}>🌍 Pays * (OBLIGATOIRE)</label>
          <select style={{ ...S.input, border: form.country_code ? '1px solid #252a3a' : '1px solid #d4a12e' }}
            value={form.country_code}
            onChange={e => handleCountryChange(e.target.value)}>
            <option value="">— Choisir un pays —</option>
            {SUPPORTED_COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        {/* Infos auto-remplies */}
        {selectedCountry && (
          <div style={{ background:'#0f1420', borderRadius:8, padding:'10px 14px', fontSize:12 }}>
            <div style={{ color:'#7a8094', marginBottom:6, fontSize:11 }}>✨ Rempli automatiquement</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
              <span style={{ color:'#7a8094' }}>Devise</span>
              <span style={{ color:'#d4a12e', fontWeight:700 }}>{selectedCountry.currency}</span>
              <span style={{ color:'#7a8094' }}>Langue</span>
              <span style={{ color:'#eaedf3' }}>{selectedCountry.language === 'fr' ? 'Français' : 'English'}</span>
              <span style={{ color:'#7a8094' }}>Fuseau</span>
              <span style={{ color:'#eaedf3', fontSize:10 }}>{selectedCountry.timezone}</span>
              <span style={{ color:'#7a8094' }}>Paiements</span>
              <span style={{ color:'#2dd4a0', fontSize:10 }}>
                {{CM:'MTN, Orange', SN:'Wave, Orange', CI:'Wave, MTN, Orange',
                  NG:'Paystack, Flutterwave', KE:'M-Pesa', GH:'MTN, Paystack'}[selectedCountry.code]
                  || 'Voir config paiements'}
              </span>
            </div>
          </div>
        )}

        {/* Plan */}
        <div style={{ gridColumn:'span 2' }}>
          <label style={lbl}>Plan d'abonnement</label>
          <select style={S.input} value={form.subscription_plan}
            onChange={e => set('subscription_plan', e.target.value)}>
            <option value="free">Gratuit (50 produits, 2 utilisateurs)</option>
            <option value="starter">Starter</option>
            <option value="business">Business</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div style={{ background:'rgba(239,100,97,.1)', border:'1px solid #ef6461', borderRadius:8,
                      padding:'10px 14px', color:'#ef6461', fontSize:13, marginBottom:12 }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display:'flex', gap:8 }}>
        <button onClick={handleCreate} disabled={loading || !form.country_code} style={{
          ...S.btnPri, opacity: (!form.country_code || loading) ? 0.6 : 1,
          cursor: !form.country_code ? 'not-allowed' : 'pointer'
        }}>
          {loading ? '⏳ Création...' : '✓ Créer la boutique'}
        </button>
        <button onClick={onCancel} style={S.btnSec}>Annuler</button>
      </div>
      {!form.country_code && (
        <div style={{ fontSize:11, color:'#d4a12e', marginTop:6 }}>
          ↑ Sélectionnez le pays pour activer la création
        </div>
      )}
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
