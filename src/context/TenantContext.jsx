// ============================================================
// KENPRO STORE — Contexte Tenant (multi-tenant)
// Stocke le tenant courant, son branding et ses droits
// ============================================================
import { createContext, useContext, useState, useEffect } from 'react';
import { settingsAPI } from '../api';

const TenantContext = createContext({
  tenant:       null,
  tenantId:     null,
  tenantSlug:   'kenpro-store',
  isSuperAdmin: false,
  branding: {
    primary_color:   '#d4a12e',
    secondary_color: '#5b9cf6',
    shop_name:       'KENPRO STORE',
    logo_url:        null,
  },
  setTenant:    () => {},
});

export function TenantProvider({ children }) {
  const [tenant,       setTenantState] = useState(null);
  const [tenantId,     setTenantId]    = useState(null);
  const [tenantSlug,   setTenantSlug]  = useState('kenpro-store');
  const [isSuperAdmin, setSuperAdmin]  = useState(false);
  const [branding,     setBranding]    = useState({
    primary_color:   '#d4a12e',
    secondary_color: '#5b9cf6',
    shop_name:       'KENPRO STORE',
    logo_url:        null,
  });

  // Charge le tenant depuis les paramètres boutique au montage
  useEffect(() => {
    settingsAPI.getShop()
      .then(r => {
        const s = r.data;
        setBranding({
          primary_color:   s.primary_color   || '#d4a12e',
          secondary_color: s.secondary_color || '#5b9cf6',
          shop_name:       s.shop_name       || 'KENPRO STORE',
          logo_url:        s.logo_url        || null,
        });
      })
      .catch(() => {});

    // Lire les infos JWT du localStorage
    const token = localStorage.getItem('kenpro_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setTenantId(payload.tenant_id || null);
        setSuperAdmin(!!payload.is_super_admin);
      } catch { /* token invalide */ }
    }
  }, []);

  const setTenant = (data) => {
    setTenantState(data);
    if (data?.slug)            setTenantSlug(data.slug);
    if (data?.id)              setTenantId(data.id);
    if (data?.primary_color)   setBranding(b => ({ ...b, primary_color:   data.primary_color }));
    if (data?.secondary_color) setBranding(b => ({ ...b, secondary_color: data.secondary_color }));
    if (data?.name)            setBranding(b => ({ ...b, shop_name:       data.name }));
    if (data?.logo_url)        setBranding(b => ({ ...b, logo_url:        data.logo_url }));
  };

  return (
    <TenantContext.Provider value={{
      tenant, tenantId, tenantSlug, isSuperAdmin, branding, setTenant,
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() { return useContext(TenantContext); }
