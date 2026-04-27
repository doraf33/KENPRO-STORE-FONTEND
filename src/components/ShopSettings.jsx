// ============================================================
// KENPRO STORE — Page paramètres boutique (admin)
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { settingsAPI } from '../api';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000';

const S = {
  card:   { background:'#141827', border:'1px solid #252a3a', borderRadius:10, padding:20, marginBottom:16 },
  label:  { color:'#7a8094', fontSize:12, display:'block', marginBottom:5 },
  input:  { width:'100%', background:'#1b1f30', border:'1px solid #252a3a', borderRadius:7,
            padding:'9px 12px', color:'#eaedf3', fontSize:13, outline:'none', boxSizing:'border-box' },
  btnPri: { background:'#d4a12e', color:'#000', border:'none', borderRadius:8,
            padding:'10px 20px', cursor:'pointer', fontWeight:700, fontSize:13 },
  btnSec: { background:'#252a3a', color:'#eaedf3', border:'none', borderRadius:8,
            padding:'10px 20px', cursor:'pointer', fontSize:13 },
};

export default function ShopSettings() {
  const [settings,  setSettings]  = useState(null);
  const [form,      setForm]      = useState({});
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [logoFile,  setLogoFile]  = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const r = await settingsAPI.getShop();
      setSettings(r.data);
      setForm(r.data);
      if (r.data.logo_url) setLogoPreview(`${API_BASE}${r.data.logo_url}?t=${Date.now()}`);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await settingsAPI.updateShop({
        shop_name:         form.shop_name,
        phone:             form.phone,
        address:           form.address,
        email:             form.email,
        thank_you_message: form.thank_you_message,
        paper_format:      form.paper_format,
      });
      setSettings(r.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setUploading(true);
    try {
      const r = await settingsAPI.uploadLogo(logoFile);
      setLogoPreview(`${API_BASE}${r.data.logo_url}?t=${Date.now()}`);
      setLogoFile(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur upload logo');
    } finally { setUploading(false); }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>⚙️ Paramètres boutique</h2>
        {saved && (
          <span style={{ color:'#2dd4a0', fontWeight:700, fontSize:13 }}>✅ Sauvegardé !</span>
        )}
      </div>

      {/* Logo */}
      <div style={S.card}>
        <h3 style={{ color:'#eaedf3', margin:'0 0 16px' }}>🖼️ Logo de la boutique</h3>
        <div style={{ display:'flex', gap:20, alignItems:'flex-start', flexWrap:'wrap' }}>
          {/* Aperçu */}
          <div style={{ background:'#1b1f30', borderRadius:8, padding:12,
                        minWidth:100, textAlign:'center', border:'1px solid #252a3a' }}>
            {logoPreview
              ? <img src={logoPreview} alt="Logo" style={{ maxWidth:80, maxHeight:80, objectFit:'contain' }}
                     onError={e => e.target.style.display='none'} />
              : <div style={{ color:'#7a8094', fontSize:12, padding:20 }}>Aucun logo</div>
            }
          </div>
          {/* Upload */}
          <div style={{ flex:1 }}>
            <label style={S.label}>Changer le logo (PNG, JPG, SVG)</label>
            <input ref={fileRef} type="file" accept="image/*"
                   onChange={handleLogoChange}
                   style={{ display:'none' }} />
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button style={S.btnSec} onClick={() => fileRef.current?.click()}>
                📁 Choisir un fichier
              </button>
              {logoFile && (
                <button style={S.btnPri} onClick={handleLogoUpload} disabled={uploading}>
                  {uploading ? '⏳ Upload...' : '⬆️ Appliquer le logo'}
                </button>
              )}
            </div>
            {logoFile && (
              <div style={{ color:'#7a8094', fontSize:12, marginTop:6 }}>
                Sélectionné : {logoFile.name}
              </div>
            )}
            <div style={{ color:'#5b9cf6', fontSize:11, marginTop:8 }}>
              Le logo s'affichera sur les tickets caisse et les étiquettes produits.
            </div>
          </div>
        </div>
      </div>

      {/* Infos boutique */}
      <div style={S.card}>
        <h3 style={{ color:'#eaedf3', margin:'0 0 16px' }}>🏪 Informations boutique</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <label style={S.label}>Nom de la boutique *</label>
            <input style={S.input} value={form.shop_name || ''}
                   onChange={e => setForm(f => ({ ...f, shop_name: e.target.value }))}
                   placeholder="KENPRO STORE" />
          </div>
          <div>
            <label style={S.label}>Téléphone</label>
            <input style={S.input} value={form.phone || ''}
                   onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                   placeholder="+237 699 001 122" />
          </div>
          <div>
            <label style={S.label}>Email</label>
            <input style={S.input} value={form.email || ''}
                   onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                   placeholder="contact@kenpro.cm" />
          </div>
          <div>
            <label style={S.label}>Adresse</label>
            <input style={S.input} value={form.address || ''}
                   onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                   placeholder="Yaoundé, Cameroun" />
          </div>
        </div>
      </div>

      {/* Ticket caisse */}
      <div style={S.card}>
        <h3 style={{ color:'#eaedf3', margin:'0 0 16px' }}>🧾 Ticket caisse</h3>
        <div style={{ marginBottom:12 }}>
          <label style={S.label}>Format papier</label>
          <div style={{ display:'flex', gap:10 }}>
            {['58mm', '80mm'].map(f => (
              <button key={f}
                onClick={() => setForm(fm => ({ ...fm, paper_format: f }))}
                style={{
                  ...S.btnSec, flex:1,
                  border: form.paper_format === f ? '1px solid #d4a12e' : '1px solid transparent',
                  color:  form.paper_format === f ? '#d4a12e' : '#eaedf3',
                  fontWeight: form.paper_format === f ? 700 : 400,
                }}>
                {f}
              </button>
            ))}
          </div>
          <div style={{ color:'#7a8094', fontSize:11, marginTop:6 }}>
            58mm : imprimantes thermiques standard · 80mm : format large
          </div>
        </div>
        <div>
          <label style={S.label}>Message de remerciement</label>
          <textarea
            value={form.thank_you_message || ''}
            onChange={e => setForm(f => ({ ...f, thank_you_message: e.target.value }))}
            rows={3}
            style={{ ...S.input, resize:'vertical', lineHeight:1.6 }}
            placeholder="Merci pour votre visite !&#10;Revenez nous voir !"
          />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={handleSave} disabled={saving} style={{ ...S.btnPri, flex:1 }}>
          {saving ? '⏳ Sauvegarde...' : '💾 Sauvegarder les paramètres'}
        </button>
        <button onClick={load} style={S.btnSec}>↩ Annuler</button>
      </div>
    </div>
  );
}
