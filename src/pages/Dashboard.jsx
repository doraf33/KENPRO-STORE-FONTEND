import { useState, useEffect, useRef, useCallback } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dashboardAPI } from '../api';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/AppContext';

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
export default Dashboard;
