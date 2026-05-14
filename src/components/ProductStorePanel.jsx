// ============================================================
// KENPRO STORE Admin — Panneau Boutique en ligne par produit
// Onglets : Description | Photos | Caractéristiques
// ============================================================
import { useState, useRef, useEffect } from 'react';
import { productsAPI } from '../api';

const API_BASE = 'http://localhost:8000';

const S = {
  card:  { background:'#141827', border:'1px solid #252a3a', borderRadius:10, padding:16, marginBottom:12 },
  label: { fontSize:12, color:'#7a8094', display:'block', marginBottom:5 },
  input: { width:'100%', background:'#1b1f30', border:'1px solid #252a3a', borderRadius:7,
           padding:'8px 12px', color:'#eaedf3', fontSize:13, outline:'none', boxSizing:'border-box' },
  btnPri:{ background:'#d4a12e', color:'#000', border:'none', borderRadius:8,
           padding:'8px 16px', cursor:'pointer', fontWeight:700, fontSize:13 },
  btnSec:{ background:'#252a3a', color:'#eaedf3', border:'none', borderRadius:8,
           padding:'8px 14px', cursor:'pointer', fontSize:13 },
  btnRed:{ background:'transparent', color:'#ef6461', border:'1px solid #ef6461',
           borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:11 },
};

// ── Onglet Description ────────────────────────────────────────
function DescriptionTab({ product, onSave }) {
  const [desc,      setDesc]     = useState(product.public_description || '');
  const [published, setPublished]= useState(!!product.is_published);
  const [featured,  setFeatured] = useState(!!product.is_featured);
  const [discount,  setDiscount] = useState(product.discount_percent || 0);
  const [saving,    setSaving]   = useState(false);
  const [saved,     setSaved]    = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('public_description', desc);
      fd.append('is_published',       published);
      fd.append('is_featured',        featured);
      fd.append('discount_percent',   discount);
      const r = await productsAPI.updateStore(product.id, fd);
      onSave(r.data.product);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      {/* Switches publication */}
      <div style={{ display:'flex', gap:12, marginBottom:14, flexWrap:'wrap' }}>
        {[
          { label:'Publié', value: published, set: setPublished, color:'#2dd4a0' },
          { label:'⭐ Vedette', value: featured, set: setFeatured, color:'#d4a12e' },
        ].map(({ label, value, set, color }) => (
          <label key={label} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer',
                                       background:'#1b1f30', border:`1px solid ${value ? color : '#252a3a'}`,
                                       borderRadius:8, padding:'8px 12px' }}>
            <input type="checkbox" checked={value} onChange={e => set(e.target.checked)}
                   style={{ accentColor: color, width:16, height:16 }} />
            <span style={{ color: value ? color : '#7a8094', fontWeight: value ? 700 : 400, fontSize:13 }}>
              {label}
            </span>
          </label>
        ))}
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'#1b1f30',
                      border:'1px solid #252a3a', borderRadius:8, padding:'8px 12px' }}>
          <label style={S.label}>Remise&nbsp;</label>
          <input type="number" min="0" max="100" value={discount}
                 onChange={e => setDiscount(Number(e.target.value))}
                 style={{ ...S.input, width:60, textAlign:'center', padding:'4px 8px' }} />
          <span style={{ color:'#7a8094', fontSize:13 }}>%</span>
        </div>
      </div>

      {/* Description */}
      <label style={S.label}>Description publique</label>
      <textarea
        value={desc}
        onChange={e => setDesc(e.target.value)}
        rows={8}
        placeholder="Décrivez votre produit pour la boutique en ligne (supports HTML basique : <b>, <ul>, <li>)…"
        style={{ ...S.input, resize:'vertical', lineHeight:1.6, marginBottom:12 }}
      />

      {/* Aperçu HTML */}
      {desc && (
        <div style={{ marginBottom:12 }}>
          <div style={S.label}>Aperçu :</div>
          <div style={{ background:'#0f1420', borderRadius:8, padding:12, fontSize:13,
                        color:'#eaedf3', lineHeight:1.7, border:'1px solid #252a3a' }}
               dangerouslySetInnerHTML={{ __html: desc }} />
        </div>
      )}

      <button onClick={handleSave} disabled={saving} style={S.btnPri}>
        {saving ? '⏳ Sauvegarde…' : saved ? '✅ Sauvegardé !' : '💾 Sauvegarder'}
      </button>
    </div>
  );
}

