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

// ── Dashboard plateforme ──────────────────────────────────────
function PlatformDashboard({ dashboard }) {
  if (!dashboard) return null;
  const { kpis, growth, revenue_by_country, top_tenants, plan_distribution, alerts } = dashboard;
  const fmt = n => Number(n||0).toLocaleString('fr-FR');

  const SEVERITY_COLOR = { critical:'#ef6461', warning:'#f0923c', info:'#5b9cf6' };

  return (
    <div style={{ marginBottom:20 }}>
      {/* KPIs globaux */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:10, marginBottom:14 }}>
        {[
          { label:'Boutiques totales', value: kpis.tenants.total,        color:'#5b9cf6', icon:'🏪' },
          { label:'Boutiques actives', value: kpis.tenants.active,       color:'#2dd4a0', icon:'✅' },
          { label:'En trial',          value: kpis.tenants.trial,        color:'#f0923c', icon:'🕐' },
          { label:'CA total (FCFA)',   value: fmt(kpis.revenue.total),   color:'#d4a12e', icon:'💰' },
          { label:'CA ce mois',        value: fmt(kpis.revenue.this_month), color:'#d4a12e', icon:'📅' },
          { label:'Paiements MoMo',    value: `${kpis.payments.rate}% ok`, color:'#2dd4a0', icon:'📱' },
        ].map(k => (
          <div key={k.label} style={{ background:'#1b1f30', border:'1px solid #252a3a', borderRadius:10, padding:'10px 14px' }}>
            <div style={{ fontSize:10, color:'#7a8094', marginBottom:2 }}>{k.icon} {k.label}</div>
            <div style={{ fontSize:18, fontWeight:700, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        {/* Top boutiques */}
        <div style={S.card}>
          <div style={{ fontWeight:700, color:'#eaedf3', marginBottom:10 }}>🏆 Top boutiques par CA</div>
          {top_tenants.slice(0,5).map((t,i) => (
            <div key={t.id} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0',
                                      borderBottom:'1px solid #252a3a', fontSize:12 }}>
              <span style={{ color: i===0?'#d4a12e':'#eaedf3' }}>
                {i===0?'🥇':i===1?'🥈':i===2?'🥉':'  '} {t.name.slice(0,20)}
              </span>
              <span style={{ color:'#d4a12e', fontWeight:700 }}>{fmt(t.revenue)} FCFA</span>
            </div>
          ))}
          {top_tenants.length === 0 && <div style={{ color:'#7a8094', fontSize:12 }}>Aucune donnée</div>}
        </div>

        {/* Revenus par pays + Plans */}
        <div>
          <div style={{ ...S.card, marginBottom:10 }}>
            <div style={{ fontWeight:700, color:'#eaedf3', marginBottom:8 }}>🌍 Revenus par pays</div>
            {revenue_by_country.slice(0,5).map(c => (
              <div key={c.country} style={{ display:'flex', justifyContent:'space-between', fontSize:12,
                                            padding:'3px 0', borderBottom:'1px solid #1b1f30' }}>
                <span style={{ color:'#7a8094' }}>{c.country_name} ({c.tenants} boutiques)</span>
                <span style={{ color:'#d4a12e', fontWeight:600 }}>{fmt(c.revenue)}</span>
              </div>
            ))}
          </div>
          <div style={S.card}>
            <div style={{ fontWeight:700, color:'#eaedf3', marginBottom:8 }}>📦 Plans</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {plan_distribution.map(p => (
                <div key={p.plan} style={{ background: (PLAN_COLORS[p.plan]||'#7a8094')+'22',
                                           color: PLAN_COLORS[p.plan]||'#7a8094',
                                           padding:'4px 10px', borderRadius:20, fontSize:12, fontWeight:700 }}>
                  {p.plan} ({p.count})
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Croissance 12 mois */}
      <div style={S.card}>
        <div style={{ fontWeight:700, color:'#eaedf3', marginBottom:8 }}>📈 Croissance boutiques (12 mois)</div>
        <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:60 }}>
          {growth.map((g, i) => {
            const max = Math.max(...growth.map(x => x.new_tenants), 1);
            const h   = Math.round((g.new_tenants / max) * 50) + 4;
            return (
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                <div style={{ fontSize:9, color:'#7a8094' }}>{g.new_tenants > 0 ? g.new_tenants : ''}</div>
                <div style={{ width:'100%', height:h, background: g.new_tenants > 0 ? '#5b9cf6' : '#252a3a',
                              borderRadius:'2px 2px 0 0', transition:'height .3s' }} title={`${g.month}: ${g.new_tenants}`} />
                <div style={{ fontSize:8, color:'#7a8094', transform:'rotate(-45deg)', transformOrigin:'center' }}>{g.month}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alertes */}
      {alerts && alerts.length > 0 && (
        <div style={S.card}>
          <div style={{ fontWeight:700, color:'#eaedf3', marginBottom:8 }}>🚨 Alertes plateforme</div>
          {alerts.map((a, i) => (
            <div key={i} style={{ display:'flex', gap:10, padding:'6px 0', borderBottom:'1px solid #1b1f30',
                                   fontSize:12, alignItems:'center' }}>
              <span style={{ color: SEVERITY_COLOR[a.severity] || '#7a8094', fontSize:16 }}>
                {a.severity === 'critical' ? '🔴' : '🟡'}
              </span>
              <div>
                <div style={{ color:'#eaedf3', fontWeight:600 }}>{a.title}</div>
                <div style={{ color:'#7a8094' }}>{a.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Billing plateforme (super admin) ─────────────────────────
const PLAN_PRICES = { free: 0, starter: 5000, business: 15000, enterprise: 50000 };

function PlatformBilling({ dashboard, tenants }) {
  const fmt = n => Number(n || 0).toLocaleString('fr-FR');
  const [renewalResult, setRenewalResult] = useState(null);
  const [renewalLoading, setRenewalLoading] = useState(false);

  if (!dashboard) return <div style={{ color:'#7a8094' }}>Chargement…</div>;

  const { kpis, plan_distribution, top_tenants } = dashboard;

  // MRR calculé depuis la distribution des plans
  const mrr = (plan_distribution || []).reduce((acc, p) => {
    return acc + (PLAN_PRICES[p.plan] || 0) * p.count;
  }, 0);
  const arr = mrr * 12;

  // Abonnements payants
  const payingCount = (plan_distribution || [])
    .filter(p => p.plan !== 'free')
    .reduce((acc, p) => acc + p.count, 0);
  const freeCount = (plan_distribution || [])
    .find(p => p.plan === 'free')?.count || 0;

  const handleCheckRenewal = async () => {
    setRenewalLoading(true);
    try {
      const r = await fetch('/api/subscriptions/admin/check-renewal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('kenpro_token')}` },
      });
      const data = await r.json();
      setRenewalResult(data);
    } catch {
      setRenewalResult({ error: 'Erreur lors de la vérification' });
    } finally {
      setRenewalLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: 20 }}>
      {/* KPIs Billing */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:10, marginBottom:14 }}>
        {[
          { label: 'MRR (FCFA/mois)',     value: fmt(mrr),         color: '#d4a12e', icon: '💰' },
          { label: 'ARR (FCFA/an)',        value: fmt(arr),         color: '#d4a12e', icon: '📅' },
          { label: 'Abonnements payants',  value: payingCount,      color: '#2dd4a0', icon: '✅' },
          { label: 'Plan gratuit',         value: freeCount,        color: '#7a8094', icon: '🆓' },
          { label: 'Total boutiques',      value: kpis?.tenants?.total || 0, color: '#5b9cf6', icon: '🏪' },
          { label: 'Taux conversion',
            value: kpis?.tenants?.total ? `${Math.round(payingCount / kpis.tenants.total * 100)}%` : '0%',
            color: '#f0923c', icon: '📈' },
        ].map(k => (
          <div key={k.label} style={{ background:'#1b1f30', border:'1px solid #252a3a', borderRadius:10, padding:'10px 14px' }}>
            <div style={{ fontSize:10, color:'#7a8094', marginBottom:2 }}>{k.icon} {k.label}</div>
            <div style={{ fontSize:20, fontWeight:700, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        {/* Revenus par plan */}
        <div style={S.card}>
          <div style={{ fontWeight:700, color:'#eaedf3', marginBottom:12 }}>📦 Revenus par plan</div>
          {(plan_distribution || []).map(p => {
            const planMrr = (PLAN_PRICES[p.plan] || 0) * p.count;
            const pct     = mrr > 0 ? Math.round(planMrr / mrr * 100) : 0;
            return (
              <div key={p.plan} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
                  <span style={{ color: PLAN_COLORS[p.plan] || '#7a8094', fontWeight:700 }}>
                    {p.plan.charAt(0).toUpperCase() + p.plan.slice(1)}
                    <span style={{ color:'#7a8094', fontWeight:400, marginLeft:6 }}>× {p.count}</span>
                  </span>
                  <span style={{ color:'#d4a12e', fontWeight:700 }}>{fmt(planMrr)} FCFA</span>
                </div>
                <div style={{ height:4, background:'#252a3a', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background: PLAN_COLORS[p.plan] || '#7a8094',
                                borderRadius:4, transition:'width .4s' }} />
                </div>
                <div style={{ fontSize:10, color:'#7a8094', marginTop:2 }}>{pct}% du MRR</div>
              </div>
            );
          })}
          {(!plan_distribution || plan_distribution.length === 0) && (
            <div style={{ color:'#7a8094', fontSize:13 }}>Aucun abonnement</div>
          )}
        </div>

        {/* Top boutiques payantes */}
        <div style={S.card}>
          <div style={{ fontWeight:700, color:'#eaedf3', marginBottom:10 }}>🏆 Top boutiques par CA</div>
          {(top_tenants || []).slice(0, 6).map((t, i) => (
            <div key={t.id} style={{ display:'flex', justifyContent:'space-between',
                                      padding:'5px 0', borderBottom:'1px solid #1b1f30', fontSize:12 }}>
              <div>
                <span style={{ color: i < 3 ? '#d4a12e' : '#eaedf3' }}>
                  {['🥇','🥈','🥉'][i] || `${i+1}.`} {t.name.slice(0, 18)}
                </span>
                <span style={{ marginLeft:6, fontSize:10, padding:'1px 6px', borderRadius:10,
                               background:(PLAN_COLORS[t.plan]||'#7a8094')+'22',
                               color:PLAN_COLORS[t.plan]||'#7a8094' }}>
                  {t.plan || 'free'}
                </span>
              </div>
              <span style={{ color:'#d4a12e', fontWeight:700 }}>{fmt(t.revenue)}</span>
            </div>
          ))}
          {(!top_tenants || top_tenants.length === 0) && (
            <div style={{ color:'#7a8094', fontSize:13 }}>Aucune donnée</div>
          )}
        </div>
      </div>

      {/* Actions maintenance */}
      <div style={S.card}>
        <div style={{ fontWeight:700, color:'#eaedf3', marginBottom:12 }}>🔧 Maintenance abonnements</div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          <button style={{ ...S.btnPri, opacity: renewalLoading ? 0.6 : 1 }}
                  onClick={handleCheckRenewal} disabled={renewalLoading}>
            {renewalLoading ? '⏳ Vérification…' : '🔄 Vérifier renouvellements'}
          </button>
          <span style={{ fontSize:12, color:'#7a8094' }}>
            Vérifie les expirations et suspend les abonnements en retard de +7 jours
          </span>
        </div>
        {renewalResult && (
          <div style={{ marginTop:12, padding:'10px 14px', background:'#1b1f30', borderRadius:8, fontSize:13 }}>
            {renewalResult.error ? (
              <span style={{ color:'#ef6461' }}>{renewalResult.error}</span>
            ) : (
              <span style={{ color:'#2dd4a0' }}>
                ✅ {renewalResult.expiring_soon ?? 0} expirant bientôt · {renewalResult.suspended ?? 0} suspendus · {renewalResult.downgraded ?? 0} rétrogradés
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


export default function SuperAdminPanel() {
  const [tenants,      setTenants]     = useState([]);
  const [stats,        setStats]       = useState(null);
  const [dashboard,    setDashboard]   = useState(null);
  const [loading,      setLoading]     = useState(true);
  const [showCreate,   setShowCreate]  = useState(false);
  const [search,       setSearch]      = useState('');
  const [activeTab,    setActiveTab]   = useState('dashboard'); // 'dashboard' | 'boutiques'
  const [impersonating, setImpersonating] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [tRes, sRes, dRes] = await Promise.all([
        superAdminAPI.getTenants({ per_page: 50 }),
        superAdminAPI.getStats(),
        superAdminAPI.getDashboard(),
      ]);
      setTenants(tRes.data.tenants || []);
      setStats(sRes.data);
      setDashboard(dRes.data);
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

  if (loading) return <div className="loading">Chargement Super Admin...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>🏢 Super Administration</h2>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => load()} style={{ ...S.btnSec, fontSize:12 }}>🔄 Actualiser</button>
          <button style={S.btnPri} onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? '✕ Annuler' : '+ Nouvelle boutique'}
          </button>
        </div>
      </div>

      {/* Onglets Dashboard / Boutiques / Billing */}
      <div className="filter-bar" style={{ marginBottom:16 }}>
        <button className={`btn-filter ${activeTab==='dashboard'?'active':''}`} onClick={() => setActiveTab('dashboard')}>
          📊 Dashboard plateforme
        </button>
        <button className={`btn-filter ${activeTab==='boutiques'?'active':''}`} onClick={() => setActiveTab('boutiques')}>
          🏪 Gestion boutiques ({tenants.length})
        </button>
        <button className={`btn-filter ${activeTab==='billing'?'active':''}`}
                onClick={() => setActiveTab('billing')}
                style={activeTab==='billing' ? {} : { color:'#d4a12e', borderColor:'rgba(212,161,46,.3)' }}>
          💰 Billing
        </button>
      </div>

      {activeTab === 'dashboard' && <PlatformDashboard dashboard={dashboard} />}

      {activeTab === 'boutiques' && <GlobalStats stats={stats} />}

      {activeTab === 'billing' && <PlatformBilling dashboard={dashboard} tenants={tenants} />}

      {showCreate && (
        <CreateTenantForm
          onCreated={t => { setTenants(prev => [t, ...prev]); setShowCreate(false); setActiveTab('boutiques'); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {activeTab === 'boutiques' && (
        <>
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
        </>
      )}
    </div>
  );
}
