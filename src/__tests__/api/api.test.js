// Tests — Couche API (appels axios vers FastAPI)
import { describe, it, expect, vi } from 'vitest';
import { authAPI, productsAPI, settingsAPI } from '../../api';

// Les appels réels sont interceptés par MSW (server.js)

describe('authAPI', () => {
  it('login success returns token', async () => {
    const r = await authAPI.login('admin', 'admin');
    expect(r.status).toBe(200);
    expect(r.data).toHaveProperty('token');
    expect(r.data).toHaveProperty('refresh_token');
    expect(r.data.user.role).toBe('admin');
  });

  it('login failure returns 401', async () => {
    await expect(authAPI.login('admin', 'wrong')).rejects.toMatchObject({
      response: { status: 401 },
    });
  });
});

describe('productsAPI', () => {
  it('getAll returns products list', async () => {
    const r = await productsAPI.getAll();
    expect(r.status).toBe(200);
    expect(r.data.products).toBeInstanceOf(Array);
    expect(r.data.stats).toHaveProperty('total_products');
  });

  it('getAlerts returns alert structure', async () => {
    const r = await productsAPI.getAlerts();
    expect(r.data).toHaveProperty('out_of_stock');
    expect(r.data).toHaveProperty('low_stock');
    expect(r.data).toHaveProperty('total_alerts');
  });
});

describe('settingsAPI', () => {
  it('getShop returns shop settings', async () => {
    const r = await settingsAPI.getShop();
    expect(r.status).toBe(200);
    const d = r.data;
    expect(d).toHaveProperty('shop_name');
    expect(d).toHaveProperty('paper_format');
    expect(d.paper_format).toMatch(/^(58mm|80mm)$/);
  });
});
