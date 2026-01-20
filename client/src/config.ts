import { Capacitor } from '@capacitor/core';

// IP Locale del PC (necessario per Android che non vede 'localhost' come il PC)
// SU PROD: Sostituire con l'URL di produzione o gestire tramite .env
const isNative = Capacitor.isNativePlatform();

// Rilevamento ambiente più robusto:
// 2. Hostname contains common deployment keywords
const isProduction =
    window.location.hostname.includes('pages.dev') ||
    window.location.hostname.includes('fantasy-dinasty.com');

export const CONFIG = {
    API_BASE_URL: isProduction ? 'https://fantasy-dinasty.onrender.com/api' : 'http://localhost:5249/api',
    HUB_BASE_URL: isProduction ? 'https://fantasy-dinasty.onrender.com' : 'http://localhost:5249'
};
