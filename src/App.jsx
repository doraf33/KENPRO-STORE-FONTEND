import { useState, useEffect, useContext, createContext, useRef, useCallback } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { authAPI, productsAPI, clientsAPI, invoicesAPI, repairsAPI, suppliersAPI, creditsAPI, creditPaymentsAPI, dashboardAPI, modulesAPI, vendorAPI, adminReportsAPI, notificationsAPI, settingsAPI, ticketsAPI, publicStoreAPI, superAdminAPI, myShopAPI, subscriptionsAPI } from './api';
import { BarcodeScanner, BarcodeDisplay } from './BarcodeScanner';
import LabelPrinter        from './components/LabelPrinter';
import TicketPrinter       from './components/TicketPrinter';
import ShopSettings        from './components/ShopSettings';
import RepairTicketPrinter from './components/RepairTicketPrinter';
import RepairLabelPrinter  from './components/RepairLabelPrinter';
import OnlineStore         from './components/OnlineStore';
import ProductStorePanel   from './components/ProductStorePanel';
import PaymentSettings     from './components/PaymentSettings';
import SyncStatus, { ConnectionDot } from './components/SyncStatus';
import SuperAdminPanel     from './components/SuperAdminPanel';
import BillingPanel        from './components/BillingPanel';
import RevenuePanel        from './components/RevenuePanel';
import SecurityPanel       from './components/SecurityPanel';
import CompliancePanel, { MyDataPanel } from './components/CompliancePanel';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { TenantProvider }  from './context/TenantContext';
import './App.css';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';

// ============================================================
// THEME CONTEXT
// ============================================================
const ThemeContext = createContext({ isDark: true, toggleTheme: () => {} });
const useTheme = () => useContext(ThemeContext);

// ============================================================
// TOAST SYSTEM — Notifications temps réel (top-right, auto-dismiss)
// ============================================================
const ToastContext = createContext({ show: () => {} });
const useToast = () => useContext(ToastContext);

const TOAST_COLORS = {
  success: { border: '#2dd4a0', icon: '🟢', bg: 'rgba(45,212,160,.12)' },
  error:   { border: '#ef6461', icon: '🔴', bg: 'rgba(239,100,97,.12)' },
  warning: { border: '#f0923c', icon: '🟡', bg: 'rgba(240,146,60,.12)' },
  info:    { border: '#5b9cf6', icon: '🔵', bg: 'rgba(91,156,246,.12)'  },
};

function ToastItem({ id, title, message, type = 'info', onClose }) {
  const [visible, setVisible]   = useState(false);
  const [progress, setProgress] = useState(100);
  const { isDark } = useTheme();
  const cfg = TOAST_COLORS[type] || TOAST_COLORS.info;

  // Slide-in au montage
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t1);
  }, []);

  // Barre de progression décroissante sur 5 secondes
  useEffect(() => {
    const DURATION = 5000;
    const TICK     = 50;
    let elapsed    = 0;
    const timer = setInterval(() => {
      elapsed += TICK;
      setProgress(Math.max(0, 100 - (elapsed / DURATION) * 100));
      if (elapsed >= DURATION) {
        clearInterval(timer);
        handleClose();
      }
    }, TICK);
    return () => clearInterval(timer);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => onClose(id), 300); // attendre la fin de l'animation de sortie
  }, [id, onClose]);

  const cardBg  = isDark ? '#141827' : '#ffffff';
  const textCol = isDark ? '#eaedf3' : '#0f172a';
  const mutedCol= isDark ? '#7a8094' : '#64748b';

  return (
    <div
      className={`toast-item toast-${visible ? 'in' : 'out'}`}
      style={{
        background:   cardBg,
        borderLeft:   `4px solid ${cfg.border}`,
        borderRadius: 10,
        boxShadow:    '0 8px 32px rgba(0,0,0,.3)',
        overflow:     'hidden',
        width:        350,
        maxWidth:     'calc(100vw - 40px)',
      }}
    >
      {/* Corps */}
      <div style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: textCol, marginBottom: 3 }}>{title}</div>
          {message && <div style={{ fontSize: 13, color: mutedCol, lineHeight: 1.45 }}>{message}</div>}
        </div>
        <button
          onClick={handleClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: mutedCol, fontSize: 16, lineHeight: 1, padding: '0 2px',
            flexShrink: 0, opacity: .7, transition: 'opacity .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = .7}
        >×</button>
      </div>
      {/* Barre de progression */}
      <div style={{ height: 3, background: 'rgba(255,255,255,.08)' }}>
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: cfg.border,
            transition: 'width 50ms linear',
            borderRadius: '0 2px 2px 0',
          }}
        />
      </div>
    </div>
  );
}

function ToastContainer({ toasts, onClose }) {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top:      20,
        right:    20,
        zIndex:   9999,
        display:  'flex',
        flexDirection: 'column',
        gap:      10,
        pointerEvents: 'none',
      }}
    >
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'all' }}>
          <ToastItem {...t} onClose={onClose} />
        </div>
      ))}
    </div>
  );
}

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((title, message = '', type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [{ id, title, message, type }, ...prev].slice(0, 5)); // max 5
  }, []);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastContainer toasts={toasts} onClose={remove} />
    </ToastContext.Provider>
  );
}

