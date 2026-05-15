import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { subscriptionsAPI } from '../api';

const fmt = n => Number(n || 0).toLocaleString('fr-FR');

const PLAN_COLORS = {
  free:       '#7a8094',
  starter:    '#5b9cf6',
  business:   '#2dd4a0',
  enterprise: '#d4a12e',
};

const STATUS_LABELS = {
  active:          { label: 'Actif',         cls: 'status-active' },
  trialing:        { label: 'Essai',         cls: 'status-pending' },
  past_due:        { label: 'En retard',     cls: 'status-late' },
  cancelled:       { label: 'Annulé',        cls: 'status-cancelled' },
  pending_payment: { label: 'Paiement...',   cls: 'status-pending' },
};

function UsageBar({ label, current, max, color }) {
  const pct = max === -1 ? 0 : Math.min(100, Math.round((current / max) * 100));
  const isUnlimited = max === -1;
  const isWarning = pct >= 80;
  const isDanger  = pct >= 100;

  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span>
        <span>
          {isUnlimited
            ? <span className="text-green-400">Illimité</span>
            : <>{current} / {max} {isDanger && '⚠️'}</>
          }
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 bg-dark-border rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all"
               style={{
                 width: `${pct}%`,
                 backgroundColor: isDanger ? '#ef4444' : isWarning ? '#f59e0b' : color,
               }} />
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan, current, onSelect }) {
  const isSelected = current === plan.slug;
  const color = PLAN_COLORS[plan.slug] || '#7a8094';
  return (
    <div onClick={() => onSelect(plan.slug)}
         className={`plan-card ${isSelected ? 'active' : ''}`}
         style={{ '--plan-color': color }}>
      <div className="flex justify-between items-start mb-2">
        <span className="font-bold" style={{ color }}>{plan.name}</span>
        {isSelected && <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded-full">Plan actuel</span>}
      </div>
      <div className="text-2xl font-bold text-white mb-3">
        {plan.price_monthly === 0
          ? 'Gratuit'
          : <>{fmt(plan.price_monthly)} <span className="text-sm text-gray-400 font-normal">FCFA/mois</span></>
        }
      </div>
      <ul className="space-y-1.5 text-sm text-gray-300">
        <li>📦 {plan.max_products === -1 ? '∞ produits' : `${plan.max_products} produits`}</li>
        <li>👤 {plan.max_users === -1 ? '∞ utilisateurs' : `${plan.max_users} utilisateur${plan.max_users > 1 ? 's' : ''}`}</li>
        <li>📋 {plan.max_orders_month === -1 ? '∞ commandes/mois' : `${plan.max_orders_month} commandes/mois`}</li>
        {plan.features?.slice(0, 3).map(f => (
          <li key={f} className="text-gray-400">✓ {f}</li>
        ))}
      </ul>
    </div>
  );
}

export default function BillingPanel() {
  const { t } = useTranslation(['payments', 'common']);
  const [info, setInfo]       = useState(null);
  const [plans, setPlans]     = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('overview');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [provider, setProvider] = useState('mtn_momo');
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [msg, setMsg]         = useState({ type: '', text: '' });

  const load = () => {
    setLoading(true);
    Promise.all([
      subscriptionsAPI.getMyPlan(),
      subscriptionsAPI.getPlans(),
      subscriptionsAPI.getPayments(),
    ]).then(([infoR, plansR, paymentsR]) => {
      setInfo(infoR.data);
      setPlans(plansR.data.plans || []);
      setPayments(paymentsR.data.payments || []);
      setSelectedPlan(infoR.data?.subscription?.plan_slug || 'free');
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleUpgrade = async () => {
    if (!selectedPlan || selectedPlan === info?.subscription?.plan_slug) return;
    setUpgradeLoading(true);
    setMsg({ type: '', text: '' });
    try {
      const r = await subscriptionsAPI.upgrade({ plan_slug: selectedPlan, billing_cycle: billingCycle, provider });
      if (r.data.status === 'active') {
        setMsg({ type: 'success', text: 'Plan mis à jour avec succès !' });
        load();
      } else {
        setMsg({ type: 'info', text: `Paiement initié (ID: ${r.data.payment_id}). Montant: ${fmt(r.data.amount)} FCFA via ${provider}.` });
      }
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.detail || 'Erreur lors du changement de plan' });
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Annuler votre abonnement ? Il restera actif jusqu\'à la fin de la période.')) return;
    try {
      await subscriptionsAPI.cancel();
      setMsg({ type: 'success', text: 'Abonnement annulé. Actif jusqu\'à la fin de la période.' });
      load();
    } catch (e) {
      setMsg({ type: 'error', text: 'Erreur lors de l\'annulation' });
    }
  };

  if (loading) return <div className="loading">{t("common:loading")}</div>;

  const sub  = info?.subscription;
  const plan = info?.plan;
  const usage = info?.usage || {};
  const statusInfo = STATUS_LABELS[sub?.status] || { label: sub?.status, cls: '' };
  const currentPlanObj = plans.find(p => p.slug === selectedPlan);
  const isDowngrade = plans.findIndex(p => p.slug === selectedPlan) <
                      plans.findIndex(p => p.slug === sub?.plan_slug);

  return (
    <div className="billing-panel">
      <div className="section-header">
        <h2>💳 Abonnement & Facturation</h2>
      </div>

      {/* Tabs */}
      <div className="period-tabs" style={{ marginBottom: 20 }}>
        {[['overview', '📊 Vue d\'ensemble'], ['upgrade', '🚀 Changer de plan'], ['history', '📜 Historique']].map(([k, l]) => (
          <button key={k} className={`period-tab${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type}`} style={{ marginBottom: 16 }}>
          {msg.text}
          <button onClick={() => setMsg({ type: '', text: '' })} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      {/* ── Vue d'ensemble ─────────────────────── */}
      {tab === 'overview' && (
        <div>
          {/* Plan actuel */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className="badge" style={{ backgroundColor: PLAN_COLORS[sub?.plan_slug] + '22', color: PLAN_COLORS[sub?.plan_slug], fontSize: 14, fontWeight: 700, padding: '4px 12px' }}>
                    {plan?.name}
                  </span>
                  <span className={statusInfo.cls} style={{ fontSize: 12 }}>{statusInfo.label}</span>
                </div>
                {sub?.period_end && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Période : {new Date(sub.period_end).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>
                  {plan?.price_monthly === 0 ? 'Gratuit' : `${fmt(plan?.price_monthly)} FCFA/mois`}
                </div>
                {plan?.price_yearly > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {fmt(plan?.price_yearly)} FCFA/an (économisez {plan?.yearly_discount || 20}%)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Usage */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 600 }}>Utilisation</h3>
            <UsageBar label="Produits"            current={usage.products || 0}         max={plan?.max_products || 20}     color={PLAN_COLORS[sub?.plan_slug]} />
            <UsageBar label="Utilisateurs"        current={usage.users || 0}            max={plan?.max_users || 1}         color={PLAN_COLORS[sub?.plan_slug]} />
            <UsageBar label="Commandes ce mois"   current={usage.orders_this_month || 0} max={plan?.max_orders_month || 50} color={PLAN_COLORS[sub?.plan_slug]} />
          </div>

          {sub?.status === 'active' && sub?.plan_slug !== 'free' && (
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button className="btn btn-sm btn-danger" onClick={handleCancel}>Annuler l'abonnement</button>
            </div>
          )}
        </div>
      )}

      {/* ── Changer de plan ────────────────────── */}
      {tab === 'upgrade' && (
        <div>
          <div className="plan-grid">
            {plans.map(p => (
              <PlanCard key={p.slug} plan={p} current={selectedPlan} onSelect={setSelectedPlan} />
            ))}
          </div>

          {selectedPlan && selectedPlan !== sub?.plan_slug && (
            <div className="card" style={{ padding: 20, marginTop: 16 }}>
              <h3 style={{ marginBottom: 12, fontSize: 14 }}>
                {isDowngrade ? '⬇️ Rétrograder vers' : '⬆️ Passer à'} {currentPlanObj?.name}
              </h3>

              {currentPlanObj?.price_monthly > 0 && (
                <>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    {[['monthly', 'Mensuel'], ['yearly', 'Annuel (-20%)']].map(([k, l]) => (
                      <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="radio" value={k} checked={billingCycle === k}
                               onChange={() => setBillingCycle(k)} />
                        <span style={{ fontSize: 13 }}>{l}</span>
                      </label>
                    ))}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label className="form-label">Mode de paiement</label>
                    <select className="form-input" value={provider} onChange={e => setProvider(e.target.value)}>
                      <option value="mtn_momo">MTN Mobile Money</option>
                      <option value="orange_money">Orange Money</option>
                      <option value="wave">Wave</option>
                    </select>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
                    {billingCycle === 'yearly'
                      ? `${fmt(currentPlanObj.price_yearly)} FCFA/an`
                      : `${fmt(currentPlanObj.price_monthly)} FCFA/mois`
                    }
                  </div>
                </>
              )}

              <button className="btn btn-primary" onClick={handleUpgrade} disabled={upgradeLoading}>
                {upgradeLoading ? 'Traitement…' : isDowngrade ? 'Rétrograder' : 'Confirmer le changement'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Historique paiements ───────────────── */}
      {tab === 'history' && (
        <div>
          {payments.length === 0 ? (
            <div className="empty-state">
              <p>Aucun paiement enregistré</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Montant</th>
                    <th>Fournisseur</th>
                    <th>Statut</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td><span className="badge">{p.plan_slug}</span></td>
                      <td style={{ fontWeight: 600 }}>{fmt(p.amount)} {p.currency}</td>
                      <td>{p.provider}</td>
                      <td>
                        <span className={p.status === 'successful' ? 'status-active' : p.status === 'pending' ? 'status-pending' : 'status-cancelled'}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {p.paid_at ? new Date(p.paid_at).toLocaleDateString('fr-FR') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <style>{`
        .billing-panel { padding: 0; }
        .plan-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
        .plan-card {
          border: 1.5px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.15s;
          background: var(--surface);
        }
        .plan-card:hover { border-color: var(--plan-color, #d4a12e); transform: translateY(-2px); }
        .plan-card.active { border-color: var(--plan-color, #d4a12e); background: color-mix(in srgb, var(--plan-color, #d4a12e) 8%, var(--surface)); }
        .alert { padding: 12px 16px; border-radius: 8px; font-size: 13px; }
        .alert-success { background: #14532d22; border: 1px solid #22c55e44; color: #4ade80; }
        .alert-error   { background: #7f1d1d22; border: 1px solid #ef444444; color: #f87171; }
        .alert-info    { background: #1e3a5f22; border: 1px solid #3b82f644; color: #93c5fd; }
        .status-active    { color: #4ade80; font-weight: 600; }
        .status-pending   { color: #fbbf24; font-weight: 600; }
        .status-late      { color: #f97316; font-weight: 600; }
        .status-cancelled { color: #9ca3af; }
      `}</style>
    </div>
  );
}
