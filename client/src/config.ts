import { Capacitor } from '@capacitor/core';

// IP Locale del PC (necessario per Android che non vede 'localhost' come il PC)
// SU PROD: Sostituire con l'URL di produzione o gestire tramite .env
const SERVER_IP = import.meta.env.VITE_SERVER_IP || window.location.hostname;

const isNative = Capacitor.isNativePlatform();

// Rilevamento ambiente più robusto:
// 1. Variabile VITE_PROD (Build)
// 2. Hostname contiene 'pages.dev' o 'render.com' (Deploy reale)
const isProduction = import.meta.env.PROD ||
    window.location.hostname.includes('pages.dev') ||
    window.location.hostname.includes('render.com');

export const CONFIG = {
    // Usa le variabili d'ambiente di Vite se presenti, altrimenti:
    // - Su Mobile (Native): usa IP Locale
    // - Su Web (Prod): usa URL Render
    // - Su Web (Dev): usa localhost
    API_BASE_URL: import.meta.env.VITE_API_URL || (
        isNative ? `http://${SERVER_IP}:5249/api` :
            isProduction ? 'https://fantasy-dinasty.onrender.com/api' :
                'http://localhost:5249/api'
    ),
    HUB_BASE_URL: import.meta.env.VITE_HUB_URL || (
        isNative ? `http://${SERVER_IP}:5249` :
            isProduction ? 'https://fantasy-dinasty.onrender.com' :
                'http://localhost:5249'
    ),
};
