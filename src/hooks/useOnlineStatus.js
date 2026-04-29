// Hook React — statut connexion + type réseau + data saver mode
import { useState, useEffect, useCallback } from 'react';

function getConnectionInfo() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return { type: 'unknown', effectiveType: 'unknown', downlink: null, saveData: false };
  return {
    type:          conn.type          || 'unknown',
    effectiveType: conn.effectiveType || 'unknown',
    downlink:      conn.downlink      || null,   // Mb/s
    saveData:      conn.saveData      || false,
  };
}

export function useOnlineStatus() {
  const [isOnline,    setIsOnline]    = useState(navigator.onLine);
  const [connection,  setConnection]  = useState(getConnectionInfo);
  const [dataSaver,   setDataSaver]   = useState(false);

  const updateConnection = useCallback(() => {
    const info = getConnectionInfo();
    setConnection(info);
    // Mode économie si connexion < 1 Mb/s ou type 2G/slow-2g
    const slow = info.effectiveType === '2g' || info.effectiveType === 'slow-2g'
              || (info.downlink !== null && info.downlink < 0.1);
    setDataSaver(info.saveData || slow);
  }, []);

  useEffect(() => {
    const goOnline  = () => { setIsOnline(true);  updateConnection(); };
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) conn.addEventListener('change', updateConnection);

    updateConnection();

    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
      if (conn) conn.removeEventListener('change', updateConnection);
    };
  }, [updateConnection]);

  // Libellé réseau lisible
  const networkLabel = {
    'slow-2g': '2G lent', '2g': '2G', '3g': '3G', '4g': '4G', 'wifi': 'WiFi',
  }[connection.effectiveType] || connection.effectiveType || '—';

  return { isOnline, connection, networkLabel, dataSaver };
}

// Hook enregistrement Service Worker
export function useServiceWorker() {
  const [swStatus, setSwStatus] = useState('idle'); // idle | registered | error

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        setSwStatus('registered');
        // Vérifier les mises à jour toutes les 5 min
        setInterval(() => reg.update(), 5 * 60 * 1000);
      })
      .catch(() => setSwStatus('error'));
  }, []);

  return swStatus;
}
