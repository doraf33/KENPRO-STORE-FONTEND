import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { clientsAPI } from '../api';
import { useToast } from '../context/AppContext';

function Clients() {
  const { t } = useTranslation(['clients', 'common']);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', city: '' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { const res = await clientsAPI.getAll({ search }); setClients(res.data.clients); } catch (err) { console.error(err); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [search]);

  const resetForm = () => { setForm({ name: '', phone: '', email: '', address: '', city: '' }); setEditId(null); setShowForm(false); };

  const handleSave = async () => {
    if (!form.name) return;
    try {
      if (editId) { await clientsAPI.update(editId, form); }
      else { await clientsAPI.create(form); }
      resetForm(); load();
    } catch (err) { alert(err?.response?.data?.detail || err?.response?.data?.error || 'Erreur'); }
  };

  const handleEdit = (c) => {
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', city: c.city || '' });
    setEditId(c.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ?')) return;
    try { await clientsAPI.delete(id); load(); } catch (err) { alert(err?.response?.data?.detail || err?.response?.data?.error || 'Erreur'); }
  };

  if (loading) return <div className="loading">{t('common:loading')}</div>;

  return (
    <div>
      <div className="page-header"><h2>👥 Clients ({clients.length})</h2><button className="btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>+ Client</button></div>
      <input type="text" placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="search-input" />
      {showForm && (
        <div className="form-card"><h3>{editId ? 'Modifier le client' : 'Nouveau client'}</h3>
          <div className="form-grid">
            <input placeholder="Nom *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input placeholder="Telephone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Adresse" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            <input placeholder="Ville" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="form-actions"><button className="btn-primary" onClick={handleSave}>{editId ? 'Enregistrer' : 'Ajouter'}</button><button className="btn-secondary" onClick={resetForm}>Annuler</button></div>
        </div>
      )}
      <div className="cards-list">{clients.map(c => (
        <div key={c.id} className="list-card">
          <div><div className="bold">{c.name}</div><div className="muted small">📱 {c.phone || '—'} &nbsp; 📧 {c.email || '—'}</div>
            {c.city && <div className="muted small">📍 {c.city} {c.address && `— ${c.address}`}</div>}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-icon" onClick={() => handleEdit(c)}>✏️</button>
            <button className="btn-icon red" onClick={() => handleDelete(c.id)}>🗑️</button>
          </div>
        </div>
      ))}</div>
    </div>
  );
}

// ============================================================
// FACTURES / DEVIS
// ============================================================

export default Clients;
