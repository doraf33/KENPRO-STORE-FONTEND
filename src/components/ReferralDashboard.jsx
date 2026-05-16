/**
 * ReferralDashboard — Tableau de bord parrainage admin boutique.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const token = () => localStorage.getItem('kenpro_token');
const slug  = () => localStorage.getItem('kenpro_tenant_slug') || 'kenpro-store';

const apiFetch = (path, method = 'GET', body = null) =>
  fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      'X-Tenant-Slug': slug(),
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).then(r => r.json());

export default function ReferralDashboard() {
  const { t } = useTranslation('common');
  const [info,   setInfo]   = useState(null);
  const [stats,  setStats]  = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/my-shop/referral'),
      apiFetch('/my-shop/referral/stats'),
    ]).then(([ref, st]) => {
      setInfo(ref);
      setStats(st);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const copyLink = () => {
    if (!info?.referral_url) return;
    navigator.clipboard.writeText(info.referral_url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareWhatsApp = () => {
    if (!stats?.referral_url) return;
    const text = `🚀 Créez votre boutique en ligne GRATUITEMENT avec KENPRO STORE !\n${stats.referral_url || info?.referral_url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareFacebook = () => {
    const url = stats?.referral_url || info?.referral_url || '';
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  if (loading) return <div className="loading">Chargement parrainage…</div>;

  const referralUrl = stats?.referral_url || info?.referral_url || '';
  const code = stats?.referral_code || info?.referral_code || '—';

  return (
    <div>
      <div className="page-header">
        <h2>🎁 Programme de parrainage</h2>
      </div>

      {/* Mon lien */}
      <div className="form-card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12, fontSize: 14 }}>Mon lien de parrainage</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <input
            readOnly
            value={referralUrl || 'Génération en cours…'}
            className="form-input"
            style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }}
          />
          <button className="btn btn-primary btn-sm" onClick={copyLink}>
            {copied ? '✅ Copié !' : '📋 Copier'}
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
          Code: <strong style={{ color: 'var(--accent)' }}>{code}</strong>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={shareWhatsApp}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#25d366',
                     color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px',
                     cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'white' }}>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.112 1.523 5.836L0 24l6.337-1.493A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.782 9.782 0 01-5.012-1.376l-.36-.213-3.757.985.998-3.648-.234-.375A9.755 9.755 0 012.182 12C2.182 6.578 6.578 2.182 12 2.182S21.818 6.578 21.818 12 17.422 21.818 12 21.818z"/>
            </svg>
            WhatsApp
          </button>
          <button onClick={shareFacebook}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1877f2',
                     color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px',
                     cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            📘 Facebook
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Filleuls recrutés',  value: stats?.total_referred || 0,  color: '#5b9cf6', icon: '👥' },
          { label: 'Inscriptions confirmées', value: stats?.completed || 0,  color: '#2dd4a0', icon: '✅' },
          { label: 'Récompenses gagnées', value: stats?.rewards_earned || 0, color: '#d4a12e', icon: '🎁' },
        ].map(k => (
          <div key={k.label} className="kpi-fintech" style={{ '--kpi-color': k.color }}>
            <div className="kpi-label">{k.icon} {k.label}</div>
            <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Comment ça marche */}
      <div className="form-card">
        <h3 style={{ marginBottom: 12, fontSize: 14 }}>Comment ça marche ?</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            ['1️⃣', 'Partagez votre lien unique avec vos amis commerçants'],
            ['2️⃣', 'Ils créent leur boutique via votre lien'],
            ['3️⃣', 'Vous recevez 1 mois gratuit du plan Starter'],
            ['4️⃣', 'Ils bénéficient de 30 jours d\'essai (au lieu de 14)'],
          ].map(([n, text]) => (
            <div key={n} style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--muted)' }}>
              <span>{n}</span><span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
