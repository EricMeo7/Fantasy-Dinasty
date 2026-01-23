import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { CONFIG } from '../config';
import {
    ChevronDown, LogOut,
    RefreshCcw, ArrowLeftRight, Shield, List, LayoutDashboard, Book, Activity, Send,
    ShoppingBag, Calendar, Trophy, Users, Coffee, Radio
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLeagueStatus } from '../features/admin/api/useLeagueStatus';
import LanguageSwitcher from './LanguageSwitcher';
import TwoFactorSetupModal from './TwoFactorSetupModal';
import LogoAvatar from './LogoAvatar';

interface UserLega {
    leagueId: number;
    leagueName: string;
    myTeamName: string;
    isAdmin: boolean;
}

interface NavItem {
    label: string;
    path: string;
    icon: React.ReactNode;
    badge?: number;
    isExternal?: boolean;
}

interface MacroArea {
    key: string;
    label: string;
    icon: React.ReactNode;
    color: string;
    items: NavItem[];
}

export default function Navbar() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    const [userLeagues, setUserLeagues] = useState<UserLega[]>([]);
    const [userName, setUserName] = useState<string>("");
    const [myTeamId, setMyTeamId] = useState<number | null>(null);
    const [pendingTrades, setPendingTrades] = useState(0);

    // State for Menus
    const [isLeagueMenuOpen, setIsLeagueMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [is2FAOpen, setIs2FAOpen] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null); // 'franchise', 'competition', etc.

    const leagueMenuRef = useRef<HTMLDivElement>(null);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const navRef = useRef<HTMLDivElement>(null);

    const currentLeagueId = localStorage.getItem('selectedLeagueId');

    // Handle click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (leagueMenuRef.current && !leagueMenuRef.current.contains(event.target as Node)) {
                setIsLeagueMenuOpen(false);
            }
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
            if (navRef.current && !navRef.current.contains(event.target as Node)) {
                setOpenDropdown(null);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        loadData();
        const timer = setInterval(checkTrades, 120000); // 2 mins polling to reduced Network Transfer
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

            if (leagues.length > 0) {
                const storedId = localStorage.getItem('selectedLeagueId');
                const isValid = storedId && leagues.find((l: UserLega) => l.leagueId.toString() === storedId);

                if (!isValid) {
                    const defaultLeague = leagues[0];
                    localStorage.setItem('selectedLeagueId', defaultLeague.leagueId.toString());
                    localStorage.setItem('isAdmin', defaultLeague.isAdmin.toString());
                    if (!storedId) window.location.reload();
                } else {
                    try {
                        const teamRes = await api.team.getMyTeam();
                        setMyTeamId(teamRes.data.id);
                    } catch (e) { console.error(e); }
                }
            }
            checkTrades();
        } catch (e) { console.error(e); }
    };

    const checkTrades = async () => {
        const activeId = localStorage.getItem('selectedLeagueId');
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

    const effectiveLeagueId = localStorage.getItem('selectedLeagueId');
    const currentLeague = userLeagues.find(l => l.leagueId.toString() === effectiveLeagueId);

    const { data: statusData } = useLeagueStatus();
    const leagueStatus = statusData ?? 0;
    const marketPath = leagueStatus === 1 ? '/live-draft' : '/market';

    // --- MACRO AREAS CONFIGURATION ---
    const macroAreas: MacroArea[] = [
        {
            key: 'franchise',
            label: t('navbar.franchise'),
            icon: <Shield size={18} />,
            color: 'blue', // Franchise: Blue (Trust, Core)
            items: [
                { label: t('navbar.dashboard'), path: '/dashboard', icon: <LayoutDashboard size={16} /> },
                { label: t('navbar.roster'), path: '/roster', icon: <Users size={16} /> },
                { label: t('navbar.lineup'), path: '/matchup', icon: <List size={16} /> },
            ]
        },
        {
            key: 'competition',
            label: t('navbar.competition'),
            icon: <Trophy size={18} />,
            color: 'amber', // Competition: Gold/Amber (Trophy, Victory)
            items: [
                { label: t('navbar.matches'), path: '/matches', icon: <Calendar size={16} /> },
                { label: t('navbar.standings'), path: '/league', icon: <Trophy size={16} /> },
            ]
        },
        {
            key: 'draft',
            label: t('draft.menu'),
            icon: <Activity size={18} />, // Placeholder icon, maybe Ticket or Vote better but Activity is imported
            color: 'purple',
            items: [
                { label: t('draft.lottery'), path: '/lottery', icon: <Trophy size={16} /> },
                { label: t('draft.board'), path: '/draft-board', icon: <LayoutDashboard size={16} /> },
                { label: t('draft.myPicks'), path: '/draft-assets', icon: <ShoppingBag size={16} /> }, // Using Existing Route
                { label: t('draft.wageScale'), path: '/draft/wage-scale', icon: <Book size={16} /> },
                { label: t('draft.liveRoom'), path: '/rookie-draft', icon: <Radio size={16} /> },
            ]
        },
        {
            key: 'market',
            label: t('navbar.market'),
            icon: <ShoppingBag size={18} />,
            color: 'emerald', // Market: Emerald (Money, Value)
            items: [
                { label: t('navbar.free_agents'), path: marketPath, icon: <ShoppingBag size={16} /> },
                { label: t('navbar.trades'), path: '/trades', icon: <ArrowLeftRight size={16} />, badge: pendingTrades > 0 ? pendingTrades : undefined },
            ]
        },
        {
            key: 'resources',
            label: t('navbar.resources'),
            icon: <Book size={18} />,
            color: 'violet', // Resources: Violet (Wisdom, Rules)
            items: [
                { label: t('navbar.player_stats'), path: '/pool', icon: <Activity size={16} /> },
                { label: t('navbar.rules'), path: '/rules', icon: <Book size={16} /> },
                { label: t('navbar.contact'), path: '/contact', icon: <Send size={16} /> },
                { label: t('navbar.support'), path: 'https://ko-fi.com/fantasydynasty', icon: <Coffee size={16} />, isExternal: true },
            ]
        }
    ];

    const toggleDropdown = (key: string) => {
        if (openDropdown === key) {
            setOpenDropdown(null);
        } else {
            setOpenDropdown(key);
        }
    };

    return (
        <>
            <nav className="bg-slate-950/80 backdrop-blur-3xl border-b border-white/5 sticky top-0 z-[100] px-4 md:px-8 h-[calc(5rem+var(--sat))] pt-[var(--sat)] flex items-center justify-between shadow-2xl transition-all" ref={navRef}>
                {/* 1. BRAND & LEAGUE SELECTOR */}
                <div className="flex items-center gap-2 md:gap-8">
                    <div
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-3 cursor-pointer group"
                    >
                        <div className="p-1 bg-blue-600/20 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] group-hover:scale-110 transition-transform backdrop-blur-sm border border-blue-500/30">
                            <LogoAvatar src="/logo.png" alt="Fantasy Dynasty" size="sm" shape="square" className="bg-transparent border-none p-0 shadow-none" />
                        </div>
                        <div className="flex-col hidden xl:flex">
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
                                className={`flex items-center gap-2 py-2 transition-colors duration-300 relative group ${isLeagueMenuOpen ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                <span className="transition-transform duration-300 group-hover:scale-110">
                                    <LogoAvatar
                                        src={`${CONFIG.API_BASE_URL}/league/${currentLeague.leagueId}/logo`}
                                        alt="League Logo"
                                        size="xs"
                                        shape="square"
                                        fallbackType="league"
                                    />
                                </span>
                                <span className="hidden md:block text-[11px] font-black uppercase italic tracking-tight relative">
                                    {currentLeague.leagueName}
                                    <span className={`absolute -bottom-1 left-0 w-full h-[2px] bg-blue-500 origin-left transition-transform duration-300 ${isLeagueMenuOpen ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}></span>
                                </span>
                                <ChevronDown size={12} className={`transition-transform duration-300 opacity-50 group-hover:opacity-100 ${isLeagueMenuOpen ? 'rotate-180 text-blue-500' : ''}`} />
                            </button>

                            {isLeagueMenuOpen && (
                                <div className="absolute top-full left-0 mt-4 w-72 bg-slate-950 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 animate-in fade-in slide-in-from-top-4 duration-300 z-50">
                                    <div className="absolute top-[-6px] left-6 w-3 h-3 bg-slate-950 border-t border-l border-white/10 rotate-45"></div>
                                    <div className="relative z-10">
                                        <div className="px-4 py-2 mb-2">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('navbar.arena_selection')}</span>
                                        </div>
                                        {userLeagues.map(l => (
                                            <button
                                                key={l.leagueId}
                                                onClick={() => handleSwitchLeague(l)}
                                                className={`w-full text-left p-4 rounded-2xl flex items-center justify-between group transition-all mb-1 ${l.leagueId.toString() === currentLeagueId ? 'bg-blue-600 shadow-lg shadow-blue-500/20' : 'hover:bg-white/5'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <LogoAvatar
                                                        src={`${CONFIG.API_BASE_URL}/league/${l.leagueId}/logo`}
                                                        alt={l.leagueName}
                                                        size="xs"
                                                        shape="square"
                                                        fallbackType="league"
                                                    />
                                                    <div>
                                                        <div className={`text-sm font-black italic uppercase tracking-tight ${l.leagueId.toString() === currentLeagueId ? 'text-white' : 'text-slate-200 group-hover:text-blue-400'}`}>{l.leagueName}</div>
                                                        <div className={`text-[10px] font-bold ${l.leagueId.toString() === currentLeagueId ? 'text-blue-200' : 'text-slate-500'}`}>{l.myTeamName}</div>
                                                    </div>
                                                </div>
                                                {l.isAdmin && <Shield size={12} className={l.leagueId.toString() === currentLeagueId ? 'text-blue-200' : 'text-slate-700'} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 2. DESKTOP MACRO NAVIGATION */}
                <div className="hidden lg:flex items-center gap-6 relative">
                    {macroAreas.map((area) => (
                        <div key={area.key} className="relative group/menu">
                            <button
                                onClick={() => toggleDropdown(area.key)}
                                className={`flex items-center gap-2 py-2 transition-colors duration-300 text-[10px] font-black uppercase tracking-widest relative group ${openDropdown === area.key || area.items.some(i => i.path === location.pathname) ? 'text-white' : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                <span className={`transition-transform duration-300 group-hover:scale-110 ${openDropdown === area.key ? `text-${area.color}-500` : ''}`}>{area.icon}</span>
                                <span className={`relative`}>
                                    {area.label}
                                    <span className={`absolute -bottom-1 left-0 w-full h-[2px] bg-${area.color}-500 origin-left transition-transform duration-300 ${openDropdown === area.key || area.items.some(i => i.path === location.pathname) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}></span>
                                </span>
                                <ChevronDown size={10} className={`transition-transform duration-300 opacity-50 group-hover:opacity-100 ${openDropdown === area.key ? `rotate-180 text-${area.color}-500` : ''}`} />
                            </button>

                            {/* Dropdown Menu */}
                            {openDropdown === area.key && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-56 bg-slate-950 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 animate-in fade-in slide-in-from-top-4 duration-300 z-50">
                                    <div className="absolute top-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-950 border-t border-l border-white/10 rotate-45"></div>
                                    <div className="relative z-10 flex flex-col gap-1">
                                        {area.items.map((item) => (
                                            <button
                                                key={item.path}
                                                onClick={() => {
                                                    if (item.path.startsWith('http')) {
                                                        window.open(item.path, '_blank');
                                                    } else {
                                                        navigate(item.path);
                                                    }
                                                    setOpenDropdown(null);
                                                }}
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group/item relative overflow-hidden ${location.pathname === item.path ? `bg-${area.color}-600/10 text-white` : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                                            >
                                                <div className={`p-1.5 rounded-lg transition-colors ${location.pathname === item.path ? `bg-${area.color}-500 text-white` : `bg-slate-800 text-slate-400 group-hover/item:bg-${area.color}-500 group-hover/item:text-white`}`}>
                                                    {item.icon}
                                                </div>
                                                <div className="flex-1 flex justify-between items-center z-10">
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                                                    {(item.badge && item.badge > 0) && (
                                                        <span className="h-4 min-w-[1rem] px-1 bg-red-600 text-[9px] text-white rounded-full flex items-center justify-center border border-slate-900 shadow-lg shadow-red-500/20">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>


                {/* 3. USER & MOBILE PROFILE */}
                <div className="flex items-center gap-2 md:gap-4">
                    <div className="hidden md:block">
                        <LanguageSwitcher />
                    </div>

                    {currentLeague?.isAdmin && (
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
                            <LogoAvatar
                                src={myTeamId ? `${CONFIG.API_BASE_URL}/team/${myTeamId}/logo` : undefined}
                                alt="Team Logo"
                                size="sm"
                                shape="circle"
                                fallbackType="team"
                            />
                        </button>

                        {/* MOBILE / PROFILE MENU */}
                        {isProfileOpen && (
                            <div className="absolute top-full right-0 mt-3 w-80 bg-slate-900/95 backdrop-blur-3xl border border-white/5 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)] p-3 animate-in fade-in slide-in-from-top-2 duration-300 max-h-[80vh] overflow-y-auto">
                                <div className="md:hidden px-4 py-4 border-b border-white/5 mb-2">
                                    <div className="text-sm font-black text-white">{userName}</div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">{t('navbar.general_manager')}</div>
                                </div>

                                {/* MOBILE NAVIGATION - ACCORDION STYLE */}
                                <div className="lg:hidden mb-2 pb-2 border-b border-white/5 space-y-2">
                                    {macroAreas.map((area) => (
                                        <div key={area.key} className="p-2 bg-white/5 rounded-2xl">
                                            <div className="flex items-center justify-between p-2 text-slate-300 uppercase font-black text-[10px] tracking-widest mb-1">
                                                <div className="flex items-center gap-2">
                                                    {area.icon} {area.label}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                {area.items.map((item) => (
                                                    <button
                                                        key={item.path}
                                                        onClick={() => { navigate(item.path); setIsProfileOpen(false); }}
                                                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${location.pathname === item.path ? 'bg-blue-600 text-white' : 'hover:bg-white/5 text-slate-400'}`}
                                                    >
                                                        <span className="text-[10px] font-bold uppercase tracking-wide flex items-center gap-2">
                                                            {item.label}
                                                            {(item.badge && item.badge > 0) ? (
                                                                <span className="bg-red-600 text-[9px] text-white px-1.5 rounded-full">{item.badge}</span>
                                                            ) : null}
                                                        </span>
                                                        {item.icon}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    {currentLeague?.isAdmin && (
                                        <button onClick={() => navigate('/commissioner')} className="w-full flex items-center justify-between p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-white/5 transition-all">
                                            {t('navbar.commissioner_zone')} <Shield size={16} className="text-red-500" />
                                        </button>
                                    )}
                                </div>

                                <div className="p-4 flex justify-between items-center lg:hidden">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('navbar.language')}</span>
                                    <LanguageSwitcher />
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
            </nav>
            <TwoFactorSetupModal isOpen={is2FAOpen} onClose={() => setIs2FAOpen(false)} />
        </>
    );
}
