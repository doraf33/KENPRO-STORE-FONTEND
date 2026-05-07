// ============================================================
// KENPRO STORE Admin — Configuration paiements multi-provider
// Page : Paramètres → Paiements
// ============================================================
import { useState, useEffect } from 'react';
import { paymentsAPI } from '../api';

const S = {
  card:  { background:'#141827', border:'1px solid #252a3a', borderRadius:10, padding:18, marginBottom:12 },
  input: { width:'100%', background:'#1b1f30', border:'1px solid #252a3a', borderRadius:7,
           padding:'8px 12px', color:'#eaedf3', fontSize:13, outline:'none', boxSizing:'border-box',
           marginBottom:8 },
  label: { fontSize:11, color:'#7a8094', display:'block', marginBottom:4 },
  btnPri:{ background:'#d4a12e', color:'#000', border:'none', borderRadius:8,
           padding:'8px 16px', cursor:'pointer', fontWeight:700, fontSize:13 },
  btnSec:{ background:'#252a3a', color:'#eaedf3', border:'none', borderRadius:8,
           padding:'8px 14px', cursor:'pointer', fontSize:13 },
  btnGrn:{ background:'#1c3b2a', color:'#2dd4a0', border:'1px solid #2dd4a0',
           borderRadius:8, padding:'8px 14px', cursor:'pointer', fontSize:13 },
  btnRed:{ background:'#3b1c1c', color:'#ef6461', border:'1px solid #ef6461',
           borderRadius:8, padding:'8px 12px', cursor:'pointer', fontSize:12 },
};

