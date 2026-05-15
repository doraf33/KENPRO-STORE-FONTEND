import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { suppliersAPI, creditsAPI, creditPaymentsAPI } from '../api';
import { useToast } from '../context/AppContext';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';

function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const { t } = useTranslation(['suppliers', 'common']);
  const [stats, setStats] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [showCredit, setShowCredit] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', city: '' });
  const [creditForm, setCreditForm] = useState({ supplier_id: '', description: '', amount: '' });
  const [paymentForm, setPaymentForm] = useState({ supplier_id: '', amount: '', description: '' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { const res = await suppliersAPI.getAll(); setSuppliers(res.data.suppliers); setStats(res.data.stats || {}); }
    catch (err) { console.error(err); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name) return;
    try { await suppliersAPI.create(form); setForm({ name: '', phone: '', email: '', city: '' }); setShowForm(false); load(); }
    catch (err) { alert(err?.response?.data?.detail || err?.response?.data?.error || 'Erreur'); }
  };

  const handleCredit = async () => {
    if (!creditForm.supplier_id || !creditForm.amount || !creditForm.description) return;
    try { await creditsAPI.create({ ...creditForm, amount: Number(creditForm.amount), supplier_id: Number(creditForm.supplier_id) }); setCreditForm({ supplier_id: '', description: '', amount: '' }); setShowCredit(false); load(); }
    catch (err) { alert(err?.response?.data?.detail || err?.response?.data?.error || 'Erreur'); }
  };

  const handlePayment = async () => {
    if (!paymentForm.supplier_id || !paymentForm.amount) return;
    try { await creditPaymentsAPI.create({ ...paymentForm, amount: Number(paymentForm.amount), supplier_id: Number(paymentForm.supplier_id) }); setPaymentForm({ supplier_id: '', amount: '', description: '' }); setShowPayment(false); load(); }
    catch (err) { alert(err?.response?.data?.detail || err?.response?.data?.error || 'Erreur'); }
  };

  if (loading) return <div className="loading">{t('common:loading')}</div>;

  return (
    <div>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 10 }}>
        <h2>🚚 Fournisseurs ({suppliers.length})</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={() => setShowForm(true)}>+ Fournisseur</button>
          <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #f0923c, #d4781e)' }} onClick={() => setShowCredit(true)}>+ Credit</button>
          <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #2dd4a0, #1faa80)' }} onClick={() => setShowPayment(true)}>+ Paiement</button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card"><span className="stat-icon">📝</span><span className="stat-label">Total credits</span><span className="stat-value orange">{fmt(stats.total_credits)}</span></div>
        <div className="stat-card"><span className="stat-icon">💸</span><span className="stat-label">Rembourse</span><span className="stat-value green">{fmt(stats.total_payments)}</span></div>
        <div className="stat-card"><span className="stat-icon">⚠️</span><span className="stat-label">Reste a payer</span><span className="stat-value red">{fmt(stats.total_balance)}</span></div>
      </div>

      {showForm && (
        <div className="form-card"><h3>Nouveau fournisseur</h3>
          <div className="form-grid">
            <input placeholder="Nom *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input placeholder="Telephone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Ville" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="form-actions"><button className="btn-primary" onClick={handleCreate}>Ajouter</button><button className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button></div>
        </div>
      )}

      {showCredit && (
        <div className="form-card"><h3 style={{ color: '#f0923c' }}>Enregistrer un credit</h3>
          <div className="form-grid">
            <select value={creditForm.supplier_id} onChange={e => setCreditForm({ ...creditForm, supplier_id: e.target.value })}>
              <option value="">— Fournisseur —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="number" placeholder="Montant (FCFA) *" value={creditForm.amount} onChange={e => setCreditForm({ ...creditForm, amount: e.target.value })} />
          </div>
          <input placeholder="Description *" value={creditForm.description} onChange={e => setCreditForm({ ...creditForm, description: e.target.value })} style={{ width: '100%', padding: '11px 14px', background: '#1c2030', border: '1px solid #252a3a', borderRadius: 10, color: '#eaedf3', fontSize: 14, marginBottom: 12, fontFamily: 'inherit' }} />
          <div className="form-actions"><button className="btn-primary" style={{ background: '#f0923c' }} onClick={handleCredit}>Enregistrer</button><button className="btn-secondary" onClick={() => setShowCredit(false)}>Annuler</button></div>
        </div>
      )}

      {showPayment && (
        <div className="form-card"><h3 style={{ color: '#2dd4a0' }}>Rembourser un fournisseur</h3>
          <div className="form-grid">
            <select value={paymentForm.supplier_id} onChange={e => setPaymentForm({ ...paymentForm, supplier_id: e.target.value })}>
              <option value="">— Fournisseur —</option>
              {suppliers.filter(s => s.balance > 0).map(s => <option key={s.id} value={s.id}>{s.name} (doit: {fmt(s.balance)})</option>)}
            </select>
            <input type="number" placeholder="Montant (FCFA) *" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
          </div>
          <input placeholder="Note" value={paymentForm.description} onChange={e => setPaymentForm({ ...paymentForm, description: e.target.value })} style={{ width: '100%', padding: '11px 14px', background: '#1c2030', border: '1px solid #252a3a', borderRadius: 10, color: '#eaedf3', fontSize: 14, marginBottom: 12, fontFamily: 'inherit' }} />
          <div className="form-actions"><button className="btn-primary" style={{ background: '#2dd4a0' }} onClick={handlePayment}>Enregistrer</button><button className="btn-secondary" onClick={() => setShowPayment(false)}>Annuler</button></div>
        </div>
      )}

      <div className="cards-list">{suppliers.map(s => (
        <div key={s.id} className="list-card">
          <div><div className="bold">{s.name}</div><div className="muted small">📱 {s.phone || '—'}</div></div>
          <div className="text-right">
            <div className="muted small">Solde</div>
            <div className={`bold ${s.balance > 0 ? 'orange' : 'green'}`}>{s.balance > 0 ? fmt(s.balance) : 'Solde ✓'}</div>
          </div>
        </div>
      ))}</div>
    </div>
  );
}

// ============================================================
// JOURNAUX
// ============================================================

export default Suppliers;
