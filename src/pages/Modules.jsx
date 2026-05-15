import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { modulesAPI, adminReportsAPI } from '../api';
import { useToast } from '../context/AppContext';

const DEFAULT_PERMS = {
  nav_items: ['vendor_dashboard', 'my_reports'],
  can_view: ['own_sales', 'own_reports', 'products'],
  can_create: ['reports'],
  can_edit: [],
  can_delete: [],
  data_scope: 'own',
};
const PERM_OPTIONS = {
  nav_items:  ['vendor_dashboard', 'my_reports', 'products', 'clients', 'invoices', 'dashboard'],
  can_view:   ['own_sales', 'own_reports', 'all_sales', 'all_reports', 'products', 'clients', 'finances'],
  can_create: ['reports', 'invoices', 'products'],
  can_edit:   ['products', 'invoices', 'reports_own'],
  can_delete: ['reports_own'],
};

function ModulePermCheckbox({ label, group, value, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginBottom: 4 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(group, value, e.target.checked)}
        style={{ accentColor: '#5b9cf6' }} />
      {label}
    </label>
  );
}

function ModuleForm({ module, onSave, onCancel }) {
  const { t } = useTranslation(['modules', 'common']);
  const [form, setForm] = useState({
    name: module?.name || '', icon: module?.icon || '📦',
    color: module?.color || '#5b9cf6', description: module?.description || '',
    is_active: module?.is_active ?? true,
    permissions: module?.permissions || { ...DEFAULT_PERMS },
  });

  const togglePerm = (group, val, checked) => {
    setForm(prev => {
      const list = [...(prev.permissions[group] || [])];
      if (checked && !list.includes(val)) list.push(val);
      if (!checked) { const i = list.indexOf(val); if (i >= 0) list.splice(i, 1); }
      return { ...prev, permissions: { ...prev.permissions, [group]: list } };
    });
  };

  return (
    <div className="form-card" style={{ maxWidth: 600 }}>
      <h3 style={{ marginBottom: 16 }}>{module ? 'Modifier le module' : 'Nouveau module'}</h3>
      <div className="form-grid">
        <input placeholder="Nom du module *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="form-input" />
        <input placeholder="Icône (emoji)" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} className="form-input" style={{ maxWidth: 100 }} />
        <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ height: 40, width: 80, border: 'none', background: 'none', cursor: 'pointer' }} />
        <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="form-input" />
      </div>
      <div style={{ marginTop: 16 }}>
        <h4 style={{ fontSize: 13, marginBottom: 10, color: '#7a8094' }}>{t('modules:permissions')}</h4>
        {Object.entries(PERM_OPTIONS).map(([group, opts]) => (
          <div key={group} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', color: '#5b9cf6' }}>{group.replace('_', ' ')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px' }}>
              {opts.map(opt => (
                <ModulePermCheckbox key={opt} group={group} value={opt} label={opt}
                  checked={(form.permissions[group] || []).includes(opt)}
                  onChange={togglePerm} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer' }}>
        <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
        Module actif
      </label>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn-primary" onClick={() => onSave(form)}>Enregistrer</button>
        <button className="btn-secondary" onClick={onCancel}>Annuler</button>
      </div>
    </div>
  );
}

function AssignModuleModal({ module, users, onAssign, onClose }) {
  const [userId, setUserId] = useState('');
  const [target, setTarget]  = useState(0);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="form-card" style={{ width: 380 }}>
        <h3>Assigner "{module.name}" à un utilisateur</h3>
        <select value={userId} onChange={e => setUserId(e.target.value)} className="form-input" style={{ marginTop: 12 }}>
          <option value="">-- Choisir un utilisateur --</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.username}) — {u.role}</option>)}
        </select>
        <input type="number" placeholder="Objectif journalier (FCFA)" value={target}
          onChange={e => setTarget(e.target.value)} className="form-input" style={{ marginTop: 10 }} />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn-primary" onClick={() => userId && onAssign(userId, target)} disabled={!userId}>Assigner</button>
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

function ModuleManager() {
  const { t } = useTranslation(['modules', 'common']);
  const [modules, setModules]   = useState([]);
  const [users, setUsers]       = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editMod, setEditMod]   = useState(null);
  const [assignMod, setAssignMod] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('modules');

  const load = async () => {
    try {
      const [mRes, uRes] = await Promise.all([modulesAPI.getAll(), modulesAPI.getUsers()]);
      setModules(mRes.data.modules || []);
      setUsers(uRes.data.users || []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (data) => {
    try {
      if (editMod) await modulesAPI.update(editMod.id, data);
      else await modulesAPI.create(data);
      setShowForm(false); setEditMod(null); load();
    } catch (e) { alert(e?.response?.data?.detail || e?.response?.data?.error || 'Erreur'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce module ?')) return;
    try { await modulesAPI.delete(id); load(); } catch {}
  };

  const handleAssign = async (userId, target) => {
    try {
      await modulesAPI.assign(assignMod.id, { user_id: Number(userId), daily_target: Number(target) });
      setAssignMod(null); load(); alert('Module assigné avec succès !');
    } catch (e) { alert(e?.response?.data?.detail || e?.response?.data?.error || 'Erreur'); }
  };

  const handleUnassign = async (mid, uid, uname) => {
    if (!confirm(`Retirer le module à ${uname} ?`)) return;
    try { await modulesAPI.unassign(mid, uid); load(); } catch {}
  };

  if (loading) return <div className="loading">{t('common:loading')}</div>;

  return (
    <div>
      <div className="page-header">
        <h2>⚙️ Gestionnaire de modules</h2>
        <button className="btn-primary" onClick={() => { setEditMod(null); setShowForm(true); }}>+ Nouveau module</button>
      </div>

      <div className="period-tabs" style={{ marginBottom: 20 }}>
        {[['modules', 'Modules'], ['users', 'Utilisateurs & modules']].map(([k, l]) => (
          <button key={k} className={`period-tab${activeTab === k ? ' active' : ''}`} onClick={() => setActiveTab(k)}>{l}</button>
        ))}
      </div>

      {showForm && <ModuleForm module={editMod} onSave={handleSave} onCancel={() => { setShowForm(false); setEditMod(null); }} />}

      {activeTab === 'modules' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 8 }}>
          {modules.map(m => (
            <div key={m.id} className="kpi-card" style={{ borderTop: `3px solid ${m.color}`, opacity: m.is_active ? 1 : .55 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 28 }}>{m.icon}</span>
                <span style={{ fontSize: 11, background: m.is_active ? '#2dd4a020' : '#ef646120', color: m.is_active ? '#2dd4a0' : '#ef6461', borderRadius: 20, padding: '2px 10px' }}>
                  {m.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{m.name}</div>
              <div style={{ fontSize: 12, color: '#7a8094', marginBottom: 8 }}>{m.description}</div>
              <div style={{ fontSize: 12, color: '#5b9cf6', marginBottom: 12 }}>{m.user_count} utilisateur(s)</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => { setEditMod(m); setShowForm(true); }}>Modifier</button>
                <button className="btn-secondary" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => setAssignMod(m)}>Assigner</button>
                <button onClick={() => handleDelete(m.id)} style={{ fontSize: 12, padding: '5px 8px', background: '#ef646120', color: '#ef6461', border: 'none', borderRadius: 6, cursor: 'pointer' }}>X</button>
              </div>
            </div>
          ))}
          {modules.length === 0 && <p style={{ color: '#7a8094' }}>Aucun module créé.</p>}
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          {users.map(u => (
            <div key={u.id} className="form-card" style={{ marginBottom: 12, padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{u.name}</span>
                  <span style={{ color: '#7a8094', fontSize: 13, marginLeft: 10 }}>@{u.username} — {u.role}</span>
                </div>
                <span style={{ fontSize: 12, color: '#5b9cf6' }}>{u.modules?.length || 0} module(s)</span>
              </div>
              {(u.modules || []).map(um => (
                <div key={um.id} style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(91,156,246,.06)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{um.module?.icon} {um.module?.name}</span>
                  <span style={{ fontSize: 12, color: '#7a8094' }}>Obj: {Number(um.daily_target || 0).toLocaleString('fr-FR')} FCFA</span>
                  <button onClick={() => handleUnassign(um.module_id, u.id, u.name)} style={{ fontSize: 11, color: '#ef6461', background: 'none', border: 'none', cursor: 'pointer' }}>Retirer</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {assignMod && (
        <AssignModuleModal module={assignMod} users={users.filter(u => u.role !== 'admin')}
          onAssign={handleAssign} onClose={() => setAssignMod(null)} />
      )}
    </div>
  );
}

// ============================================================
// TABLEAU DE BORD VENDEUR
// ============================================================

export { ModuleManager };
