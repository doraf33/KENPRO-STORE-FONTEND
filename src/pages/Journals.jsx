import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { creditsAPI, suppliersAPI } from '../api';
import { useToast } from '../context/AppContext';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';

function Journals() {
  const [invoices, setInvoices] = useState([]);
  const { t } = useTranslation(['common']);
  const [credits, setCredits] = useState([]);
  const [tab, setTab] = useState('sales');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [invRes, crRes] = await Promise.all([invoicesAPI.getAll({ type: 'facture' }), creditsAPI.getAll()]);
        setInvoices(invRes.data.invoices.filter(i => i.status === 'payee'));
        setCredits(crRes.data.credits);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="loading">{t('common:loading')}</div>;

  const totalSales = invoices.reduce((s, i) => s + i.total, 0);
  const totalPurchases = credits.reduce((s, c) => s + c.amount, 0);

  return (
    <div>
      <h2>📒 Journaux</h2>
      <div className="filter-bar">
        <button className={`btn-filter ${tab === 'sales' ? 'active' : ''}`} style={tab === 'sales' ? { background: '#2dd4a0', borderColor: '#2dd4a0' } : {}} onClick={() => setTab('sales')}>📗 Ventes ({invoices.length})</button>
        <button className={`btn-filter ${tab === 'purchases' ? 'active' : ''}`} style={tab === 'purchases' ? { background: '#f0923c', borderColor: '#f0923c' } : {}} onClick={() => setTab('purchases')}>📕 Achats ({credits.length})</button>
      </div>

      {tab === 'sales' && (
        <div>
          <div className="stat-card" style={{ marginBottom: 16 }}><span className="stat-label">Total ventes</span><span className="stat-value green">{fmt(totalSales)}</span></div>
          {invoices.length === 0 ? <div className="loading">Aucune vente enregistree</div> :
            <div className="cards-list">{invoices.map(inv => (
              <div key={inv.id} className="list-card">
                <div><div className="bold">{inv.number} — {inv.client_name}</div><div className="muted small">{inv.created_at} | {inv.items?.map(it => `${it.product_name} x${it.quantity}`).join(', ')}</div></div>
                <span className="green bold">{fmt(inv.total)}</span>
              </div>
            ))}</div>
          }
        </div>
      )}

      {tab === 'purchases' && (
        <div>
          <div className="stat-card" style={{ marginBottom: 16 }}><span className="stat-label">Total achats (credits)</span><span className="stat-value orange">{fmt(totalPurchases)}</span></div>
          {credits.length === 0 ? <div className="loading">Aucun achat enregistre</div> :
            <div className="cards-list">{credits.map(c => (
              <div key={c.id} className="list-card">
                <div><div className="bold">{c.description}</div><div className="muted small">{c.date} — 🚚 {c.supplier_name}</div></div>
                <span className="orange bold">{fmt(c.amount)}</span>
              </div>
            ))}</div>
          }
        </div>
      )}
    </div>
  );
}

// ============================================================
// NOTIFICATIONS — Cloche
// ============================================================

export default Journals;
