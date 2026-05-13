// ============================================================
// KENPRO STORE — Configuration API
// Fichier : src/api.js
// Communication avec le back-end FastAPI (port 8000)
// ============================================================

import axios from 'axios';

// Adresse du serveur FastAPI — défini dans .env (VITE_API_URL)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Créer une instance axios configurée (no-cache)
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store',
    'Pragma': 'no-cache',
  },
});

// Intercepteur : ajoute JWT + X-Tenant-Slug (multi-tenant)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kenpro_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    // Pour les super_admins sans tenant_id dans le JWT,
    // ajouter X-Tenant-Slug depuis le localStorage (défaut : kenpro-store)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.tenant_id) {
        const user = JSON.parse(localStorage.getItem('kenpro_user') || '{}');
        const slug = localStorage.getItem('kenpro_tenant_slug')
                  || user.default_tenant_slug
                  || 'kenpro-store';
        config.headers['X-Tenant-Slug'] = slug;
      }
    } catch { /* token invalide */ }
  }
  return config;
});

// Intercepteur : si le token expire (401), redirige vers le login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('kenpro_token');
      localStorage.removeItem('kenpro_user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// ── AUTH ──
export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  register: (data) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// ── PRODUITS ──
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  adjustStock: (id, adjustment, reason) => api.post(`/products/${id}/stock`, { adjustment, reason }),
  getAlerts: () => api.get('/products/alerts'),
  getCategories: () => api.get('/products/categories'),
  getByBarcode:    (code)       => api.get(`/products/barcode/${encodeURIComponent(code)}`),
  generateBarcode: (id)         => api.post(`/products/${id}/barcode`),
  uploadPhotos:    (id, formData) => api.post(`/products/${id}/photos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deletePhoto:     (id, url)    => api.delete(`/products/${id}/photos`, { params: { url } }),
  setMainPhoto:    (id, url)    => api.put(`/products/${id}/photos/main`, null, { params: { url } }),
  updateStore:     (id, formData) => api.put(`/products/${id}/store`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// ── CLIENTS ──
export const clientsAPI = {
  getAll: (params) => api.get('/clients', { params }),
  getOne: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
  search: (q) => api.get('/clients/search', { params: { q } }),
  getCities: () => api.get('/clients/cities'),
  getInvoices: (id) => api.get(`/clients/${id}/invoices`),
  getRepairs: (id) => api.get(`/clients/${id}/repairs`),
};

// ── FACTURES ──
export const invoicesAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getOne: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  pay: (id) => api.post(`/invoices/${id}/pay`),
  convert: (id) => api.post(`/invoices/${id}/convert`),
  getMonthlySales: () => api.get('/invoices/monthly-sales'),
};

// ── RÉPARATIONS ──
export const repairsAPI = {
  getAll: (params) => api.get('/repairs', { params }),
  getOne: (id) => api.get(`/repairs/${id}`),
  create: (data) => api.post('/repairs', data),
  update: (id, data) => api.put(`/repairs/${id}`, data),
  delete: (id) => api.delete(`/repairs/${id}`),
  changeStatus: (id, status, note) => api.post(`/repairs/${id}/status`, { status, note }),
  addPart: (id, data) => api.post(`/repairs/${id}/parts`, data),
};

// ── FOURNISSEURS ──
export const suppliersAPI = {
  getAll: (params) => api.get('/suppliers', { params }),
  getOne: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
  getStatement: (id) => api.get(`/suppliers/${id}/statement`),
};

// ── CRÉDITS ──
export const creditsAPI = {
  getAll: (params) => api.get('/credits', { params }),
  create: (data) => api.post('/credits', data),
  delete: (id) => api.delete(`/credits/${id}`),
};

// ── PAIEMENTS CRÉDITS ──
export const creditPaymentsAPI = {
  getAll: (params) => api.get('/credit-payments', { params }),
  create: (data) => api.post('/credit-payments', data),
  delete: (id) => api.delete(`/credit-payments/${id}`),
};

// ── ADMIN ──
export const adminAPI = {
  getUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};

// ── DASHBOARD ANALYTIQUE ──
export const dashboardAPI = {
  getKPI:           (period = 'month') => api.get('/dashboard/kpi', { params: { period } }),
  getRevenueChart:  ()                 => api.get('/dashboard/revenue-chart'),
  getCategoryChart: (period = 'all')   => api.get('/dashboard/category-chart', { params: { period } }),
  getTopProducts:   (period = 'all')   => api.get('/dashboard/top-products', { params: { period } }),
  getAlerts:        ()                 => api.get('/dashboard/alerts'),
  getPayments:      ()                 => api.get('/dashboard/payments'),   // Phase 3: widget MoMo
  getFinancial:     (period = 'month') => api.get('/dashboard/financial-summary', { params: { period } }),
};

// ── MODULES DYNAMIQUES ──
export const modulesAPI = {
  getAll:    ()          => api.get('/modules'),
  create:    (data)      => api.post('/modules', data),
  update:    (id, data)  => api.put(`/modules/${id}`, data),
  delete:    (id)        => api.delete(`/modules/${id}`),
  assign:    (id, data)  => api.post(`/modules/${id}/assign`, data),
  unassign:  (mid, uid)  => api.delete(`/modules/${mid}/unassign/${uid}`),
  getUsers:  ()          => api.get('/modules/users'),
  myModule:  ()          => api.get('/my/module'),
};

// ── VENDEUR ──
export const vendorAPI = {
  getDashboard:  ()     => api.get('/vendor/dashboard'),
  getReports:    ()     => api.get('/vendor/reports'),
  submitReport:  (data) => api.post('/vendor/reports', data),
  checkToday:    ()     => api.get('/vendor/check-today'),
};

// ── RAPPORTS ADMIN ──
export const adminReportsAPI = {
  getAll:     (params) => api.get('/admin/reports', { params }),
  getSummary: (period) => api.get('/admin/reports/summary', { params: { period } }),
  review:     (id, data) => api.put(`/admin/reports/${id}/review`, data),
  exportCsv:  (params) => api.get('/admin/reports/export-csv', { params, responseType: 'blob' }),
};

// ── NOTIFICATIONS ──
export const notificationsAPI = {
  getAll:     (unread) => api.get('/notifications', { params: unread ? { unread: 1 } : {} }),
  markRead:   (id)     => api.put(`/notifications/${id}/read`),
  markAllRead: ()      => api.post('/notifications/read-all'),
  delete:     (id)     => api.delete(`/notifications/${id}`),
};

// ── PARAMÈTRES BOUTIQUE ──
export const settingsAPI = {
  getShop:    ()       => api.get('/settings/shop'),
  updateShop: (data)   => api.put('/settings/shop', data),
  uploadLogo: (file)   => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// ── TICKETS & ÉTIQUETTES ──
// Ces endpoints retournent du HTML → on les ouvre dans une popup
export const ticketsAPI = {
  invoiceUrl:     (id)               => `${API_URL}/tickets/invoice/${id}`,
  labelUrl:       (pid, qty, format) => `${API_URL}/tickets/label/${pid}?qty=${qty}&format=${format || '58mm'}`,
  repairUrl:      (id)               => `${API_URL}/tickets/repair/${id}`,
  repairExitUrl:  (id)               => `${API_URL}/tickets/repair/${id}/exit`,
};

// ── STORE PUBLIC (admin) ──
export const publicStoreAPI = {
  getAdminProducts: ()            => api.get('/store/admin/products'),
  updateProduct:    (id, data)    => api.put(`/store/admin/products/${id}`, data),
  getOrders:        (params)      => api.get('/store/admin/orders', { params }),
  getOrder:         (id)          => api.get(`/store/admin/orders/${id}`),
  updateOrderStatus:(id, data)    => api.put(`/store/admin/orders/${id}/status`, data),
};

// ── SUPER ADMIN (multi-tenant) ──
export const superAdminAPI = {
  getTenants:      (params)   => api.get('/super-admin/tenants', { params }),
  getTenant:       (id)       => api.get(`/super-admin/tenants/${id}`),
  createTenant:    (data)     => api.post('/super-admin/tenants', data),
  updateTenant:    (id, data) => api.put(`/super-admin/tenants/${id}`, data),
  suspendTenant:   (id)       => api.put(`/super-admin/tenants/${id}/suspend`),
  activateTenant:  (id)       => api.put(`/super-admin/tenants/${id}/activate`),
  deleteTenant:    (id)       => api.delete(`/super-admin/tenants/${id}`),
  getStats:        ()         => api.get('/super-admin/stats'),
  impersonate:     (id)       => api.post(`/super-admin/impersonate/${id}`),
  getCountries:    ()         => api.get('/super-admin/countries'),
  // Phase 3 — Dashboard plateforme
  getDashboard:         ()    => api.get('/super-admin/dashboard'),
  getDashboardKpis:     ()    => api.get('/super-admin/dashboard/kpis'),
  getDashboardGrowth:   ()    => api.get('/super-admin/dashboard/growth'),
  getDashboardCountries:()    => api.get('/super-admin/dashboard/revenue-by-country'),
  getTopTenants:        (n)   => api.get('/super-admin/dashboard/top-tenants', { params: { limit: n || 10 } }),
  getDashboardPlans:    ()    => api.get('/super-admin/dashboard/plans'),
  getDashboardAlerts:   ()    => api.get('/super-admin/dashboard/alerts'),
};

// ── MA BOUTIQUE ──
export const myShopAPI = {
  get:          ()     => api.get('/my-shop'),
  update:       (data) => api.put('/my-shop', data),
  updateBranding:(data)=> api.put('/my-shop/branding', data),
  uploadLogo:   (file) => {
    const fd = new FormData(); fd.append('file', file);
    return api.post('/my-shop/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getStats:     ()     => api.get('/my-shop/stats'),
  getUsage:     ()     => api.get('/my-shop/usage'),
};

// ── PAIEMENTS MULTI-PROVIDER ──
export const paymentsAPI = {
  // Config paiements de ma boutique
  getConfigs:      ()                => api.get('/my-shop/payments'),
  getAvailable:    ()                => api.get('/my-shop/payments/available'),
  getAllProviders:  ()                => api.get('/my-shop/payments/all-providers'),
  configure:       (provider, data)  => api.post(`/my-shop/payments/${provider}`, data),
  updateConfig:    (provider, data)  => api.put(`/my-shop/payments/${provider}`, data),
  deleteConfig:    (provider)        => api.delete(`/my-shop/payments/${provider}`),
  testConfig:      (provider)        => api.post(`/my-shop/payments/${provider}/test`),
  // Paiements
  detectPhone:     (phone)           => api.get(`/payments/detect/${encodeURIComponent(phone)}`),
  activeProviders: ()                => api.get('/payments/providers'),
  initiate:        (data)            => api.post('/payments/initiate', data),
  getStatus:       (txId)            => api.get(`/payments/${txId}/status`),
};

// ── ABONNEMENTS & FACTURATION ──
export const subscriptionsAPI = {
  getPlans:       ()     => api.get('/subscriptions/plans'),
  getMyPlan:      ()     => api.get('/subscriptions/me'),
  initiate:       (data) => api.post('/subscriptions/initiate', data),
  confirmPayment: (data) => api.post('/subscriptions/confirm-payment', data),
  upgrade:        (data) => api.post('/subscriptions/upgrade', data),
  downgrade:      ()     => api.post('/subscriptions/downgrade'),
  cancel:         ()     => api.post('/subscriptions/cancel'),
  getPayments:    ()     => api.get('/subscriptions/payments'),
};

// ── ESCROW & FLUX PAIEMENT ──
export const escrowAPI = {
  getMyEscrows:   (params) => api.get('/my-shop/escrow', { params }),
  markDelivered:  (id)     => api.post(`/my-shop/escrow/${id}/deliver`),
  getMyRevenue:   ()       => api.get('/my-shop/revenue'),
  getMyPayouts:   (params) => api.get('/my-shop/payouts', { params }),
  createEscrow:   (data)   => api.post('/my-shop/escrow/create', data),
  // Super Admin
  getAllEscrows:   (params) => api.get('/super-admin/escrow', { params }),
  getWallet:      ()       => api.get('/super-admin/wallet'),
  getCommissions: ()       => api.get('/super-admin/commissions'),
  releaseEscrow:  (id)     => api.post(`/super-admin/escrow/${id}/release`),
  autoConfirm:    ()       => api.post('/super-admin/escrow/auto-confirm'),
  // Utils
  previewCommission: (amount, rate) => api.get('/escrow/commission-preview', { params: { amount, rate } }),
};

// ── AUDIT & SÉCURITÉ ──
export const auditAPI = {
  getSecurity:    ()       => api.get('/super-admin/security'),
  getLogs:        (params) => api.get('/super-admin/audit-logs', { params }),
  getMyLogs:      ()       => api.get('/my-shop/audit-logs'),
};

export default api;
