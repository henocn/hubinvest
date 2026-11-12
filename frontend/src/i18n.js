import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import fr from './locales/fr';

// Les robots d'indexation (Googlebot annonce l'anglais) lisent la version française, langue de référence du site.
const isCrawler = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|lighthouse/i.test(navigator.userAgent);

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    supportedLngs: ['fr', 'en'],
    fallbackLng: 'fr',
    ...(isCrawler && { lng: 'fr' }),
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'hubinvest-language',
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language.startsWith('en') ? 'en' : 'fr';
});

document.documentElement.lang = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'fr';

export default i18n;
