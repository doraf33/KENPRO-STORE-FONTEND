// ============================================================
// KENPRO STORE — Service de synchronisation offline→online
// Algorithme :
//   1. Connexion retrouvée → lire queue IndexedDB
//   2. Envoyer chaque action au backend par ordre chronologique
//   3. Marquer done / failed (max 3 retries)
//   4. Notifier l'UI du résultat
// ============================================================

import { getPendingQueue, updateQueueItem, enqueue } from './db';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const MAX_RETRIES = 3;

// ── Enqueue une action pour sync différée ─────────────────────

export async function queueAction(method, endpoint, data, label = '') {
  return enqueue({ method, endpoint, data, label });
}

// ── Synchronise toute la queue ────────────────────────────────

export async function syncQueue(apiToken) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiToken}`,
  };

  const pending = await getPendingQueue();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  // Tenter la route batch d'abord
  try {
    const batchRes = await fetch(`${API_BASE}/sync/batch`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ actions: pending }),
    });

    if (batchRes.ok) {
      const result = await batchRes.json();
      // Marquer chaque action selon la réponse
      for (const item of pending) {
        const r = result.results?.find(r => r.local_id === item.id);
        await updateQueueItem(item.id, {
          status:       r?.ok ? 'done' : 'failed',
          server_id:    r?.server_id,
          error:        r?.error,
          synced_at:    Date.now(),
        });
      }
      return {
        synced: result.results?.filter(r => r.ok).length || 0,
        failed: result.results?.filter(r => !r.ok).length || 0,
      };
    }
  } catch { /* fallback individuel */ }

  // Fallback : envoyer action par action
  let synced = 0, failed = 0;
  for (const item of pending) {
    if (item.retry_count >= MAX_RETRIES) {
      await updateQueueItem(item.id, { status: 'failed' });
      failed++;
      continue;
    }

    await updateQueueItem(item.id, { status: 'syncing' });

    try {
      const res = await fetch(`${API_BASE}${item.endpoint}`, {
        method: item.method,
        headers,
        body:   item.method !== 'GET' ? JSON.stringify(item.data) : undefined,
      });

      if (res.ok) {
        await updateQueueItem(item.id, { status: 'done', synced_at: Date.now() });
        synced++;
      } else {
        await updateQueueItem(item.id, {
          status:      item.retry_count + 1 >= MAX_RETRIES ? 'failed' : 'pending',
          retry_count: (item.retry_count || 0) + 1,
          error:       `HTTP ${res.status}`,
        });
        if (item.retry_count + 1 >= MAX_RETRIES) failed++;
      }
    } catch (err) {
      await updateQueueItem(item.id, {
        status:      'pending',
        retry_count: (item.retry_count || 0) + 1,
        error:       err.message,
      });
    }

    // Pause entre requêtes (bande passante limitée)
    await new Promise(r => setTimeout(r, 300));
  }

  return { synced, failed };
}

// ── Vérifier si des données serveur sont plus récentes ────────

export async function checkServerUpdates(apiToken, since) {
  const headers = { Authorization: `Bearer ${apiToken}` };
  try {
    const res = await fetch(`${API_BASE}/sync/check?since=${since}`, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