// ── Formulaire de configuration d'un provider ─────────────────
function ProviderConfigForm({ provider, existing, onSave, onCancel }) {
  const [isSandbox,  setSandbox]   = useState(existing?.is_sandbox ?? true);
  const [creds,      setCreds]     = useState({});
  const [saving,     setSaving]    = useState(false);
  const [testing,    setTesting]   = useState(false);
  const [testResult, setTestResult]= useState(null);

  // Champs credentials spécifiques par provider
  const CRED_FIELDS = {
    mtn_momo:     [{ key:'api_user', label:'API User (UUID)' },
                   { key:'api_key', label:'API Key' },
                   { key:'subscription_key', label:'Subscription Key (Collections)' },
                   { key:'callback_host', label:'Callback Host (optionnel)', placeholder:'https://votredomaine.com' }],
    orange_money: [{ key:'client_id', label:'Client ID' },
                   { key:'client_secret', label:'Client Secret' },
                   { key:'merchant_key', label:'Merchant Key' }],
    wave:         [{ key:'api_key', label:'API Key (wave_sn_prod_... ou wave_ci_prod_...)' }],
    mpesa:        [{ key:'consumer_key', label:'Consumer Key' },
                   { key:'consumer_secret', label:'Consumer Secret' },
                   { key:'shortcode', label:'Shortcode' },
                   { key:'passkey', label:'Passkey' }],
    paystack:     [{ key:'secret_key', label:'Secret Key (sk_test_... ou sk_live_...)' }],
    flutterwave:  [{ key:'secret_key', label:'Secret Key (FLWSECK_TEST-... ou FLWSECK-...)' }],
    stripe:       [{ key:'secret_key', label:'Secret Key (sk_test_... ou sk_live_...)' },
                   { key:'webhook_secret', label:'Webhook Secret (whsec_...)' }],
    paypal:       [{ key:'client_id', label:'Client ID' },
                   { key:'client_secret', label:'Client Secret' }],
  };

  const fields = CRED_FIELDS[provider.name] || [{ key:'api_key', label:'API Key' }];

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = { credentials: creds, is_sandbox: isSandbox };
      if (existing) {
        await paymentsAPI.updateConfig(provider.name, body);
      } else {
        await paymentsAPI.configure(provider.name, body);
      }
      onSave();
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      const r = await paymentsAPI.testConfig(provider.name);
      setTestResult(r.data);
    } catch { setTestResult({ available: false, message: 'Erreur de connexion' }); }
    finally { setTesting(false); }
  };

  return (
    <div style={{ ...S.card, borderColor:'#5b9cf6' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
        <h4 style={{ margin:0, color:'#eaedf3' }}>
          {provider.logo_emoji} Configurer {provider.display_name}
        </h4>
        <button onClick={onCancel} style={{ background:'none', border:'none', color:'#7a8094', cursor:'pointer', fontSize:18 }}>×</button>
      </div>

      {/* Mode sandbox/production */}
      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        <label style={{ ...S.label, display:'flex', alignItems:'center', gap:8, cursor:'pointer',
                         padding:'8px 12px', border:`1px solid ${isSandbox ? '#d4a12e' : '#252a3a'}`,
                         borderRadius:8, color: isSandbox ? '#d4a12e' : '#7a8094' }}>
          <input type="radio" checked={isSandbox} onChange={() => setSandbox(true)} style={{ accentColor:'#d4a12e' }} />
          🧪 Sandbox (tests)
        </label>
        <label style={{ ...S.label, display:'flex', alignItems:'center', gap:8, cursor:'pointer',
                         padding:'8px 12px', border:`1px solid ${!isSandbox ? '#2dd4a0' : '#252a3a'}`,
                         borderRadius:8, color: !isSandbox ? '#2dd4a0' : '#7a8094' }}>
          <input type="radio" checked={!isSandbox} onChange={() => setSandbox(false)} style={{ accentColor:'#2dd4a0' }} />
          🚀 Production
        </label>
      </div>

      {/* Champs credentials */}
      {fields.map(f => (
        <div key={f.key}>
          <label style={S.label}>{f.label}</label>
          <input
            type="password"
            placeholder={f.placeholder || `Votre ${f.label}`}
            value={creds[f.key] || ''}
            onChange={e => setCreds(c => ({ ...c, [f.key]: e.target.value }))}
            style={S.input}
          />
        </div>
      ))}

      {/* Lien documentation */}
      <div style={{ fontSize:12, color:'#7a8094', marginBottom:12 }}>
        📖 Documentation : {
          { mtn_momo: 'momodeveloper.mtn.com', orange_money: 'developer.orange.com',
            wave: 'docs.wave.com', mpesa: 'developer.safaricom.co.ke',
            paystack: 'paystack.com/developers', flutterwave: 'developer.flutterwave.com',
            stripe: 'stripe.com/docs', paypal: 'developer.paypal.com' }[provider.name] || 'voir doc provider'
        }
      </div>

      {/* Résultat test */}
      {testResult && (
        <div style={{ padding:'8px 12px', borderRadius:8, marginBottom:10,
                      background: testResult.available ? 'rgba(45,212,160,.1)' : 'rgba(239,100,97,.1)',
                      color: testResult.available ? '#2dd4a0' : '#ef6461', fontSize:13 }}>
          {testResult.available ? '✅' : '❌'} {testResult.message}
        </div>
      )}

      <div style={{ display:'flex', gap:8 }}>
        <button onClick={handleSave} disabled={saving} style={S.btnPri}>
          {saving ? '⏳...' : '💾 Sauvegarder'}
        </button>
        <button onClick={handleTest} disabled={testing} style={S.btnGrn}>
          {testing ? '⏳...' : '🧪 Tester'}
        </button>
        <button onClick={onCancel} style={S.btnSec}>Annuler</button>
      </div>
    </div>
  );
}

// ── Carte provider ────────────────────────────────────────────
function ProviderCard({ provider, config, onConfigure, onDelete }) {
  const isConfigured = !!config;
  const isActive     = config?.is_active;

  return (
    <div style={{ ...S.card, borderColor: isConfigured ? '#252a3a' : '#1a1f2e',
                  opacity: isConfigured ? 1 : 0.75 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <span style={{ fontSize:28 }}>{provider.logo_emoji}</span>
          <div>
            <div style={{ fontWeight:700, color:'#eaedf3' }}>{provider.display_name}</div>
            <div style={{ fontSize:11, color:'#7a8094', marginTop:2 }}>
              {provider.supported_countries?.join(', ')}
            </div>
          </div>
        </div>
        <div>
          {isConfigured ? (
            <span style={{ fontSize:12, padding:'3px 10px', borderRadius:20,
                           background: isActive ? 'rgba(45,212,160,.15)' : 'rgba(239,100,97,.15)',
                           color: isActive ? '#2dd4a0' : '#ef6461' }}>
              {isActive ? '✅ Actif' : '⏸ Inactif'}
            </span>
          ) : (
            <span style={{ fontSize:12, color:'#7a8094' }}>❌ Non configuré</span>
          )}
        </div>
      </div>

      {isConfigured && (
        <div style={{ fontSize:12, color:'#7a8094', marginTop:8 }}>
          Mode : {config.is_sandbox ? '🧪 Sandbox' : '🚀 Production'} ·
          Credentials : {config.has_credentials ? '🔑 Présents' : '⚠️ Absents'}
        </div>
      )}

      <div style={{ display:'flex', gap:8, marginTop:12 }}>
        <button onClick={() => onConfigure(provider, config)} style={S.btnSec}>
          {isConfigured ? '✏️ Modifier' : '⚙️ Configurer'}
        </button>
        {isConfigured && (
          <button onClick={() => onDelete(provider.name)} style={S.btnRed}>🗑️</button>
        )}
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────
export default function PaymentSettings() {
  const [available,  setAvailable]  = useState([]);
  const [configs,    setConfigs]     = useState([]);
  const [configuring,setConfiguring] = useState(null); // {provider, existing}
  const [loading,    setLoading]     = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [avRes, cfRes] = await Promise.all([
        paymentsAPI.getAvailable(),
        paymentsAPI.getConfigs(),
      ]);
      setAvailable(avRes.data.providers || []);
      setConfigs(cfRes.data.configs || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (providerName) => {
    if (!confirm(`Supprimer la configuration de ${providerName} ?`)) return;
    try {
      await paymentsAPI.deleteConfig(providerName);
      load();
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
  };

  const configMap = Object.fromEntries(configs.map(c => [c.provider_name, c]));

  if (loading) return <div className="loading">Chargement des paiements…</div>;

  return (
    <div>
      <div className="page-header">
        <h2>💳 Paiements</h2>
        <div style={{ fontSize:12, color:'#7a8094' }}>
          Configuration des moyens de paiement de votre boutique
        </div>
      </div>

      {/* Formulaire de configuration */}
      {configuring && (
        <ProviderConfigForm
          provider={configuring.provider}
          existing={configuring.existing}
          onSave={() => { setConfiguring(null); load(); }}
          onCancel={() => setConfiguring(null)}
        />
      )}

      {/* Liste des providers disponibles */}
      <div style={{ marginBottom:16 }}>
        <h3 style={{ color:'#eaedf3', marginBottom:12 }}>
          Providers disponibles dans votre pays
        </h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12 }}>
          {available.map(p => (
            <ProviderCard
              key={p.name}
              provider={p}
              config={configMap[p.name]}
              onConfigure={(provider, existing) => setConfiguring({ provider, existing })}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>

      {available.length === 0 && (
        <div style={{ ...S.card, textAlign:'center', padding:32, color:'#7a8094' }}>
          <div style={{ fontSize:32, marginBottom:8 }}>💳</div>
          <p>Aucun provider disponible pour votre pays.<br/>
             Vérifiez le code pays dans les paramètres de votre boutique.</p>
        </div>
      )}
    </div>
  );
}