// ── Onglet Photos ─────────────────────────────────────────────
function PhotosTab({ product, onSave }) {
  const [photos,    setPhotos]   = useState(product.photos || []);
  const [mainPhoto, setMain]     = useState(product.main_photo || '');
  const [uploading, setUploading]= useState(false);
  const [dragOver,  setDragOver] = useState(false);
  const fileRef = useRef(null);

  const doUpload = async (files) => {
    if (!files.length) return;
    if (photos.length + files.length > 5) {
      alert(`Maximum 5 photos. Vous en avez déjà ${photos.length}.`); return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('files', f));
      const r = await productsAPI.uploadPhotos(product.id, fd);
      setPhotos(r.data.photos);
      setMain(r.data.main_photo);
      onSave(r.data.product);
    } catch (e) { alert(e.response?.data?.detail || 'Erreur upload'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (url) => {
    if (!confirm('Supprimer cette photo ?')) return;
    try {
      const r = await productsAPI.deletePhoto(product.id, url);
      setPhotos(r.data.photos);
      setMain(r.data.main_photo);
      onSave({ ...product, photos: r.data.photos, main_photo: r.data.main_photo });
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
  };

  const handleSetMain = async (url) => {
    try {
      await productsAPI.setMainPhoto(product.id, url);
      setMain(url);
      onSave({ ...product, main_photo: url });
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
  };

  return (
    <div>
      <div style={{ color:'#7a8094', fontSize:12, marginBottom:10 }}>
        {photos.length}/5 photos · JPG, PNG, WEBP · Max 5 MB · Compression WebP automatique
      </div>

      {/* Zone drag & drop */}
      {photos.length < 5 && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); doUpload(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          style={{
            border:`2px dashed ${dragOver ? '#d4a12e' : '#252a3a'}`,
            borderRadius:10, padding:32, textAlign:'center', cursor:'pointer',
            background: dragOver ? 'rgba(212,161,46,.05)' : '#1b1f30',
            transition:'all .2s', marginBottom:14,
          }}
        >
          <input ref={fileRef} type="file" multiple
                 accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                 style={{ display:'none' }}
                 onChange={e => doUpload(e.target.files)} />
          {uploading
            ? <div style={{ color:'#d4a12e', fontSize:14 }}>⏳ Upload en cours…</div>
            : <>
                <div style={{ fontSize:32, marginBottom:8 }}>📸</div>
                <div style={{ color:'#eaedf3', fontSize:13, marginBottom:4 }}>
                  Glissez des photos ici ou cliquez pour sélectionner
                </div>
                <div style={{ color:'#7a8094', fontSize:11 }}>
                  JPG · PNG · WEBP · HEIC (iPhone) — max 10 MB · {5 - photos.length} restante(s)
                </div>
              </>
          }
        </div>
      )}

      {/* Grille photos */}
      {photos.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:10 }}>
          {photos.map((url, i) => (
            <div key={i} style={{ position:'relative', borderRadius:8, overflow:'hidden',
                                   border:`2px solid ${mainPhoto === url ? '#d4a12e' : '#252a3a'}` }}>
              <img src={`${API_BASE}${url}`} alt={`Photo ${i+1}`}
                   style={{ width:'100%', aspectRatio:'1', objectFit:'cover', display:'block' }}
                   onError={e => e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📦</text></svg>'} />
              {mainPhoto === url && (
                <span style={{ position:'absolute', top:4, left:4, background:'#d4a12e',
                               color:'#000', fontSize:9, fontWeight:700,
                               padding:'2px 5px', borderRadius:4 }}>
                  PRINCIPALE
                </span>
              )}
              <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(0,0,0,.6)',
                            display:'flex', gap:4, padding:4, justifyContent:'center' }}>
                {mainPhoto !== url && (
                  <button onClick={() => handleSetMain(url)}
                          style={{ ...S.btnSec, fontSize:10, padding:'2px 6px' }} title="Définir principale">
                    ⭐
                  </button>
                )}
                <button onClick={() => handleDelete(url)}
                        style={{ background:'transparent', border:'none', color:'#ef6461',
                                 cursor:'pointer', fontSize:14, padding:'2px 4px' }} title="Supprimer">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && !uploading && (
        <div style={{ color:'#7a8094', fontSize:13, textAlign:'center', padding:16 }}>
          Aucune photo — ajoutez-en ci-dessus
        </div>
      )}
    </div>
  );
}

// ── Onglet Caractéristiques ───────────────────────────────────
function SpecsTab({ product, onSave }) {
  const initSpecs = () => {
    try {
      const s = JSON.parse(product.specs || '{}');
      return Object.entries(s).map(([k, v]) => ({ k, v }));
    } catch { return []; }
  };

  const [rows,   setRows]  = useState(initSpecs);
  const [saving, setSaving]= useState(false);
  const [saved,  setSaved] = useState(false);

  const updateRow = (i, field, val) =>
    setRows(rs => rs.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  const addRow    = () => setRows(rs => [...rs, { k: '', v: '' }]);
  const removeRow = (i) => setRows(rs => rs.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true);
    try {
      const specsObj = {};
      rows.filter(r => r.k.trim()).forEach(r => { specsObj[r.k.trim()] = r.v; });
      const fd = new FormData();
      fd.append('specs', JSON.stringify(specsObj));
      const r = await productsAPI.updateStore(product.id, fd);
      onSave(r.data.product);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
    finally { setSaving(false); }
  };

  const SUGGESTIONS = ['Écran', 'RAM', 'Stockage', 'Processeur', 'Batterie', 'Caméra', 'Couleur', 'Poids', 'Garantie'];

  return (
    <div>
      <div style={{ color:'#7a8094', fontSize:12, marginBottom:12 }}>
        Ajoutez les caractéristiques techniques qui s'afficheront sur la fiche produit publique.
      </div>

      {/* Suggestions rapides */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
        {SUGGESTIONS.filter(s => !rows.some(r => r.k === s)).map(s => (
          <button key={s} onClick={() => setRows(rs => [...rs, { k: s, v: '' }])}
                  style={{ ...S.btnSec, fontSize:11, padding:'4px 10px' }}>
            + {s}
          </button>
        ))}
      </div>

      {/* Tableau clé / valeur */}
      <div style={{ display:'flex', gap:8, marginBottom:6 }}>
        <span style={{ flex:1, fontSize:11, color:'#7a8094' }}>Caractéristique</span>
        <span style={{ flex:1.5, fontSize:11, color:'#7a8094' }}>Valeur</span>
        <span style={{ width:28 }} />
      </div>
      {rows.map((row, i) => (
        <div key={i} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'center' }}>
          <input value={row.k} onChange={e => updateRow(i, 'k', e.target.value)}
                 placeholder="Ex: Écran" style={{ ...S.input, flex:1 }} />
          <input value={row.v} onChange={e => updateRow(i, 'v', e.target.value)}
                 placeholder="Ex: 6.1 pouces" style={{ ...S.input, flex:1.5 }} />
          <button onClick={() => removeRow(i)}
                  style={{ background:'none', border:'none', color:'#ef6461', cursor:'pointer', fontSize:18 }}>
            ×
          </button>
        </div>
      ))}

      <button onClick={addRow} style={{ ...S.btnSec, fontSize:12, marginBottom:16 }}>
        + Ajouter une ligne
      </button>

      {/* Aperçu */}
      {rows.filter(r => r.k.trim()).length > 0 && (
        <div style={{ background:'#0f1420', borderRadius:8, padding:12, marginBottom:12,
                      border:'1px solid #252a3a' }}>
          <div style={{ fontSize:12, color:'#7a8094', marginBottom:8 }}>Aperçu :</div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <tbody>
              {rows.filter(r => r.k.trim()).map((r, i) => (
                <tr key={i} style={{ borderBottom:'1px solid #252a3a' }}>
                  <td style={{ padding:'5px 8px', color:'#7a8094', width:'40%' }}>{r.k}</td>
                  <td style={{ padding:'5px 8px', color:'#eaedf3', fontWeight:600 }}>{r.v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button onClick={handleSave} disabled={saving} style={S.btnPri}>
        {saving ? '⏳ Sauvegarde…' : saved ? '✅ Sauvegardé !' : '💾 Sauvegarder les caractéristiques'}
      </button>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────
export default function ProductStorePanel({ product, onClose, onSave }) {
  const [tab, setTab] = useState('description');
  const [cur, setCur] = useState(product);

  const handleSave = (updated) => {
    setCur(p => ({ ...p, ...updated }));
    if (onSave) onSave(updated);
  };

  const tabs = [
    { id: 'description', label: '📝 Description' },
    { id: 'photos',      label: '📸 Photos' },
    { id: 'specs',       label: '📋 Caractéristiques' },
  ];

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:9800,
                  display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#141827', border:'1px solid #252a3a', borderRadius:14,
                    width:'100%', maxWidth:620, maxHeight:'90vh', overflowY:'auto', padding:22 }}>
        {/* En-tête */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div>
            <h3 style={{ margin:0, color:'#eaedf3' }}>🛒 Boutique — {cur.name}</h3>
            <div style={{ fontSize:12, color:'#7a8094', marginTop:3 }}>
              {cur.is_published ? '🟢 Publié' : '⚪ Non publié'}
              {cur.is_featured ? ' · ⭐ Vedette' : ''}
              {cur.discount_percent > 0 ? ` · -${cur.discount_percent}%` : ''}
            </div>
          </div>
          <button onClick={onClose}
                  style={{ background:'none', border:'none', color:'#7a8094', fontSize:22, cursor:'pointer' }}>
            ×
          </button>
        </div>

        {/* Onglets */}
        <div style={{ display:'flex', gap:6, marginBottom:16, borderBottom:'1px solid #252a3a', paddingBottom:12 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
                    style={{ ...S.btnSec, flex:1, fontSize:12, padding:'7px 0',
                             border: tab === t.id ? '1px solid #d4a12e' : '1px solid transparent',
                             color:  tab === t.id ? '#d4a12e' : '#7a8094',
                             fontWeight: tab === t.id ? 700 : 400 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenu onglet */}
        {tab === 'description' && <DescriptionTab product={cur} onSave={handleSave} />}
        {tab === 'photos'      && <PhotosTab      product={cur} onSave={handleSave} />}
        {tab === 'specs'       && <SpecsTab       product={cur} onSave={handleSave} />}
      </div>
    </div>
  );
}
