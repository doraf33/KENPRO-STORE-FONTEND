import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// FR
import frCommon     from './fr/common.json';
import frAuth       from './fr/auth.json';
import frDashboard  from './fr/dashboard.json';
import frProducts   from './fr/products.json';
import frClients    from './fr/clients.json';
import frInvoices   from './fr/invoices.json';
import frRepairs    from './fr/repairs.json';
import frSettings   from './fr/settings.json';
import frPayments   from './fr/payments.json';
import frSuperAdmin from './fr/superadmin.json';
import frModules    from './fr/modules.json';
import frNav        from './fr/nav.json';
import frSuppliers  from './fr/suppliers.json';

// EN
import enCommon     from './en/common.json';
import enAuth       from './en/auth.json';
import enDashboard  from './en/dashboard.json';
import enProducts   from './en/products.json';
import enClients    from './en/clients.json';
import enInvoices   from './en/invoices.json';
import enRepairs    from './en/repairs.json';
import enSettings   from './en/settings.json';
import enPayments   from './en/payments.json';
import enSuperAdmin from './en/superadmin.json';
import enModules    from './en/modules.json';
import enNav        from './en/nav.json';
import enSuppliers  from './en/suppliers.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: {
        common:     frCommon,
        auth:       frAuth,
        dashboard:  frDashboard,
        products:   frProducts,
        clients:    frClients,
        invoices:   frInvoices,
        repairs:    frRepairs,
        settings:   frSettings,
        payments:   frPayments,
        superadmin: frSuperAdmin,
        modules:    frModules,
        nav:        frNav,
        suppliers:  frSuppliers,
      },
      en: {
        common:     enCommon,
        auth:       enAuth,
        dashboard:  enDashboard,
        products:   enProducts,
        clients:    enClients,
        invoices:   enInvoices,
        repairs:    enRepairs,
        settings:   enSettings,
        payments:   enPayments,
        superadmin: enSuperAdmin,
        modules:    enModules,
        nav:        enNav,
        suppliers:  enSuppliers,
      },
    },
    defaultNS: 'common',
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en'],
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'kenpro_language',
    },
    interpolation: {
      escapeValue: false,
    },
    // Architecture prévue pour Phase 2
    // es: Español, ar: العربية (RTL), pt: Português
  });

export default i18n;
