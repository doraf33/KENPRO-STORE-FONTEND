// ============================================================
// KENPRO STORE — Service Worker (Admin)
// Stratégie : Network First avec fallback Cache
// Optimisé pour faible bande passante (2G/3G Cameroun)
// ============================================================

const CACHE_NAME   = 'kenpro-admin-v1';
const API_CACHE    = 'kenpro-api-v1';
const API_BASE     = 'http://localhost:8000/api';

// Ressources statiques à pré-cacher
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// Routes API à cacher (données critiques)
const CACHED_API_ROUTES = [
  '/products',
  '/clients',
  '/settings/shop',
  '/dashboard/kpi',
];

// ── Installation ──────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activation ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== API_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch — Network First avec fallback Cache ─────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne pas intercepter : POST/PUT/DELETE, non-GET
  if (request.method !== 'GET') return;

  // Ressources statiques : Cache First
  if (!url.href.includes('/api/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // API : Network First avec fallback cache
  const isApiCacheable = CACHED_API_ROUTES.some(r => url.pathname.includes(r));
  if (isApiCacheable) {
    event.respondWith(networkFirst(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || new Response('Hors ligne', { status: 503 });
  }
}

async function networkFirst(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: 'Hors ligne', offline: true }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ── Messages depuis le client ─────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(API_CACHE).then(() => {
      event.ports[0]?.postMessage({ ok: true });
    });
  }
});
