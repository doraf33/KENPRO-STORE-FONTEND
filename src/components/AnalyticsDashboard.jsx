/**
 * AnalyticsDashboard — Analytics marketing pour admin boutique.
 */
import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const apiFetch = (path) =>
  fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('kenpro_token')}`,
      'X-Tenant-Slug': localStorage.getItem('kenpro_tenant_slug') || 'kenpro-store',
    },
  }).then(r => r.json());

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0;
  return (
    <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width .4s' }} />
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [data,    setData]    = useState(null);
  const [rating,  setRating]  = useState(null);
  const [days,    setDays]    = useState(30);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch(`/my-shop/analytics?days=${days}`),
      apiFetch('/my-shop/rating'),
    ]).then(([a, r]) => { setData(a); setRating(r); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [days]);

  if (loading) return <div className="loading">Chargement analytics…</div>;
  if (!data)   return <div className="form-card"><p style={{ color: 'var(--muted)' }}>Aucune donnée</p></div>;

  const kpis = [
    { label: 'Pages vues',       value: data.page_views    || 0, color: '#5b9cf6', icon: '👁️' },
    { label: 'Vues produits',    value: data.product_views || 0, color: '#9b7ff0', icon: '📦' },
    { label: 'Ajouts panier',    value: data.add_to_cart   || 0, color: '#f0923c', icon: '🛒' },
    { label: 'Achats',           value: data.purchases     || 0, color: '#2dd4a0', icon: '💰' },
    { label: 'Taux conversion',  value: `${data.conversion_rate || 0}%`, color: '#d4a12e', icon: '📈' },
    { label: 'Note boutique',    value: `${rating?.average || '—'}/5 (${rating?.total || 0} avis)`, color: '#d4a12e', icon: '⭐' },
  ];

  const deviceData = data.by_device || {};
  const totalDevice = Object.values(deviceData).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="page-header">
        <h2>📊 Analytics</h2>
        <div className="period-tabs">
          {[[7,'7j'],[30,'30j'],[90,'90j']].map(([d, l]) => (
            <button key={d} className={`period-tab${days === d ? ' active' : ''}`} onClick={() => setDays(d)}>{l}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 20 }}>
        {kpis.map(k => (
          <div key={k.label} className="kpi-fintech" style={{ '--kpi-color': k.color }}>
            <div className="kpi-label">{k.icon} {k.label}</div>
            <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Appareils */}
        <div className="form-card">
          <h3 style={{ marginBottom: 14, fontSize: 13 }}>📱 Appareils</h3>
          {[['mobile','Mobile',total => deviceData.mobile || 0],
            ['desktop','Desktop',total => deviceData.desktop || 0],
            ['tablet','Tablette',total => deviceData.tablet || 0]].map(([k, l, fn]) => {
            const v = fn(totalDevice);
            return (
              <div key={k} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                  <span style={{ color: 'var(--text)' }}>{l}</span>
                  <span style={{ color: 'var(--muted)' }}>{v} ({totalDevice > 0 ? Math.round(v/totalDevice*100) : 0}%)</span>
                </div>
                <MiniBar value={v} max={totalDevice} color={k === 'mobile' ? '#5b9cf6' : k === 'desktop' ? '#2dd4a0' : '#f0923c'} />
              </div>
            );
          })}
        </div>

        {/* Funnel conversion */}
        <div className="form-card">
          <h3 style={{ marginBottom: 14, fontSize: 13 }}>🔄 Entonnoir de conversion</h3>
          {[
            ['👁️ Pages vues',   data.page_views    || 0],
            ['📦 Vues produits', data.product_views || 0],
            ['🛒 Ajouts panier', data.add_to_cart   || 0],
            ['💰 Achats',        data.purchases     || 0],
          ].map(([label, val]) => (
            <div key={label} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--muted)' }}>{label}</span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{val.toLocaleString('fr-FR')}</span>
              </div>
              <MiniBar value={val} max={data.page_views || 1} color="#d4a12e" />
            </div>
          ))}
          <div style={{ marginTop: 12, padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 12 }}>
            <span style={{ color: 'var(--muted)' }}>Taux global : </span>
            <span style={{ color: '#2dd4a0', fontWeight: 700 }}>{data.conversion_rate || 0}%</span>
          </div>
        </div>
      </div>

      <div className="form-card" style={{ marginTop: 14 }}>
        <p style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center' }}>
          📊 Données sur les {days} derniers jours · Total événements : {(data.total_events || 0).toLocaleString('fr-FR')}
        </p>
      </div>
    </div>
  );
}
