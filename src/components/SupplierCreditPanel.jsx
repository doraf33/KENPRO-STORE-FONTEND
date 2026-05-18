/**
 * SupplierCreditPanel — Panneau crédit fournisseur (5 onglets).
 * Dashboard | Factures | Paiements | Messages | Score
 */
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const token   = () => localStorage.getItem('kenpro_token');
const slug    = () => localStorage.getItem('kenpro_tenant_slug') || 'kenpro-store';

const api = (path, method = 'GET', body = null) =>
  fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      'X-Tenant-Slug': slug(),
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).then(r => r.json());

const fmt = n => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

// ── Statut badge ──────────────────────────────────────────────
const STATUS_COLORS = {
  pending:   { bg: 'rgba(240,146,60,.15)', color: '#f0923c', label: '⏳ En attente' },
  partial:   { bg: 'rgba(91,156,246,.15)', color: '#5b9cf6', label: '🟡 Partiel' },
  paid:      { bg: 'rgba(45,212,160,.15)', color: '#2dd4a0', label: '✅ Payée' },
  overdue:   { bg: 'rgba(239,100,97,.15)', color: '#ef6461', label: '🔴 En retard' },
  active:    { bg: 'rgba(45,212,160,.15)', color: '#2dd4a0', label: '✅ Actif' },
  suspended: { bg: 'rgba(239,100,97,.15)', color: '#ef6461', label: '⛔ Suspendu' },
  validated: { bg: 'rgba(45,212,160,.15)', color: '#2dd4a0', label: '✅ Validé' },
};

