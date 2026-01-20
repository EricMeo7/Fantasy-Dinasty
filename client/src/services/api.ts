import axios from 'axios';
import { CONFIG } from '../config';


const axiosInstance = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log("API Service Initialized with Base URL:", CONFIG.API_BASE_URL);


// Interceptor per Token e League ID
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const leagueId = localStorage.getItem('selectedLeagueId'); // <--- NUOVO: Recupera ID Lega

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const lng = localStorage.getItem('i18nextLng') || 'en';
    config.headers['Accept-Language'] = lng;

    // Se c'è una lega selezionata, aggiungi l'header custom
    if (leagueId) {
      config.headers['X-League-Id'] = leagueId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor per gestire errori di risposta (es. 401 Unauthorized)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Evita redirect se siamo già al login (es. errore 2FA)
      if (!window.location.pathname.includes('/login')) {
        console.warn('Sessione scaduta o token non valido. Logout...');
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface BidRequest {
  playerId: number;
  totalAmount: number;
  years: number;
}


const api = {
  // Metodi Axios standard
  get: axiosInstance.get,
  post: axiosInstance.post,
  put: axiosInstance.put,
  delete: axiosInstance.delete,

  // --- LEAGUE MANAGEMENT (Esporta anche qui per comodità) ---
  //league: leagueApi,

  // --- TEAM / ROSTER ---
  team: {
    getMyRoster: () => axiosInstance.get(`/team/my-roster`),
    getBudget: () => axiosInstance.get('/team/budget'),
    releasePlayer: (id: number) => axiosInstance.post(`/team/release/${id}`),
    simulateRelease: (id: number) => axiosInstance.get(`/team/simulate-release/${id}`),
    toggleStarter: (id: number) => axiosInstance.post(`/team/toggle-starter/${id}`),
    getMyTeam: () => axiosInstance.get('/team/my-team'),
  },

  // --- MARKET ---
  market: {
    getFreeAgents: () => axiosInstance.get('/market/free-agents'),
    getActiveAuctions: () => axiosInstance.get('/market/active-auctions'),
    getPlayerDetails: (id: number) => axiosInstance.get(`/market/player/${id}`),
    placeBid: (data: BidRequest) => axiosInstance.post('/auction/bid', data),
    signPlayer: (id: number) => axiosInstance.post(`/market/sign/${id}`),
  },

  getAllRosters: () => axiosInstance.get('/league/all-rosters'),
  // --- ADMIN ---
  admin: {
    resetMarket: () => axiosInstance.post('/admin/reset-market'),
    getStatus: () => axiosInstance.get<{ status: number }>('/admin/status'),
    changeStatus: (status: number) => axiosInstance.post('/admin/change-status', status),
    getMembers: <T = any>() => axiosInstance.get<T>('/admin/members'),
    searchAllPlayers: <T = any>(query: string) => axiosInstance.get<T>(`/admin/search-all/${query}`),
    assignPlayer: (data: { playerId: number; targetUserId: string; salary: number; years: number }) =>
      axiosInstance.post('/admin/assign-player', data),
    generateSchedule: (data: { playoffTeams: number; mode: number }) => axiosInstance.post('/admin/generate-schedule', data),
    getSettings: <T = any>() => axiosInstance.get<T>('/admin/settings'),
    updateSettings: (data: any) => axiosInstance.post('/admin/settings', data),
    updateScores: () => axiosInstance.post('/admin/force-update-scores'),
  },
  trades: {
    getPendingCount: () => axiosInstance.get('/trade/pending-count'),
    propose: (data: { offers: { fromUserId: string, toUserId: string, playerId: number }[] }) =>
      axiosInstance.post('/trade/propose', data),
    getTrades: () => axiosInstance.get('/trade/my-trades'),
    accept: (id: number) => axiosInstance.post(`/trade/accept/${id}`),
    reject: (id: number) => axiosInstance.post(`/trade/reject/${id}`),
  },
  league: {
    create: <T = any>(data: { leagueName: string; myTeamName: string }) =>
      axiosInstance.post<T>('/league/create', data),
    join: <T = any>(data: { code: string; myTeamName: string }) =>
      axiosInstance.post<T>('/league/join', data),
    getMyLeagues: <T = any>() =>
      axiosInstance.get<T>('/league/my-leagues'),
    getAllRosters: <T = any>() =>
      axiosInstance.get<T>('/league/all-rosters'),
    getLeagueDetails: <T = any>() =>
      axiosInstance.get<T>('/league/details'),
    leave: (id: number) => axiosInstance.post(`/league/${id}/leave`),
  },
  match: {
    getLeagueSchedule: <T = any>() => axiosInstance.get<T>('/match/league-schedule'),
    getCurrent: <T = any>() => axiosInstance.get<T>('/match/current'),
    getDetails: <T = any>(id: number) => axiosInstance.get<T>(`/match/${id}`),
  },

  lineup: {
    getDailyLineup: <T = any>(date: string, targetTeamId?: number) =>
      axiosInstance.get<T>(`/lineup/day?date=${date}${targetTeamId ? `&targetTeamId=${targetTeamId}` : ''}`),

    getStatus: <T = any>(date: string) => axiosInstance.get<T>(`/lineup/status?date=${date}`),

    saveLineup: (data: { date: string, starterSlots: Record<string, number>, bench: number[] }) =>
      axiosInstance.post('/lineup/save', data),
  },

  stats: {
    getPlayers: <T = any>(params: any) => axiosInstance.get<T>('/stats/players', { params }),
    getSeasons: <T = any>() => axiosInstance.get<T>('/stats/seasons'),
  },

  // --- PROFILE ---

  getProfile: () => axiosInstance.get('/profile'), // Assumendo tu abbia questo endpoint

  // Backward compatibility
  getMyRoster: () => axiosInstance.get(`/team/my-roster`),
  getTeamBudget: () => axiosInstance.get('/team/budget'),
  getFreeAgents: () => axiosInstance.get('/market/free-agents'),
  getPlayerDetails: (id: number) => axiosInstance.get(`/market/player/${id}`),
  simulateRelease: (id: number) => axiosInstance.get(`/team/simulate-release/${id}`),
};

export default api;