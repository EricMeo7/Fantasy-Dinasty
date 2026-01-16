import { Capacitor } from '@capacitor/core';

// IP Locale del PC (necessario per Android che non vede 'localhost' come il PC)
// SU PROD: Sostituire con l'URL di produzione o gestire tramite .env
const SERVER_IP = import.meta.env.VITE_SERVER_IP || window.location.hostname;

const isNative = Capacitor.isNativePlatform();

export const CONFIG = {
    // Usa le variabili d'ambiente di Vite se presenti, altrimenti:
    // - Su Mobile (Native): usa IP Locale
    // - Su Web (Prod): usa URL Render
    // - Su Web (Dev): usa localhost
    API_BASE_URL: import.meta.env.VITE_API_URL || (
        isNative ? `http://${SERVER_IP}:5249/api` :
            import.meta.env.PROD ? 'https://fantasy-dinasty.onrender.com/api' :
                'http://localhost:5249/api'
    ),
    HUB_BASE_URL: import.meta.env.VITE_HUB_URL || (
        isNative ? `http://${SERVER_IP}:5249` :
            import.meta.env.PROD ? 'https://fantasy-dinasty.onrender.com' :
                'http://localhost:5249'
    ),
};
