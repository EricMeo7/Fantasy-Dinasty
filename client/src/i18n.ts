import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Risorse di traduzione
import { en } from './locales/en';
import { it } from './locales/it';

// Risorse di traduzione
const resources = {
  en: en,
  it: it
};

i18n
  .use(LanguageDetector) // Rileva la lingua del browser
  .use(initReactI18next) // Passa i18n a React
  .init({
    resources,
    fallbackLng: 'en', // Lingua di default se non ne trova altre
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    interpolation: {
      escapeValue: false // React protegge già da XSS
    }
  });

export default i18n;