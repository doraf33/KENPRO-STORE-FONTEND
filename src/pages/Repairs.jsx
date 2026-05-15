import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { repairsAPI, clientsAPI } from '../api';
import { ticketsAPI } from '../api';
import { BarcodeScanner } from '../BarcodeScanner';
import RepairTicketPrinter from '../components/RepairTicketPrinter';
import RepairLabelPrinter from '../components/RepairLabelPrinter';
import { useToast } from '../context/AppContext';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';

function Repairs() {
  const { t } = useTranslation(['repairs', 'common']);
  const [repairs,       setRepairs]       = useState([]);
  const [filter,        setFilter]        = useState('');
  const [showForm,      setShowForm]      = useState(false);
  const [clients,       setClients]       = useState([]);
  const [form,          setForm]          = useState({ client_id: '', device_type: 'laptop', brand: '', model: '', serial_number: '', problem: '', estimated_cost: '', priority: 'normal' });
  const [loading,       setLoading]       = useState(true);
  const [ticketRepair,   setTicketRepair]   = useState(null);  // pour RepairTicketPrinter
  const [labelRepair,    setLabelRepair]    = useState(null);  // pour RepairLabelPrinter
  const [scanRepairOpen, setScanRepairOpen] = useState(false); // scanner barcode → REP
  const { show: showToast } = useToast();

  const handleRepairScan = async (code) => {
    setScanRepairOpen(false);
    // code peut être "REP-0001" ou juste "REP-0001" depuis JsBarcode
    const ticket = code.trim().toUpperCase();
    try {
      const res = await repairsAPI.getAll({ search: ticket });
      const found = (res.data.repairs || []).find(r =>
        r.ticket === ticket || r.ticket === code
      );
      if (found) {
        setLabelRepair(found);
        showToast('Réparation trouvée', `${found.ticket} — ${found.client_name}`, 'success');
      } else {
        showToast('Introuvable', `Aucune réparation pour "${ticket}"`, 'error');
      }
    } catch {
      showToast('Erreur', 'Impossible de récupérer la réparation', 'error');
    }
  };

  const STATUSES = ['recu', 'diagnostic', 'attente_piece', 'en_reparation', 'termine', 'livre'];
  const STATUS_LABELS = { recu: 'Recu', diagnostic: 'Diagnostic', attente_piece: 'Att. piece', en_reparation: 'En repar.', termine: 'Termine', livre: 'Livre' };

  // Messages WhatsApp automatiques selon le statut
  const WA_MESSAGES = {
    diagnostic:    (r) => `Bonjour ${r.client_name},\n📋 Votre ${r.device_type} (Ticket: *${r.ticket}*) est en cours de diagnostic.\nNous vous tiendrons informé.`,
    attente_piece: (r) => `Bonjour ${r.client_name},\n⏳ Votre ${r.device_type} (Ticket: *${r.ticket}*) est en attente d'une pièce.\nNous vous contacterons dès la réception.`,
    en_reparation: (r) => `Bonjour ${r.client_name},\n🔧 La réparation de votre ${r.device_type} (Ticket: *${r.ticket}*) est en cours.\nNous vous contacterons à la fin.`,
    termine:       (r) => `Bonjour ${r.client_name},\n✅ Votre ${r.device_type} (Ticket: *${r.ticket}*) est *PRÊT* !\nVenez le récupérer muni de votre ticket.\nMerci — KENPRO STORE`,
    livre:         (r) => `Bonjour ${r.client_name},\n📦 Votre ${r.device_type} (Ticket: *${r.ticket}*) vous a été remis.\nMerci pour votre confiance — KENPRO STORE`,
  };

  const load = async () => {
    try { const res = await repairsAPI.getAll(filter ? { status: filter } : {}); setRepairs(res.data.repairs); } catch (err) { console.error(err); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  const openForm = async () => {
    try { const res = await clientsAPI.getAll(); setClients(res.data.clients); } catch (err) { console.error(err); }
    setShowForm(true);
  };

  const handleCreate = async () => {
    if (!form.client_id || !form.problem) { alert('Client et problème obligatoires'); return; }
    try {
      const res = await repairsAPI.create({ ...form, client_id: Number(form.client_id), estimated_cost: Number(form.estimated_cost || 0) });
      setForm({ client_id: '', device_type: 'laptop', brand: '', model: '', serial_number: '', problem: '', estimated_cost: '', priority: 'normal' });
      setShowForm(false);
      await load();
      const newRepair = res.data.repair;
      // Ouvrir le ticket de réception automatiquement après création
      setTicketRepair(newRepair);
      showToast('Ticket créé', newRepair.ticket + ' — Imprimez le ticket + l\'étiquette', 'success');
      // Proposer d'imprimer l'étiquette après 1.5s (laisse le temps de fermer le ticket)
      setTimeout(() => {
        if (window.confirm(`Imprimer l'étiquette autocollante pour cet appareil ?\n(${newRepair.brand} ${newRepair.model})`)) {
          setLabelRepair(newRepair);
        }
      }, 1500);
    } catch (err) { alert(err?.response?.data?.detail || err?.response?.data?.error || 'Erreur'); }
  };

  const nextStatus = async (r) => {
    const idx = STATUSES.indexOf(r.status);
    if (idx >= STATUSES.length - 1) return;
    const newStatus = STATUSES[idx + 1];
    try {
      await repairsAPI.changeStatus(r.id, newStatus, '');
      await load();
      // Notification WhatsApp automatique si le client a un numéro
      if (r.client_phone && WA_MESSAGES[newStatus]) {
        const msg = WA_MESSAGES[newStatus](r);
        const phone = r.client_phone.replace(/\D/g, '');
        showToast(
          '📱 WhatsApp prêt',
          `Statut → ${STATUS_LABELS[newStatus]} — cliquez pour envoyer`,
          'info'
        );
        // Proposer d'ouvrir WhatsApp sans forcer (popup bloqué si non initié)
        if (window.confirm(`Envoyer une notification WhatsApp au client ?\n\n"${msg.slice(0, 100)}..."`)) {
          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
        }
      }
    } catch (err) { alert(err?.response?.data?.detail || err?.response?.data?.error || 'Erreur'); }
  };

  if (loading) return <div className="loading">{t('common:loading')}</div>;

  return (
    <div>
      {ticketRepair && (
        <RepairTicketPrinter repair={ticketRepair} onClose={() => setTicketRepair(null)} />
      )}
      {labelRepair && (
        <RepairLabelPrinter repair={labelRepair} onClose={() => setLabelRepair(null)} />
      )}

      <div className="page-header">
        <h2>🔧 Réparations ({repairs.length})</h2>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-secondary" style={{ fontSize:12 }}
                  onClick={() => setScanRepairOpen(true)} title="Scanner une étiquette REP pour trouver la réparation">
            📷 Scanner REP
          </button>
          <button className="btn-primary" onClick={openForm}>+ Réparation</button>
        </div>
      </div>

      {scanRepairOpen && (
        <BarcodeScanner
          title="Scanner étiquette réparation"
          onDetect={handleRepairScan}
          onClose={() => setScanRepairOpen(false)}
        />
      )}

      <div className="filter-bar">
        <button className={`btn-filter ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>Tout</button>
        {STATUSES.map(s => <button key={s} className={`btn-filter ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>{STATUS_LABELS[s]}</button>)}
      </div>

      {showForm && (
        <div className="form-card"><h3>Nouvelle reparation</h3>
          <div className="form-grid">
            <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
              <option value="">— Client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
            </select>
            <select value={form.device_type} onChange={e => setForm({ ...form, device_type: e.target.value })}>
              <option value="laptop">💻 Laptop</option><option value="desktop">🖥️ PC Bureau</option>
              <option value="phone">📱 Telephone</option><option value="tablet">📲 Tablette</option>
              <option value="printer">🖨️ Imprimante</option><option value="other">🔌 Autre</option>
            </select>
            <input placeholder="Marque" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
            <input placeholder="Modele" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
            <input placeholder="N° Serie" value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} />
            <input type="number" placeholder="Estimation (FCFA)" value={form.estimated_cost} onChange={e => setForm({ ...form, estimated_cost: e.target.value })} />
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
              <option value="basse">{t('repairs:priority_low')}</option><option value="normal">{t('repairs:priority_normal')}</option>
              <option value="haute">{t('repairs:priority_high')}</option><option value="urgente">{t('repairs:priority_urgent')}</option>
            </select>
          </div>
          <textarea placeholder="Probleme decrit par le client *" value={form.problem} onChange={e => setForm({ ...form, problem: e.target.value })}
            style={{ width: '100%', padding: '11px 14px', background: '#1c2030', border: '1px solid #252a3a', borderRadius: 10, color: '#eaedf3', fontSize: 14, minHeight: 80, resize: 'vertical', fontFamily: 'inherit', marginBottom: 12 }} />
          <div className="form-actions"><button className="btn-primary" onClick={handleCreate}>Creer</button><button className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button></div>
        </div>
      )}

      <div className="cards-list">{repairs.map(r => (
        <div key={r.id} className="list-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <span className="gold bold">{r.ticket}</span>
                <span className={`badge badge-${r.status}`}>{STATUS_LABELS[r.status]}</span>
                {r.priority === 'urgente' && <span className="badge badge-rupture">URGENT</span>}
              </div>
              <div>👤 {r.client_name}</div>
              <div className="muted small">{r.brand} {r.model} — {r.device_type}</div>
              <div className="muted small">🔍 {r.problem?.substring(0, 80)}{r.problem?.length > 80 ? '...' : ''}</div>
            </div>
            {r.total_cost > 0 && <span className="gold bold" style={{ fontSize: 16 }}>{fmt(r.total_cost)}</span>}
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn-small btn-secondary" onClick={() => setTicketRepair(r)} title="Ticket thermique 58mm">🎫 Ticket</button>
            <button className="btn-small btn-secondary"
                    style={{ background:'rgba(212,161,46,.1)', color:'#d4a12e', border:'1px solid rgba(212,161,46,.3)' }}
                    onClick={() => setLabelRepair(r)} title="Étiquette autocollante pour l'appareil">
              🏷️ Étiquette
            </button>
            {r.client_phone && WA_MESSAGES[r.status] && (
              <button className="btn-small btn-secondary" style={{ background:'#1c3b2a', color:'#2dd4a0', border:'1px solid #2dd4a0' }}
                onClick={() => { const phone=r.client_phone.replace(/\D/g,''); window.open(`https://wa.me/${phone}?text=${encodeURIComponent(WA_MESSAGES[r.status]?.(r)||'')}`, '_blank'); }}>
                📱 WhatsApp
              </button>
            )}
            {r.status !== 'livre' && STATUSES.indexOf(r.status) < STATUSES.length - 1 && (
              <button className="btn-small btn-primary" onClick={() => nextStatus(r)}>→ {STATUS_LABELS[STATUSES[STATUSES.indexOf(r.status) + 1]]}</button>
            )}
          </div>
        </div>
      ))}</div>
    </div>
  );
}

// ============================================================
// FOURNISSEURS
// ============================================================

export default Repairs;
