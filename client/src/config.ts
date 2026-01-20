// Rilevamento ambiente più robusto:
// 2. Hostname contains common deployment keywords
const isProduction =
    window.location.hostname.includes('pages.dev') ||
    window.location.hostname.includes('fantasy-dinasty.com');

export const CONFIG = {
    API_BASE_URL: isProduction ? 'https://fantasy-dinasty.onrender.com/api' : 'http://localhost:5249/api',
    HUB_BASE_URL: isProduction ? 'https://fantasy-dinasty.onrender.com' : 'http://localhost:5249'
};