function Badge({ status }) {
  const s = STATUS_COLORS[status] || { bg: 'rgba(122,128,148,.15)', color: '#7a8094', label: status };
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 10px',
                   borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

// ── Credit progress bar ───────────────────────────────────────
function CreditBar({ used, limit }) {
  const pct = limit > 0 ? Math.min(100, Math.round(used / limit * 100)) : 0;
  const color = pct > 80 ? '#ef6461' : pct > 60 ? '#f0923c' : '#2dd4a0';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12,
                    color: 'var(--muted)', marginBottom: 4 }}>
        <span>Crédit utilisé</span>
        <span style={{ color, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 8, background: 'var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color,
                      borderRadius: 8, transition: 'width .6s ease' }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ONGLET DASHBOARD
// ═══════════════════════════════════════════════════════════════
function TabDashboard({ supplierId, supplierName }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCredit, setShowCredit] = useState(false);
  const [creditForm, setCreditForm] = useState({ credit_limit: '', interest_rate: 0 });
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    api(`/suppliers/${supplierId}/credit/dashboard`)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [supplierId]);

  const saveCredit = async () => {
    try {
      await api(`/suppliers/${supplierId}/credit`, 'POST', {
        credit_limit: parseFloat(creditForm.credit_limit),
        interest_rate: parseFloat(creditForm.interest_rate || 0),
      });
      setMsg('✅ Ligne de crédit créée !'); setShowCredit(false); load();
    } catch { setMsg('❌ Erreur'); }
  };

  if (loading) return <div className="loading">Chargement…</div>;

  const credit = data?.credit;
  const stats = [
    { label: 'Plafond',         value: fmt(credit?.credit_limit || 0),     color: '#5b9cf6', icon: '💳' },
    { label: 'Utilisé',         value: fmt(credit?.credit_used || 0),      color: '#f0923c', icon: '📤' },
    { label: 'Disponible',      value: fmt(credit?.credit_available || 0), color: '#2dd4a0', icon: '✅' },
    { label: 'Factures retard', value: `${data?.overdue_count || 0}`,      color: '#ef6461', icon: '⚠️' },
  ];

  return (
    <div>
      {msg && <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                             background: msg.includes('✅') ? 'rgba(45,212,160,.1)' : 'rgba(239,100,97,.1)',
                             color: msg.includes('✅') ? '#2dd4a0' : '#ef6461' }}>{msg}</div>}

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 16 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: 'var(--card2)', borderRadius: 10, padding: '12px 14px',
                                       border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Credit bar */}
      {credit && (
        <div className="form-card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 style={{ fontSize: 13, color: 'var(--text)' }}>Ligne de crédit — <Badge status={credit.status} /></h4>
            <button className="btn btn-sm" style={{ fontSize: 11, padding: '4px 10px',
                                                     background: 'var(--card2)', border: '1px solid var(--border)',
                                                     borderRadius: 6, cursor: 'pointer', color: 'var(--text)' }}
                    onClick={() => setShowCredit(!showCredit)}>✏️ Modifier</button>
          </div>
          <CreditBar used={credit.credit_used} limit={credit.credit_limit} />
        </div>
      )}

      {/* Create credit */}
      {!credit || showCredit ? (
        <div className="form-card" style={{ marginBottom: 14 }}>
          <h4 style={{ fontSize: 13, marginBottom: 10 }}>{credit ? 'Modifier' : 'Créer'} la ligne de crédit</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input className="form-input" type="number" placeholder="Plafond (FCFA) *"
                   value={creditForm.credit_limit}
                   onChange={e => setCreditForm(f => ({ ...f, credit_limit: e.target.value }))} />
            <input className="form-input" type="number" placeholder="Taux intérêt % (optionnel)"
                   value={creditForm.interest_rate}
                   onChange={e => setCreditForm(f => ({ ...f, interest_rate: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary btn-sm" onClick={saveCredit}>Enregistrer</button>
            {credit && <button className="btn btn-sm" style={{ background: 'var(--card2)', border: '1px solid var(--border)',
                                                                 borderRadius: 6, cursor: 'pointer', color: 'var(--text)', padding: '6px 12px' }}
                              onClick={() => setShowCredit(false)}>Annuler</button>}
          </div>
        </div>
      ) : null}

      {/* Échéances proches */}
      {data?.upcoming_invoices?.length > 0 && (
        <div className="form-card" style={{ marginBottom: 14 }}>
          <h4 style={{ fontSize: 13, marginBottom: 10 }}>📅 Échéances proches</h4>
          {data.upcoming_invoices.map(inv => (
            <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between',
                                        padding: '6px 0', borderBottom: '1px solid var(--border)',
                                        fontSize: 12 }}>
              <span style={{ color: 'var(--text)' }}>
                {inv.is_overdue ? '🔴' : '⚠️'} {inv.invoice_number}
              </span>
              <span style={{ color: 'var(--muted)' }}>{fmt(inv.remaining)} · {fmtDate(inv.due_date)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Derniers paiements */}
      {data?.recent_payments?.length > 0 && (
        <div className="form-card">
          <h4 style={{ fontSize: 13, marginBottom: 10 }}>💳 Derniers paiements</h4>
          {data.recent_payments.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between',
                                      padding: '6px 0', borderBottom: '1px solid var(--border)',
                                      fontSize: 12 }}>
              <span style={{ color: 'var(--text)' }}>
                ✅ {fmt(p.amount)} · {p.payment_method}
              </span>
              <span style={{ color: 'var(--muted)' }}>{fmtDate(p.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ONGLET FACTURES
// ═══════════════════════════════════════════════════════════════
function TabInvoices({ supplierId }) {
  const [invoices, setInvoices] = useState([]);
  const [filter,   setFilter]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ amount: '', description: '', due_date: '', invoice_number: '' });
  const [loading, setLoading]   = useState(true);
  const [msg, setMsg]           = useState('');

  const load = (f = filter) => {
    setLoading(true);
    api(`/suppliers/${supplierId}/invoices${f ? `?status=${f}` : ''}`)
      .then(d => { setInvoices(d.invoices || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [supplierId]);

  const save = async () => {
    if (!form.amount) return;
    try {
      await api(`/suppliers/${supplierId}/invoices`, 'POST', {
        amount: parseFloat(form.amount), description: form.description,
        due_date: form.due_date || null,
        invoice_number: form.invoice_number || undefined,
      });
      setMsg('✅ Facture créée !'); setShowForm(false); setForm({ amount:'',description:'',due_date:'',invoice_number:'' }); load();
    } catch { setMsg('❌ Erreur'); }
  };

  const FILTERS = [['','Toutes'],['pending','Impayées'],['partial','Partielles'],['paid','Payées']];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div className="period-tabs" style={{ margin: 0 }}>
          {FILTERS.map(([val, label]) => (
            <button key={val} className={`period-tab${filter === val ? ' active' : ''}`}
                    onClick={() => { setFilter(val); load(val); }}>{label}</button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>+ Nouvelle facture</button>
      </div>

      {msg && <div style={{ marginBottom: 10, padding: '6px 12px', borderRadius: 8, fontSize: 12,
                             background: msg.includes('✅') ? 'rgba(45,212,160,.1)' : 'rgba(239,100,97,.1)',
                             color: msg.includes('✅') ? '#2dd4a0' : '#ef6461' }}>{msg}</div>}

      {showForm && (
        <div className="form-card" style={{ marginBottom: 14 }}>
          <h4 style={{ fontSize: 13, marginBottom: 10 }}>Nouvelle facture fournisseur</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input className="form-input" placeholder="N° facture (auto si vide)" value={form.invoice_number}
                   onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} />
            <input className="form-input" type="number" placeholder="Montant (FCFA) *" value={form.amount}
                   onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            <input className="form-input" type="date" placeholder="Date d'échéance" value={form.due_date}
                   onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            <input className="form-input" placeholder="Description" value={form.description}
                   onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary btn-sm" onClick={save}>Créer la facture</button>
            <button className="btn btn-sm" style={{ background: 'var(--card2)', border: '1px solid var(--border)',
                                                     borderRadius: 6, cursor: 'pointer', color: 'var(--text)', padding: '6px 12px' }}
                    onClick={() => setShowForm(false)}>Annuler</button>
          </div>
        </div>
      )}

      {loading ? <div className="loading">Chargement…</div> : (
        <div className="table-container">
          <table>
            <thead>
              <tr><th>N°</th><th>Montant</th><th>Payé</th><th>Reste</th><th>Échéance</th><th>Statut</th></tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>Aucune facture</td></tr>
              ) : invoices.map(inv => (
                <tr key={inv.id} style={{ background: inv.is_overdue ? 'rgba(239,100,97,.04)' : 'transparent' }}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--accent)' }}>{inv.invoice_number}</td>
                  <td style={{ fontWeight: 600 }}>{fmt(inv.amount)}</td>
                  <td style={{ color: '#2dd4a0' }}>{fmt(inv.paid_amount)}</td>
                  <td style={{ color: inv.remaining > 0 ? '#ef6461' : '#2dd4a0', fontWeight: 700 }}>{fmt(inv.remaining)}</td>
                  <td style={{ fontSize: 12, color: inv.is_overdue ? '#ef6461' : 'var(--muted)' }}>
                    {fmtDate(inv.due_date)} {inv.is_overdue ? '⚠️' : ''}
                  </td>
                  <td><Badge status={inv.is_overdue ? 'overdue' : inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ONGLET PAIEMENTS
// ═══════════════════════════════════════════════════════════════
// Providers mobiles disponibles (enrichis avec 3 nouveaux)
const MOBILE_PROVIDERS = [
  { val: 'mtn_momo',    label: '📱 MTN Mobile Money',  countries: ['CM','CI','GH'] },
  { val: 'orange_money',label: '🟠 Orange Money',       countries: ['CM','SN','CI','ML','BF','NE'] },
  { val: 'campay',      label: '🔵 CamPay',             countries: ['CM'] },
  { val: 'paiementpro', label: '💳 Paiement Pro',       countries: ['CI','SN','BF','ML','BJ','TG'] },
  { val: 'cinetpay',    label: '🟢 CinetPay',           countries: ['CI','SN','CM','BF','ML','BJ','TG','GN','CG','CD'] },
  { val: 'wave',        label: '🌊 Wave',                countries: ['SN','CI'] },
];

function TabPayments({ supplierId }) {
  const [payments,  setPayments]  = useState([]);
  const [invoices,  setInvoices]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [form, setForm] = useState({
    invoice_id: '', amount: '', payment_method: 'cash',
    reference: '', notes: '', mobile_phone: '',
  });
  const [mobileStatus, setMobileStatus] = useState(null); // null | 'pending' | 'success' | 'error'
  const [msg, setMsg]  = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      api(`/suppliers/${supplierId}/payments`),
      api(`/suppliers/${supplierId}/invoices?status=pending`),
    ]).then(([p, i]) => {
      setPayments(p.payments || []);
      const partial = api(`/suppliers/${supplierId}/invoices?status=partial`).then(d => d.invoices || []).catch(() => []);
      partial.then(par => setInvoices([...(i.invoices || []), ...par]));
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [supplierId]);

  const isMobile = MOBILE_PROVIDERS.some(p => p.val === form.payment_method);

  const save = async () => {
    if (!form.amount) return;

    // Si paiement mobile → initier via API paiement
    if (isMobile && form.mobile_phone) {
      setMobileStatus('pending');
      setMsg('📱 Paiement mobile en cours…');
      try {
        const ref = `SUPP-${supplierId}-${Date.now()}`;
        const res = await api('/payments/initiate', 'POST', {
          provider: form.payment_method,
          phone: form.mobile_phone,
          amount: parseFloat(form.amount),
          currency: 'XAF',
          reference: ref,
          description: `Paiement fournisseur #${supplierId}`,
        });

        if (res.status === 'PENDING' || res.status === 'SUCCESSFUL') {
          // Enregistrer le paiement dans le crédit fournisseur
          await api(`/suppliers/${supplierId}/payments`, 'POST', {
            amount: parseFloat(form.amount),
            invoice_id: form.invoice_id ? parseInt(form.invoice_id) : null,
            payment_method: form.payment_method,
            reference: res.transaction_id || ref,
            notes: `Paiement mobile initié — ${form.payment_method}`,
          });

          // Message auto dans le chat
          await api(`/suppliers/${supplierId}/messages`, 'POST', {
            message: `💳 Paiement de ${parseInt(form.amount).toLocaleString('fr-FR')} FCFA initié via ${form.payment_method.replace('_',' ').toUpperCase()} ✅ Réf: ${res.transaction_id || ref}`,
            sender_name: 'Système',
          });

          setMobileStatus('success');
          setMsg('✅ Paiement mobile initié ! Vérifiez votre téléphone.');
          setForm({ invoice_id:'', amount:'', payment_method:'cash', reference:'', notes:'', mobile_phone:'' });
          load();
        } else {
          setMobileStatus('error');
          setMsg(`❌ Paiement échoué: ${res.message || 'Erreur provider'}`);
        }
      } catch (e) {
        setMobileStatus('error');
        setMsg('❌ Erreur réseau');
      }
      return;
    }

    // Paiement classique (espèces, virement)
    try {
      await api(`/suppliers/${supplierId}/payments`, 'POST', {
        amount: parseFloat(form.amount),
        invoice_id: form.invoice_id ? parseInt(form.invoice_id) : null,
        payment_method: form.payment_method,
        reference: form.reference,
        notes: form.notes,
      });
      setMsg('✅ Paiement enregistré !');
      setForm({ invoice_id:'', amount:'', payment_method:'cash', reference:'', notes:'', mobile_phone:'' });
      load();
    } catch { setMsg('❌ Erreur'); }
  };

  const METHODS = [
    ['cash',     '💵 Espèces'],
    ['mtn_momo', '📱 MTN MoMo'],
    ['orange_money', '🍊 Orange Money'],
    ['campay',   '🔵 CamPay'],
    ['paiementpro', '💳 Paiement Pro'],
    ['cinetpay', '🟢 CinetPay'],
    ['transfer', '🏦 Virement'],
  ];

  return (
    <div>
      {/* Formulaire */}
      <div className="form-card" style={{ marginBottom: 16 }}>
        <h4 style={{ fontSize: 13, marginBottom: 12 }}>💳 Enregistrer un paiement</h4>
        {msg && <div style={{ marginBottom: 10, padding: '6px 12px', borderRadius: 8, fontSize: 12,
                               background: msg.includes('✅') ? 'rgba(45,212,160,.1)' : 'rgba(239,100,97,.1)',
                               color: msg.includes('✅') ? '#2dd4a0' : '#ef6461' }}>{msg}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <select className="form-input" value={form.invoice_id}
                  onChange={e => setForm(f => ({ ...f, invoice_id: e.target.value }))}>
            <option value="">Facture (optionnel)</option>
            {invoices.map(inv => (
              <option key={inv.id} value={inv.id}>
                {inv.invoice_number} — {fmt(inv.remaining)} restant
              </option>
            ))}
          </select>
          <input className="form-input" type="number" placeholder="Montant (FCFA) *"
                 value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {METHODS.map(([val, label]) => (
            <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
              <input type="radio" name="method" value={val} checked={form.payment_method === val}
                     onChange={() => setForm(f => ({ ...f, payment_method: val }))} />
              {label}
            </label>
          ))}
        </div>
        {/* Numéro mobile si provider mobile */}
        {isMobile && (
          <div style={{ marginBottom: 10 }}>
            <input className="form-input" placeholder="📱 Numéro Mobile Money (+237 6XX XXX XXX)"
                   value={form.mobile_phone}
                   onChange={e => setForm(f => ({ ...f, mobile_phone: e.target.value }))}
                   style={{ width: '100%' }} />
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              ℹ️ Le fournisseur recevra une notification pour confirmer le paiement
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <input className="form-input" placeholder="Référence (numéro transaction)" value={form.reference}
                 onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
          <input className="form-input" placeholder="Notes" value={form.notes}
                 onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
        {mobileStatus === 'pending' && (
          <div style={{ padding: '8px 12px', background: 'rgba(91,156,246,.1)', borderRadius: 8,
                        fontSize: 12, color: '#5b9cf6', marginBottom: 10 }}>
            ⏳ Paiement en attente de confirmation…
          </div>
        )}
        <button className="btn btn-primary btn-sm" onClick={save}
                disabled={mobileStatus === 'pending'}
                style={{ opacity: mobileStatus === 'pending' ? 0.6 : 1 }}>
          {isMobile ? '📱 Initier le paiement mobile' : '💳 Enregistrer le paiement'}
        </button>
      </div>

      {/* Timeline paiements */}
      <h4 style={{ fontSize: 13, marginBottom: 10, color: 'var(--text)' }}>Historique des paiements</h4>
      {loading ? <div className="loading">Chargement…</div> : (
        <div style={{ position: 'relative' }}>
          {payments.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>Aucun paiement</p>
          ) : payments.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', gap: 12, marginBottom: 12, position: 'relative' }}>
              {/* Timeline dot */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2dd4a0',
                               border: '2px solid var(--bg)', marginTop: 2 }} />
                {i < payments.length - 1 && (
                  <div style={{ width: 2, flex: 1, background: 'var(--border)', marginTop: 2 }} />
                )}
              </div>
              {/* Content */}
              <div style={{ flex: 1, background: 'var(--card2)', borderRadius: 8, padding: '8px 12px',
                             border: '1px solid var(--border)', marginBottom: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, color: '#2dd4a0' }}>{fmt(p.amount)}</span>
                  <Badge status={p.status} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {p.payment_method} {p.reference ? `· Réf: ${p.reference}` : ''}
                  {p.notes ? ` · ${p.notes}` : ''} · {fmtDate(p.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ONGLET MESSAGES
// ═══════════════════════════════════════════════════════════════
function TabMessages({ supplierId, supplierName, userName }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(true);
  const endRef = useRef(null);

  const load = () => {
    api(`/suppliers/${supplierId}/messages`)
      .then(d => { setMessages(d.messages || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [supplierId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    try {
      await api(`/suppliers/${supplierId}/messages`, 'POST', {
        message: input.trim(), sender_name: userName || 'Admin',
      });
      setInput(''); load();
    } catch {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 400 }}>
      <h4 style={{ fontSize: 13, marginBottom: 10, flexShrink: 0 }}>
        💬 Conversation avec {supplierName}
      </h4>

      {/* Message list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', marginBottom: 10 }}>
        {loading ? <div className="loading">Chargement…</div> :
         messages.length === 0 ? (
           <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
             Aucun message — commencez la conversation
           </p>
         ) : messages.map(m => {
          const isVendor = m.sender_type === 'vendor';
          return (
            <div key={m.id} style={{
              display: 'flex', justifyContent: isVendor ? 'flex-end' : 'flex-start',
              marginBottom: 10,
            }}>
              <div style={{
                maxWidth: '80%',
                background: isVendor ? 'rgba(212,161,46,.15)' : 'var(--card2)',
                border: `1px solid ${isVendor ? 'rgba(212,161,46,.3)' : 'var(--border)'}`,
                borderRadius: isVendor ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                padding: '8px 12px',
              }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>
                  {isVendor ? `📤 ${m.sender_name || 'Vous'}` : `📥 ${supplierName}`}
                  {' · '}{m.created_at ? new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{m.message}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <input
          className="form-input"
          style={{ flex: 1 }}
          placeholder="Message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
        />
        <button className="btn btn-primary btn-sm" onClick={send} disabled={!input.trim()}>
          Envoyer →
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ONGLET SCORE DE CONFIANCE
// ═══════════════════════════════════════════════════════════════
function TabTrustScore({ supplierId }) {
  const [score, setScore]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/suppliers/${supplierId}/trust-score`)
      .then(d => { setScore(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [supplierId]);

  if (loading) return <div className="loading">Calcul du score…</div>;
  if (!score)  return <p style={{ color: 'var(--muted)' }}>Aucun historique disponible.</p>;

  const s = score.score || 50;
  const color = s >= 80 ? '#2dd4a0' : s >= 60 ? '#f0923c' : '#ef6461';
  const label = s >= 80 ? 'Excellent' : s >= 60 ? 'Correct' : 'À améliorer';

  const metrics = [
    { icon: '✅', label: 'Paiements à temps', value: `${score.on_time_payments}/${score.total_transactions}` },
    { icon: '⚠️', label: 'Retards',           value: score.late_payments },
    { icon: '📊', label: 'Volume total',       value: fmt(score.total_volume) },
    { icon: '📅', label: 'Retard moyen',       value: `${score.average_delay_days} jours` },
    { icon: '🔄', label: 'Transactions',       value: score.total_transactions },
  ];

  return (
    <div>
      {/* Score ring */}
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 120, height: 120, borderRadius: '50%',
          border: `8px solid ${color}`,
          boxShadow: `0 0 30px ${color}44`,
          marginBottom: 12,
        }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 900, color }}>{s}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>/100</div>
          </div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
          Score de confiance — mis à jour automatiquement
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 20, padding: '0 20px' }}>
        <div style={{ height: 12, background: 'var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${s}%`, background: color,
                         borderRadius: 8, transition: 'width .6s ease' }} />
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {metrics.map(m => (
          <div key={m.label} style={{ background: 'var(--card2)', borderRadius: 8, padding: '10px 14px',
                                       border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>{m.icon} {m.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="form-card" style={{ marginTop: 16 }}>
        <h4 style={{ fontSize: 12, marginBottom: 8, color: 'var(--muted)' }}>CALCUL DU SCORE</h4>
        {[
          ['✅', 'Paiement à temps', '+5 pts'],
          ['🟡', 'Retard < 7 jours', '-2 pts'],
          ['🟠', 'Retard 7-30 jours', '-5 pts'],
          ['🔴', 'Retard > 30 jours', '-10 pts'],
          ['📈', 'Volume > 500 000 FCFA', '+5 pts bonus'],
          ['🔄', '10+ transactions', '+5 pts bonus'],
        ].map(([icon, label, pts]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
                                     fontSize: 11, padding: '3px 0', color: 'var(--muted)' }}>
            <span>{icon} {label}</span>
            <span style={{ color: pts.startsWith('+') ? '#2dd4a0' : '#ef6461', fontWeight: 700 }}>{pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function SupplierCreditPanel({ supplier, onClose, userName }) {
  const [tab, setTab] = useState('dashboard');

  const TABS = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'invoices',  label: '📄 Factures'  },
    { id: 'payments',  label: '💳 Paiements' },
    { id: 'messages',  label: '💬 Messages'  },
    { id: 'score',     label: '📈 Score'     },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
      zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 16, width: '100%', maxWidth: 720,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,.5)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)',
                       display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text)' }}>
              🏭 {supplier.name}
            </h3>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {supplier.phone && `📱 ${supplier.phone}`}
              {supplier.city && ` · 📍 ${supplier.city}`}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', fontSize: 22, lineHeight: 1,
          }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0 20px', borderBottom: '1px solid var(--border)',
                       display: 'flex', gap: 0, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 14px', fontSize: 12, fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? 'var(--accent)' : 'var(--muted)',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              whiteSpace: 'nowrap', transition: 'all .15s',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {tab === 'dashboard' && <TabDashboard supplierId={supplier.id} supplierName={supplier.name} />}
          {tab === 'invoices'  && <TabInvoices  supplierId={supplier.id} />}
          {tab === 'payments'  && <TabPayments  supplierId={supplier.id} />}
          {tab === 'messages'  && <TabMessages  supplierId={supplier.id} supplierName={supplier.name} userName={userName} />}
          {tab === 'score'     && <TabTrustScore supplierId={supplier.id} />}
        </div>
      </div>
    </div>
  );
}
