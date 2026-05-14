import { useTranslation } from 'react-i18next';

const LANGS = [
  { code: 'fr', flag: '🇫🇷', label: 'FR' },
  { code: 'en', flag: '🇬🇧', label: 'EN' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage || 'fr';

  const change = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('kenpro_language', code);
    // RTL support (futur arabe)
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = code;
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 4, padding: '6px 12px',
    }}>
      {LANGS.map((lang, i) => (
        <>
          <button
            key={lang.code}
            onClick={() => change(lang.code)}
            title={lang.label}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '3px 6px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: current === lang.code ? 800 : 400,
              color: current === lang.code ? 'var(--accent)' : 'var(--muted)',
              borderBottom: current === lang.code ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'all .15s',
              lineHeight: 1.4,
            }}
          >
            {lang.flag} {lang.label}
          </button>
          {i < LANGS.length - 1 && (
            <span key={`sep-${i}`} style={{ color: 'var(--border)', fontSize: 12 }}>|</span>
          )}
        </>
      ))}
    </div>
  );
}
