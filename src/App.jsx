/**
 * App.jsx — Routing shell uniquement.
 * Les composants de page sont dans src/pages/.
 * Les contextes partagés sont dans src/context/AppContext.jsx.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeContext, ToastProvider, useTheme, useToast } from './context/AppContext';

// ── Pages ──────────────────────────────────────────────────────
import Dashboard    from './pages/Dashboard';
import Products     from './pages/Products';
import Clients      from './pages/Clients';
import Invoices     from './pages/Invoices';
import Repairs      from './pages/Repairs';
import Suppliers    from './pages/Suppliers';
import Journals     from './pages/Journals';
import { ModuleManager }  from './pages/Modules';
import {
  VendorDashboard, VendorReportForm,
  AdminReports, MyReports,
} from './pages/VendorPages';

// ── Composants partagés ────────────────────────────────────────
import ShopSettings       from './components/ShopSettings';
import OnlineStore        from './components/OnlineStore';
import PaymentSettings    from './components/PaymentSettings';
import SuperAdminPanel    from './components/SuperAdminPanel';
import BillingPanel       from './components/BillingPanel';
import RevenuePanel       from './components/RevenuePanel';
import SecurityPanel      from './components/SecurityPanel';
import CompliancePanel      from './components/CompliancePanel';
import ReferralDashboard   from './components/ReferralDashboard';
import PromoManager        from './components/PromoManager';
import AnalyticsDashboard  from './components/AnalyticsDashboard';
import SyncStatus, { ConnectionDot } from './components/SyncStatus';
import LanguageSwitcher   from './components/LanguageSwitcher';
import { authAPI, notificationsAPI } from './api';
import { TenantProvider } from './context/TenantContext';
import './App.css';

// ── Login ──────────────────────────────────────────────────────
function Login({ onLogin }) {
  const { t } = useTranslation(['auth', 'common']);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) { setError(t('auth:fill_fields')); return; }
    setLoading(true); setError('');
    try {
      const res = await authAPI.login(username, password);
      const userToStore = {
        ...res.data.user,
        is_super_admin: res.data.is_super_admin ?? false,
        tenant_id:      res.data.tenant_id ?? null,
      };
      localStorage.setItem('kenpro_token', res.data.token);
      localStorage.setItem('kenpro_user', JSON.stringify(userToStore));
      onLogin(userToStore);
    } catch (err) {
      setError(err.response?.data?.error || t('auth:login_error'));
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <img src="/logo.png" alt="KENPRO" className="login-logo-img" onError={e => e.target.style.display='none'} />
        <h1>KENPRO STORE</h1>
        <p className="login-sub">{t('auth:login_title')}</p>
        {error && <div className="error-msg">{error}</div>}
        <input type="text" placeholder={t('auth:username')} value={username}
          onChange={e => { setUsername(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        <input type="password" placeholder={t('auth:password')} value={password}
          onChange={e => { setPassword(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        <button onClick={handleLogin} disabled={loading} className="btn-primary">
          {loading ? t('auth:connecting') : t('auth:login_button')}
        </button>
        <p className="login-hint">{t('auth:default_credentials')}</p>
      </div>
    </div>
  );
}

// ── Notification Bell ──────────────────────────────────────────
function NotificationBell({ userId }) {
  const { show: showToast } = useToast();
  const [unread, setUnread] = useState(0);
  const [open, setOpen]     = useState(false);
  const [notifs, setNotifs] = useState([]);

  const load = async () => {
    try {
      const r = await notificationsAPI.getAll();
      const all = r.data.notifications || [];
      setNotifs(all.slice(0, 8));
      setUnread(all.filter(n => !n.read_at).length);
    } catch {}
  };

  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, [userId]);

  const markRead = async (id) => {
    try { await notificationsAPI.markRead(id); load(); } catch {}
  };
  const markAll = async () => {
    try { await notificationsAPI.markAllRead(); load(); } catch {}
  };

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: 4 }}>
        🔔
        {unread > 0 && (
          <span style={{ position: 'absolute', top: 0, right: 0, background: '#ef6461', color: '#fff',
                         borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex',
                         alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '100%', width: 320, background: '#141827',
                      border: '1px solid #252a3a', borderRadius: 10, zIndex: 1000, boxShadow: '0 8px 32px rgba(0,0,0,.4)' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #252a3a', display: 'flex',
                         justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#eaedf3', fontWeight: 700, fontSize: 13 }}>Notifications</span>
            {unread > 0 && <button onClick={markAll} style={{ background: 'none', border: 'none',
              color: '#d4a12e', fontSize: 11, cursor: 'pointer' }}>Tout marquer lu</button>}
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {notifs.length === 0
              ? <div style={{ padding: 20, textAlign: 'center', color: '#7a8094', fontSize: 13 }}>Aucune notification</div>
              : notifs.map(n => (
                <div key={n.id} onClick={() => markRead(n.id)}
                  style={{ padding: '10px 14px', borderBottom: '1px solid #1b1f30', cursor: 'pointer',
                            background: n.read_at ? 'transparent' : 'rgba(91,156,246,.05)' }}>
                  <div style={{ color: '#eaedf3', fontSize: 13, marginBottom: 2 }}>{n.title}</div>
                  {n.message && <div style={{ color: '#7a8094', fontSize: 11 }}>{n.message}</div>}
                </div>
              ))
            }
          </div>
          <button onClick={() => setOpen(false)}
            style={{ width: '100%', padding: '8px', background: 'none', border: 'none',
                     borderTop: '1px solid #252a3a', color: '#7a8094', cursor: 'pointer', fontSize: 12 }}>
            ✕ Fermer
          </button>
        </div>
      )}
    </div>
  );
}

// ── Navigation tabs ────────────────────────────────────────────
const ADMIN_TABS = [
  { id: 'dashboard',        labelKey: 'dashboard',       icon: '📊' },
  { id: 'products',         labelKey: 'products',        icon: '📦' },
  { id: 'clients',          labelKey: 'clients',         icon: '👥' },
  { id: 'invoices',         labelKey: 'invoices',        icon: '🧾' },
  { id: 'repairs',          labelKey: 'repairs',         icon: '🔧' },
  { id: 'suppliers',        labelKey: 'suppliers',       icon: '🚚' },
  { id: 'journals',         labelKey: 'journals',        icon: '📒' },
  { id: 'modules',          labelKey: 'modules',         icon: '🔩' },
  { id: 'admin_reports',    labelKey: 'vendor_reports',  icon: '📋' },
  { id: 'shop_settings',    labelKey: 'shop_settings',   icon: '⚙️' },
  { id: 'online_store',     labelKey: 'online_store',    icon: '🛒' },
  { id: 'payment_settings', labelKey: 'payments',        icon: '💳' },
  { id: 'revenue',          labelKey: 'revenue',         icon: '💰', highlight: true },
  { id: 'billing',          labelKey: 'subscription',    icon: '📋' },
  { id: 'super_admin',      labelKey: 'super_admin',     icon: '🏢', superOnly: true },
  { id: 'security',         labelKey: 'security',        icon: '🔐', superOnly: true },
  { id: 'compliance',       labelKey: 'compliance',      icon: '🛡️' },
  { id: 'referral',         labelKey: 'referral',        icon: '🎁', highlight: true },
  { id: 'promos',           labelKey: 'promos',          icon: '🏷️' },
  { id: 'analytics_mkt',   labelKey: 'analytics_mkt',   icon: '📊' },
];
const VENDOR_TABS = [
  { id: 'vendor_dashboard', labelKey: 'vendor_dashboard', icon: '🏠' },
  { id: 'my_report',        labelKey: 'my_report',        icon: '📝' },
  { id: 'my_reports',       labelKey: 'my_reports',       icon: '📋' },
];

// ── AppShell — layout + routing ────────────────────────────────
function AppShell() {
  const [user, setUser]             = useState(null);
  const [tab, setTab]               = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { show: showToast } = useToast();
  const { isDark, toggleTheme }     = useTheme();
  const { t, i18n }                 = useTranslation('nav');

  useEffect(() => {
    const saved = localStorage.getItem('kenpro_user');
    const token = localStorage.getItem('kenpro_token');
    if (saved && token) {
      const u = JSON.parse(saved);
      if (u.role === 'super_admin' && u.is_super_admin === undefined) {
        u.is_super_admin = true;
        localStorage.setItem('kenpro_user', JSON.stringify(u));
      }
      setUser(u);
      if (u.role === 'vendeur' || u.role === 'vendor') setTab('vendor_dashboard');
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('kenpro_token');
    localStorage.removeItem('kenpro_user');
    setUser(null);
    showToast('Déconnexion', 'À bientôt !', 'info');
  };

  const handleLogin = (u) => {
    setUser(u);
    setTab(u.role === 'vendeur' || u.role === 'vendor' ? 'vendor_dashboard' : 'dashboard');
    showToast(`Bienvenue, ${u.name} !`,
      u.role === 'vendeur' ? 'Tableau de bord vendeur chargé.' : 'Administration KENPRO STORE.',
      'success');
  };

  const isVendor     = user?.role === 'vendeur' || user?.role === 'vendor';
  const isSuperAdmin = user?.role === 'super_admin' || user?.is_super_admin;
  const TABS = isVendor ? VENDOR_TABS : ADMIN_TABS.filter(navTab => !navTab.superOnly || isSuperAdmin);

  const renderPage = () => {
    const token = localStorage.getItem('kenpro_token');
    switch (tab) {
      case 'dashboard':        return <Dashboard />;
      case 'products':         return <Products />;
      case 'clients':          return <Clients />;
      case 'invoices':         return <Invoices />;
      case 'repairs':          return <Repairs />;
      case 'suppliers':        return <Suppliers />;
      case 'journals':         return <Journals />;
      case 'modules':          return <ModuleManager />;
      case 'admin_reports':    return <AdminReports />;
      case 'shop_settings':    return <ShopSettings />;
      case 'online_store':     return <OnlineStore />;
      case 'payment_settings': return <PaymentSettings />;
      case 'billing':          return <BillingPanel />;
      case 'revenue':          return <RevenuePanel token={token} />;
      case 'super_admin':      return <SuperAdminPanel />;
      case 'security':         return <SecurityPanel token={token} />;
      case 'compliance':       return <CompliancePanel isSuperAdmin={isSuperAdmin} />;
      case 'referral':         return <ReferralDashboard />;
      case 'promos':           return <PromoManager />;
      case 'analytics_mkt':   return <AnalyticsDashboard />;
      case 'vendor_dashboard': return <VendorDashboard />;
      case 'my_report':        return <VendorReportForm onSubmitted={() => {
        setTab('my_reports');
        showToast('Rapport soumis !', 'Votre rapport journalier a été envoyé.', 'success');
      }} />;
      case 'my_reports':       return <MyReports />;
      default:                 return isVendor ? <VendorDashboard /> : <Dashboard />;
    }
  };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="app">
      <SyncStatus />
      <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src="/logo.png" alt="KENPRO" className="sidebar-logo" onError={e => e.target.style.display='none'} />
          <div className="store-name">KENPRO STORE</div>
          <div className="user-name">
            {isVendor ? '🛒' : '👨‍💼'} {user.name}
            {isVendor && <span style={{ display: 'block', fontSize: 11, color: '#7a8094', marginTop: 2 }}>Vendeur</span>}
          </div>
          <ConnectionDot />
        </div>
        <nav>
          {TABS.map(navTab => (
            <button key={navTab.id}
              className={`nav-btn ${tab === navTab.id ? 'active' : ''}${navTab.highlight ? ' nav-btn-highlight' : ''}`}
              onClick={() => { setTab(navTab.id); setSidebarOpen(false); }}>
              <span className="nav-icon">{navTab.icon}</span> {t(navTab.labelKey, { defaultValue: navTab.labelKey })}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#7a8094' }}>{i18n.t('common:notifications')}</span>
            <NotificationBell userId={user.id} />
          </div>
          <LanguageSwitcher />
          <button className="theme-toggle" onClick={toggleTheme}>
            <span className="theme-toggle-track">
              <span className={`theme-toggle-thumb ${isDark ? 'dark' : 'light'}`} />
            </span>
            <span className="theme-toggle-label">
              {isDark ? `☀️ ${i18n.t('common:dark_mode')}` : `🌙 ${i18n.t('common:light_mode')}`}
            </span>
          </button>
          <button className="btn-logout" onClick={logout}>🚪 {i18n.t('common:logout')}</button>
        </div>
      </aside>
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}
      <main className="content">{renderPage()}</main>
    </div>
  );
}

// ── Root App ───────────────────────────────────────────────────
export default function App() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('kenpro_theme');
    const dark = saved ? saved === 'dark' : !window.matchMedia('(prefers-color-scheme: light)').matches;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    return dark;
  });

  const toggleTheme = () => {
    const html = document.documentElement;
    html.classList.add('theme-switching');
    setIsDark(prev => {
      const next = !prev;
      html.setAttribute('data-theme', next ? 'dark' : 'light');
      localStorage.setItem('kenpro_theme', next ? 'dark' : 'light');
      return next;
    });
    setTimeout(() => html.classList.remove('theme-switching'), 350);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <TenantProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </TenantProvider>
    </ThemeContext.Provider>
  );
}
