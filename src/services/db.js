// ============================================================
// KENPRO STORE — IndexedDB (stockage local offline)
// Tables : products, clients, settings, sync_queue, last_sync
// ============================================================

const DB_NAME    = 'kenpro_local';
const DB_VERSION = 1;

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains('products'))
        db.createObjectStore('products', { keyPath: 'id' });

      if (!db.objectStoreNames.contains('clients'))
        db.createObjectStore('clients', { keyPath: 'id' });

      if (!db.objectStoreNames.contains('settings'))
        db.createObjectStore('settings', { keyPath: 'key' });

      if (!db.objectStoreNames.contains('sync_queue')) {
        const sq = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        sq.createIndex('status', 'status', { unique: false });
      }

      if (!db.objectStoreNames.contains('last_sync'))
        db.createObjectStore('last_sync', { keyPath: 'key' });
    };

    req.onsuccess  = e => { _db = e.target.result; resolve(_db); };
    req.onerror    = e => reject(e.target.error);
  });
}

// ── Helpers génériques ────────────────────────────────────────

function tx(storeName, mode = 'readonly') {
  return openDB().then(db => db.transaction(storeName, mode).objectStore(storeName));
}

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

// ── Products ──────────────────────────────────────────────────

export async function saveProducts(products) {
  const store = await tx('products', 'readwrite');
  return Promise.all(products.map(p => promisify(store.put(p))));
}

export async function getProducts() {
  const store = await tx('products');
  return promisify(store.getAll());
}

export async function getProduct(id) {
  const store = await tx('products');
  return promisify(store.get(id));
}

// ── Clients ───────────────────────────────────────────────────

export async function saveClients(clients) {
  const store = await tx('clients', 'readwrite');
  return Promise.all(clients.map(c => promisify(store.put(c))));
}

export async function getClients() {
  const store = await tx('clients');
  return promisify(store.getAll());
}

// ── Settings ──────────────────────────────────────────────────

export async function saveSetting(key, value) {
  const store = await tx('settings', 'readwrite');
  return promisify(store.put({ key, value, updated_at: Date.now() }));
}

export async function getSetting(key) {
  const store = await tx('settings');
  const row   = await promisify(store.get(key));
  return row?.value ?? null;
}

// ── Last sync ─────────────────────────────────────────────────

export async function setLastSync(resource, timestamp = Date.now()) {
  const store = await tx('last_sync', 'readwrite');
  return promisify(store.put({ key: resource, timestamp }));
}

export async function getLastSync(resource) {
  const store = await tx('last_sync');
  const row   = await promisify(store.get(resource));
  return row?.timestamp ?? null;
}

// ── Sync queue ────────────────────────────────────────────────

export async function enqueue(action) {
  const store = await tx('sync_queue', 'readwrite');
  return promisify(store.add({
    ...action,
    status:      'pending',
    retry_count: 0,
    created_at:  Date.now(),
  }));
}

export async function getPendingQueue() {
  const store = await tx('sync_queue');
  const idx   = store.index('status');
  return promisify(idx.getAll('pending'));
}

export async function updateQueueItem(id, updates) {
  const db    = await openDB();
  const txn   = db.transaction('sync_queue', 'readwrite');
  const store = txn.objectStore('sync_queue');
  const item  = await promisify(store.get(id));
  if (item) {
    return promisify(store.put({ ...item, ...updates }));
  }
}

export async function clearDoneQueue() {
  const store = await tx('sync_queue', 'readwrite');
  const idx   = store.index('status');
  const done  = await promisify(idx.getAll('done'));
  return Promise.all(done.map(d => promisify(store.delete(d.id))));
}

export async function getQueueCount() {
  const store = await tx('sync_queue');
  const idx   = store.index('status');
  return promisify(idx.count('pending'));
}

// ── Full sync download ────────────────────────────────────────

export async function downloadAndCache(apiToken) {
  const headers = { Authorization: `Bearer ${apiToken}` };
  const base    = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  try {
    const [prodRes, clientRes, settingsRes] = await Promise.allSettled([
      fetch(`${base}/products`, { headers }).then(r => r.json()),
      fetch(`${base}/clients`,  { headers }).then(r => r.json()),
      fetch(`${base}/settings/shop`).then(r => r.json()),
    ]);

    if (prodRes.status === 'fulfilled' && prodRes.value.products)
      await saveProducts(prodRes.value.products);

    if (clientRes.status === 'fulfilled' && clientRes.value.clients)
      await saveClients(clientRes.value.clients);

    if (settingsRes.status === 'fulfilled')
      await saveSetting('shop', settingsRes.value);

    await setLastSync('all');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
