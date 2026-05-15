/**
 * RevenuePanel — Dashboard "Mes Revenus" pour admin boutique.
 * Affiche : gains en attente, gains disponibles, historique versements,
 * transactions escrow, configuration compte de réception.
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const API = (path, token) =>
  fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  }).then(r => r.json());

const fmt = n => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;

const STATUS_MAP = {
  pending:     { label: 'En attente',    cls: 'pending' },
  paid:        { label: 'Payé',          cls: 'paid' },
  delivered:   { label: 'Livré',         cls: 'delivered' },
  confirmed:   { label: 'Confirmé',      cls: 'confirmed' },
  vendor_paid: { label: 'Versé',         cls: 'vendor_paid' },
  disputed:    { label: 'Litige',        cls: 'disputed' },
  completed:   { label: 'Complété',      cls: 'confirmed' },
  failed:      { label: 'Échoué',        cls: 'disputed' },
  processing:  { label: 'En cours',      cls: 'pending' },
};

function EscrowBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, cls: 'pending' };
  return <span className={`escrow-status ${s.cls}`}>{s.label}</span>;
}

function SkeletonKPI() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
      {[1,2,3,4].map(i => <div key={i} className="skeleton-card" style={{ height: 90 }} />)}
    </div>
  );
}

function FlowDiagram({ status }) {
  const steps = [
    { key: 'paid',        icon: '💳', label: 'Payé par client' },
    { key: 'delivered',   icon: '📦', label: 'Livré' },
    { key: 'confirmed',   icon: '✅', label: 'Confirmé' },
    { key: 'vendor_paid', icon: '💰', label: 'Versé au vendeur' },
  ];
  const ORDER = ['paid','delivered','confirmed','vendor_paid'];
  const idx = ORDER.indexOf(status);

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
      {steps.map((s, i) => (
        <>
          <div key={s.key} className={`flow-step ${i < idx ? 'done' : i === idx ? 'active' : ''}`}
               style={{ padding: '6px 10px', flex: '0 0 auto' }}>
            <span className="step-num">{i < idx ? '✓' : i + 1}</span>
            <span style={{ fontSize: 11, color: i <= idx ? 'var(--text)' : 'var(--muted)' }}>
              {s.icon} {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <span key={`arr-${i}`} style={{ color: 'var(--muted)', fontSize: 12 }}>→</span>
          )}
        </>
      ))}
    </div>
  );
}

export default function RevenuePanel({ token }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('overview');
  const [delivering, setDelivering] = useState(null);
  const [msg,     setMsg]     = useState({ type: '', text: '' });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [rev, esc] = await Promise.all([
        API('/my-shop/revenue', token),
        API('/my-shop/escrow', token),
      ]);
      setData({ ...rev, escrows: esc.escrows || [] });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleDeliver = async (escrowId) => {
    setDelivering(escrowId);
    setMsg({ type: '', text: '' });
    try {
      const r = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/my-shop/escrow/${escrowId}/deliver`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
      const d = await r.json();
      if (r.ok) {
        setMsg({ type: 'success', text: 'Commande marquée comme livrée. Le client a 48h pour confirmer.' });
        load();
      } else {
        setMsg({ type: 'error', text: d.detail || 'Erreur' });
      }
    } catch { setMsg({ type: 'error', text: 'Erreur réseau' }); }
    finally { setDelivering(null); }
  };

  if (loading) return <SkeletonKPI />;

  const sum = data?.summary || {};
  const kpis = [
    { label: 'Gains disponibles',      value: fmt(sum.available),       color: '#2dd4a0', icon: '✅' },
    { label: 'En attente livraison',   value: fmt(sum.pending_delivery), color: '#f0923c', icon: '📦' },
    { label: 'En attente confirmation',value: fmt(sum.pending_confirm),  color: '#5b9cf6', icon: '⏳' },
    { label: 'Déjà versés',            value: fmt(sum.paid_out),         color: '#d4a12e', icon: '💰' },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>💰 Mes Revenus</h2>
        <button onClick={load} style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', color: 'var(--text)', fontSize: 12 }}>
          🔄 Actualiser
        </button>
      </div>

      {msg.text && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13,
                      background: msg.type === 'success' ? 'rgba(45,212,160,.1)' : 'rgba(239,100,97,.1)',
                      border: `1px solid ${msg.type === 'success' ? 'rgba(45,212,160,.3)' : 'rgba(239,100,97,.3)'}`,
                      color: msg.type === 'success' ? '#2dd4a0' : '#ef6461' }}>
          {msg.text}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
        {kpis.map(k => (
          <div key={k.label} className="kpi-fintech" style={{ '--kpi-color': k.color }}>
            <div className="kpi-label">{k.icon} {k.label}</div>
            <div className="kpi-value">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="period-tabs" style={{ marginBottom: 16 }}>
        {[['overview', '📊 Aperçu'], ['escrows', '🔒 Commandes escrow'], ['payouts', '💸 Versements']].map(([k, l]) => (
          <button key={k} className={`period-tab${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ── Aperçu ─────────────────────────────────── */}
      {tab === 'overview' && (
        <div>
          <div className="form-card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 12, fontSize: 14 }}>🔄 Flux de paiement KENPRO</h3>
            <FlowDiagram status="paid" />
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
              <b style={{ color: 'var(--text)' }}>Commission KENPRO : 5%</b> prélevée automatiquement.<br />
              Les fonds sont sécurisés sur le compte plateforme jusqu'à confirmation client (48h max).
            </div>
          </div>

          {/* Feed transactions récentes */}
          <div className="form-card">
            <h3 style={{ marginBottom: 12, fontSize: 14 }}>⚡ Transactions récentes</h3>
            {(data?.recent_escrows || []).length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>Aucune transaction escrow</p>
            ) : (
              <div className="tx-feed">
                {(data?.recent_escrows || []).slice(0, 8).map(e => (
                  <div key={e.id} className="tx-item">
                    <div className={`tx-icon ${e.status === 'vendor_paid' ? 'payout' : e.status === 'confirmed' ? 'success' : 'pending'}`}>
                      {e.status === 'vendor_paid' ? '💰' : e.status === 'confirmed' ? '✅' : e.status === 'disputed' ? '⚠️' : '🔒'}
                    </div>
                    <div className="tx-body">
                      <div className="tx-title">Commande #{e.order_number}</div>
                      <div className="tx-sub">
                        <EscrowBadge status={e.status} />
                        <span style={{ marginLeft: 6 }}>{e.payment_provider || 'N/A'}</span>
                      </div>
                    </div>
                    <div className={`tx-amount ${e.status === 'vendor_paid' ? 'gold' : 'neutral'}`}>
                      {fmt(e.vendor_amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Commandes Escrow ────────────────────────── */}
      {tab === 'escrows' && (
        <div className="table-container">
          {(data?.escrows || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
              <p>Aucune commande escrow</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Commande</th>
                  <th>Montant total</th>
                  <th>Votre gain</th>
                  <th>Commission</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(data?.escrows || []).map(e => (
                  <tr key={e.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>#{e.order_number}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{e.payment_provider || '—'}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{fmt(e.total_amount)}</td>
                    <td style={{ color: '#2dd4a0', fontWeight: 700 }}>{fmt(e.vendor_amount)}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{fmt(e.commission_amount)} ({e.commission_rate}%)</td>
                    <td><EscrowBadge status={e.status} /></td>
                    <td>
                      {e.status === 'paid' && (
                        <button
                          onClick={() => handleDeliver(e.id)}
                          disabled={delivering === e.id}
                          style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                          {delivering === e.id ? '⏳' : '📦 Marquer livré'}
                        </button>
                      )}
                      {e.status === 'delivered' && (
                        <span style={{ fontSize: 11, color: 'var(--orange)' }}>⏳ Conf. client ({e.auto_confirm_at ? 'auto dans 48h' : '...'})</span>
                      )}
                      {e.status === 'confirmed' && (
                        <span style={{ fontSize: 11, color: 'var(--green)' }}>✅ Versement en cours</span>
                      )}
                      {e.status === 'vendor_paid' && (
                        <span style={{ fontSize: 11, color: 'var(--accent)' }}>💰 Versé</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Versements ──────────────────────────────── */}
      {tab === 'payouts' && (
        <div className="table-container">
          {(data?.recent_payouts || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>💸</div>
              <p>Aucun versement effectué</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr><th>Montant</th><th>Provider</th><th>Numéro</th><th>Statut</th><th>Date</th></tr>
              </thead>
              <tbody>
                {(data?.recent_payouts || []).map(p => (
                  <tr key={p.id}>
                    <td style={{ color: '#d4a12e', fontWeight: 700 }}>{fmt(p.amount)}</td>
                    <td>{p.provider}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.phone_number || '—'}</td>
                    <td><EscrowBadge status={p.status} /></td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>
                      {p.initiated_at ? new Date(p.initiated_at).toLocaleDateString('fr-FR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
