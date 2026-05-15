/**
 * AppContext — Shared contexts for the admin app.
 * Exports: ThemeContext, useTheme, ToastContext, useToast, ToastProvider
 */
import { useState, useEffect, useContext, createContext, useCallback, useRef } from 'react';

// ── Theme ─────────────────────────────────────────────────────
export const ThemeContext = createContext({ isDark: true, toggleTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

// ── Toast ─────────────────────────────────────────────────────
export const ToastContext = createContext({ show: () => {} });
export const useToast = () => useContext(ToastContext);

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

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    const DURATION = 5000, TICK = 50;
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += TICK;
      setProgress(Math.max(0, 100 - (elapsed / DURATION) * 100));
      if (elapsed >= DURATION) { clearInterval(timer); handleClose(); }
    }, TICK);
    return () => clearInterval(timer);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => onClose(id), 300);
  }, [id, onClose]);

  const cardBg  = isDark ? '#141827' : '#ffffff';
  const textCol = isDark ? '#eaedf3' : '#0f172a';
  const mutedCol= isDark ? '#7a8094' : '#64748b';

  return (
    <div className={`toast-item toast-${visible ? 'in' : 'out'}`}
      style={{ background: cardBg, borderLeft: `4px solid ${cfg.border}`, borderRadius: 10,
               boxShadow: '0 8px 32px rgba(0,0,0,.3)', overflow: 'hidden', width: 350,
               maxWidth: 'calc(100vw - 40px)' }}>
      <div style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: textCol, marginBottom: 3 }}>{title}</div>
          {message && <div style={{ fontSize: 13, color: mutedCol, lineHeight: 1.45 }}>{message}</div>}
        </div>
        <button onClick={handleClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: mutedCol,
                   fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0, opacity: .7 }}>×</button>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,.08)' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: cfg.border,
                      transition: 'width 50ms linear', borderRadius: '0 2px 2px 0' }} />
      </div>
    </div>
  );
}

function ToastContainer({ toasts, onClose }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999,
                  display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'all' }}>
          <ToastItem {...t} onClose={onClose} />
        </div>
      ))}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((title, message = '', type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [{ id, title, message, type }, ...prev].slice(0, 5));
  }, []);
  const remove = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastContainer toasts={toasts} onClose={remove} />
    </ToastContext.Provider>
  );
}
