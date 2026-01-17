import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { CONFIG } from '../config';
import {
    User, ChevronDown, LogOut,
    Trophy, RefreshCcw, ArrowLeftRight, Shield, List, LayoutDashboard, Book
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import TwoFactorSetupModal from './TwoFactorSetupModal';

interface UserLega {
    leagueId: number;
    leagueName: string;
    myTeamName: string;
    isAdmin: boolean;
}

export default function Navbar() {
    const { t } = useTranslation();
    const [userLeagues, setUserLeagues] = useState<UserLega[]>([]);
    const [userName, setUserName] = useState<string>("");
    const [myTeamId, setMyTeamId] = useState<number | null>(null);
    const [leagueLogoError, setLeagueLogoError] = useState(false);
    const [teamLogoError, setTeamLogoError] = useState(false);

    // Restore missing state
    const [pendingTrades, setPendingTrades] = useState(0);
    const [isLeagueMenuOpen, setIsLeagueMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [is2FAOpen, setIs2FAOpen] = useState(false);

    const leagueMenuRef = useRef<HTMLDivElement>(null);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    const navigate = useNavigate();
    const currentLeagueId = localStorage.getItem('selectedLeagueId');

    // Handle click outside to close menus
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (leagueMenuRef.current && !leagueMenuRef.current.contains(event.target as Node)) {
                setIsLeagueMenuOpen(false);
            }
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        loadData();
        const timer = setInterval(checkTrades, 30000);
        return () => clearInterval(timer);
    }, [currentLeagueId]);

    const loadData = async () => {
        try {
            const [profileRes, leaguesRes] = await Promise.all([
                api.get('/profile'),
                api.league.getMyLeagues()
            ]);

            setUserName(profileRes.data.generalManagerName || profileRes.data.email);

            const leagues = leaguesRes.data;
            setUserLeagues(leagues);

            // AUTO-FIX: Se non ho una lega selezionata o quella selezionata non è valida, prendo la prima
            if (leagues.length > 0) {
                const storedId = localStorage.getItem('selectedLeagueId');
                const isValid = storedId && leagues.find((l: UserLega) => l.leagueId.toString() === storedId);

                if (!isValid) {
                    const defaultLeague = leagues[0];
                    localStorage.setItem('selectedLeagueId', defaultLeague.leagueId.toString());
                    localStorage.setItem('isAdmin', defaultLeague.isAdmin.toString());

                    if (!storedId) {
                        window.location.reload();
                    }
                } else {
                    // Se ho una lega valida, carico anche il team ID per il logo
                    try {
                        const teamRes = await api.team.getMyTeam();
                        setMyTeamId(teamRes.data.id);
                    } catch (e) {
                        console.error("Failed to load team info", e);
                    }
                }
            }

            checkTrades();
        } catch (e) {
            console.error("Navbar Load Data Error:", e);
        }
    };

    const checkTrades = async () => {
        const activeId = localStorage.getItem('selectedLeagueId'); // Re-read fresh
        if (!activeId) return;
        try {
            const { data } = await api.get('/trade/pending-count');
            setPendingTrades(data.count);
        } catch (e) { }
    };

    const handleSwitchLeague = (league: UserLega) => {
        localStorage.setItem('selectedLeagueId', league.leagueId.toString());
        localStorage.setItem('isAdmin', league.isAdmin.toString());
        window.location.href = '/dashboard';
    };

    // Re-read to ensure sync with loadData fix? 
    // No, React cycle: loadData runs -> updates state. 
    // We can compute render props from State + LocalStorage.
    const effectiveLeagueId = localStorage.getItem('selectedLeagueId');
    const currentLeague = userLeagues.find(l => l.leagueId.toString() === effectiveLeagueId);

    return (
        <>
            <nav className="bg-slate-950/80 backdrop-blur-3xl border-b border-white/5 sticky top-0 z-[100] px-4 md:px-8 h-[calc(5rem+var(--sat))] pt-[var(--sat)] flex items-center justify-between shadow-2xl transition-all">
                <div className="flex items-center gap-2 md:gap-10">
                    <div
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-3 cursor-pointer group"
                    >
                        <div className="p-2 bg-blue-600/20 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] group-hover:scale-110 transition-transform backdrop-blur-sm border border-blue-500/30">
                            <img src="/logo.png" alt="Fantasy Dynasty" className="w-10 h-10 object-contain shadow-none" />
                        </div>
                        <div className="flex-col hidden md:flex">
                            <span className="text-xl font-black text-white italic tracking-tighter leading-none">
                                FANTASY <span className="text-blue-500">DYNASTY NBA</span>
                            </span>
                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mt-1">{t('navbar.dynasty_core')}</span>
                        </div>
                    </div>

                    {currentLeague && (
                        <div className="relative" ref={leagueMenuRef}>
                            <button
                                onClick={() => setIsLeagueMenuOpen(!isLeagueMenuOpen)}
                                className="flex items-center gap-2 md:gap-3 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 px-3 md:px-4 py-2 rounded-2xl transition-all shadow-inner group"
                            >
                                <div className="w-5 h-5 md:w-6 md:h-6 rounded-lg overflow-hidden flex items-center justify-center bg-slate-800">
                                    {!leagueLogoError ? (
                                        <img
                                            src={`${CONFIG.API_BASE_URL}/league/${currentLeague.leagueId}/logo?t=${new Date().getTime()}`}
                                            alt="League Logo"
                                            className="w-full h-full object-cover"
                                            onError={() => setLeagueLogoError(true)}
                                        />
                                    ) : (
                                        <Trophy size={14} className="text-amber-500 shrink-0" />
                                    )}
                                </div>
                                <span className="text-[10px] md:text-[11px] font-black text-slate-300 uppercase italic tracking-tight max-w-[100px] md:max-w-none truncate group-hover:text-white transition-colors">{currentLeague.leagueName}</span>
                                <ChevronDown size={14} className={`text-slate-600 transition-transform shrink-0 ${isLeagueMenuOpen ? 'rotate-180 text-blue-500' : ''}`} />
                            </button>

                            {isLeagueMenuOpen && (
                                <div className="absolute top-full left-0 mt-3 w-72 bg-slate-900/90 backdrop-blur-3xl border border-white/5 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)] p-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="px-4 py-2 mb-2">
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t('navbar.arena_selection')}</span>
                                    </div>
                                    {
                                        userLeagues.map(l => (
                                            <button
                                                key={l.leagueId}
                                                onClick={() => handleSwitchLeague(l)}
                                                className={`w-full text-left p-4 rounded-2xl flex items-center justify-between group transition-all mb-1 ${l.leagueId.toString() === currentLeagueId ? 'bg-blue-600 shadow-lg shadow-blue-500/20' : 'hover:bg-white/5'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-800 border border-white/10 flex-shrink-0">
                                                        <img
                                                            src={`${CONFIG.API_BASE_URL}/league/${l.leagueId}/logo?t=${new Date().getTime()}`}
                                                            alt={l.leagueName}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                                (e.target as HTMLImageElement).parentElement!.innerText = l.leagueName.substring(0, 2).toUpperCase();
                                                                (e.target as HTMLImageElement).parentElement!.className += " flex items-center justify-center text-[10px] font-black text-slate-500";
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <div className={`text-sm font-black italic uppercase tracking-tight ${l.leagueId.toString() === currentLeagueId ? 'text-white' : 'text-slate-200 group-hover:text-blue-400'}`}>{l.leagueName}</div>
                                                        <div className={`text-[10px] font-bold ${l.leagueId.toString() === currentLeagueId ? 'text-blue-200' : 'text-slate-500'}`}>{l.myTeamName}</div>
                                                    </div>
                                                </div>
                                                {l.isAdmin && <Shield size={12} className={l.leagueId.toString() === currentLeagueId ? 'text-blue-200' : 'text-slate-700'} />}
                                            </button>
                                        ))
                                    }
                                </div>
                            )
                            }
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 md:gap-6">

                    <div className="hidden lg:flex items-center gap-1 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
                        <NavIcon
                            icon={<LayoutDashboard size={20} />}
                            label={t('navbar.dashboard')}
                            onClick={() => navigate('/dashboard')}
                        />
                        <NavIcon
                            icon={<List size={20} />}
                            label={t('navbar.lineup')}
                            onClick={() => navigate('/matchup')}
                        />
                        <NavIcon
                            icon={<ArrowLeftRight size={20} />}
                            label={t('navbar.trades')}
                            onClick={() => navigate('/trades')}
                            badge={pendingTrades}
                        />
                        <NavIcon
                            icon={<Book size={20} />}
                            label={t('navbar.rules')}
                            onClick={() => navigate('/rules')}
                        />
                    </div>

                    <div className="h-8 w-px bg-slate-800 mx-2 hidden md:block"></div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="hidden md:block">
                            <LanguageSwitcher />
                        </div>

                        {
                            currentLeague?.isAdmin && (
                                <button
                                    onClick={() => navigate('/commissioner')}
                                    className="hidden md:block p-3 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-xl shadow-red-500/5"
                                    title={t('navbar.commissioner_zone')}
                                >
                                    <Shield size={20} />
                                </button>
                            )}

                        <div className="relative" ref={profileMenuRef}>
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center gap-4 bg-slate-950 border border-slate-800 md:pl-5 md:pr-2 p-1 md:py-2 rounded-[2rem] hover:bg-slate-900 transition-all shadow-2xl group"
                            >
                                <div className="text-right hidden md:block">
                                    <div className="text-[11px] font-black text-white italic uppercase tracking-tight leading-none truncate max-w-[120px]">{userName}</div>
                                    <div className="text-[8px] text-slate-600 font-black uppercase mt-1 tracking-widest group-hover:text-blue-500 transition-colors">{t('navbar.general_manager')}</div>
                                </div>
                                <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center shadow-lg overflow-hidden">
                                    {myTeamId && !teamLogoError ? (
                                        <img
                                            src={`${CONFIG.API_BASE_URL}/team/${myTeamId}/logo?t=${new Date().getTime()}`}
                                            alt="Team Logo"
                                            className="w-full h-full object-cover"
                                            onError={() => setTeamLogoError(true)}
                                        />
                                    ) : (
                                        <>
                                            <User size={16} className="text-slate-400 md:hidden" />
                                            <User size={20} className="text-slate-400 hidden md:block" />
                                        </>
                                    )}
                                </div>
                            </button>

                            {isProfileOpen && (
                                <div className="absolute top-full right-0 mt-3 w-64 bg-slate-900/90 backdrop-blur-3xl border border-white/5 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)] p-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="md:hidden px-4 py-2 border-b border-white/5 mb-2">
                                        <div className="text-sm font-black text-white">{userName}</div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-widest">{t('navbar.general_manager')}</div>
                                    </div>

                                    {/* Mobile Navigation Links */}
                                    <div className="lg:hidden mb-2 pb-2 border-b border-white/5">
                                        <button onClick={() => navigate('/dashboard')} className="w-full flex items-center justify-between p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/5 transition-all">
                                            {t('navbar.dashboard')} <LayoutDashboard size={16} className="text-blue-500" />
                                        </button>
                                        <button onClick={() => navigate('/matchup')} className="w-full flex items-center justify-between p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/5 transition-all">
                                            {t('navbar.lineup')} <List size={16} className="text-blue-500" />
                                        </button>
                                        <button onClick={() => navigate('/trades')} className="w-full flex items-center justify-between p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/5 transition-all">
                                            {t('navbar.trades')} <ArrowLeftRight size={16} className="text-blue-500" />
                                        </button>
                                        <button onClick={() => navigate('/rules')} className="w-full flex items-center justify-between p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/5 transition-all">
                                            {t('navbar.rules')} <Book size={16} className="text-blue-500" />
                                        </button>
                                        {currentLeague?.isAdmin && (
                                            <button onClick={() => navigate('/commissioner')} className="w-full flex items-center justify-between p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-white/5 transition-all">
                                                {t('navbar.commissioner_zone')} <Shield size={16} className="text-red-500" />
                                            </button>
                                        )}
                                        <div className="p-4 flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('navbar.language')}</span>
                                            <LanguageSwitcher />
                                        </div>
                                    </div>

                                    <button onClick={() => navigate('/leagues')} className="w-full flex items-center justify-between p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/5 transition-all">
                                        {t('navbar.switch_league')} <RefreshCcw size={16} className="text-blue-500" />
                                    </button>
                                    <button onClick={() => setIs2FAOpen(true)} className="w-full flex items-center justify-between p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/5 transition-all">
                                        {t('navbar.setup_2fa')} <Shield size={16} className="text-blue-500" />
                                    </button>
                                    <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="w-full flex items-center justify-between p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all mt-1">
                                        {t('navbar.terminate_session')} <LogOut size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
            <TwoFactorSetupModal isOpen={is2FAOpen} onClose={() => setIs2FAOpen(false)} />
        </>
    );
}

function NavIcon({ icon, label, onClick, badge }: { icon: any, label: string, onClick: () => void, badge?: number }) {
    return (
        <button
            onClick={onClick}
            className={`relative p-3 rounded-xl transition-all duration-300 flex items-center gap-2 group ${badge ? 'text-amber-500 bg-amber-500/5 hover:bg-amber-500 hover:text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
            title={label}
        >
            {icon}
            {badge ? (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-600 text-[10px] font-black text-white rounded-full flex items-center justify-center border-2 border-slate-950 animate-bounce">
                    {badge}
                </span>
            ) : null
            }
            <span className="text-[9px] font-black uppercase tracking-widest hidden xl:block">{label}</span>
        </button>
    );
}
