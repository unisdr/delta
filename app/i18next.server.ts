import { resolve } from 'node:path';
import { RemixI18Next } from 'remix-i18next/server';
import i18n from './i18n';

// Dynamic import to ensure this only runs on server
let Backend: any;
if (typeof window === 'undefined') {
  Backend = await import('i18next-fs-backend').then(m => m.default);
}

export let i18next = new RemixI18Next({
  detection: {
    supportedLanguages: i18n.supportedLngs,
    fallbackLanguage: i18n.fallbackLng,
  },
  i18next: {
    ...i18n,
    backend: {
      loadPath: resolve('./public/locales/{{lng}}/{{ns}}.json'),
    },
  },
  plugins: Backend ? [Backend] : [],
});