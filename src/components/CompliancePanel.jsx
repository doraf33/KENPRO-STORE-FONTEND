/**
 * CompliancePanel — Dashboard conformité RGPD + 2FA (Super Admin & Tenant Admin).
 * Tabs : Consentements | Demandes RGPD | 2FA | Audit
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const API = (path, token, method = 'GET', body = null) =>
  fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).then(r => r.json());

const fmt = n => Number(n || 0).toLocaleString('fr-FR');

function StatCard({ label, value, color, icon }) {
  return (
    <div className="kpi-fintech" style={{ '--kpi-color': color }}>
      <div className="kpi-label">{icon} {label}</div>
      <div className="kpi-value" style={{ color }}>{value}</div>
    </div>
  );
}

// ── Onglet Consentements ──────────────────────────────────────
function ConsentTab({ token, isSuperAdmin }) {
  const [stats,    setStats]    = useState(null);
  const [consents, setConsents] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const load = async () => {
      const [s, c] = await Promise.all([
        isSuperAdmin ? API('/super-admin/compliance', token) : Promise.resolve({}),
        isSuperAdmin ? API('/super-admin/compliance/consents?limit=30', token) : Promise.resolve({ consents: [] }),
      ]);
      setStats(s); setConsents(c.consents || []);
      setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Chargement…</div>;

  return (
    <div>
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
          <StatCard label="Total consentements" value={fmt(stats.total_consents)}   color="#5b9cf6" icon="📊" />
          <StatCard label="Taux d'acceptation"  value={`${stats.accept_rate}%`}    color="#2dd4a0" icon="✅" />
          <StatCard label="Exports en attente"  value={stats.pending_exports || 0} color="#f0923c" icon="📥" />
          <StatCard label="Suppressions J+30"   value={stats.pending_deletes || 0} color="#ef6461" icon="🗑️" />
        </div>
      )}

      <div className="table-container">
        <table>
          <thead><tr><th>Type</th><th>Accepté</th><th>Session/User</th><th>IP</th><th>Date</th></tr></thead>
          <tbody>
            {consents.map(c => (
              <tr key={c.id}>
                <td><span className="badge">{c.consent_type}</span></td>
                <td>
                  <span style={{ color: c.accepted ? '#2dd4a0' : '#ef6461', fontWeight: 700 }}>
                    {c.accepted ? '✅ Oui' : '❌ Non'}
                  </span>
                </td>
                <td style={{ fontSize: 11, color: 'var(--muted)' }}>—</td>
                <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--muted)' }}>—</td>
                <td style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {c.created_at ? new Date(c.created_at).toLocaleString('fr-FR') : '—'}
                </td>
              </tr>
            ))}
            {consents.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>Aucun consentement enregistré</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Onglet Demandes RGPD ──────────────────────────────────────
function GDPRTab({ token, isSuperAdmin }) {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const path = isSuperAdmin ? '/super-admin/compliance/gdpr-requests' : '/me/consents';
    API(path, token).then(d => {
      setRequests(d.requests || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const TYPE_COLOR = { export: '#5b9cf6', delete: '#ef6461', deactivate: '#f0923c' };
  const STATUS_COLOR = { pending: '#f0923c', completed: '#2dd4a0', cancelled: '#7a8094', processing: '#5b9cf6' };

  if (loading) return <div className="loading">Chargement…</div>;

  return (
    <div className="table-container">
      <table>
        <thead><tr><th>Type</th><th>Statut</th><th>Utilisateur</th><th>Demandé le</th><th>Suppression le</th></tr></thead>
        <tbody>
          {requests.map(r => (
            <tr key={r.id}>
              <td><span style={{ background: (TYPE_COLOR[r.type]||'#7a8094')+'22', color: TYPE_COLOR[r.type]||'#7a8094', padding:'2px 10px', borderRadius:12, fontSize:11, fontWeight:700 }}>{r.type}</span></td>
              <td><span style={{ background: (STATUS_COLOR[r.status]||'#7a8094')+'22', color: STATUS_COLOR[r.status]||'#7a8094', padding:'2px 10px', borderRadius:12, fontSize:11, fontWeight:600 }}>{r.status}</span></td>
              <td style={{ fontSize:11, color:'var(--muted)' }}>User #{r.user_id || '—'}</td>
              <td style={{ fontSize:11, color:'var(--muted)' }}>{r.requested_at ? new Date(r.requested_at).toLocaleDateString('fr-FR') : '—'}</td>
              <td style={{ fontSize:11, color: r.scheduled_delete_at ? '#ef6461' : 'var(--muted)' }}>
                {r.scheduled_delete_at ? new Date(r.scheduled_delete_at).toLocaleDateString('fr-FR') : '—'}
              </td>
            </tr>
          ))}
          {requests.length === 0 && (
            <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--muted)', padding:30 }}>Aucune demande RGPD</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Onglet 2FA (utilisateur courant) ─────────────────────────
function TwoFATab({ token }) {
  const [status,  setStatus]  = useState(null);
  const [qr,      setQR]      = useState(null);
  const [code,    setCode]    = useState('');
  const [backup,  setBackup]  = useState(null);
  const [msg,     setMsg]     = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    API('/me/2fa', token).then(d => { setStatus(d); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const startSetup = async () => {
    const d = await API('/me/2fa/setup', token, 'POST');
    setQR(d);
  };

  const verifyCode = async () => {
    try {
      const d = await API('/me/2fa/verify', token, 'POST', { code });
      setBackup(d.backup_codes);
      setMsg('✅ 2FA activé avec succès !');
      setQR(null); setCode('');
      load();
    } catch { setMsg('❌ Code incorrect ou expiré'); }
  };

  const disable = async () => {
    if (!code) return;
    try {
      await API('/me/2fa/disable', token, 'POST', { code });
      setMsg('2FA désactivé.'); setCode(''); load();
    } catch { setMsg('❌ Code incorrect'); }
  };

  if (loading) return <div className="loading">Chargement…</div>;

  return (
    <div style={{ maxWidth: 480 }}>
      <div className="form-card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12, fontSize: 14 }}>🔐 Double authentification (2FA)</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div className={`status-dot ${status?.is_enabled ? 'active' : 'inactive'}`} />
          <span style={{ color: 'var(--text)', fontSize: 13 }}>
            {status?.is_enabled
              ? `Activé — ${status.backup_codes_remaining} codes de secours restants`
              : 'Non activé'}
          </span>
        </div>

        {msg && <div style={{ marginBottom: 12, padding:'8px 12px', borderRadius:8, fontSize:12, background:'rgba(45,212,160,.1)', color:'#2dd4a0' }}>{msg}</div>}

        {!status?.is_enabled && !qr && (
          <button className="btn btn-primary btn-sm" onClick={startSetup}>Configurer le 2FA</button>
        )}

        {qr && !backup && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
              Scannez ce QR code avec Google Authenticator ou Authy, puis entrez le code généré.
            </p>
            <img src={qr.qr_code} alt="QR Code 2FA" style={{ width: 180, height: 180, borderRadius: 8, background:'#fff', padding:8, marginBottom:12 }} />
            <p style={{ fontSize:10, color:'var(--muted)', fontFamily:'monospace', wordBreak:'break-all', marginBottom:12 }}>
              Code manuel : {qr.secret}
            </p>
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="Code à 6 chiffres"
                   className="form-input" style={{ marginBottom:10, letterSpacing:4, textAlign:'center', fontSize:18 }} maxLength={6} />
            <button className="btn btn-primary btn-sm" onClick={verifyCode} disabled={code.length !== 6}>
              Vérifier et activer
            </button>
          </div>
        )}

        {backup && (
          <div>
            <p style={{ fontWeight:700, marginBottom:8, color:'#f0923c' }}>⚠️ Sauvegardez ces codes de récupération (affichés une seule fois) :</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              {backup.map(c => (
                <code key={c} style={{ background:'var(--card2)', padding:'4px 8px', borderRadius:4, fontSize:12, fontFamily:'monospace' }}>{c}</code>
              ))}
            </div>
          </div>
        )}

        {status?.is_enabled && !backup && (
          <div style={{ marginTop:16 }}>
            <h4 style={{ fontSize:12, marginBottom:8, color:'var(--muted)' }}>Désactiver le 2FA</h4>
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="Code TOTP actuel"
                   className="form-input" style={{ marginBottom:8 }} />
            <button className="btn btn-sm" style={{ background:'rgba(239,100,97,.15)', color:'#ef6461', border:'1px solid rgba(239,100,97,.3)', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:12 }}
                    onClick={disable}>Désactiver le 2FA</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────
export default function CompliancePanel({ isSuperAdmin = false }) {
  const token = localStorage.getItem('kenpro_token');
  const [tab, setTab] = useState('consents');

  const tabs = [
    ...(isSuperAdmin ? [['consents', '📊 Consentements']] : []),
    ...(isSuperAdmin ? [['gdpr', '📋 Demandes RGPD']] : []),
    ['2fa', '🔐 Double Auth (2FA)'],
    ...(isSuperAdmin ? [['audit', '🔍 Audit']] : []),
  ];

  return (
    <div>
      <div className="page-header">
        <h2>🛡️ Conformité RGPD & Sécurité</h2>
      </div>

      <div className="period-tabs" style={{ marginBottom: 20 }}>
        {tabs.map(([k, l]) => (
          <button key={k} className={`period-tab${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'consents' && isSuperAdmin && <ConsentTab token={token} isSuperAdmin={isSuperAdmin} />}
      {tab === 'gdpr'     && isSuperAdmin && <GDPRTab    token={token} isSuperAdmin={isSuperAdmin} />}
      {tab === '2fa'                       && <TwoFATab   token={token} />}
      {tab === 'audit'    && isSuperAdmin  && (
        <div style={{ textAlign:'center', padding:40, color:'var(--muted)' }}>
          <p>Logs d'audit disponibles dans l'onglet <strong>🔐 Sécurité</strong> du Super Admin.</p>
        </div>
      )}
    </div>
  );
}

// ── Widget "Mes données" (tenant admin) ───────────────────────
export function MyDataPanel({ token }) {
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState('');

  const exportData = async () => {
    setLoading(true);
    try {
      const d = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/me/export-data`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json());
      const blob = new Blob([JSON.stringify(d.data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a'); a.href = url; a.download = 'mes-donnees-kenpro.json'; a.click();
      setMsg('✅ Export téléchargé');
    } catch { setMsg('❌ Erreur lors de l\'export'); }
    setLoading(false);
  };

  const requestDelete = async () => {
    if (!confirm('Demander la suppression de votre compte ? Vous avez 30 jours pour annuler.')) return;
    const d = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/me/delete-account`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json());
    setMsg(d.message || 'Demande envoyée');
  };

  return (
    <div className="form-card" style={{ maxWidth: 520 }}>
      <h3 style={{ marginBottom: 16, fontSize: 14 }}>🔒 Mes données personnelles</h3>
      {msg && <div style={{ marginBottom:12, padding:'8px 12px', borderRadius:8, fontSize:12, background:'rgba(45,212,160,.1)', color:'#2dd4a0' }}>{msg}</div>}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <button className="btn btn-primary btn-sm" onClick={exportData} disabled={loading}>
          {loading ? '⏳ Export…' : '📥 Télécharger mes données (JSON)'}
        </button>
        <button className="btn btn-sm" style={{ background:'rgba(239,100,97,.1)', color:'#ef6461', border:'1px solid rgba(239,100,97,.3)', borderRadius:8, padding:'8px 14px', cursor:'pointer', fontSize:12 }}
                onClick={requestDelete}>
          🗑️ Demander la suppression de mon compte
        </button>
      </div>
      <p style={{ fontSize:11, color:'var(--muted)', marginTop:12 }}>
        Conformément au RGPD, vous avez le droit d'accéder, modifier et supprimer vos données.
      </p>
    </div>
  );
}
