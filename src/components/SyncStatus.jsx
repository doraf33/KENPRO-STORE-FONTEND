// ============================================================
// KENPRO STORE — Bannière statut connexion + sync
// Affichée en haut de l'app quand offline ou sync en attente
// ============================================================
import { useState, useEffect } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getQueueCount, clearDoneQueue } from '../services/db';

const COLORS = {
  online:  { bg: '#1a2e1a', border: '#2dd4a0', text: '#2dd4a0', dot: '#2dd4a0' },
  offline: { bg: '#2e1a0a', border: '#f0923c', text: '#f0923c', dot: '#f0923c' },
  slow:    { bg: '#2e280a', border: '#d4a12e', text: '#d4a12e', dot: '#d4a12e' },
  sync:    { bg: '#0a1a2e', border: '#5b9cf6', text: '#5b9cf6', dot: '#5b9cf6' },
};

export default function SyncStatus({ onSyncRequest }) {
  const { isOnline, networkLabel, dataSaver } = useOnlineStatus();
  const [queueCount, setQueueCount]     = useState(0);
  const [syncing,    setSyncing]         = useState(false);
  const [dismissed,  setDismissed]       = useState(false);

  // Rafraîchit le compteur queue toutes les 5s
  useEffect(() => {
    const refresh = () => getQueueCount().then(setQueueCount).catch(() => {});
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []);

  // Relance sync auto quand connexion retrouvée
  useEffect(() => {
    if (isOnline && queueCount > 0) {
      handleSync();
    }
  }, [isOnline]);

  const handleSync = async () => {
    if (syncing || !isOnline) return;
    setSyncing(true);
    try {
      if (onSyncRequest) await onSyncRequest();
      await clearDoneQueue();
      setQueueCount(0);
    } finally {
      setSyncing(false);
    }
  };

  const theme = !isOnline ? COLORS.offline
              : dataSaver  ? COLORS.slow
              : queueCount > 0 ? COLORS.sync
              : COLORS.online;

  // Masquer si tout est OK et bannière rejetée
  if (isOnline && !dataSaver && queueCount === 0 && dismissed) return null;
  // Masquer si tout est OK et jamais de problème
  if (isOnline && !dataSaver && queueCount === 0 && dismissed === false) return null;

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 9999,
      background: theme.bg,
      borderBottom: `1px solid ${theme.border}`,
      padding: '6px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Indicateur point */}
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: theme.dot,
          boxShadow: `0 0 6px ${theme.dot}`,
          flexShrink: 0,
        }} />

        <span style={{ fontSize: 13, color: theme.text, fontWeight: 600 }}>
          {!isOnline
            ? '🔴 Hors ligne — Mode local activé'
            : dataSaver
              ? `🟡 Connexion lente (${networkLabel}) — Mode économie`
              : queueCount > 0
                ? `🔵 En ligne — ${queueCount} action${queueCount > 1 ? 's' : ''} en attente`
                : `🟢 En ligne (${networkLabel})`
          }
        </span>

        {!isOnline && (
          <span style={{ fontSize: 11, color: '#7a8094' }}>
            Consultation OK · Modifications enregistrées localement
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {/* Bouton sync manuel */}
        {isOnline && queueCount > 0 && (
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              background: theme.bg, border: `1px solid ${theme.border}`,
              color: theme.text, borderRadius: 6, padding: '3px 10px',
              cursor: syncing ? 'wait' : 'pointer', fontSize: 12,
            }}
          >
            {syncing ? '⏳ Sync…' : '↑ Synchroniser'}
          </button>
        )}

        {/* Fermer si en ligne */}
        {isOnline && (
          <button
            onClick={() => setDismissed(true)}
            style={{ background: 'none', border: 'none', color: '#7a8094', cursor: 'pointer', fontSize: 16 }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

// ── Indicateur compact pour la sidebar ───────────────────────
export function ConnectionDot() {
  const { isOnline, networkLabel, dataSaver } = useOnlineStatus();
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => getQueueCount().then(setQueueCount).catch(() => {}), 5000);
    getQueueCount().then(setQueueCount).catch(() => {});
    return () => clearInterval(id);
  }, []);

  const color = !isOnline ? '#f0923c' : dataSaver ? '#d4a12e' : '#2dd4a0';
  const label = !isOnline ? 'Hors ligne' : dataSaver ? networkLabel : `En ligne · ${networkLabel}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7a8094' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span>{label}</span>
      {queueCount > 0 && (
        <span style={{ background: '#5b9cf6', color: '#000', borderRadius: 10,
                       padding: '0 5px', fontSize: 10, fontWeight: 700 }}>
          {queueCount}
        </span>
      )}
    </div>
  );
}
