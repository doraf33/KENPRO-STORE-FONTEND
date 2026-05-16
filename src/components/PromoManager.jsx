/**
 * PromoManager — Gestion des codes promo admin boutique.
 */
import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const token = () => localStorage.getItem('kenpro_token');
const slug  = () => localStorage.getItem('kenpro_tenant_slug') || 'kenpro-store';

const apiFetch = (path, method = 'GET', body = null) =>
  fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      'X-Tenant-Slug': slug(),
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).then(r => r.json());

const fmt = n => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';

const EMPTY = { code: '', type: 'percent', value: '', min_amount: '', max_uses: '', description: '', expires_at: '' };

export default function PromoManager() {
  const [promos,   setPromos]   = useState([]);
  const [form,     setForm]     = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [msg,      setMsg]      = useState({ type: '', text: '' });

  const load = () => {
    setLoading(true);
    apiFetch('/my-shop/promos').then(d => { setPromos(d.promos || []); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.code || !form.value) { setMsg({ type: 'error', text: 'Code et valeur requis' }); return; }
    try {
      await apiFetch('/my-shop/promos', 'POST', {
        code:        form.code.toUpperCase(),
        type:        form.type,
        value:       parseFloat(form.value),
        min_amount:  parseFloat(form.min_amount || 0),
        max_uses:    form.max_uses ? parseInt(form.max_uses) : null,
        description: form.description,
        expires_at:  form.expires_at ? new Date(form.expires_at).toISOString() : null,
      });
      setMsg({ type: 'success', text: 'Code promo créé !' });
      setForm(EMPTY); setShowForm(false); load();
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Erreur' });
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>🏷️ Codes Promotionnels</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setMsg({ type:'',text:'' }); }}>
          {showForm ? '✕ Annuler' : '+ Nouveau code'}
        </button>
      </div>

      {msg.text && (
        <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                      background: msg.type === 'success' ? 'rgba(45,212,160,.1)' : 'rgba(239,100,97,.1)',
                      color: msg.type === 'success' ? '#2dd4a0' : '#ef6461' }}>
          {msg.text}
        </div>
      )}

      {/* Formulaire création */}
      {showForm && (
        <div className="form-card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 14, fontSize: 14 }}>Nouveau code promo</h3>
          <div className="form-grid">
            <input className="form-input" placeholder="Code (ex: NOEL2026) *"
                   value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
            <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="percent">% de réduction</option>
              <option value="fixed">Montant fixe (FCFA)</option>
            </select>
            <input className="form-input" placeholder={`Valeur (${form.type === 'percent' ? '%' : 'FCFA'}) *`}
                   type="number" min="0" max={form.type === 'percent' ? 100 : undefined}
                   value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
            <input className="form-input" placeholder="Montant minimum d'achat (FCFA)"
                   type="number" value={form.min_amount} onChange={e => setForm(f => ({ ...f, min_amount: e.target.value }))} />
            <input className="form-input" placeholder="Nombre max d'utilisations"
                   type="number" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} />
            <input className="form-input" placeholder="Date d'expiration"
                   type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
          </div>
          <input className="form-input" placeholder="Description (optionnel)"
                 value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                 style={{ width: '100%', marginTop: 10 }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn btn-primary btn-sm" onClick={save}>Créer le code</button>
            <button className="btn btn-sm" style={{ background: 'var(--card2)', color: 'var(--text)', border: '1px solid var(--border)' }}
                    onClick={() => { setShowForm(false); setForm(EMPTY); }}>Annuler</button>
          </div>
        </div>
      )}

      {/* Liste des codes */}
      {loading ? (
        <div className="loading">Chargement…</div>
      ) : promos.length === 0 ? (
        <div className="form-card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏷️</div>
          <p style={{ color: 'var(--muted)' }}>Aucun code promo créé.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Code</th><th>Réduction</th><th>Min. achat</th>
                <th>Utilisations</th><th>Expire le</th><th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {promos.map(p => (
                <tr key={p.id}>
                  <td>
                    <code style={{ background: 'var(--card2)', padding: '2px 8px', borderRadius: 4,
                                   fontWeight: 700, color: 'var(--accent)', fontSize: 13 }}>
                      {p.code}
                    </code>
                    {p.description && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{p.description}</div>}
                  </td>
                  <td style={{ fontWeight: 700, color: '#2dd4a0' }}>
                    {p.type === 'percent' ? `${p.value}%` : fmt(p.value)}
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>
                    {p.min_amount > 0 ? fmt(p.min_amount) : '—'}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {p.uses_count}{p.max_uses ? `/${p.max_uses}` : ''}
                    <div style={{ height: 3, background: 'var(--border)', borderRadius: 3, marginTop: 4, maxWidth: 80, overflow: 'hidden' }}>
                      {p.max_uses > 0 && (
                        <div style={{ height: '100%', width: `${Math.min(100, p.uses_count / p.max_uses * 100)}%`,
                                      background: '#2dd4a0', borderRadius: 3 }} />
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {p.expires_at ? new Date(p.expires_at).toLocaleDateString('fr-FR') : '∞'}
                  </td>
                  <td>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 600,
                                   background: p.is_active ? 'rgba(45,212,160,.15)' : 'rgba(239,100,97,.1)',
                                   color: p.is_active ? '#2dd4a0' : '#ef6461' }}>
                      {p.is_active ? '✅ Actif' : '❌ Inactif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
