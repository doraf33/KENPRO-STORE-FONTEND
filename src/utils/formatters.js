/**
 * Formatters localisés — KENPRO STORE.
 * Adapte les formats de date, monnaie et téléphone selon la langue.
 */

/**
 * Formate un montant en FCFA (ou autre devise).
 * FR : 1 500 000 FCFA | EN : 1,500,000 FCFA
 */
export function formatCurrency(amount, currency = 'FCFA', lang = 'fr') {
  const n = Number(amount || 0);
  const formatted = lang === 'fr'
    ? n.toLocaleString('fr-FR')
    : n.toLocaleString('en-US');
  return `${formatted} ${currency}`;
}

/**
 * Formate une date.
 * FR : 27/04/2026 | EN : Apr 27, 2026
 */
export function formatDate(dateStr, lang = 'fr') {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    if (lang === 'en') {
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return d.toLocaleDateString('fr-FR');
  } catch {
    return dateStr;
  }
}

/**
 * Formate une date+heure.
 */
export function formatDateTime(dateStr, lang = 'fr') {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const locale = lang === 'en' ? 'en-US' : 'fr-FR';
    return d.toLocaleString(locale, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formate un numéro de téléphone camerounais.
 */
export function formatPhone(phone, country = 'CM') {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (country === 'CM' && digits.length === 9) {
    return `+237 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 9 || digits.length === 10) {
    return `+237 ${digits}`;
  }
  return phone;
}

/**
 * Retourne le formateur actif depuis i18n.
 * Usage : const { fmt, fmtDate } = useFormatters();
 */
export function getFormatters(lang = 'fr') {
  return {
    fmt:     (n, currency) => formatCurrency(n, currency, lang),
    fmtDate: (d)           => formatDate(d, lang),
    fmtDT:   (d)           => formatDateTime(d, lang),
    fmtPhone:(p, c)        => formatPhone(p, c),
  };
}
