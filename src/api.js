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

// Intercepteur : ajoute automatiquement le token JWT à chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kenpro_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
  getByBarcode: (code) => api.get(`/products/barcode/${encodeURIComponent(code)}`),
  generateBarcode: (id) => api.post(`/products/${id}/barcode`),
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
  getKPI: (period = 'month') => api.get('/dashboard/kpi', { params: { period } }),
  getRevenueChart: () => api.get('/dashboard/revenue-chart'),
  getCategoryChart: (period = 'all') => api.get('/dashboard/category-chart', { params: { period } }),
  getTopProducts: (period = 'all') => api.get('/dashboard/top-products', { params: { period } }),
  getAlerts: () => api.get('/dashboard/alerts'),
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
  invoiceUrl: (id)               => `${API_URL}/tickets/invoice/${id}`,
  labelUrl:   (pid, qty, format) => `${API_URL}/tickets/label/${pid}?qty=${qty}&format=${format || '58mm'}`,
};

export default api;
