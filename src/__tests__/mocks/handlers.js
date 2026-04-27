// MSW handlers — simulent les réponses de l'API FastAPI
import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:8000/api';

export const handlers = [
  // ── Auth ───────────────────────────────────────────────────
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = await request.json();
    if (body.username === 'admin' && body.password === 'admin') {
      return HttpResponse.json({
        token: 'mock-access-token-admin',
        refresh_token: 'mock-refresh-token-admin',
        expires_in: 7200,
        message: 'Connexion reussie',
        user: { id: 1, username: 'admin', name: 'Admin Test', role: 'admin',
                email: 'admin@test.local', is_active: true },
      });
    }
    return HttpResponse.json({ detail: 'Identifiants incorrects.' }, { status: 401 });
  }),

  http.get(`${BASE}/auth/profile`, ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return HttpResponse.json({ detail: 'Non authentifié' }, { status: 401 });
    }
    return HttpResponse.json({
      user: { id: 1, username: 'admin', name: 'Admin Test',
              role: 'admin', email: 'admin@test.local', is_active: true },
    });
  }),

  // ── Paramètres boutique ────────────────────────────────────
  http.get(`${BASE}/settings/shop`, () =>
    HttpResponse.json({
      id: 1, shop_name: 'KENPRO STORE', phone: '+237 699 001 122',
      address: 'Yaoundé', email: '', thank_you_message: 'Merci !',
      paper_format: '58mm', logo_url: '/uploads/logo.png',
    })
  ),

  // ── Produits ───────────────────────────────────────────────
  http.get(`${BASE}/products`, () =>
    HttpResponse.json({
      products: [
        { id: 1, name: 'iPhone 15', category: 'Smartphones',
          price: 450000, quantity: 10, status: 'ok', barcode: '1234567890123' },
        { id: 2, name: 'Câble USB', category: 'Accessoires',
          price: 2000, quantity: 1, status: 'bas', barcode: '' },
      ],
      total: 2,
      stats: { total_products: 2, total_stock: 11, total_value: 4502000,
               low_stock: 1, out_of_stock: 0 },
    })
  ),

  http.get(`${BASE}/products/alerts`, () =>
    HttpResponse.json({ out_of_stock: [], low_stock: [
      { id: 2, name: 'Câble USB', quantity: 1, min_stock: 5 },
    ], total_alerts: 1 })
  ),

  // ── Dashboard ──────────────────────────────────────────────
  http.get(`${BASE}/dashboard/kpi`, () =>
    HttpResponse.json({
      period: 'month',
      current: { revenue: 360000, expenses: 0, gross_profit: 80000,
                 margin_rate: 22.2, nb_paid: 1, nb_pending: 0, conversion_rate: 100 },
      comparison: { revenue: null, gross_profit: null, nb_paid: null,
                    conversion_rate: null, margin_rate: null },
      stock: { value: 4502000, alerts: 1 },
      repairs: { active: 0 },
    })
  ),

  http.get(`${BASE}/dashboard/alerts`, () =>
    HttpResponse.json({ alerts: [
      { severity: 'warning', title: 'Stock bas', detail: 'Câble USB - 1 unité' },
    ], total: 1 })
  ),

  // ── Clients ────────────────────────────────────────────────
  http.get(`${BASE}/clients`, () =>
    HttpResponse.json({
      clients: [
        { id: 1, name: 'Marie Dupont', phone: '+237699001122', city: 'Yaoundé' },
      ],
      total: 1,
    })
  ),

  // ── Factures ───────────────────────────────────────────────
  http.get(`${BASE}/invoices`, () =>
    HttpResponse.json({
      invoices: [
        { id: 1, number: 'FAC-0001', invoice_type: 'facture', total: 20000,
          status: 'payee', client_name: 'Marie Dupont', created_at: '2026-04-27',
          items: [{ product_name: 'iPhone 15', quantity: 2, unit_price: 10000, total: 20000 }] },
      ],
      total: 1,
      stats: { total_factures_payees: 20000, en_attente: 0, nb_factures: 1, nb_devis: 0 },
    })
  ),
];