// ============================================================
// LOGIN
// ============================================================
function Login({ onLogin }) {
  const { t } = useTranslation(['auth', 'common']);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) { setError(t('auth:fill_fields')); return; }
    setLoading(true); setError('');
    try {
      const res = await authAPI.login(username, password);
      // Merge is_super_admin + tenant_id depuis la réponse top-level dans l'objet user
      const userToStore = {
        ...res.data.user,
        is_super_admin: res.data.is_super_admin ?? false,
        tenant_id:      res.data.tenant_id ?? null,
      };
      localStorage.setItem('kenpro_token', res.data.token);
      localStorage.setItem('kenpro_user', JSON.stringify(userToStore));
      onLogin(userToStore);
    } catch (err) { setError(err.response?.data?.error || t('auth:login_error')); }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <img src="/logo.png" alt="KENPRO" className="login-logo-img" />
        <h1>KENPRO STORE</h1>
        <p className="login-sub">{t('auth:login_title')}</p>
        {error && <div className="error-msg">{error}</div>}
        <input type="text" {...{placeholder: t('auth:username')}} value={username}
          onChange={e => { setUsername(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        <input type="password" {...{placeholder: t('auth:password')}} value={password}
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

// ============================================================
// DASHBOARD ANALYTIQUE — Composants
// ============================================================

// Hook : compteur animé
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    let frame;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) frame = requestAnimationFrame(tick);
      else setVal(target);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return val;
}

// Carte KPI avec compteur animé et indicateur de tendance
function KPICard({ icon, label, value = 0, unit = '', trend, color = 'gold' }) {
  const animated = useCountUp(value);
  let display;
  if (unit === 'FCFA') display = Math.round(animated).toLocaleString('fr-FR') + ' FCFA';
  else if (unit === '%') display = animated.toFixed(1) + ' %';
  else display = Math.round(animated).toLocaleString('fr-FR');
  return (
    <div className="kpi-card">
      <div className="kpi-top">
        <span className="kpi-icon">{icon}</span>
        {trend !== undefined && trend !== null && (
          <span className={`kpi-trend ${trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral'}`}>
            {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className={`kpi-value ${color}`}>{display}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}

// Graphique linéaire area — évolution 12 mois
function RevenueAreaChart({ data, forecast }) {
  const { isDark } = useTheme();
  const fmtY = (v) => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v;
  const tipStyle = { background: isDark ? '#1b1f30' : '#ffffff', border: `1px solid ${isDark ? '#252a3a' : '#e2e8f0'}`, borderRadius: 10, fontSize: 13, color: isDark ? '#eaedf3' : '#0f172a' };
  const gridColor = isDark ? '#252a3a' : '#e2e8f0';
  const axisColor = isDark ? '#7a8094' : '#94a3b8';
  return (
    <div className="chart-card chart-full">
      <div className="chart-header">
        <h3>📈 Évolution des ventes — 12 derniers mois</h3>
        {forecast && (
          <span className={`forecast-pill ${forecast.trend}`}>
            Prévision {forecast.month} : {Number(forecast.revenue).toLocaleString('fr-FR')} FCFA
            {' '}{forecast.trend === 'hausse' ? '↑' : forecast.trend === 'baisse' ? '↓' : '→'}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d4a12e" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#d4a12e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2dd4a0" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#2dd4a0" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmtY} tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
          <Tooltip contentStyle={tipStyle} formatter={(v, n) => [Number(v).toLocaleString('fr-FR') + ' FCFA', n]} />
          <Legend wrapperStyle={{ fontSize: 12, color: axisColor }} />
          <Area type="monotone" dataKey="revenue" name="Revenus" stroke="#d4a12e" strokeWidth={2.5} fill="url(#gradRev)" dot={false} activeDot={{ r: 5, fill: '#d4a12e' }} />
          <Area type="monotone" dataKey="profit" name="Bénéfice" stroke="#2dd4a0" strokeWidth={2} fill="url(#gradProfit)" dot={false} activeDot={{ r: 4, fill: '#2dd4a0' }} strokeDasharray="5 3" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Graphique barres — revenus vs dépenses (6 derniers mois)
function RevenueExpensesChart({ data }) {
  const { isDark } = useTheme();
  const fmtY = (v) => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v;
  const tipStyle = { background: isDark ? '#1b1f30' : '#ffffff', border: `1px solid ${isDark ? '#252a3a' : '#e2e8f0'}`, borderRadius: 10, fontSize: 13, color: isDark ? '#eaedf3' : '#0f172a' };
  const gridColor = isDark ? '#252a3a' : '#e2e8f0';
  const axisColor = isDark ? '#7a8094' : '#94a3b8';
  return (
    <div className="chart-card">
      <h3>💹 Revenus vs Dépenses — 6 mois</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmtY} tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
          <Tooltip contentStyle={tipStyle} formatter={(v, n) => [Number(v).toLocaleString('fr-FR') + ' FCFA', n]} />
          <Legend wrapperStyle={{ fontSize: 12, color: axisColor }} />
          <Bar dataKey="revenue" name="Revenus" fill="#d4a12e" radius={[4, 4, 0, 0]} maxBarSize={30} />
          <Bar dataKey="expenses" name="Dépenses" fill="#ef6461" radius={[4, 4, 0, 0]} maxBarSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Graphique camembert — répartition par catégorie
const PIE_COLORS = ['#d4a12e', '#5b9cf6', '#2dd4a0', '#9b7ff0', '#f0923c', '#ef6461', '#7a8094'];
function CategoryPieChart({ data }) {
  const { isDark } = useTheme();
  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }) => {
    if (percentage < 6) return null;
    const R = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.6;
    return (
      <text x={cx + r * Math.cos(-midAngle * R)} y={cy + r * Math.sin(-midAngle * R)}
        fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
        {percentage}%
      </text>
    );
  };
  const tipStyle = { background: isDark ? '#1b1f30' : '#ffffff', border: `1px solid ${isDark ? '#252a3a' : '#e2e8f0'}`, borderRadius: 10, fontSize: 13, color: isDark ? '#eaedf3' : '#0f172a' };
  const legendColor = isDark ? '#eaedf3' : '#0f172a';
  return (
    <div className="chart-card">
      <h3>🥧 Répartition par catégorie</h3>
      {data.length === 0
        ? <p className="chart-empty">Aucune donnée disponible</p>
        : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" outerRadius={95} innerRadius={52}
                dataKey="total" nameKey="category" labelLine={false} label={CustomLabel}>
                {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tipStyle} formatter={(v, n) => [Number(v).toLocaleString('fr-FR') + ' FCFA', n]} />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={v => <span style={{ color: legendColor }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        )
      }
    </div>
  );
}

// Classement Top 5 produits
function TopProductsList({ products }) {
  const maxRev = products[0]?.revenue || 1;
  return (
    <div className="analytics-card">
      <h3>🏆 Top 5 Produits</h3>
      {products.length === 0
        ? <p className="chart-empty">Aucune vente sur cette période</p>
        : (
          <div className="top-list">
            {products.map((p, i) => (
              <div key={i} className="top-item">
                <span className={`top-rank rank-${i + 1}`}>#{i + 1}</span>
                <div className="top-info">
                  <div className="top-row">
                    <span className="top-name">{p.name}</span>
                    <span className="top-rev gold">{Number(p.revenue).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div className="top-bar-wrap">
                    <div className="top-bar" style={{ width: `${(p.revenue / maxRev) * 100}%` }} />
                  </div>
                  <div className="top-meta">
                    <span className="muted">{p.quantity} vendu(s)</span>
                    <span className={p.margin >= 0 ? 'green' : 'red'}>Marge {p.margin}%</span>
                    <span className="muted">{p.share}% du CA</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

// Panneau d'alertes
const ALERT_CLRS = { critical: 'red', warning: 'orange', info: 'blue' };
function AlertsPanel({ alerts }) {
  return (
    <div className="analytics-card">
      <h3>
        🚨 Alertes{' '}
        <span className={`alert-count-badge ${alerts.some(a => a.severity === 'critical') ? 'crit' : ''}`}>
          {alerts.length}
        </span>
      </h3>
      {alerts.length === 0
        ? <p className="alert-ok">✅ Aucune alerte — Tout est en ordre</p>
        : (
          <div className="alerts-list">
            {alerts.slice(0, 8).map((a, i) => (
              <div key={i} className={`alert-item sev-${a.severity}`}>
                <span className="alert-dot" />
                <div className="alert-body">
                  <div className={`alert-title ${ALERT_CLRS[a.severity] || ''}`}>{a.title}</div>
                  <div className="alert-detail">{a.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

// ============================================================
// DASHBOARD — Composant principal
// ============================================================
function Dashboard() {
  const { t } = useTranslation(['dashboard', 'common']);
  const [period, setPeriod] = useState('month');
  const [kpi, setKpi] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [catData, setCatData] = useState([]);
  const [topProds, setTopProds] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const load = async (p, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [kpiRes, revRes, catRes, topRes, alertRes] = await Promise.all([
        dashboardAPI.getKPI(p),
        dashboardAPI.getRevenueChart(),
        dashboardAPI.getCategoryChart(p),
        dashboardAPI.getTopProducts(p),
        dashboardAPI.getAlerts(),
      ]);
      setKpi(kpiRes.data);
      setChartData(revRes.data.data || []);
      setForecast(revRes.data.forecast || null);
      setCatData(catRes.data.data || []);
      setTopProds(topRes.data.products || []);
      setAlerts(alertRes.data.alerts || []);
      setLastUpdate(new Date());
    } catch (err) { console.error('Dashboard:', err); }
    if (!silent) setLoading(false);
  };

  useEffect(() => { load(period); }, [period]);

  // Auto-refresh toutes les 30 secondes
  useEffect(() => {
    const id = setInterval(() => load(period, true), 30000);
    return () => clearInterval(id);
  }, [period]);

  const exportCSV = () => {
    const c = kpi?.current || {};
    const s = kpi?.stock || {};
    const rows = [
      ['Indicateur', 'Valeur', 'Periode'],
      ['Chiffre affaires', c.revenue || 0, period],
      ['Depenses', c.expenses || 0, period],
      ['Benefice brut', c.gross_profit || 0, period],
      ['Taux de marge %', c.margin_rate || 0, period],
      ['Factures payees', c.nb_paid || 0, period],
      ['Factures en attente', c.nb_pending || 0, period],
      ['Taux conversion %', c.conversion_rate || 0, period],
      ['Valeur stock', s.value || 0, 'actuel'],
      ['Alertes stock', s.alerts || 0, 'actuel'],
    ];
    const csv = '﻿' + rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kenpro-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="loading">{t('common:loading')}</div>;

  const curr = kpi?.current || {};
  const comp = kpi?.comparison || {};
  const stock = kpi?.stock || {};
  const reps = kpi?.repairs || {};
  const criticals = alerts.filter(a => a.severity === 'critical').length;

  return (
    <div className="dashboard-pro">
      {/* En-tête */}
      <div className="dash-header">
        <div>
          <h2 className="dash-title">📊 {t('dashboard:title')}</h2>
          {lastUpdate && (
            <p className="dash-update">
              {lastUpdate.toLocaleTimeString()} · {t('dashboard:refresh_auto')}
            </p>
          )}
        </div>
        <div className="dash-actions">
          <div className="period-tabs">
            {[['day', t('dashboard:today')], ['week', t('dashboard:week')], ['month', t('dashboard:month')], ['year', t('dashboard:year')]].map(([k, l]) => (
              <button key={k} className={`period-tab${period === k ? ' active' : ''}`} onClick={() => setPeriod(k)}>
                {l}
              </button>
            ))}
          </div>
          <button className="btn-csv" onClick={exportCSV}>⬇ CSV</button>
        </div>
      </div>

      {/* Bannière critique */}
      {criticals > 0 && (
        <div className="alert-banner">
          🚨 <strong>{criticals} {t('dashboard:critical_alerts')}</strong> — consultez le panneau ci-dessous
        </div>
      )}

      {/* KPI */}
      <div className="kpi-grid">
        <KPICard icon="💰" {...{label: t('dashboard:revenue')}} value={curr.revenue || 0} unit="FCFA" trend={comp.revenue} color="gold" />
        <KPICard icon="📈" {...{label: t('dashboard:profit')}} value={curr.gross_profit || 0} unit="FCFA" trend={comp.gross_profit} color="green" />
        <KPICard icon="🧾" {...{label: t('dashboard:paid_invoices')}} value={curr.nb_paid || 0} trend={comp.nb_paid} color="blue" />
        <KPICard icon="⏳" {...{label: t('dashboard:pending_payment')}} value={curr.nb_pending || 0} color="orange" />
        <KPICard icon="🔄" {...{label: t('dashboard:conversion_rate')}} value={curr.conversion_rate || 0} unit="%" trend={comp.conversion_rate} color="purple" />
        <KPICard icon="💎" {...{label: t('dashboard:stock_value')}} value={stock.value || 0} unit="FCFA" color="blue" />
        <KPICard icon="📊" {...{label: t('dashboard:margin_rate')}} value={curr.margin_rate || 0} unit="%" color={curr.margin_rate >= 0 ? 'green' : 'red'} />
        <KPICard icon="🔧" {...{label: t('dashboard:active_repairs')}} value={reps.active || 0} color="orange" />
      </div>

      {/* Graphique principal */}
      <RevenueAreaChart data={chartData} forecast={forecast} />

      {/* Graphiques secondaires */}
      <div className="charts-row">
        <RevenueExpensesChart data={chartData.slice(-6)} />
        <CategoryPieChart data={catData} />
      </div>

      {/* Section basse */}
      <div className="analytics-row">
        <TopProductsList products={topProds} />
        <AlertsPanel alerts={alerts} />
      </div>
    </div>
  );
}

// ============================================================
// PRODUITS
// ============================================================
function Products() {
  const { t } = useTranslation(['products', 'common']);
  const [products, setProducts]     = useState([]);
  const [search, setSearch]         = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState(null);
  const [form, setForm]             = useState({ name: '', category: '', price: '', cost_price: '', quantity: '', min_stock: '5', barcode: '' });
  const [loading, setLoading]       = useState(true);
  const [showScanner,   setShowScanner]  = useState(false);
  const [labelProduct,  setLabelProduct] = useState(null);
  const [storeProduct,  setStoreProduct] = useState(null);  // pour ProductStorePanel
  const [scanResult,    setScanResult]   = useState(null);
  const { show: showToast } = useToast();

  const load = async () => {
    try { const res = await productsAPI.getAll({ search }); setProducts(res.data.products); } catch (err) { console.error(err); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [search]);

  const resetForm = () => {
    setForm({ name: '', category: '', price: '', cost_price: '', quantity: '', min_stock: '5', barcode: '' });
    setEditId(null); setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    const data = { ...form, price: Number(form.price), cost_price: Number(form.cost_price || 0), quantity: Number(form.quantity || 0), min_stock: Number(form.min_stock || 5) };
    try {
      if (editId) { await productsAPI.update(editId, data); }
      else { await productsAPI.create(data); }
      resetForm(); load();
    } catch (err) { alert(err.response?.data?.error || err.response?.data?.detail || 'Erreur'); }
  };

  const handleEdit = (p) => {
    setForm({ name: p.name, category: p.category || '', price: String(p.price), cost_price: String(p.cost_price || ''), quantity: String(p.quantity), min_stock: String(p.min_stock || 5), barcode: p.barcode || '' });
    setEditId(p.id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm(t('products:delete_confirm'))) return;
    try { await productsAPI.delete(id); load(); } catch (err) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  // Scan → recherche produit par code-barres
  const handleBarcodeDetected = async (code) => {
    // caméra déjà libérée par BarcodeScanner avant cet appel
    setShowScanner(false);
    try {
      const res = await productsAPI.getByBarcode(code);
      setScanResult({ found: true, product: res.data.product });
      showToast('Produit trouvé', res.data.product.name, 'success');
    } catch {
      setScanResult({ found: false, code });
      // Pré-remplir le code dans le formulaire et ouvrir pour ajouter le produit
      setForm(f => ({ ...f, barcode: code }));
      setShowForm(true);
      showToast('Code inconnu', `Ajoutez ce produit (code: ${code})`, 'warning');
    }
  };

  if (loading) return <div className="loading">{t('common:loading')}</div>;

  return (
    <div>
      {/* Modales */}
      {showScanner  && <BarcodeScanner   onDetect={handleBarcodeDetected} onClose={() => setShowScanner(false)} title={t('products:scan')} />}
      {labelProduct && <LabelPrinter    product={labelProduct}  onClose={() => { setLabelProduct(null);  load(); }} />}
      {storeProduct && <ProductStorePanel product={storeProduct} onClose={() => { setStoreProduct(null); load(); }}
                          onSave={updated => setProducts(ps => ps.map(p => p.id === updated.id ? { ...p, ...updated } : p))} />}

      <div className="page-header">
        <h2>📦 {t('products:title')} ({products.length})</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => { setScanResult(null); setShowScanner(true); }}>📷 {t('products:scan')}</button>
          <button className="btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>+ {t('products:title')}</button>
        </div>
      </div>

      {/* Résultat scan */}
      {scanResult && (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 10,
          background: scanResult.found ? 'rgba(45,212,160,.1)' : 'rgba(240,146,60,.1)',
          border: `1px solid ${scanResult.found ? '#2dd4a0' : '#f0923c'}` }}>
          {scanResult.found ? (
            <div>
              <div style={{ fontWeight: 700, color: '#2dd4a0', marginBottom: 8 }}>
                ✅ Produit trouvé : {scanResult.product.name}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <BarcodeDisplay value={scanResult.product.barcode} height={45} />
                <div style={{ flex: 1, marginLeft: 12 }}>
                  <div style={{ color: '#d4a12e', fontWeight: 700 }}>{fmt(scanResult.product.price)}</div>
                  <div style={{ color: '#7a8094', fontSize: 13 }}>Stock : {scanResult.product.quantity}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                      onClick={() => handleEdit(scanResult.product)}>✏️ Modifier</button>
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                      onClick={() => setLabelProduct(scanResult.product)}>🏷️ Étiquette</button>
                    <button onClick={() => setScanResult(null)} style={{ background: 'none', border: 'none', color: '#7a8094', cursor: 'pointer', fontSize: 18 }}>×</button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 700, color: '#f0923c', marginBottom: 8 }}>
                ⚠️ Code inconnu : <code style={{ fontFamily: 'monospace' }}>{scanResult.code}</code>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" style={{ fontSize: 12 }}
                  onClick={() => {
                    const code = scanResult.code;
                    setScanResult(null);
                    setEditId(null);
                    setForm({ name: '', category: '', price: '', cost_price: '', quantity: '', min_stock: '5', barcode: code });
                    setShowForm(true);
                  }}>
                  + Créer ce produit
                </button>
                <button onClick={() => setScanResult(null)} style={{ ...{background:'#252a3a',color:'#eaedf3',border:'none',borderRadius:8,padding:'6px 12px',cursor:'pointer',fontSize:12} }}>
                  Ignorer
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <input type="text" placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="search-input" />

      {showForm && (
        <div className="form-card">
          <h3>{editId ? 'Modifier le produit' : 'Nouveau produit'}</h3>
          <div className="form-grid">
            <input placeholder="Nom *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input placeholder="Catégorie" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
            <input type="number" placeholder="Prix vente *" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            <input type="number" placeholder="Prix achat" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} />
            <input type="number" placeholder="Quantité" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
            <input type="number" placeholder="Stock min" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })} />
            <input placeholder="Code-barres (optionnel)" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })}
              style={{ gridColumn: 'span 2' }} />
          </div>
          <div className="form-actions">
            <button className="btn-primary" onClick={handleSave}>{editId ? 'Enregistrer' : 'Ajouter'}</button>
            <button className="btn-secondary" onClick={resetForm}>Annuler</button>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead><tr><th>{t('products:product_name')}</th><th>{t('common:category')}</th><th>{t('products:barcode')}</th><th>{t('common:price')}</th><th>{t('products:stock')}</th><th>{t('common:status')}</th><th></th></tr></thead>
          <tbody>{products.map(p => (
            <tr key={p.id}>
              <td className="bold">{p.name}</td>
              <td className="muted">{p.category || '—'}</td>
              <td>
                {p.barcode
                  ? <code style={{ fontSize: 11, color: '#7a8094', fontFamily: 'monospace' }}>{p.barcode}</code>
                  : <span style={{ color: '#3a3f52', fontSize: 11 }}>—</span>}
              </td>
              <td className="gold bold">{fmt(p.price)}</td>
              <td className={p.status === 'rupture' ? 'red bold' : p.status === 'bas' ? 'orange bold' : 'bold'}>{p.quantity}</td>
              <td><span className={`badge badge-${p.status}`}>{p.status === 'rupture' ? 'Rupture' : p.status === 'bas' ? 'Bas' : 'OK'}</span></td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-icon" onClick={() => handleEdit(p)}>✏️</button>
                  <button className="btn-icon" onClick={() => setStoreProduct(p)} title="Boutique en ligne">🛒</button>
                  <button className="btn-icon" onClick={() => setLabelProduct(p)} title="Imprimer étiquette">🏷️</button>
                  <button className="btn-icon red" onClick={() => handleDelete(p.id)}>🗑️</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// CLIENTS
// ============================================================
function Clients() {
  const { t } = useTranslation(['clients', 'common']);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', city: '' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { const res = await clientsAPI.getAll({ search }); setClients(res.data.clients); } catch (err) { console.error(err); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [search]);

  const resetForm = () => { setForm({ name: '', phone: '', email: '', address: '', city: '' }); setEditId(null); setShowForm(false); };

  const handleSave = async () => {
    if (!form.name) return;
    try {
      if (editId) { await clientsAPI.update(editId, form); }
      else { await clientsAPI.create(form); }
      resetForm(); load();
    } catch (err) { alert(err?.response?.data?.detail || err?.response?.data?.error || 'Erreur'); }
  };

  const handleEdit = (c) => {
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', city: c.city || '' });
    setEditId(c.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ?')) return;
    try { await clientsAPI.delete(id); load(); } catch (err) { alert(err?.response?.data?.detail || err?.response?.data?.error || 'Erreur'); }
  };

  if (loading) return <div className="loading">{t('common:loading')}</div>;

  return (
    <div>
      <div className="page-header"><h2>👥 Clients ({clients.length})</h2><button className="btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>+ Client</button></div>
      <input type="text" placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="search-input" />
      {showForm && (
        <div className="form-card"><h3>{editId ? 'Modifier le client' : 'Nouveau client'}</h3>
          <div className="form-grid">
            <input placeholder="Nom *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input placeholder="Telephone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Adresse" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            <input placeholder="Ville" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="form-actions"><button className="btn-primary" onClick={handleSave}>{editId ? 'Enregistrer' : 'Ajouter'}</button><button className="btn-secondary" onClick={resetForm}>Annuler</button></div>
        </div>
      )}
      <div className="cards-list">{clients.map(c => (
        <div key={c.id} className="list-card">
          <div><div className="bold">{c.name}</div><div className="muted small">📱 {c.phone || '—'} &nbsp; 📧 {c.email || '—'}</div>
            {c.city && <div className="muted small">📍 {c.city} {c.address && `— ${c.address}`}</div>}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-icon" onClick={() => handleEdit(c)}>✏️</button>
            <button className="btn-icon red" onClick={() => handleDelete(c.id)}>🗑️</button>
          </div>
        </div>
      ))}</div>
    </div>
  );
}

// ============================================================
// FACTURES / DEVIS
// ============================================================
function Invoices() {
  const { t } = useTranslation(['invoices', 'common']);
  const [invoices, setInvoices]     = useState([]);
  const [stats, setStats]           = useState({});
  const [filter, setFilter]         = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [clients, setClients]       = useState([]);
  const [products, setProducts]     = useState([]);
  const [form, setForm]             = useState({ client_id: '', invoice_type: 'facture', status: 'en_attente', items: [{ product_id: '', quantity: 1, price: '' }], notes: '' });
  const [loading, setLoading]       = useState(true);
  const [showScanner, setShowScanner]         = useState(false);
  const [scanningItemIdx, setScanningItemIdx] = useState(null);
  const [ticketInvoice, setTicketInvoice]     = useState(null);  // facture pour TicketPrinter
  const quantityRefs = useRef({});
  const { show: showToast } = useToast();

  const load = async () => {
    try {
      const res = await invoicesAPI.getAll(filter ? { type: filter } : {});
      setInvoices(res.data.invoices); setStats(res.data.stats || {});
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadFormData = async () => {
    try {
      const [cRes, pRes] = await Promise.all([clientsAPI.getAll(), productsAPI.getAll()]);
      setClients(cRes.data.clients); setProducts(pRes.data.products);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { load(); }, [filter]);

  const openForm = () => { loadFormData(); setShowForm(true); };

  const addItem = () => setForm({ ...form, items: [...form.items, { product_id: '', quantity: 1, price: '' }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const updateItem = (i, field, val) => {
    const items = [...form.items];
    if (field === 'product_id') {
      const prod = products.find(p => p.id === Number(val));
      items[i] = { ...items[i], product_id: val, price: prod ? String(prod.price) : '' };
    } else {
      items[i] = { ...items[i], [field]: val };
    }
    setForm({ ...form, items });
  };

  // Scanner → ajouter/compléter une ligne de facture
  const handleInvoiceScan = async (code) => {
    setShowScanner(false);
    try {
      const res = await productsAPI.getByBarcode(code);
      const prod = res.data.product;
      const targetIdx = scanningItemIdx;
      setScanningItemIdx(null);
      setForm(prev => {
        const items = [...prev.items];
        if (targetIdx !== null && !items[targetIdx].product_id) {
          // Remplir la ligne vide ciblée
          items[targetIdx] = { product_id: String(prod.id), quantity: 1, price: String(prod.price) };
        } else {
          // Chercher si le produit est déjà dans la liste
          const existingIdx = items.findIndex(it => Number(it.product_id) === prod.id);
          if (existingIdx >= 0) {
            items[existingIdx] = { ...items[existingIdx], quantity: Number(items[existingIdx].quantity) + 1 };
          } else {
            items.push({ product_id: String(prod.id), quantity: 1, price: String(prod.price) });
          }
        }
        return { ...prev, items };
      });
      showToast('Produit ajouté', prod.name, 'success');
      // Focus quantité après ajout
      setTimeout(() => {
        const idx = scanningItemIdx !== null ? scanningItemIdx : form.items.length;
        quantityRefs.current[idx]?.focus();
      }, 100);
    } catch {
      showToast('Code-barres inconnu', code, 'error');
    }
  };

  const getTotal = () => form.items.reduce((s, it) => {
    const price = it.price ? Number(it.price) : 0;
    return s + price * Number(it.quantity || 1);
  }, 0);

  const handleCreate = async () => {
    if (!form.client_id || form.items.some(i => !i.product_id)) { alert('Selectionnez un client et des produits'); return; }
    try {
      await invoicesAPI.create({
        client_id: Number(form.client_id), invoice_type: form.invoice_type, status: form.status, notes: form.notes,
        items: form.items.map(i => ({ product_id: Number(i.product_id), quantity: Number(i.quantity), price: i.price ? Number(i.price) : undefined }))
      });
      setForm({ client_id: '', invoice_type: 'facture', status: 'en_attente', items: [{ product_id: '', quantity: 1, price: '' }], notes: '' });
      setShowForm(false); load();
    } catch (err) { alert(err?.response?.data?.detail || err?.response?.data?.error || 'Erreur'); }
  };

  const handlePay = async (id) => {
    try {
      await invoicesAPI.pay(id);
      await load();
      // Impression automatique du ticket après paiement
      const paid = (await invoicesAPI.getAll()).data.invoices.find(i => i.id === id);
      if (paid) setTicketInvoice(paid);
    } catch (err) { alert(err.response?.data?.error || err.response?.data?.detail || 'Erreur'); }
  };

  const handleConvert = async (id) => {
    try { await invoicesAPI.convert(id); load(); } catch (err) { alert(err?.response?.data?.detail || err?.response?.data?.error || 'Erreur'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ?')) return;
    try { await invoicesAPI.delete(id); load(); } catch (err) { alert(err?.response?.data?.detail || err?.response?.data?.error || 'Erreur'); }
  };

  const printInvoice = (inv) => {
    const itemsHtml = (inv.items || []).map(it => `<tr><td>${it.product_name}</td><td style="text-align:center">${it.quantity}</td><td style="text-align:right">${fmt(it.unit_price)}</td><td style="text-align:right">${fmt(it.total)}</td></tr>`).join('');
    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) { alert('Autorisez les popups'); return; }
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${inv.number}</title><style>
      *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;padding:30px;color:#1a1a1a;font-size:13px}
      .hdr{text-align:center;margin-bottom:24px;border-bottom:3px solid #d4a12e;padding-bottom:16px}.hdr img{width:70px;height:70px;border-radius:50%;margin-bottom:8px}.hdr h1{font-size:22px;color:#d4a12e;margin:0}
      table{width:100%;border-collapse:collapse;margin:16px 0}th{background:#f0f0f0;padding:10px 12px;text-align:left;font-size:12px;border-bottom:2px solid #ddd}td{padding:10px 12px;border-bottom:1px solid #eee}
      .tot{font-weight:700;font-size:16px;text-align:right;padding:16px 0;border-top:3px solid #d4a12e;margin-top:8px}
      .sig{margin-top:50px;display:flex;justify-content:space-between}.sig div{width:200px;text-align:center;border-top:1px solid #333;padding-top:8px;font-size:12px}
      .ft{margin-top:40px;text-align:center;color:#aaa;font-size:11px;border-top:1px solid #eee;padding-top:16px}
      @media print{body{padding:20px}}
    </style></head><body>
      <div class="hdr"><img src="${window.location.origin}/logo.png" alt="KENPRO"/><h1>KENPRO STORE</h1></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:20px">
        <div><strong style="font-size:18px">${inv.invoice_type === 'facture' ? 'FACTURE' : 'DEVIS'}</strong><br/><span style="color:#d4a12e;font-weight:700">${inv.number}</span></div>
        <div style="text-align:right"><strong>Date:</strong> ${inv.created_at}<br/><strong>Statut:</strong> ${inv.status === 'payee' ? '✅ Payee' : '⏳ En attente'}</div>
      </div>
      <div style="background:#f8f8f8;padding:12px;border-radius:6px;margin-bottom:16px"><strong>Client:</strong> 👤 ${inv.client_name} ${inv.client_phone ? '📱 ' + inv.client_phone : ''}</div>
      <table><thead><tr><th>Produit</th><th style="text-align:center">Qte</th><th style="text-align:right">Prix unit.</th><th style="text-align:right">Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>
      <div class="tot">TOTAL: ${fmt(inv.total)}</div>
      <div class="sig"><div>Le vendeur</div><div>Le client</div></div>
      <div class="ft">KENPRO STORE — Document genere le ${new Date().toLocaleDateString('fr-FR')}</div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const sendWhatsApp = (inv) => {
    if (!inv.client_phone) { alert('Ce client n\'a pas de numero de telephone'); return; }
    const phone = inv.client_phone.replace(/\D/g, '');
    const msg = `Bonjour ${inv.client_name},\nVoici votre ${inv.invoice_type} N°${inv.number} de KENPRO STORE.\nMontant: ${fmt(inv.total)}\nMerci pour votre confiance !`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) return <div className="loading">{t('common:loading')}</div>;

  return (
    <div>
      {/* Modales */}
      {showScanner && (
        <BarcodeScanner
          onDetect={handleInvoiceScan}
          onClose={() => { setShowScanner(false); setScanningItemIdx(null); }}
          title={t('products:scan')}
        />
      )}
      {ticketInvoice && (
        <TicketPrinter invoice={ticketInvoice} onClose={() => setTicketInvoice(null)} />
      )}

      <div className="page-header"><h2>🧾 Factures / Devis ({invoices.length})</h2><button className="btn-primary" onClick={openForm}>+ Facture</button></div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card"><span className="stat-icon">🧾</span><span className="stat-label">Factures</span><span className="stat-value blue">{stats.nb_factures || 0}</span></div>
        <div className="stat-card"><span className="stat-icon">📋</span><span className="stat-label">Devis</span><span className="stat-value purple">{stats.nb_devis || 0}</span></div>
        <div className="stat-card"><span className="stat-icon">💰</span><span className="stat-label">Factures payées</span><span className="stat-value green">{fmt(stats.total_factures_payees)}</span></div>
      </div>

      <div className="filter-bar">
        <button className={`btn-filter ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>Tout</button>
        <button className={`btn-filter ${filter === 'facture' ? 'active' : ''}`} onClick={() => setFilter('facture')}>Factures</button>
        <button className={`btn-filter ${filter === 'devis' ? 'active' : ''}`} onClick={() => setFilter('devis')}>Devis</button>
      </div>

      {showForm && (
        <div className="form-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>{t('invoices:new_invoice')} / {t('invoices:new_quote')}</h3>
            <button
              className="btn-secondary"
              style={{ fontSize: 13, padding: '7px 14px' }}
              onClick={() => { setScanningItemIdx(null); setShowScanner(true); }}
            >
              📷 Scanner produit
            </button>
          </div>
          <div className="form-grid">
            <select value={form.invoice_type} onChange={e => setForm({ ...form, invoice_type: e.target.value })}>
              <option value="facture">{t('invoices:facture')}</option><option value="devis">{t('invoices:devis')}</option>
            </select>
            <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
              <option value="">— Choisir un client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
            </select>
            {form.invoice_type === 'facture' && (
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="en_attente">{t('invoices:pending')}</option><option value="payee">{t('invoices:paid')}</option>
              </select>
            )}
          </div>
          <div className="muted small" style={{ marginBottom: 8, marginTop: 8 }}>Articles :</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <span style={{ flex: 2, fontSize: 11, color: '#7a8094' }}>Produit</span>
            <span style={{ flex: 0.7, fontSize: 11, color: '#7a8094', textAlign: 'center' }}>Prix</span>
            <span style={{ flex: 0.5, fontSize: 11, color: '#7a8094', textAlign: 'center' }}>Qté</span>
            <span style={{ width: 60 }}></span>
          </div>
          {form.items.map((it, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <select value={it.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)} style={{ flex: 2 }}>
                <option value="">— Produit —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({fmt(p.price)})</option>)}
              </select>
              <input type="number" value={it.price} placeholder="Prix" onChange={e => updateItem(i, 'price', e.target.value)} style={{ flex: 0.7, textAlign: 'center' }} />
              <input
                type="number" value={it.quantity} min={1}
                ref={el => quantityRefs.current[i] = el}
                onChange={e => updateItem(i, 'quantity', e.target.value)}
                style={{ flex: 0.5, textAlign: 'center' }}
              />
              <button
                onClick={() => { setScanningItemIdx(i); setShowScanner(true); }}
                title="Scanner un produit pour cette ligne"
                style={{ background: 'none', border: '1px solid #252a3a', borderRadius: 6, color: '#d4a12e', cursor: 'pointer', fontSize: 16, padding: '4px 8px' }}
              >📷</button>
              {form.items.length > 1 && <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: '#ef6461', cursor: 'pointer', fontSize: 16 }}>✕</button>}
            </div>
          ))}
          <button className="btn-secondary btn-small" onClick={addItem} style={{ marginBottom: 12 }}>+ Article</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderTop: '1px solid #252a3a' }}>
            <span className="muted bold">Total</span><span className="gold bold" style={{ fontSize: 18 }}>{fmt(getTotal())}</span>
          </div>
          <div className="form-actions">
            <button className="btn-primary" onClick={handleCreate}>Créer</button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
          </div>
        </div>
      )}

      <div className="cards-list">{invoices.map(inv => (
        <div key={inv.id} className="list-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span className="gold bold">{inv.number}</span>
                <span className={`badge ${inv.invoice_type === 'facture' ? 'badge-recu' : 'badge-diagnostic'}`}>{inv.invoice_type === 'facture' ? 'Facture' : 'Devis'}</span>
                <span className={`badge ${inv.status === 'payee' ? 'badge-ok' : inv.status === 'converti' ? 'badge-livre' : 'badge-bas'}`}>
                  {inv.status === 'payee' ? 'Payee' : inv.status === 'converti' ? 'Converti' : 'En attente'}
                </span>
              </div>
              <div>👤 {inv.client_name} — {inv.created_at}</div>
            </div>
            <span className="gold bold" style={{ fontSize: 18 }}>{fmt(inv.total)}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn-small btn-secondary" onClick={() => setTicketInvoice(inv)} title="Ticket caisse">🧾 Ticket</button>
            <button className="btn-small btn-secondary" onClick={() => printInvoice(inv)} title="Facture complète">🖨️ Facture</button>
            <button className="btn-small btn-secondary" style={{ background: '#1c3b2a', color: '#2dd4a0', border: '1px solid #2dd4a0' }} onClick={() => sendWhatsApp(inv)}>📱 WhatsApp</button>
            {inv.status === 'en_attente' && inv.invoice_type === 'facture' && <button className="btn-small btn-primary" onClick={() => handlePay(inv.id)}>✅ Payer</button>}
            {inv.invoice_type === 'devis' && inv.status !== 'converti' && <button className="btn-small btn-primary" onClick={() => handleConvert(inv.id)}>→ Convertir en facture</button>}
            {inv.status !== 'payee' && <button className="btn-icon red" onClick={() => handleDelete(inv.id)}>🗑️</button>}
          </div>
          <div className="muted small">
            {inv.items?.map((it, i) => <span key={i}>{it.product_name} x{it.quantity} ({fmt(it.unit_price)}) {i < inv.items.length - 1 ? ' | ' : ''}</span>)}
          </div>
        </div>
      ))}</div>
    </div>
  );
}

// ============================================================
// REPARATIONS
// ============================================================
function Repairs() {
  const { t } = useTranslation(['repairs', 'common']);
  const [repairs,       setRepairs]       = useState([]);
  const [filter,        setFilter]        = useState('');
  const [showForm,      setShowForm]      = useState(false);
  const [clients,       setClients]       = useState([]);
  const [form,          setForm]          = useState({ client_id: '', device_type: 'laptop', brand: '', model: '', serial_number: '', problem: '', estimated_cost: '', priority: 'normal' });
  const [loading,       setLoading]       = useState(true);
  const [ticketRepair,   setTicketRepair]   = useState(null);  // pour RepairTicketPrinter
  const [labelRepair,    setLabelRepair]    = useState(null);  // pour RepairLabelPrinter
  const [scanRepairOpen, setScanRepairOpen] = useState(false); // scanner barcode → REP
  const { show: showToast } = useToast();

  const handleRepairScan = async (code) => {
    setScanRepairOpen(false);
    // code peut être "REP-0001" ou juste "REP-0001" depuis JsBarcode
    const ticket = code.trim().toUpperCase();
    try {
      const res = await repairsAPI.getAll({ search: ticket });
      const found = (res.data.repairs || []).find(r =>
        r.ticket === ticket || r.ticket === code
      );
      if (found) {
        setLabelRepair(found);
        showToast('Réparation trouvée', `${found.ticket} — ${found.client_name}`, 'success');
      } else {
        showToast('Introuvable', `Aucune réparation pour "${ticket}"`, 'error');
      }
    } catch {
      showToast('Erreur', 'Impossible de récupérer la réparation', 'error');
    }
  };

  const STATUSES = ['recu', 'diagnostic', 'attente_piece', 'en_reparation', 'termine', 'livre'];
  const STATUS_LABELS = { recu: 'Recu', diagnostic: 'Diagnostic', attente_piece: 'Att. piece', en_reparation: 'En repar.', termine: 'Termine', livre: 'Livre' };

  // Messages WhatsApp automatiques selon le statut
  const WA_MESSAGES = {
    diagnostic:    (r) => `Bonjour ${r.client_name},\n📋 Votre ${r.device_type} (Ticket: *${r.ticket}*) est en cours de diagnostic.\nNous vous tiendrons informé.`,
    attente_piece: (r) => `Bonjour ${r.client_name},\n⏳ Votre ${r.device_type} (Ticket: *${r.ticket}*) est en attente d'une pièce.\nNous vous contacterons dès la réception.`,
    en_reparation: (r) => `Bonjour ${r.client_name},\n🔧 La réparation de votre ${r.device_type} (Ticket: *${r.ticket}*) est en cours.\nNous vous contacterons à la fin.`,
    termine:       (r) => `Bonjour ${r.client_name},\n✅ Votre ${r.device_type} (Ticket: *${r.ticket}*) est *PRÊT* !\nVenez le récupérer muni de votre ticket.\nMerci — KENPRO STORE`,
    livre:         (r) => `Bonjour ${r.client_name},\n📦 Votre ${r.device_type} (Ticket: *${r.ticket}*) vous a été remis.\nMerci pour votre confiance — KENPRO STORE`,
  };

  const load = async () => {
    try { const res = await repairsAPI.getAll(filter ? { status: filter } : {}); setRepairs(res.data.repairs); } catch (err) { console.error(err); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  const openForm = async () => {
    try { const res = await clientsAPI.getAll(); setClients(res.data.clients); } catch (err) { console.error(err); }
    setShowForm(true);
  };

  const handleCreate = async () => {
    if (!form.client_id || !form.problem) { alert('Client et problème obligatoires'); return; }
    try {
      const res = await repairsAPI.create({ ...form, client_id: Number(form.client_id), estimated_cost: Number(form.estimated_cost || 0) });
      setForm({ client_id: '', device_type: 'laptop', brand: '', model: '', serial_number: '', problem: '', estimated_cost: '', priority: 'normal' });
      setShowForm(false);
      await load();
      const newRepair = res.data.repair;
      // Ouvrir le ticket de réception automatiquement après création
      setTicketRepair(newRepair);
      showToast('Ticket créé', newRepair.ticket + ' — Imprimez le ticket + l\'étiquette', 'success');
      // Proposer d'imprimer l'étiquette après 1.5s (laisse le temps de fermer le ticket)
      setTimeout(() => {
        if (window.confirm(`Imprimer l'étiquette autocollante pour cet appareil ?\n(${newRepair.brand} ${newRepair.model})`)) {
          setLabelRepair(newRepair);
        }
      }, 1500);
    } catch (err) { alert(err?.response?.data?.detail || err?.response?.data?.error || 'Erreur'); }
  };

  const nextStatus = async (r) => {
    const idx = STATUSES.indexOf(r.status);
    if (idx >= STATUSES.length - 1) return;
    const newStatus = STATUSES[idx + 1];
    try {
      await repairsAPI.changeStatus(r.id, newStatus, '');
      await load();
      // Notification WhatsApp automatique si le client a un numéro
      if (r.client_phone && WA_MESSAGES[newStatus]) {
        const msg = WA_MESSAGES[newStatus](r);
        const phone = r.client_phone.replace(/\D/g, '');
        showToast(
          '📱 WhatsApp prêt',
          `Statut → ${STATUS_LABELS[newStatus]} — cliquez pour envoyer`,
          'info'
        );
        // Proposer d'ouvrir WhatsApp sans forcer (popup bloqué si non initié)
        if (window.confirm(`Envoyer une notification WhatsApp au client ?\n\n"${msg.slice(0, 100)}..."`)) {
          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
        }
      }
    } catch (err) { alert(err?.response?.data?.detail || err?.response?.data?.error || 'Erreur'); }
  };

  if (loading) return <div className="loading">{t('common:loading')}</div>;

  return (
    <div>
      {ticketRepair && (
        <RepairTicketPrinter repair={ticketRepair} onClose={() => setTicketRepair(null)} />
      )}
      {labelRepair && (
        <RepairLabelPrinter repair={labelRepair} onClose={() => setLabelRepair(null)} />
      )}

      <div className="page-header">
        <h2>🔧 Réparations ({repairs.length})</h2>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-secondary" style={{ fontSize:12 }}
                  onClick={() => setScanRepairOpen(true)} title="Scanner une étiquette REP pour trouver la réparation">
            📷 Scanner REP
          </button>
          <button className="btn-primary" onClick={openForm}>+ Réparation</button>
        </div>
      </div>

      {scanRepairOpen && (
        <BarcodeScanner
          title="Scanner étiquette réparation"
          onDetect={handleRepairScan}
          onClose={() => setScanRepairOpen(false)}
        />
      )}

      <div className="filter-bar">
        <button className={`btn-filter ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>Tout</button>
        {STATUSES.map(s => <button key={s} className={`btn-filter ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>{STATUS_LABELS[s]}</button>)}
      </div>

      {showForm && (
        <div className="form-card"><h3>Nouvelle reparation</h3>
          <div className="form-grid">
            <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
              <option value="">— Client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
            </select>
            <select value={form.device_type} onChange={e => setForm({ ...form, device_type: e.target.value })}>
              <option value="laptop">💻 Laptop</option><option value="desktop">🖥️ PC Bureau</option>
              <option value="phone">📱 Telephone</option><option value="tablet">📲 Tablette</option>
              <option value="printer">🖨️ Imprimante</option><option value="other">🔌 Autre</option>
            </select>
            <input placeholder="Marque" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
            <input placeholder="Modele" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
            <input placeholder="N° Serie" value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} />
            <input type="number" placeholder="Estimation (FCFA)" value={form.estimated_cost} onChange={e => setForm({ ...form, estimated_cost: e.target.value })} />
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
              <option value="basse">{t('repairs:priority_low')}</option><option value="normal">{t('repairs:priority_normal')}</option>
              <option value="haute">{t('repairs:priority_high')}</option><option value="urgente">{t('repairs:priority_urgent')}</option>
            </select>
          </div>
          <textarea placeholder="Probleme decrit par le client *" value={form.problem} onChange={e => setForm({ ...form, problem: e.target.value })}
            style={{ width: '100%', padding: '11px 14px', background: '#1c2030', border: '1px solid #252a3a', borderRadius: 10, color: '#eaedf3', fontSize: 14, minHeight: 80, resize: 'vertical', fontFamily: 'inherit', marginBottom: 12 }} />
          <div className="form-actions"><button className="btn-primary" onClick={handleCreate}>Creer</button><button className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button></div>
        </div>
      )}

      <div className="cards-list">{repairs.map(r => (
        <div key={r.id} className="list-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <span className="gold bold">{r.ticket}</span>
                <span className={`badge badge-${r.status}`}>{STATUS_LABELS[r.status]}</span>
                {r.priority === 'urgente' && <span className="badge badge-rupture">URGENT</span>}
              </div>
              <div>👤 {r.client_name}</div>
              <div className="muted small">{r.brand} {r.model} — {r.device_type}</div>
              <div className="muted small">🔍 {r.problem?.substring(0, 80)}{r.problem?.length > 80 ? '...' : ''}</div>
            </div>
            {r.total_cost > 0 && <span className="gold bold" style={{ fontSize: 16 }}>{fmt(r.total_cost)}</span>}
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn-small btn-secondary" onClick={() => setTicketRepair(r)} title="Ticket thermique 58mm">🎫 Ticket</button>
            <button className="btn-small btn-secondary"
                    style={{ background:'rgba(212,161,46,.1)', color:'#d4a12e', border:'1px solid rgba(212,161,46,.3)' }}
                    onClick={() => setLabelRepair(r)} title="Étiquette autocollante pour l'appareil">
              🏷️ Étiquette
            </button>
            {r.client_phone && WA_MESSAGES[r.status] && (
              <button className="btn-small btn-secondary" style={{ background:'#1c3b2a', color:'#2dd4a0', border:'1px solid #2dd4a0' }}
                onClick={() => { const phone=r.client_phone.replace(/\D/g,''); window.open(`https://wa.me/${phone}?text=${encodeURIComponent(WA_MESSAGES[r.status]?.(r)||'')}`, '_blank'); }}>
                📱 WhatsApp
              </button>
            )}
            {r.status !== 'livre' && STATUSES.indexOf(r.status) < STATUSES.length - 1 && (
              <button className="btn-small btn-primary" onClick={() => nextStatus(r)}>→ {STATUS_LABELS[STATUSES[STATUSES.indexOf(r.status) + 1]]}</button>
            )}
          </div>
        </div>
      ))}</div>
    </div>
  );
}

// ============================================================
// FOURNISSEURS
// ============================================================
function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [stats, setStats] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [showCredit, setShowCredit] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', city: '' });
  const [creditForm, setCreditForm] = useState({ supplier_id: '', description: '', amount: '' });
  const [paymentForm, setPaymentForm] = useState({ supplier_id: '', amount: '', description: '' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { const res = await suppliersAPI.getAll(); setSuppliers(res.data.suppliers); setStats(res.data.stats || {}); }
    catch (err) { console.error(err); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name) return;
    try { await suppliersAPI.create(form); setForm({ name: '', phone: '', email: '', city: '' }); setShowForm(false); load(); }
    catch (err) { alert(err?.response?.data?.detail || err?.response?.data?.error || 'Erreur'); }
  };

  const handleCredit = async () => {
    if (!creditForm.supplier_id || !creditForm.amount || !creditForm.description) return;
    try { await creditsAPI.create({ ...creditForm, amount: Number(creditForm.amount), supplier_id: Number(creditForm.supplier_id) }); setCreditForm({ supplier_id: '', description: '', amount: '' }); setShowCredit(false); load(); }
    catch (err) { alert(err?.response?.data?.detail || err?.response?.data?.error || 'Erreur'); }
  };

  const handlePayment = async () => {
    if (!paymentForm.supplier_id || !paymentForm.amount) return;
    try { await creditPaymentsAPI.create({ ...paymentForm, amount: Number(paymentForm.amount), supplier_id: Number(paymentForm.supplier_id) }); setPaymentForm({ supplier_id: '', amount: '', description: '' }); setShowPayment(false); load(); }
    catch (err) { alert(err?.response?.data?.detail || err?.response?.data?.error || 'Erreur'); }
  };

  if (loading) return <div className="loading">{t('common:loading')}</div>;

  return (
    <div>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 10 }}>
        <h2>🚚 Fournisseurs ({suppliers.length})</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={() => setShowForm(true)}>+ Fournisseur</button>
          <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #f0923c, #d4781e)' }} onClick={() => setShowCredit(true)}>+ Credit</button>
          <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #2dd4a0, #1faa80)' }} onClick={() => setShowPayment(true)}>+ Paiement</button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card"><span className="stat-icon">📝</span><span className="stat-label">Total credits</span><span className="stat-value orange">{fmt(stats.total_credits)}</span></div>
        <div className="stat-card"><span className="stat-icon">💸</span><span className="stat-label">Rembourse</span><span className="stat-value green">{fmt(stats.total_payments)}</span></div>
        <div className="stat-card"><span className="stat-icon">⚠️</span><span className="stat-label">Reste a payer</span><span className="stat-value red">{fmt(stats.total_balance)}</span></div>
      </div>

      {showForm && (
        <div className="form-card"><h3>Nouveau fournisseur</h3>
          <div className="form-grid">
            <input placeholder="Nom *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input placeholder="Telephone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Ville" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="form-actions"><button className="btn-primary" onClick={handleCreate}>Ajouter</button><button className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button></div>
        </div>
      )}

      {showCredit && (
        <div className="form-card"><h3 style={{ color: '#f0923c' }}>Enregistrer un credit</h3>
          <div className="form-grid">
            <select value={creditForm.supplier_id} onChange={e => setCreditForm({ ...creditForm, supplier_id: e.target.value })}>
              <option value="">— Fournisseur —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="number" placeholder="Montant (FCFA) *" value={creditForm.amount} onChange={e => setCreditForm({ ...creditForm, amount: e.target.value })} />
          </div>
          <input placeholder="Description *" value={creditForm.description} onChange={e => setCreditForm({ ...creditForm, description: e.target.value })} style={{ width: '100%', padding: '11px 14px', background: '#1c2030', border: '1px solid #252a3a', borderRadius: 10, color: '#eaedf3', fontSize: 14, marginBottom: 12, fontFamily: 'inherit' }} />
          <div className="form-actions"><button className="btn-primary" style={{ background: '#f0923c' }} onClick={handleCredit}>Enregistrer</button><button className="btn-secondary" onClick={() => setShowCredit(false)}>Annuler</button></div>
        </div>
      )}

      {showPayment && (
        <div className="form-card"><h3 style={{ color: '#2dd4a0' }}>Rembourser un fournisseur</h3>
          <div className="form-grid">
            <select value={paymentForm.supplier_id} onChange={e => setPaymentForm({ ...paymentForm, supplier_id: e.target.value })}>
              <option value="">— Fournisseur —</option>
              {suppliers.filter(s => s.balance > 0).map(s => <option key={s.id} value={s.id}>{s.name} (doit: {fmt(s.balance)})</option>)}
            </select>
            <input type="number" placeholder="Montant (FCFA) *" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
          </div>
          <input placeholder="Note" value={paymentForm.description} onChange={e => setPaymentForm({ ...paymentForm, description: e.target.value })} style={{ width: '100%', padding: '11px 14px', background: '#1c2030', border: '1px solid #252a3a', borderRadius: 10, color: '#eaedf3', fontSize: 14, marginBottom: 12, fontFamily: 'inherit' }} />
          <div className="form-actions"><button className="btn-primary" style={{ background: '#2dd4a0' }} onClick={handlePayment}>Enregistrer</button><button className="btn-secondary" onClick={() => setShowPayment(false)}>Annuler</button></div>
        </div>
      )}

      <div className="cards-list">{suppliers.map(s => (
        <div key={s.id} className="list-card">
          <div><div className="bold">{s.name}</div><div className="muted small">📱 {s.phone || '—'}</div></div>
          <div className="text-right">
            <div className="muted small">Solde</div>
            <div className={`bold ${s.balance > 0 ? 'orange' : 'green'}`}>{s.balance > 0 ? fmt(s.balance) : 'Solde ✓'}</div>
          </div>
        </div>
      ))}</div>
    </div>
  );
}

// ============================================================
// JOURNAUX
// ============================================================
function Journals() {
  const [invoices, setInvoices] = useState([]);
  const [credits, setCredits] = useState([]);
  const [tab, setTab] = useState('sales');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [invRes, crRes] = await Promise.all([invoicesAPI.getAll({ type: 'facture' }), creditsAPI.getAll()]);
        setInvoices(invRes.data.invoices.filter(i => i.status === 'payee'));
        setCredits(crRes.data.credits);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="loading">{t('common:loading')}</div>;

  const totalSales = invoices.reduce((s, i) => s + i.total, 0);
  const totalPurchases = credits.reduce((s, c) => s + c.amount, 0);

  return (
    <div>
      <h2>📒 Journaux</h2>
      <div className="filter-bar">
        <button className={`btn-filter ${tab === 'sales' ? 'active' : ''}`} style={tab === 'sales' ? { background: '#2dd4a0', borderColor: '#2dd4a0' } : {}} onClick={() => setTab('sales')}>📗 Ventes ({invoices.length})</button>
        <button className={`btn-filter ${tab === 'purchases' ? 'active' : ''}`} style={tab === 'purchases' ? { background: '#f0923c', borderColor: '#f0923c' } : {}} onClick={() => setTab('purchases')}>📕 Achats ({credits.length})</button>
      </div>

      {tab === 'sales' && (
        <div>
          <div className="stat-card" style={{ marginBottom: 16 }}><span className="stat-label">Total ventes</span><span className="stat-value green">{fmt(totalSales)}</span></div>
          {invoices.length === 0 ? <div className="loading">Aucune vente enregistree</div> :
            <div className="cards-list">{invoices.map(inv => (
              <div key={inv.id} className="list-card">
                <div><div className="bold">{inv.number} — {inv.client_name}</div><div className="muted small">{inv.created_at} | {inv.items?.map(it => `${it.product_name} x${it.quantity}`).join(', ')}</div></div>
                <span className="green bold">{fmt(inv.total)}</span>
              </div>
            ))}</div>
          }
        </div>
      )}

      {tab === 'purchases' && (
        <div>
          <div className="stat-card" style={{ marginBottom: 16 }}><span className="stat-label">Total achats (credits)</span><span className="stat-value orange">{fmt(totalPurchases)}</span></div>
          {credits.length === 0 ? <div className="loading">Aucun achat enregistre</div> :
            <div className="cards-list">{credits.map(c => (
              <div key={c.id} className="list-card">
                <div><div className="bold">{c.description}</div><div className="muted small">{c.date} — 🚚 {c.supplier_name}</div></div>
                <span className="orange bold">{fmt(c.amount)}</span>
              </div>
            ))}</div>
          }
        </div>
      )}
    </div>
  );
}

// ============================================================
// NOTIFICATIONS — Cloche
// ============================================================
function NotificationBell({ userId }) {
  const [notifs, setNotifs]   = useState([]);
  const [open, setOpen]       = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, right: 20 });
  const btnRef = useRef(null);
  const dropRef = useRef(null);
  const { isDark } = useTheme();
  const { show: showToast } = useToast();

  const load = async (showNew = false) => {
    try {
      const r   = await notificationsAPI.getAll();
      const next = r.data.notifications || [];
      // Afficher un toast pour chaque nouvelle notification non lue
      if (showNew) {
        const prevIds = new Set(notifs.map(n => n.id));
        next.filter(n => !n.is_read && !prevIds.has(n.id)).forEach(n => {
          showToast(n.title, n.message, n.type || 'info');
        });
      }
      setNotifs(next);
    } catch {}
  };

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 30000);
    return () => clearInterval(id);
  }, []);

  // Fermer le dropdown en cliquant en dehors
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (dropRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggleOpen = () => {
    if (!open && btnRef.current) {
      // Calculer la position du dropdown en coordonnées viewport
      const rect = btnRef.current.getBoundingClientRect();
      const dropW = 320;
      const rightEdge = window.innerWidth - 12;
      const leftPos   = Math.min(rect.left, rightEdge - dropW);
      setDropPos({ top: rect.bottom + 6, left: Math.max(8, leftPos) });
    }
    setOpen(o => !o);
    load();
  };

  const markRead = async (id) => {
    await notificationsAPI.markRead(id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };
  const markAll = async () => {
    await notificationsAPI.markAllRead();
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  };
  const deleteNotif = async (e, id) => {
    e.stopPropagation();
    await notificationsAPI.delete(id);
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  const unread = notifs.filter(n => !n.is_read).length;
  const TYPE_COLOR = { info: '#5b9cf6', success: '#2dd4a0', warning: '#f0923c', error: '#ef6461' };
  const cardBg  = isDark ? '#141827' : '#ffffff';
  const border  = isDark ? '#252a3a' : '#e2e8f0';
  const textCol = isDark ? '#eaedf3' : '#0f172a';
  const mutedCol= isDark ? '#7a8094' : '#94a3b8';
  const hoverBg = isDark ? 'rgba(91,156,246,.07)' : 'rgba(91,156,246,.05)';

  return (
    <>
      {/* Bouton cloche */}
      <button
        ref={btnRef}
        onClick={toggleOpen}
        title="Notifications"
        style={{
          background: unread > 0 ? 'rgba(91,156,246,.12)' : 'transparent',
          border:     unread > 0 ? '1px solid rgba(91,156,246,.25)' : '1px solid transparent',
          borderRadius: 8, cursor: 'pointer',
          fontSize: 18, position: 'relative', padding: '6px 10px',
          transition: 'background .2s',
        }}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            background: '#ef6461', color: '#fff', borderRadius: 10,
            fontSize: 10, fontWeight: 700, padding: '1px 5px',
            minWidth: 18, textAlign: 'center', lineHeight: '16px',
            boxShadow: '0 0 0 2px var(--bg)',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {/* Dropdown — rendu via portal en position: fixed */}
      {open && (
        <div
          ref={dropRef}
          style={{
            position:  'fixed',
            top:       dropPos.top,
            left:      dropPos.left,
            width:     320,
            zIndex:    9000,
            background: cardBg,
            border:    `1px solid ${border}`,
            borderRadius: 12,
            boxShadow: '0 12px 40px rgba(0,0,0,.35)',
            overflow:  'hidden',
            animation: 'fadeInDown .18s ease',
          }}
        >
          {/* En-tête */}
          <div style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: textCol }}>
              🔔 Notifications {unread > 0 && <span style={{ color: '#ef6461' }}>({unread})</span>}
            </span>
            {unread > 0 && (
              <button onClick={markAll} style={{
                fontSize: 11, color: '#5b9cf6', background: 'none',
                border: 'none', cursor: 'pointer', padding: '2px 6px',
              }}>Tout marquer lu</button>
            )}
          </div>

          {/* Liste */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <p style={{ padding: '24px 16px', color: mutedCol, textAlign: 'center', fontSize: 13 }}>
                Aucune notification
              </p>
            ) : notifs.map(n => (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                style={{
                  padding: '11px 14px',
                  borderBottom: `1px solid ${border}`,
                  cursor: 'pointer',
                  background: n.is_read ? 'transparent' : hoverBg,
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  transition: 'background .15s',
                }}
                onMouseEnter={e => { if (n.is_read) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,.03)' : '#f8fafc'; }}
                onMouseLeave={e => { e.currentTarget.style.background = n.is_read ? 'transparent' : hoverBg; }}
              >
                {/* Indicateur type */}
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: TYPE_COLOR[n.type] || '#5b9cf6',
                  marginTop: 5, flexShrink: 0,
                  boxShadow: n.is_read ? 'none' : `0 0 6px ${TYPE_COLOR[n.type] || '#5b9cf6'}60`,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: n.is_read ? 400 : 600, fontSize: 13, color: textCol }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: mutedCol, marginTop: 2, lineHeight: 1.4 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: mutedCol, marginTop: 4, opacity: .7 }}>{n.created_at}</div>
                </div>
                {/* Bouton supprimer */}
                <button
                  onClick={e => deleteNotif(e, n.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: mutedCol, fontSize: 14, opacity: .5, padding: '0 2px',
                    flexShrink: 0, transition: 'opacity .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = .5}
                  title="Supprimer"
                >×</button>
              </div>
            ))}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div style={{ padding: '8px 14px', borderTop: `1px solid ${border}`, textAlign: 'center' }}>
              <button onClick={() => { markAll(); setOpen(false); }} style={{
                fontSize: 12, color: mutedCol, background: 'none',
                border: 'none', cursor: 'pointer',
              }}>Tout effacer</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ============================================================
// GESTIONNAIRE DE MODULES (Admin)
// ============================================================
const DEFAULT_PERMS = {
  nav_items: ['vendor_dashboard', 'my_reports'],
  can_view: ['own_sales', 'own_reports', 'products'],
  can_create: ['reports'],
  can_edit: [],
  can_delete: [],
  data_scope: 'own',
};
const PERM_OPTIONS = {
  nav_items:  ['vendor_dashboard', 'my_reports', 'products', 'clients', 'invoices', 'dashboard'],
  can_view:   ['own_sales', 'own_reports', 'all_sales', 'all_reports', 'products', 'clients', 'finances'],
  can_create: ['reports', 'invoices', 'products'],
  can_edit:   ['products', 'invoices', 'reports_own'],
  can_delete: ['reports_own'],
};

function ModulePermCheckbox({ label, group, value, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginBottom: 4 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(group, value, e.target.checked)}
        style={{ accentColor: '#5b9cf6' }} />
      {label}
    </label>
  );
}

function ModuleForm({ module, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: module?.name || '', icon: module?.icon || '📦',
    color: module?.color || '#5b9cf6', description: module?.description || '',
    is_active: module?.is_active ?? true,
    permissions: module?.permissions || { ...DEFAULT_PERMS },
  });

  const togglePerm = (group, val, checked) => {
    setForm(prev => {
      const list = [...(prev.permissions[group] || [])];
      if (checked && !list.includes(val)) list.push(val);
      if (!checked) { const i = list.indexOf(val); if (i >= 0) list.splice(i, 1); }
      return { ...prev, permissions: { ...prev.permissions, [group]: list } };
    });
  };

  return (
    <div className="form-card" style={{ maxWidth: 600 }}>
      <h3 style={{ marginBottom: 16 }}>{module ? 'Modifier le module' : 'Nouveau module'}</h3>
      <div className="form-grid">
        <input placeholder="Nom du module *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="form-input" />
        <input placeholder="Icône (emoji)" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} className="form-input" style={{ maxWidth: 100 }} />
        <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ height: 40, width: 80, border: 'none', background: 'none', cursor: 'pointer' }} />
        <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="form-input" />
      </div>
      <div style={{ marginTop: 16 }}>
        <h4 style={{ fontSize: 13, marginBottom: 10, color: '#7a8094' }}>{t('modules:permissions')}</h4>
        {Object.entries(PERM_OPTIONS).map(([group, opts]) => (
          <div key={group} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', color: '#5b9cf6' }}>{group.replace('_', ' ')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px' }}>
              {opts.map(opt => (
                <ModulePermCheckbox key={opt} group={group} value={opt} label={opt}
                  checked={(form.permissions[group] || []).includes(opt)}
                  onChange={togglePerm} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer' }}>
        <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
        Module actif
      </label>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn-primary" onClick={() => onSave(form)}>Enregistrer</button>
        <button className="btn-secondary" onClick={onCancel}>Annuler</button>
      </div>
    </div>
  );
}

function AssignModuleModal({ module, users, onAssign, onClose }) {
  const [userId, setUserId] = useState('');
  const [target, setTarget]  = useState(0);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="form-card" style={{ width: 380 }}>
        <h3>Assigner "{module.name}" à un utilisateur</h3>
        <select value={userId} onChange={e => setUserId(e.target.value)} className="form-input" style={{ marginTop: 12 }}>
          <option value="">-- Choisir un utilisateur --</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.username}) — {u.role}</option>)}
        </select>
        <input type="number" placeholder="Objectif journalier (FCFA)" value={target}
          onChange={e => setTarget(e.target.value)} className="form-input" style={{ marginTop: 10 }} />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn-primary" onClick={() => userId && onAssign(userId, target)} disabled={!userId}>Assigner</button>
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

function ModuleManager() {
  const { t } = useTranslation(['modules', 'common']);
  const [modules, setModules]   = useState([]);
  const [users, setUsers]       = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editMod, setEditMod]   = useState(null);
  const [assignMod, setAssignMod] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('modules');

  const load = async () => {
    try {
      const [mRes, uRes] = await Promise.all([modulesAPI.getAll(), modulesAPI.getUsers()]);
      setModules(mRes.data.modules || []);
      setUsers(uRes.data.users || []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (data) => {
    try {
      if (editMod) await modulesAPI.update(editMod.id, data);
      else await modulesAPI.create(data);
      setShowForm(false); setEditMod(null); load();
    } catch (e) { alert(e?.response?.data?.detail || e?.response?.data?.error || 'Erreur'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce module ?')) return;
    try { await modulesAPI.delete(id); load(); } catch {}
  };

  const handleAssign = async (userId, target) => {
    try {
      await modulesAPI.assign(assignMod.id, { user_id: Number(userId), daily_target: Number(target) });
      setAssignMod(null); load(); alert('Module assigné avec succès !');
    } catch (e) { alert(e?.response?.data?.detail || e?.response?.data?.error || 'Erreur'); }
  };

  const handleUnassign = async (mid, uid, uname) => {
    if (!confirm(`Retirer le module à ${uname} ?`)) return;
    try { await modulesAPI.unassign(mid, uid); load(); } catch {}
  };

  if (loading) return <div className="loading">{t('common:loading')}</div>;

  return (
    <div>
      <div className="page-header">
        <h2>⚙️ Gestionnaire de modules</h2>
        <button className="btn-primary" onClick={() => { setEditMod(null); setShowForm(true); }}>+ Nouveau module</button>
      </div>

      <div className="period-tabs" style={{ marginBottom: 20 }}>
        {[['modules', 'Modules'], ['users', 'Utilisateurs & modules']].map(([k, l]) => (
          <button key={k} className={`period-tab${activeTab === k ? ' active' : ''}`} onClick={() => setActiveTab(k)}>{l}</button>
        ))}
      </div>

      {showForm && <ModuleForm module={editMod} onSave={handleSave} onCancel={() => { setShowForm(false); setEditMod(null); }} />}

      {activeTab === 'modules' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 8 }}>
          {modules.map(m => (
            <div key={m.id} className="kpi-card" style={{ borderTop: `3px solid ${m.color}`, opacity: m.is_active ? 1 : .55 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 28 }}>{m.icon}</span>
                <span style={{ fontSize: 11, background: m.is_active ? '#2dd4a020' : '#ef646120', color: m.is_active ? '#2dd4a0' : '#ef6461', borderRadius: 20, padding: '2px 10px' }}>
                  {m.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{m.name}</div>
              <div style={{ fontSize: 12, color: '#7a8094', marginBottom: 8 }}>{m.description}</div>
              <div style={{ fontSize: 12, color: '#5b9cf6', marginBottom: 12 }}>{m.user_count} utilisateur(s)</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => { setEditMod(m); setShowForm(true); }}>Modifier</button>
                <button className="btn-secondary" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => setAssignMod(m)}>Assigner</button>
                <button onClick={() => handleDelete(m.id)} style={{ fontSize: 12, padding: '5px 8px', background: '#ef646120', color: '#ef6461', border: 'none', borderRadius: 6, cursor: 'pointer' }}>X</button>
              </div>
            </div>
          ))}
          {modules.length === 0 && <p style={{ color: '#7a8094' }}>Aucun module créé.</p>}
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          {users.map(u => (
            <div key={u.id} className="form-card" style={{ marginBottom: 12, padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{u.name}</span>
                  <span style={{ color: '#7a8094', fontSize: 13, marginLeft: 10 }}>@{u.username} — {u.role}</span>
                </div>
                <span style={{ fontSize: 12, color: '#5b9cf6' }}>{u.modules?.length || 0} module(s)</span>
              </div>
              {(u.modules || []).map(um => (
                <div key={um.id} style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(91,156,246,.06)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{um.module?.icon} {um.module?.name}</span>
                  <span style={{ fontSize: 12, color: '#7a8094' }}>Obj: {Number(um.daily_target || 0).toLocaleString('fr-FR')} FCFA</span>
                  <button onClick={() => handleUnassign(um.module_id, u.id, u.name)} style={{ fontSize: 11, color: '#ef6461', background: 'none', border: 'none', cursor: 'pointer' }}>Retirer</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {assignMod && (
        <AssignModuleModal module={assignMod} users={users.filter(u => u.role !== 'admin')}
          onAssign={handleAssign} onClose={() => setAssignMod(null)} />
      )}
    </div>
  );
}

// ============================================================
// TABLEAU DE BORD VENDEUR
// ============================================================
function VendorDashboard() {
  const { t } = useTranslation(['dashboard', 'common']);
  const [data, setData]     = useState(null);
  const [myMod, setMyMod]   = useState(null);
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();

  const load = async () => {
    try {
      const [dRes, mRes] = await Promise.all([vendorAPI.getDashboard(), modulesAPI.myModule()]);
      setData(dRes.data);
      setMyMod(mRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); const id = setInterval(load, 60000); return () => clearInterval(id); }, []);

  if (loading) return <div className="loading">{t('common:loading')}</div>;
  if (!data) return <div>Erreur de chargement.</div>;

  const pct     = data.today?.progress_pct || 0;
  const target  = myMod?.daily_target || 0;
  const gridColor = isDark ? '#252a3a' : '#e2e8f0';
  const axisColor = isDark ? '#7a8094' : '#94a3b8';
  const tipStyle  = { background: isDark ? '#1b1f30' : '#fff', border: `1px solid ${gridColor}`, borderRadius: 10, fontSize: 12 };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h2>🛒 Mon tableau de bord vendeur</h2>
        <span style={{ fontSize: 13, color: '#7a8094' }}>
          {data.today?.report_submitted
            ? `Rapport soumis ✓ (${data.today.report_status})`
            : '⚠ Rapport non soumis aujourd\'hui'}
        </span>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-icon">💰</span></div>
          <div className="kpi-value gold">{Number(data.today?.total || 0).toLocaleString('fr-FR')} FCFA</div>
          <div className="kpi-label">Ventes du jour</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-icon">🎯</span></div>
          <div className="kpi-value blue">{Number(target).toLocaleString('fr-FR')} FCFA</div>
          <div className="kpi-label">Objectif journalier</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-icon">📈</span></div>
          <div className={`kpi-value ${pct >= 100 ? 'green' : pct >= 50 ? 'gold' : 'orange'}`}>{pct.toFixed(1)} %</div>
          <div className="kpi-label">Progression</div>
          <div style={{ marginTop: 8, height: 6, background: '#252a3a', borderRadius: 3 }}>
            <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? '#2dd4a0' : '#d4a12e', borderRadius: 3, transition: 'width .5s' }} />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-icon">📅</span></div>
          <div className="kpi-value purple">{Number(data.week_total || 0).toLocaleString('fr-FR')} FCFA</div>
          <div className="kpi-label">Total semaine</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-icon">🗓️</span></div>
          <div className="kpi-value blue">{Number(data.month_total || 0).toLocaleString('fr-FR')} FCFA</div>
          <div className="kpi-label">Total mois</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-icon">✅</span></div>
          <div className="kpi-value green">{data.validated || 0} / {data.total_reports || 0}</div>
          <div className="kpi-label">Rapports validés</div>
        </div>
      </div>

      <div className="chart-card chart-full" style={{ marginTop: 20 }}>
        <h3>📊 Mes ventes — 30 derniers jours</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.chart || []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => v.slice(5)} />
            <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} width={45}
              tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <Tooltip contentStyle={tipStyle} formatter={v => [Number(v).toLocaleString('fr-FR') + ' FCFA', 'Ventes']} />
            <Bar dataKey="total" fill="#d4a12e" radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {(data.top_products || []).length > 0 && (
        <div className="analytics-card" style={{ marginTop: 16 }}>
          <h3>🏆 Mes meilleurs produits</h3>
          <div className="top-list">
            {data.top_products.slice(0, 5).map((p, i) => (
              <div key={i} className="top-item">
                <span className={`top-rank rank-${i+1}`}>#{i+1}</span>
                <div className="top-info">
                  <div className="top-row">
                    <span className="top-name">{p.name}</span>
                    <span className="top-rev gold">{Number(p.total).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div className="top-meta"><span className="muted">{p.qty} vendu(s)</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// FORMULAIRE RAPPORT JOURNALIER VENDEUR
// ============================================================
function VendorReportForm({ onSubmitted }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    report_date: today,
    payment_method: 'especes',
    customers_count: '',
    observations: '',
  });
  const [items, setItems]   = useState([{ product_name: '', quantity: '', unit_price: '' }]);
  const [products, setProducts] = useState([]);
  const [submitted, setSubmitted] = useState(null);
  const [loading, setLoading]  = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const r = await vendorAPI.checkToday();
        if (r.data.submitted) setSubmitted(r.data);
      } catch {}
      setChecking(false);
    };
    check();
    productsAPI.getAll({}).then(r => setProducts(r.data.products || [])).catch(() => {});
  }, []);

  const addItem  = () => setItems(p => [...p, { product_name: '', quantity: '', unit_price: '' }]);
  const rmItem   = (i) => setItems(p => p.filter((_, j) => j !== i));
  const setItem  = (i, field, val) => setItems(p => p.map((it, j) => j === i ? { ...it, [field]: val } : it));

  const total = items.reduce((s, it) => s + (Number(it.quantity) * Number(it.unit_price) || 0), 0);

  const handleSubmit = async () => {
    const validItems = items.filter(it => it.product_name && Number(it.quantity) > 0);
    if (!validItems.length) { alert('Ajoutez au moins un produit vendu.'); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        customers_count: Number(form.customers_count) || 0,
        items: validItems.map(it => {
          const prod = products.find(p => p.name === it.product_name);
          return {
            product_id: prod?.id, product_name: it.product_name,
            quantity: Number(it.quantity), unit_price: Number(it.unit_price),
            total: Number(it.quantity) * Number(it.unit_price),
          };
        }),
      };
      await vendorAPI.submitReport(payload);
      if (onSubmitted) onSubmitted();
      setSubmitted({ submitted: true, total, status: 'soumis' });
    } catch (e) { alert(e?.response?.data?.detail || e?.response?.data?.error || 'Erreur lors de la soumission'); }
    setLoading(false);
  };

  if (checking) return <div className="loading">Vérification...</div>;

  if (submitted) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 60, marginBottom: 12 }}>✅</div>
      <h2 style={{ color: '#2dd4a0', marginBottom: 8 }}>Rapport soumis !</h2>
      <p style={{ color: '#7a8094' }}>
        Total : {Number(submitted.total || 0).toLocaleString('fr-FR')} FCFA — Statut : {submitted.status}
      </p>
      <p style={{ color: '#7a8094', marginTop: 8 }}>L'admin examinera votre rapport prochainement.</p>
    </div>
  );

  return (
    <div>
      <div className="page-header"><h2>📝 Rapport journalier</h2></div>
      <div className="form-card" style={{ maxWidth: 700 }}>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={{ fontSize: 12, color: '#7a8094' }}>Date du rapport</label>
            <input type="date" value={form.report_date} onChange={e => setForm({ ...form, report_date: e.target.value })}
              max={today} className="form-input" style={{ marginTop: 4 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#7a8094' }}>Mode de paiement</label>
            <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}
              className="form-input" style={{ marginTop: 4 }}>
              <option value="especes">Espèces</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="mixte">Mixte</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#7a8094' }}>Nombre de clients servis</label>
            <input type="number" min="0" value={form.customers_count}
              onChange={e => setForm({ ...form, customers_count: e.target.value })}
              className="form-input" style={{ marginTop: 4 }} placeholder="0" />
          </div>
        </div>

        <h4 style={{ marginTop: 20, marginBottom: 10 }}>Produits vendus</h4>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}>
            <input list={`prods-${i}`} placeholder="Nom du produit *" value={it.product_name}
              onChange={e => setItem(i, 'product_name', e.target.value)} className="form-input" />
            <datalist id={`prods-${i}`}>
              {products.map(p => <option key={p.id} value={p.name} />)}
            </datalist>
            <input type="number" min="1" placeholder="Qté *" value={it.quantity}
              onChange={e => setItem(i, 'quantity', e.target.value)} className="form-input" />
            <input type="number" min="0" placeholder="Prix unit." value={it.unit_price}
              onChange={e => setItem(i, 'unit_price', e.target.value)} className="form-input" />
            <button onClick={() => rmItem(i)} style={{ background: 'rgba(239,100,97,.15)', color: '#ef6461', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '0 10px' }}>×</button>
          </div>
        ))}
        <button onClick={addItem} className="btn-secondary" style={{ marginTop: 4 }}>+ Ajouter un produit</button>

        <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(212,161,46,.08)', borderRadius: 8 }}>
          <span style={{ fontWeight: 600 }}>Total calculé : </span>
          <span style={{ color: '#d4a12e', fontWeight: 700, fontSize: 18 }}>{total.toLocaleString('fr-FR')} FCFA</span>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 12, color: '#7a8094' }}>Observations / remarques</label>
          <textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })}
            className="form-input" style={{ marginTop: 4, minHeight: 80, resize: 'vertical', width: '100%', fontFamily: 'inherit' }}
            placeholder="Problèmes rencontrés, produits manquants, remarques clients..." />
        </div>

        <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ marginTop: 16, width: '100%', padding: '13px' }}>
          {loading ? 'Envoi en cours...' : '📤 Soumettre le rapport'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// VUE ADMIN — RAPPORTS VENDEURS
// ============================================================
function AdminReports() {
  const [summary, setSummary]   = useState(null);
  const [reports, setReports]   = useState([]);
  const [period, setPeriod]     = useState('month');
  const [selected, setSelected] = useState(null);
  const [comment, setComment]   = useState('');
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const { isDark } = useTheme();

  const load = async () => {
    try {
      const [sRes, rRes] = await Promise.all([
        adminReportsAPI.getSummary(period),
        adminReportsAPI.getAll({ limit: 50 }),
      ]);
      setSummary(sRes.data);
      setReports(rRes.data.reports || []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, [period]);

  const review = async (rid, status) => {
    try {
      await adminReportsAPI.review(rid, { status, comment });
      setSelected(null); setComment(''); load();
    } catch (e) { alert(e?.response?.data?.detail || e?.response?.data?.error || 'Erreur'); }
  };

  const exportCsv = async () => {
    try {
      const res = await adminReportsAPI.exportCsv({});
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href = url; a.download = 'rapports_vendeurs.csv';
      a.click(); URL.revokeObjectURL(url);
    } catch {}
  };

  const STATUS_COLOR = { soumis: '#5b9cf6', valide: '#2dd4a0', rejete: '#ef6461' };
  const gridColor = isDark ? '#252a3a' : '#e2e8f0';
  const axisColor = isDark ? '#7a8094' : '#94a3b8';
  const tipStyle  = { background: isDark ? '#1b1f30' : '#fff', border: `1px solid ${gridColor}`, borderRadius: 10, fontSize: 12 };

  if (loading) return <div className="loading">{t('common:loading')}</div>;

  return (
    <div>
      <div className="page-header">
        <h2>📋 Rapports vendeurs</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="period-tabs">
            {[['day','Auj.'],['week','Sem.'],['month','Mois'],['year','Année']].map(([k,l]) => (
              <button key={k} className={`period-tab${period === k ? ' active' : ''}`} onClick={() => setPeriod(k)}>{l}</button>
            ))}
          </div>
          <button className="btn-csv" onClick={exportCsv}>⬇ CSV</button>
        </div>
      </div>

      {(summary?.missing_today || []).length > 0 && (
        <div className="alert-banner">
          ⚠ {summary.missing_today.length} vendeur(s) n'ont pas soumis leur rapport aujourd'hui :
          {' '}{summary.missing_today.map(v => v.name).join(', ')}
        </div>
      )}

      <div className="period-tabs" style={{ marginBottom: 16 }}>
        {[['summary','Vue d\'ensemble'],['reports','Tous les rapports'],['chart','Graphique']].map(([k,l]) => (
          <button key={k} className={`period-tab${activeTab === k ? ' active' : ''}`} onClick={() => setActiveTab(k)}>{l}</button>
        ))}
      </div>

      {activeTab === 'summary' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {(summary?.vendors || []).map(v => (
            <div key={v.user_id} className="kpi-card">
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{v.name}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#d4a12e' }}>{Number(v.total_sales).toLocaleString('fr-FR')} FCFA</div>
              <div style={{ fontSize: 12, color: '#7a8094', marginTop: 4 }}>
                {v.nb_reports} rapport(s) sur {v.target_days} jours — {v.completion_pct}% complétion
              </div>
              <div style={{ height: 4, background: '#252a3a', borderRadius: 2, marginTop: 8 }}>
                <div style={{ height: '100%', width: `${Math.min(v.completion_pct, 100)}%`, background: '#5b9cf6', borderRadius: 2 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, fontSize: 12 }}>
                <span style={{ color: '#2dd4a0' }}>✓ {v.validated}</span>
                <span style={{ color: '#5b9cf6' }}>◎ {v.pending}</span>
                <span style={{ color: '#ef6461' }}>✗ {v.rejected}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'chart' && (
        <div className="chart-card chart-full">
          <h3>📊 Ventes globales — 30 jours</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={summary?.chart || []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} width={48} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip contentStyle={tipStyle} formatter={v => [Number(v).toLocaleString('fr-FR') + ' FCFA']} />
              <Bar dataKey="total" fill="#d4a12e" radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'reports' && (
        <div>
          {reports.map(r => (
            <div key={r.id} className="form-card" style={{ marginBottom: 10, padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <span style={{ fontWeight: 700 }}>{r.user_name}</span>
                  <span style={{ color: '#7a8094', fontSize: 13, marginLeft: 10 }}>{r.report_date}</span>
                  <span style={{ marginLeft: 10, fontSize: 20, fontWeight: 700, color: '#d4a12e' }}>
                    {Number(r.total_sales).toLocaleString('fr-FR')} FCFA
                  </span>
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#7a8094' }}>
                    {r.customers_count} client(s) · {r.payment_method}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: STATUS_COLOR[r.status] + '20', color: STATUS_COLOR[r.status] }}>
                    {r.status}
                  </span>
                  {r.status === 'soumis' && (
                    <button onClick={() => { setSelected(r); setComment(''); }} className="btn-primary" style={{ fontSize: 12, padding: '5px 12px' }}>
                      Examiner
                    </button>
                  )}
                </div>
              </div>
              {r.admin_comment && <p style={{ fontSize: 12, color: '#7a8094', marginTop: 6 }}>💬 {r.admin_comment}</p>}
            </div>
          ))}
          {reports.length === 0 && <p style={{ color: '#7a8094' }}>Aucun rapport.</p>}
        </div>
      )}

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="form-card" style={{ width: 480 }}>
            <h3>Rapport de {selected.user_name} — {selected.report_date}</h3>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#d4a12e', marginTop: 8 }}>{Number(selected.total_sales).toLocaleString('fr-FR')} FCFA</p>
            <p style={{ fontSize: 13, color: '#7a8094' }}>{selected.customers_count} client(s) · {selected.payment_method}</p>
            {selected.observations && <p style={{ marginTop: 8, fontSize: 13 }}>📝 {selected.observations}</p>}
            <div style={{ marginTop: 12, maxHeight: 140, overflowY: 'auto' }}>
              {(selected.items || []).map((it, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span>{it.product_name} × {it.quantity}</span>
                  <span style={{ color: '#d4a12e' }}>{Number(it.total || 0).toLocaleString('fr-FR')}</span>
                </div>
              ))}
            </div>
            <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Commentaire admin (optionnel)"
              className="form-input" style={{ marginTop: 14, minHeight: 70, width: '100%', fontFamily: 'inherit', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button className="btn-primary" style={{ flex: 1, background: '#2dd4a0' }} onClick={() => review(selected.id, 'valide')}>✓ Valider</button>
              <button className="btn-primary" style={{ flex: 1, background: '#ef6461' }} onClick={() => review(selected.id, 'rejete')}>✗ Rejeter</button>
              <button className="btn-secondary" onClick={() => setSelected(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// APP PRINCIPAL
// ============================================================
// labelKey = clé dans le namespace 'nav' → traduit dans la sidebar
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
];
const VENDOR_TABS = [
  { id: 'vendor_dashboard', labelKey: 'vendor_dashboard', icon: '🏠' },
  { id: 'my_report',        labelKey: 'my_report',        icon: '📝' },
  { id: 'my_reports',       labelKey: 'my_reports',       icon: '📋' },
];

// Composant "Mes rapports" (liste des rapports du vendeur)
function MyReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const STATUS_COLOR = { soumis: '#5b9cf6', valide: '#2dd4a0', rejete: '#ef6461' };

  useEffect(() => {
    vendorAPI.getReports().then(r => { setReports(r.data.reports || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">{t('common:loading')}</div>;
  return (
    <div>
      <div className="page-header"><h2>📋 Mes rapports</h2></div>
      {reports.length === 0 && <p style={{ color: '#7a8094' }}>Aucun rapport soumis.</p>}
      {reports.map(r => (
        <div key={r.id} className="form-card" style={{ marginBottom: 10, padding: '12px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <span style={{ fontWeight: 700 }}>{r.report_date}</span>
              <span style={{ marginLeft: 12, fontSize: 18, fontWeight: 700, color: '#d4a12e' }}>
                {Number(r.total_sales).toLocaleString('fr-FR')} FCFA
              </span>
              <span style={{ marginLeft: 8, fontSize: 12, color: '#7a8094' }}>
                {r.customers_count} client(s) · {r.payment_method}
              </span>
            </div>
            <span style={{ fontSize: 12, padding: '3px 12px', borderRadius: 20, background: STATUS_COLOR[r.status] + '20', color: STATUS_COLOR[r.status] }}>
              {r.status}
            </span>
          </div>
          {r.admin_comment && <p style={{ marginTop: 6, fontSize: 12, color: '#7a8094' }}>💬 Admin : {r.admin_comment}</p>}
        </div>
      ))}
    </div>
  );
}

// ── Composant interne qui a accès aux deux contextes (Theme + Toast) ──────────
function AppShell() {
  const [user, setUser]           = useState(null);
  const [tab, setTab]             = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { show: showToast } = useToast();
  const { isDark, toggleTheme }   = useTheme();
  const { t, i18n }               = useTranslation('nav');

  // Session persistée — force re-login si user sans is_super_admin (cache ancien)
  useEffect(() => {
    const saved = localStorage.getItem('kenpro_user');
    const token = localStorage.getItem('kenpro_token');
    if (saved && token) {
      const u = JSON.parse(saved);
      // Migration douce : si role super_admin mais pas le flag, l'ajouter
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
    const isVendorRole = u.role === 'vendeur' || u.role === 'vendor';
    showToast(
      `Bienvenue, ${u.name} !`,
      isVendorRole ? 'Tableau de bord vendeur chargé.' : 'Administration KENPRO STORE.',
      'success'
    );
  };

  const isVendor     = user?.role === 'vendeur' || user?.role === 'vendor';
  const isSuperAdmin = user?.role === 'super_admin' || user?.is_super_admin;
  const TABS         = isVendor
    ? VENDOR_TABS
    : ADMIN_TABS.filter(t => !t.superOnly || isSuperAdmin);

  const renderPage = () => {
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
      case 'online_store':       return <OnlineStore />;
      case 'payment_settings':   return <PaymentSettings />;
      case 'billing':            return <BillingPanel />;
      case 'revenue':            return <RevenuePanel token={localStorage.getItem('kenpro_token')} />;
      case 'super_admin':        return <SuperAdminPanel />;
      case 'security':           return <SecurityPanel token={localStorage.getItem('kenpro_token')} />;
      case 'compliance':         return <CompliancePanel isSuperAdmin={isSuperAdmin} />;
      case 'vendor_dashboard': return <VendorDashboard />;
      case 'my_report':        return <VendorReportForm onSubmitted={() => { setTab('my_reports'); showToast('Rapport soumis !', 'Votre rapport journalier a été envoyé.', 'success'); }} />;
      case 'my_reports':       return <MyReports />;
      default:                 return isVendor ? <VendorDashboard /> : <Dashboard />;
    }
  };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="app">
      {/* Bannière connexion / sync — affichée uniquement si offline ou queue > 0 */}
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
          {/* Sélecteur de langue */}
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

export default function App() {
  // Thème : localStorage > système > sombre par défaut
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

  // Ordre des providers : Theme (externe) → Toast (interne, car ToastItem utilise useTheme)
  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </ThemeContext.Provider>
  );
}
