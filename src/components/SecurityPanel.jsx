/**
 * SecurityPanel — Page sécurité pour Super Admin.
 * Affiche : score sécurité, features actives, audit logs, wallet plateforme.
 */
import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const apiFetch = (path, token) =>
  fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());

const fmt = n => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;

const SEVERITY_COLOR = { info: '#5b9cf6', warning: '#f0923c', critical: '#ef6461' };
const SEVERITY_ICON  = { info: 'ℹ️', warning: '⚠️', critical: '🔴' };

function ScoreRing({ score }) {
  const color = score >= 90 ? '#2dd4a0' : score >= 70 ? '#f0923c' : '#ef6461';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        border: `6px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 20px ${color}44`,
        transition: 'all .3s',
      }}>
        <span style={{ fontSize: 22, fontWeight: 800, color }}>{score}</span>
      </div>
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>Score /100</span>
    </div>
  );
}

function FeatureRow({ label, active, detail }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
      <span style={{ color: 'var(--text)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {detail && <span style={{ color: 'var(--muted)', fontSize: 11 }}>{detail}</span>}
        <span style={{ color: active ? '#2dd4a0' : '#ef6461', fontWeight: 700, fontSize: 12 }}>
          {active ? '✅ Actif' : '❌ Inactif'}
        </span>
      </div>
    </div>
  );
}

export default function SecurityPanel({ token }) {
  const [sec,    setSec]    = useState(null);
  const [wallet, setWallet] = useState(null);
  const [logs,   setLogs]   = useState([]);
  const [escrow, setEscrow] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,    setTab]    = useState('security');
  const [autoConfirmResult, setAutoConfirmResult] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, w, l, e] = await Promise.all([
        apiFetch('/super-admin/security', token),
        apiFetch('/super-admin/wallet', token),
        apiFetch('/super-admin/audit-logs?limit=50', token),
        apiFetch('/super-admin/escrow?limit=20', token),
      ]);
      setSec(s);
      setWallet(w);
      setLogs(l.logs || []);
      setEscrow(e.escrows || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAutoConfirm = async () => {
    const r = await fetch(`${API_BASE}/super-admin/escrow/auto-confirm`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    setAutoConfirmResult(d);
    load();
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 20 }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton-card" />)}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>🔐 Sécurité & Monitoring</h2>
        <button onClick={load} style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', color: 'var(--text)', fontSize: 12 }}>
          🔄 Actualiser
        </button>
      </div>

      <div className="period-tabs" style={{ marginBottom: 16 }}>
        {[['security','🔐 Sécurité'],['wallet','💳 Wallet'],['escrow','🔒 Escrow'],['logs','📋 Audit Logs']].map(([k,l]) => (
          <button key={k} className={`period-tab${tab===k?' active':''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ── Sécurité ─────────────────────────────── */}
      {tab === 'security' && sec && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
          <div className="form-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <ScoreRing score={sec.score || 95} />
            <div style={{ textAlign: 'center', width: '100%' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Alertes critiques', value: sec.critical_today, color: sec.critical_today > 0 ? '#ef6461' : '#2dd4a0' },
                  { label: 'Avertissements', value: sec.warning_today, color: sec.warning_today > 0 ? '#f0923c' : '#2dd4a0' },
                  { label: 'Événements total', value: sec.total_events, color: '#5b9cf6' },
                  { label: 'Payouts logués', value: sec.payout_events, color: '#d4a12e' },
                ].map(k => (
                  <div key={k.label} style={{ background: 'var(--card2)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{k.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="form-card">
            <h3 style={{ marginBottom: 14, fontSize: 14 }}>🛡️ Features de sécurité</h3>
            {sec.features && Object.entries({
              'Chiffrement Fernet AES-256': [sec.features.fernet_encryption, sec.encryption],
              'JWT signé': [sec.features.jwt_signed, ''],
              'Rate limiting': [sec.features.rate_limiting, sec.rate_limiting],
              'Webhooks HMAC': [sec.features.webhook_hmac, ''],
              'APIs plateforme isolées': [sec.features.platform_api_isolated, ''],
              'Isolation multi-tenant': [sec.features.tenant_isolation, ''],
              'Audit logging': [sec.features.audit_logging, ''],
            }).map(([label, [active, detail]]) => (
              <FeatureRow key={label} label={label} active={active} detail={detail} />
            ))}

            <h3 style={{ marginTop: 16, marginBottom: 12, fontSize: 14 }}>🔑 Variables d'environnement</h3>
            {sec.env && Object.entries({
              'ENCRYPTION_KEY':           sec.env.encryption_key_set,
              'JWT_SECRET_KEY':           sec.env.jwt_secret_set,
              'PLATFORM_MTN_API_KEY':     sec.env.platform_mtn_set,
              'PLATFORM_ORANGE_CLIENT_ID':sec.env.platform_orange_set,
            }).map(([k, v]) => (
              <FeatureRow key={k} label={k} active={v} />
            ))}
          </div>
        </div>
      )}

      {/* ── Wallet ───────────────────────────────── */}
      {tab === 'wallet' && wallet && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Solde disponible',     value: fmt(wallet.balance),            color: '#2dd4a0', icon: '💰' },
              { label: 'Total encaissé',        value: fmt(wallet.total_received),     color: '#5b9cf6', icon: '📥' },
              { label: 'Versé aux vendeurs',    value: fmt(wallet.total_paid_vendors), color: '#d4a12e', icon: '📤' },
              { label: 'Commissions KENPRO',    value: fmt(wallet.total_commissions),  color: '#f0923c', icon: '🏦' },
            ].map(k => (
              <div key={k.label} className="kpi-fintech wallet-card" style={{ '--kpi-color': k.color }}>
                <div className="kpi-label">{k.icon} {k.label}</div>
                <div className="kpi-value">{k.value}</div>
              </div>
            ))}
          </div>
          <div className="form-card">
            <h3 style={{ marginBottom: 12, fontSize: 14 }}>⚙️ Actions maintenance</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={handleAutoConfirm}
                      style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                🔄 Auto-confirmer escrows expirés (48h)
              </button>
            </div>
            {autoConfirmResult && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(45,212,160,.1)', borderRadius: 8, fontSize: 13, color: '#2dd4a0' }}>
                ✅ {autoConfirmResult.auto_confirmed || 0} transaction(s) confirmée(s) automatiquement
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Escrow ───────────────────────────────── */}
      {tab === 'escrow' && (
        <div className="table-container">
          <table>
            <thead><tr>
              <th>Commande</th><th>Boutique</th><th>Total</th>
              <th>Commission</th><th>Gain vendeur</th><th>Statut</th>
            </tr></thead>
            <tbody>
              {escrow.map(e => (
                <tr key={e.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{e.order_number}</td>
                  <td style={{ fontSize: 11, color: 'var(--muted)' }}>{e.tenant_id?.slice(0,8)}…</td>
                  <td style={{ fontWeight: 600 }}>{fmt(e.total_amount)}</td>
                  <td style={{ color: '#d4a12e' }}>{fmt(e.commission_amount)}</td>
                  <td style={{ color: '#2dd4a0' }}>{fmt(e.vendor_amount)}</td>
                  <td>
                    <span className={`escrow-status ${e.status}`}>
                      {STATUS_MAP_LABEL[e.status] || e.status}
                    </span>
                  </td>
                </tr>
              ))}
              {escrow.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>Aucun escrow</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Audit Logs ───────────────────────────── */}
      {tab === 'logs' && (
        <div className="table-container">
          <table>
            <thead><tr>
              <th>Action</th><th>Sévérité</th><th>Ressource</th><th>IP</th><th>Date</th>
            </tr></thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text)' }}>
                    {SEVERITY_ICON[l.severity] || 'ℹ️'} {l.action}
                  </td>
                  <td>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 700,
                                   background: (SEVERITY_COLOR[l.severity] || '#5b9cf6') + '22',
                                   color: SEVERITY_COLOR[l.severity] || '#5b9cf6' }}>
                      {l.severity}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--muted)' }}>{l.resource} {l.resource_id ? `#${l.resource_id}` : ''}</td>
                  <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--muted)' }}>{l.ip_address || '—'}</td>
                  <td style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {l.created_at ? new Date(l.created_at).toLocaleString('fr-FR') : '—'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>Aucun événement</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const STATUS_MAP_LABEL = {
  pending: 'En attente', paid: 'Payé', delivered: 'Livré',
  confirmed: 'Confirmé', vendor_paid: 'Versé', disputed: 'Litige',
};
