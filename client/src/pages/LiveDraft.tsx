import { useEffect, useState, useRef, useMemo } from 'react';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import BidModal from '../components/BidModal';
import NominationModal from '../components/NominationModal';
import api from '../services/api';
import { CONFIG } from '../config';
import { useNavigate } from 'react-router-dom';
import { Gavel, User, Mic, PlayCircle, Loader2, DollarSign, Users, ChevronDown, Lock, Shield, Wifi, Timer, Activity, TrendingUp, Search } from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { useTranslation } from 'react-i18next';
import { useErrorTranslation } from '../hooks/useErrorTranslation';
import SEO from '../components/SEO/SEO';
import { PremiumSelect } from '../components/PremiumSelect';
import LogoAvatar from '../components/LogoAvatar';
import { useLeagueSettings } from '../features/admin/api/useLeagueSettings';

const HUB_URL = `${CONFIG.HUB_BASE_URL}/drafthub`;

interface DraftPlayerDto {
    name: string;
    salary: number;
    position: string;
}

interface TeamSummary {
    userId: string;
    teamName: string;
    remainingBudget: number;
    rosterCount: number;
    players: DraftPlayerDto[];
}

interface DraftState {
    isActive: boolean;
    currentTurnIndex: number;
    participants: string[];
    onlineParticipants: string[];
    currentPlayerId: number | null;
    currentPlayerName: string;
    currentBidTotal: number;
    currentBidYears: number;
    currentBidYear1: number;
    highBidderName: string;
    highBidderId?: string;
    bidEndTime: string;
    teams: TeamSummary[];
}


export default function LiveDraft() {
    const { t } = useTranslation();
    const { translateError } = useErrorTranslation();
    const [connection, setConnection] = useState<HubConnection | null>(null);
    const [draftState, setDraftState] = useState<DraftState | null>(null);
    const [freeAgents, setFreeAgents] = useState<any[]>([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [myBidAmount, setMyBidAmount] = useState<number>(0);
    const [myBidYears, setMyBidYears] = useState<number>(1);
    const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showAdminPanel, setShowAdminPanel] = useState(false);

    // New Features State
    const [searchTerm, setSearchTerm] = useState("");
    const [positionFilter, setPositionFilter] = useState("");
    const [sortBy, setSortBy] = useState<string>("avgPoints");
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [hideUnaffordable, setHideUnaffordable] = useState(false);
    const [activeTab, setActiveTab] = useState<'auction' | 'rosters'>('auction'); // Mobile Tab State
    const [selectedPlayerForNomination, setSelectedPlayerForNomination] = useState<any>(null);
    const [isNominationModalOpen, setIsNominationModalOpen] = useState(false);
    const [isBidModalOpen, setIsBidModalOpen] = useState(false);
    const { data: leagueSettings } = useLeagueSettings();

    const navigate = useNavigate();
    const { showAlert, showConfirm } = useModal();
    const isConnecting = useRef(false);


    const toggleTeamExpand = (teamId: string) => {
        setExpandedTeamId(expandedTeamId === teamId ? null : teamId);
    };

    const getMyIdFromToken = () => {
        const token = localStorage.getItem('token');
        if (!token) return "";
        try {
            const base64Url = token.split('.')[1];
            if (!base64Url) return "";
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            const payload = JSON.parse(jsonPayload);
            return payload.nameid || payload.sub || "";
        } catch (e) {
            return "";
        }
    };

    const myId = getMyIdFromToken();
    const isMyTurn = draftState && draftState.participants && draftState.participants[draftState.currentTurnIndex] === myId;

    useEffect(() => {
        const token = localStorage.getItem('token');
        const leagueId = localStorage.getItem('selectedLeagueId');

        if (!token || !leagueId) { navigate('/login'); return; }

        setIsAdmin(localStorage.getItem('isAdmin') === 'true');

        const newConnection = new HubConnectionBuilder()
            .withUrl(`${HUB_URL}?leagueId=${leagueId}`, {
                accessTokenFactory: () => token
            })
            .withAutomaticReconnect()
            .build();

        setConnection(newConnection);

        return () => { newConnection.stop(); };
    }, [navigate]);

    useEffect(() => {
        if (connection && connection.state === HubConnectionState.Disconnected && !isConnecting.current) {
            isConnecting.current = true;
            connection.start()
                .then(() => { isConnecting.current = false; })
                .catch(() => { isConnecting.current = false; });

            connection.on('UpdateState', (state: DraftState) => {
                setDraftState(state);
                if (state.currentPlayerId) {
                    setMyBidAmount(state.currentBidTotal + 1);
                    setMyBidYears(state.currentBidYears);
                }
            });

            // Lightweight bid update handler (reduced payload ~2KB vs ~50KB)
            connection.on('BidUpdate', (update: {
                currentBidTotal: number;
                currentBidYears: number;
                currentBidYear1: number;
                highBidderId: string;
                highBidderName: string;
                bidEndTime: string;
                updatedBudgets: { userId: string; teamName: string; remainingBudget: number; rosterCount: number }[];
            }) => {
                setDraftState(prev => {
                    if (!prev) return prev;

                    // Update bid information
                    const updated = {
                        ...prev,
                        currentBidTotal: update.currentBidTotal,
                        currentBidYears: update.currentBidYears,
                        currentBidYear1: update.currentBidYear1,
                        highBidderId: update.highBidderId,
                        highBidderName: update.highBidderName,
                        bidEndTime: update.bidEndTime,
                    };

                    // Update budgets for affected teams only
                    if (update.updatedBudgets && update.updatedBudgets.length > 0) {
                        updated.teams = prev.teams.map(team => {
                            const budgetUpdate = update.updatedBudgets.find(u => u.userId === team.userId);
                            if (budgetUpdate) {
                                return {
                                    ...team,
                                    remainingBudget: budgetUpdate.remainingBudget,
                                    rosterCount: budgetUpdate.rosterCount
                                };
                            }
                            return team;
                        });
                    }

                    return updated;
                });

                // Update my bid form
                if (update.currentBidTotal) {
                    setMyBidAmount(update.currentBidTotal + 1);
                    setMyBidYears(update.currentBidYears);
                }
            });

            connection.on('PlayerSold', (data: any) => showAlert({ title: t('draft.sold'), message: `${data.playerName} ${t('draft.sold_to')} ${data.winner}`, type: 'success' }));
            connection.on('Error', (msg: string) => showAlert({ title: t('common.error'), message: translateError(msg), type: 'error' }));
            connection.on('RefreshList', () => {
                api.getFreeAgents().then((res: any) => setFreeAgents(res.data));
            });
        }
    }, [connection, showAlert, t]);

    useEffect(() => {
        if (!draftState?.bidEndTime) return;
        const interval = setInterval(() => {
            const end = new Date(draftState.bidEndTime).getTime();
            const now = new Date().getTime();
            setTimeLeft(Math.max(0, Math.floor((end - now) / 1000)));
        }, 1000);
        return () => clearInterval(interval);
    }, [draftState?.bidEndTime]);

    useEffect(() => {
        if (isMyTurn && !draftState?.currentPlayerId) {
            api.getFreeAgents().then((res: any) => setFreeAgents(res.data));
        }
    }, [isMyTurn, draftState?.currentPlayerId]);

    const myTeam = draftState?.teams.find(t => t.userId === myId);
    const maxAvailableBid = myTeam ? myTeam.remainingBudget : 0;

    const filteredFreeAgents = useMemo(() => {
        return freeAgents
            .filter(p => {
                const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
                const matchesSearch = searchTerm === "" || fullName.includes(searchTerm.toLowerCase());
                const matchesPos = positionFilter === "" || p.position === positionFilter;
                const basePrice = Math.max(1, p.minBid || Math.round(p.avgPoints || 1));
                const isAffordable = basePrice <= maxAvailableBid;

                if (hideUnaffordable && !isAffordable) return false;
                return matchesSearch && matchesPos;
            })
            .map(p => {
                const basePrice = Math.max(1, p.minBid || Math.round(p.avgPoints || 1));
                const isAffordable = basePrice <= maxAvailableBid;
                return { ...p, basePrice, isAffordable };
            })
            .sort((a, b) => {
                let valA: any, valB: any;

                if (sortBy === 'name') {
                    valA = `${a.firstName} ${a.lastName}`.toLowerCase();
                    valB = `${b.firstName} ${b.lastName}`.toLowerCase();
                } else {
                    valA = a[sortBy] || 0;
                    valB = b[sortBy] || 0;
                }

                if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
    }, [freeAgents, searchTerm, positionFilter, hideUnaffordable, maxAvailableBid, sortBy, sortOrder]);

    // Limit visible players to 200 for initial performance, or use virtualization principles
    const visibleFreeAgents = filteredFreeAgents.slice(0, 200);

    const handleNominate = async (player: any) => {
        setSelectedPlayerForNomination(player);
        setIsNominationModalOpen(true);
    };

    const handleConfirmNomination = async (player: any) => {
        setIsNominationModalOpen(false);

        // Use minBid from API if available (simulating FreeAgent logic), otherwise fallback
        const startBid = Math.max(1, player.minBid || Math.round(player.avgPoints || 1));
        await connection?.invoke('Nominate', player.id, `${player.firstName} ${player.lastName}`, startBid, 1);
    };

    const handleBid = async () => {
        if (!draftState) return;


        await connection?.invoke('Bid', Number(myBidAmount), Number(myBidYears));
    };

    const handleStartDraft = async () => {
        const leagueId = localStorage.getItem('selectedLeagueId');
        if (!leagueId) return;

        const ok = await showConfirm({
            title: t('draft.start_confirm_title'),
            message: t('draft.start_confirm_msg'),
            type: "confirm"
        });

        if (ok) {
            await connection?.invoke("StartDraft", parseInt(leagueId));
            setShowAdminPanel(false);
        }
    }

    if (!draftState) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="animate-spin mb-6 text-emerald-500" size={48} />
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-400">{t('draft.initializing_engine')}</p>
        </div>
    );

    const onlineCount = draftState.onlineParticipants?.length || 0;
    const totalCount = draftState.teams.length;

    // LOBBY VIEW
    if (!draftState.isActive) return (
        <div className="min-h-screen bg-slate-950 text-white p-6 relative flex flex-col items-center justify-center">
            <SEO title="Draft Lobby" description="Sala d'attesa per l'asta live." />
            {/* Header / Stats Overlay */}
            <div className="absolute top-8 left-8 flex items-center gap-4">
                <LogoAvatar
                    src={`${CONFIG.API_BASE_URL}/league/${localStorage.getItem('selectedLeagueId')}/logo`}
                    alt="League Logo"
                    size="sm"
                    shape="square"
                    className="bg-slate-900 border-slate-800 shadow-2xl"
                    fallbackType="league"
                />
                <div>
                    <h2 className="text-xl font-black uppercase italic tracking-tighter">{t('draft.lobby')}</h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{onlineCount} / {totalCount} {t('draft.gm_online')}</p>
                </div>
            </div>

            <div className="max-w-4xl w-full">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-8xl font-black text-white italic tracking-tighter uppercase leading-none mb-4 break-words">
                        {t('draft.waiting_room')}
                    </h1>
                    <div className="flex items-center justify-center gap-4">
                        <div className="h-px w-20 bg-slate-800"></div>
                        <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-xs">{t('draft.prepare_auction')}</p>
                        <div className="h-px w-20 bg-slate-800"></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
                    {draftState.teams.map(team => {
                        const isOnline = draftState.onlineParticipants?.includes(team.userId);
                        return (
                            <div key={team.userId} className={`relative p-5 rounded-3xl border transition-all duration-500 overflow-hidden ${isOnline ? 'bg-emerald-500/5 border-emerald-500/20 shadow-2xl shadow-emerald-900/10' : 'bg-slate-900 border-slate-800 opacity-40'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-slate-700'}`}></div>
                                    <div className="flex-1">
                                        <div className={`font-black uppercase italic tracking-tight ${isOnline ? 'text-white' : 'text-slate-500'}`}>{team.teamName}</div>
                                        <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{isOnline ? t('draft.connected') : t('draft.waiting')}</div>
                                    </div>
                                </div>
                                {isOnline && <div className="absolute -right-4 -bottom-4 p-4 opacity-5 text-emerald-500"><Wifi size={40} /></div>}
                            </div>
                        )
                    })}
                </div>

                <div className="flex flex-col items-center gap-10">
                    <div className="bg-slate-900/50 backdrop-blur-xl p-10 rounded-[3rem] border border-slate-800 text-center max-w-lg w-full shadow-2xl">
                        <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center text-blue-500 mb-6 mx-auto border border-white/5 shadow-inner">
                            {isAdmin ? <Mic size={32} className="animate-pulse" /> : <Lock size={32} />}
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">
                            {isAdmin ? t('draft.ready_launch') : t('draft.locked_commissioner')}
                        </h3>
                        <p className="text-slate-500 text-sm font-medium mb-8">
                            {isAdmin ? t('draft.start_instructions') : t('draft.wait_instructions')}
                        </p>

                        {isAdmin && (
                            <button
                                onClick={handleStartDraft}
                                className="w-full bg-blue-600 hover:bg-blue-550 border-t border-white/20 text-white font-black py-5 rounded-2xl shadow-[0_20px_40px_rgba(37,99,235,0.4)] transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 text-lg uppercase tracking-tighter italic"
                            >
                                <PlayCircle size={28} /> {t('draft.start_final_auction')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    // LIVE DRAFT VIEW
    const auctionRunning = draftState.currentPlayerId !== null;

    return (
        <div className="min-h-screen bg-slate-950 text-white p-2 md:p-4 flex flex-col font-sans pb-10">
            <SEO title="Asta Live" description="Partecipa all'asta in tempo reale." />

            {/* NEW PREMIUM HEADER */}
            <header className="flex flex-col md:flex-row justify-between items-center px-4 md:px-6 py-4 bg-slate-900 border border-white/5 shrink-0 rounded-[2rem] shadow-2xl mb-2 md:mb-4 relative z-50 gap-4 md:gap-0">
                <div className="flex items-center gap-4 w-full md:w-auto justify-center md:justify-start">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase italic leading-none">{t('draft.live_auction')}</h1>
                        <div className="flex items-center gap-2 mt-1 justify-center md:justify-start">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">{t('draft.global_sync')}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-end flex-wrap">
                    {isAdmin && (
                        <button
                            onClick={() => setShowAdminPanel(!showAdminPanel)}
                            className={`bg-slate-800 hover:bg-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 px-4 py-2 rounded-full border border-slate-700 flex items-center gap-2 transition-all shrink-0 ${showAdminPanel ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/20 bg-slate-900' : ''}`}
                        >
                            <Shield size={14} className="text-blue-400" /> {t('draft.commissioner_zone')}
                        </button>
                    )}

                    {myTeam && (
                        <div className="flex gap-2 md:gap-4 shrink-0">
                            <div className="bg-slate-950 border border-slate-800 px-3 md:px-5 py-2.5 rounded-2xl flex items-center gap-3 group shadow-inner">
                                <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400 hidden md:block">
                                    <DollarSign size={16} />
                                </div>
                                <div className="text-center md:text-right">
                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">{t('draft.rem_budget')}</p>
                                    <p className="text-sm md:text-lg font-black font-mono italic text-white leading-none">{myTeam.remainingBudget.toFixed(1)} M</p>
                                </div>
                            </div>
                            <div className="bg-slate-950 border border-slate-800 px-3 md:px-5 py-2.5 rounded-2xl flex items-center gap-3 shadow-inner">
                                <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400 hidden md:block">
                                    <Users size={16} />
                                </div>
                                <div className="text-center md:text-right">
                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">{t('draft.roster_size')}</p>
                                    <p className="text-sm md:text-lg font-black italic text-white leading-none">
                                        {myTeam.rosterCount}
                                        {leagueSettings && (
                                            <span className="text-[10px] text-slate-700 ml-1">
                                                / {(leagueSettings.roleLimitGuards || 0) + (leagueSettings.roleLimitForwards || 0) + (leagueSettings.roleLimitCenters || 0)}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {showAdminPanel && isAdmin && (
                <div className="mb-4 bg-slate-900/50 backdrop-blur-3xl border-2 border-dashed border-blue-900/30 rounded-[2rem] p-6 animate-in slide-in-from-top-4 duration-500 shadow-2xl relative z-40">
                    <h3 className="text-blue-500 font-black uppercase text-xs tracking-widest mb-4 flex items-center gap-2 italic">
                        <Shield size={16} /> {t('draft.supervisor_center')}
                    </h3>
                    <div className="flex flex-wrap gap-4">
                        <AdminAction
                            label={t('draft.pause_session')}
                            icon={<Lock size={14} />}
                            onClick={async () => {
                                if (await showConfirm({ title: t('draft.pause_draft_title'), message: t('draft.pause_draft_msg'), type: "confirm" }))
                                    await connection?.invoke("PauseDraft", parseInt(localStorage.getItem('selectedLeagueId')!));
                            }}
                        />
                        <AdminAction
                            label={t('draft.undo_pick')}
                            icon={<User size={14} />}
                            onClick={async () => {
                                if (await showConfirm({ title: t('draft.undo_pick_title'), message: t('draft.undo_pick_msg'), type: "confirm" }))
                                    await connection?.invoke("RemoveLastPick", parseInt(localStorage.getItem('selectedLeagueId')!));
                            }}
                        />
                        <button
                            onClick={async () => {
                                if (await showConfirm({ title: t('draft.force_stop_title'), message: t('draft.force_stop_msg'), type: "confirm" }))
                                    await connection?.invoke("ResetCurrentRound", parseInt(localStorage.getItem('selectedLeagueId')!));
                            }}
                            className="bg-red-500/10 hover:bg-red-500 border border-red-500/30 text-red-500 hover:text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ml-auto">
                            {t('draft.force_stop')}
                        </button>
                    </div>
                </div>
            )
            }

            {/* MOBILE TABS */}
            <div className="flex lg:hidden gap-2 mb-4">
                <button
                    onClick={() => setActiveTab('auction')}
                    className={`flex-1 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${activeTab === 'auction' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-900 text-slate-500'}`}
                >
                    {t('draft.auction_floor')}
                </button>
                <button
                    onClick={() => setActiveTab('rosters')}
                    className={`flex-1 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${activeTab === 'rosters' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-900 text-slate-500'}`}
                >
                    Team Rosters
                </button>
            </div>

            <div className={`flex flex-1 gap-6 ${auctionRunning ? '' : 'flex-col lg:flex-row'}`}>
                {/* LEFT: MAIN ACTION AREA */}
                <div className={`flex-[3] flex flex-col gap-6 ${activeTab === 'auction' ? 'flex' : 'hidden lg:flex'}`}>
                    <div className={`relative bg-slate-900 border rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center p-4 md:p-8 transition-all duration-700
                        ${timeLeft < 10 && auctionRunning ? 'border-red-500/40' : 'border-white/5'}`}>

                        {/* THE COURT / BACKGROUND LOGO */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
                            <Activity size={400} />
                        </div>

                        {timeLeft < 10 && auctionRunning && (
                            <div className="absolute inset-0 bg-red-600/5 animate-pulse pointer-events-none"></div>
                        )}

                        {auctionRunning ? (
                            <div className="text-center w-full max-w-3xl animate-in zoom-in duration-500 relative z-10">
                                <div className="mb-4 md:mb-10">
                                    <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-4 py-1 md:px-6 md:py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-[0.3em] inline-flex items-center gap-2 mb-2 md:mb-4">
                                        <Gavel size={12} className="md:w-[14px] md:h-[14px]" /> {t('draft.bid_in_progress')}
                                    </span>
                                    <h2 className="text-3xl md:text-6xl font-black text-white italic tracking-tighter uppercase leading-none drop-shadow-2xl px-2 break-words">
                                        {draftState.currentPlayerName}
                                    </h2>
                                </div>

                                <div className="grid grid-cols-3 gap-2 md:gap-6 mb-6 md:mb-12 px-2 md:px-0">
                                    <AuctionStat label={t('draft.current_bid')} value={draftState.currentBidTotal.toFixed(1)} sub={`x ${draftState.currentBidYears}Y`} color="emerald" />
                                    <AuctionStat label={t('draft.annual_avg')} value={draftState.currentBidYear1.toFixed(1)} sub={t('draft.calculated')} color="blue" />
                                    <AuctionStat label={t('draft.time_left')} value={`${timeLeft}s`} sub={t('draft.critical_time')} color={timeLeft < 10 ? "red" : "white"} />
                                </div>

                                <div className="bg-slate-950/80 backdrop-blur-md px-6 py-3 md:px-10 md:py-4 rounded-full inline-flex items-center gap-3 md:gap-4 mb-6 md:mb-12 border border-white/5 shadow-2xl max-w-full mx-auto">
                                    <span className="text-slate-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{t('draft.winning_bid')}</span>
                                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                        <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
                                            <User size={12} className="md:w-4 md:h-4" />
                                        </div>
                                        <span className="text-base md:text-xl font-black italic uppercase tracking-tight text-white truncate max-w-[150px] md:max-w-none">
                                            {draftState.teams.find(t => t.userId === draftState.highBidderId)?.teamName || draftState.highBidderName}
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-slate-950/90 backdrop-blur-3xl p-4 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-white/5 max-w-xl mx-auto shadow-2xl">
                                    <div className="flex flex-col md:flex-row gap-2 md:gap-4 mb-4 md:mb-6">
                                        <div className="relative flex-1 flex items-center">
                                            <div className="absolute left-3 md:left-4 z-10 text-emerald-500 font-black p-1.5 md:p-2 bg-emerald-500/10 rounded-lg">
                                                <DollarSign size={16} className="md:w-5 md:h-5" />
                                            </div>
                                            <input
                                                type="number"
                                                value={myBidAmount}
                                                onChange={e => setMyBidAmount(Number(e.target.value))}
                                                className="w-full bg-slate-900 border border-slate-800 group-hover:border-emerald-500/30 transition-colors rounded-xl md:rounded-2xl h-14 md:h-20 pl-12 md:pl-16 pr-4 md:pr-6 text-xl md:text-2xl text-white font-black italic focus:outline-none shadow-inner leading-none flex items-center"
                                            />
                                        </div>
                                        <div className="flex flex-row md:flex-col gap-2">
                                            {
                                                [1, 2, 3].map(y => (
                                                    <button
                                                        key={y}
                                                        onClick={() => setMyBidYears(y)}
                                                        className={`flex-1 md:flex-none px-3 py-2 md:px-5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black transition-all ${myBidYears === y ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'}`}
                                                    >
                                                        {y}Y
                                                    </button>
                                                ))
                                            }
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleBid}
                                        disabled={timeLeft <= 0}
                                        className="w-full py-4 md:py-6 bg-emerald-600 hover:bg-emerald-550 border-t border-white/20 active:scale-[0.98] disabled:opacity-30 rounded-xl md:rounded-2xl font-black text-lg md:text-xl uppercase italic tracking-tighter shadow-2xl transition-all"
                                    >
                                        {t('draft.place_bid')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in duration-500 max-w-4xl relative z-10">
                                <div className="text-center mb-2 shrink-0 hidden md:block">
                                    <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.3em] inline-flex items-center gap-2 mb-2">
                                        <Timer size={14} /> {t('draft.turn_transition')}
                                    </span>
                                    <h2 className={`text-5xl font-black uppercase italic tracking-tighter leading-none ${isMyTurn ? 'text-white' : 'text-slate-600'}`}>
                                        {isMyTurn ? t('draft.nomination_phase') : t('draft.waiting_scout')}
                                    </h2>
                                </div>

                                {
                                    isMyTurn ? (
                                        <div className="w-full flex-1 min-h-0 flex flex-col bg-slate-950/50 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
                                            <div className="p-4 md:p-6 border-b border-slate-800 flex flex-col gap-4 shrink-0">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">{t('draft.available_free_agents')}</h4>
                                                    <div className="flex items-center gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer group">
                                                            <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${hideUnaffordable ? 'bg-emerald-600' : 'bg-slate-800'}`} onClick={() => setHideUnaffordable(!hideUnaffordable)}>
                                                                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${hideUnaffordable ? 'translate-x-4' : 'translate-x-0'}`} />
                                                            </div>
                                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">{t('draft.hide_unaffordable')}</span>
                                                        </label>
                                                        <span className="text-[10px] font-black text-slate-600 bg-slate-900 px-2 py-1 rounded">
                                                            {filteredFreeAgents.length} {t('draft.found')}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                                                        <input
                                                            type="text"
                                                            placeholder={t('draft.search_player')}
                                                            value={searchTerm}
                                                            onChange={(e) => setSearchTerm(e.target.value)}
                                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-2 text-[10px] text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                                        />
                                                    </div>
                                                    <div className="w-32">
                                                        <PremiumSelect
                                                            value={positionFilter}
                                                            onChange={setPositionFilter}
                                                            options={[
                                                                { value: "", label: t('draft.all') },
                                                                { value: "G", label: "G" },
                                                                { value: "F", label: "F" },
                                                                { value: "C", label: "C" }
                                                            ]}
                                                            icon={<Users size={14} />}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-12 px-4 text-[9px] font-black text-slate-600 uppercase tracking-widest pt-2">
                                                    <div className="col-span-4 flex items-center gap-1 cursor-pointer hover:text-slate-400" onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                                                        {t('draft.name')} {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                    </div>
                                                    <div className="col-span-1 text-center flex items-center justify-center gap-1 cursor-pointer hover:text-slate-400" onClick={() => { setSortBy('position'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                                                        {t('draft.role')} {sortBy === 'position' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                    </div>
                                                    <div className="col-span-1 text-center flex items-center justify-center gap-1 cursor-pointer hover:text-slate-400" onClick={() => { setSortBy('basePrice'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                                                        PRICE {sortBy === 'basePrice' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                    </div>
                                                    <div className="col-span-1 text-center flex items-center justify-center gap-1 cursor-pointer hover:text-slate-400" onClick={() => { setSortBy('avgPoints'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                                                        PTS {sortBy === 'avgPoints' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                    </div>
                                                    <div className="col-span-1 text-center flex items-center justify-center gap-1 cursor-pointer hover:text-slate-400" onClick={() => { setSortBy('avgRebounds'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                                                        REB {sortBy === 'avgRebounds' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                    </div>
                                                    <div className="col-span-1 text-center flex items-center justify-center gap-1 cursor-pointer hover:text-slate-400" onClick={() => { setSortBy('avgAssists'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                                                        AST {sortBy === 'avgAssists' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                    </div>
                                                    <div className="col-span-3 text-right flex items-center justify-end gap-1 cursor-pointer hover:text-slate-400" onClick={() => { setSortBy('avgFantasyPoints'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                                                        FPTS {sortBy === 'avgFantasyPoints' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar min-h-0">
                                                {
                                                    visibleFreeAgents.map((p: any) => (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => {
                                                                if (p.isAffordable) {
                                                                    handleNominate(p);
                                                                } else {
                                                                    showAlert({ title: t('common.error'), message: t('common.insufficient_cap', { available: maxAvailableBid, needed: p.basePrice }), type: 'error' });
                                                                }
                                                            }}
                                                            className={`w-full group relative grid grid-cols-12 items-center p-3 gap-2 border transition-all rounded-xl ${p.isAffordable ? 'bg-slate-900/40 border-slate-800/50 hover:border-blue-500/30 hover:bg-slate-900 shadow-md' : 'bg-slate-950 border-slate-900 opacity-40 grayscale pointer-events-auto'}`}
                                                        >
                                                            <div className="col-span-4 flex items-center gap-3 min-w-0">
                                                                <div className="min-w-0 flex-1 text-left">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="font-black text-white uppercase italic tracking-tight text-xs leading-none truncate">{p.firstName} {p.lastName}</div>
                                                                        {p.injuryStatus && p.injuryStatus !== 'Active' && (
                                                                            <span className="shrink-0 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_5px_rgba(239,68,68,0.8)]" title={p.injuryStatus}></span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[8px] text-slate-600 font-bold uppercase tracking-widest mt-1 truncate">{p.nbaTeam}</div>
                                                                </div>
                                                            </div>
                                                            <div className="col-span-1 flex justify-center">
                                                                <div className={`w-7 h-7 rounded bg-slate-800 flex items-center justify-center font-black text-[9px] text-slate-400 transition-all ${p.isAffordable ? 'group-hover:bg-blue-600 group-hover:text-white' : ''}`}>
                                                                    {p.position || '-'}
                                                                </div>
                                                            </div>
                                                            <div className="col-span-1 text-center">
                                                                <span className={`text-[10px] font-mono font-black ${p.isAffordable ? 'text-emerald-500' : 'text-slate-600'}`}>{p.basePrice}M</span>
                                                            </div>
                                                            <div className="col-span-1 text-center">
                                                                <span className="text-[10px] font-black text-slate-400">{p.avgPoints?.toFixed(1) || '0.0'}</span>
                                                            </div>
                                                            <div className="col-span-1 text-center">
                                                                <span className="text-[10px] font-black text-slate-400">{p.avgRebounds?.toFixed(1) || '0.0'}</span>
                                                            </div>
                                                            <div className="col-span-1 text-center">
                                                                <span className="text-[10px] font-black text-slate-400">{p.avgAssists?.toFixed(1) || '0.0'}</span>
                                                            </div>
                                                            <div className="col-span-3 text-right">
                                                                <span className="text-[10px] font-black text-white">{p.avgFantasyPoints?.toFixed(1) || '0.0'}</span>
                                                            </div>

                                                            {!p.isAffordable && (
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                                    <span className="bg-red-600/90 text-white text-[8px] font-black uppercase px-2 py-1 rounded-full shadow-lg">Budget insufficiente</span>
                                                                </div>
                                                            )}
                                                        </button>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-6">
                                            <div className="relative">
                                                <div className="w-32 h-32 border-[10px] border-slate-900 rounded-full"></div>
                                                <div className="absolute inset-0 w-32 h-32 border-[10px] border-t-emerald-500 border-transparent rounded-full animate-spin"></div>
                                                <Mic size={40} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-700" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-black uppercase italic tracking-tighter text-slate-700">{t('draft.gm_choosing')}</p>
                                                <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] mt-2">{t('draft.scanning')}</p>
                                            </div>
                                        </div>
                                    )
                                }
                            </div >
                        )}
                    </div >
                </div >

                {/* RIGHT: LIVE ROSTER TRACKER */}
                <div className={`bg-slate-900 border border-white/5 rounded-[3rem] shadow-2xl flex flex-col overflow-hidden ${activeTab === 'rosters' ? 'flex w-full' : 'hidden lg:flex lg:w-96'}`}>
                    <div className="p-8 border-b border-slate-800 bg-slate-800/30">
                        <div className="flex items-center gap-3 mb-1">
                            <Users size={20} className="text-blue-500" />
                            <h3 className="font-black text-white uppercase italic tracking-tighter text-xl">{t('draft.gm_tracking')}</h3>
                        </div>
                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">{t('draft.live_budget_matrix')}</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {
                            draftState.teams.map((team) => {
                                const isOnline = draftState.onlineParticipants?.includes(team.userId);
                                const isExpanded = expandedTeamId === team.userId;
                                return (
                                    <div key={team.userId} className={`group rounded-[2rem] border transition-all duration-300 overflow-hidden shadow-lg ${team.userId === myId ? 'bg-emerald-500/5 border-emerald-500/20' : isExpanded ? 'bg-slate-800 border-slate-700' : 'bg-slate-950 border-slate-900 hover:border-slate-800'}`}>
                                        <div onClick={() => toggleTeamExpand(team.userId)} className="p-5 cursor-pointer flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] ${isOnline ? 'bg-emerald-500' : 'bg-slate-800 shadow-none'}`}></div>
                                                <div>
                                                    <div className={`font-black uppercase italic tracking-tight text-sm ${team.userId === myId ? 'text-emerald-400' : 'text-slate-100'}`}>{team.teamName}</div>
                                                    <div className="flex gap-3 text-[9px] font-black uppercase tracking-widest mt-1">
                                                        <span className="text-emerald-500/80">$ {team.remainingBudget.toFixed(1)}M</span>
                                                        <span className="text-slate-700">/</span>
                                                        <span className="text-blue-500/80">{team.rosterCount} PLY</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-500' : 'text-slate-700'}`}>
                                                <ChevronDown size={18} />
                                            </div>
                                        </div>
                                        {isExpanded && (
                                            <div className="bg-slate-950/50 p-4 border-t border-slate-800 mx-2 mb-2 rounded-[1.5rem]">
                                                {
                                                    team.players.length === 0 ? (
                                                        <div className="text-slate-700 italic text-[10px] px-2 py-4 text-center">{t('draft.no_players_acquired')}</div>
                                                    ) : (
                                                        <ul className="space-y-2">
                                                            {
                                                                team.players.map((p, idx) => {
                                                                    return (
                                                                        <li key={idx} className="bg-slate-900 border border-slate-800/50 px-3 py-2 rounded-xl flex justify-between items-center group/player hover:bg-slate-800 transition-colors">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-[9px] font-black w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-blue-500">{p.position}</span>
                                                                                <span className="text-[11px] font-black text-slate-300 uppercase italic tracking-tight">{p.name}</span>
                                                                            </div>
                                                                            <span className="text-[9px] font-mono font-black text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded-lg border border-emerald-500/10 shrink-0">{p.salary}M</span>
                                                                        </li >
                                                                    );
                                                                })
                                                            }
                                                        </ul >
                                                    )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                </div >
            </div >
            {draftState.currentPlayerId && (
                <BidModal
                    isOpen={isBidModalOpen}
                    player={freeAgents.find(p => p.id === draftState.currentPlayerId)}
                    onClose={() => setIsBidModalOpen(false)}
                    onSuccess={() => { }}
                    maxBid={maxAvailableBid}
                />
            )}

            <NominationModal
                isOpen={isNominationModalOpen}
                player={selectedPlayerForNomination}
                onClose={() => setIsNominationModalOpen(false)}
                onConfirm={handleConfirmNomination}
            />
        </div >
    );
}


function AuctionStat({ label, value, sub, color }: { label: string, value: string, sub: string, color: string }) {
    const colors: any = {
        emerald: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/20',
        blue: 'text-blue-500 bg-blue-500/5 border-blue-500/20',
        red: 'text-red-500 bg-red-500/10 border-red-500/30 animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.2)]',
        white: 'text-white bg-slate-800/50 border-white/5'
    };
    return (
        <div className={`p-2 md:p-6 rounded-2xl md:rounded-[2rem] border shadow-xl flex flex-col items-center justify-center transition-all ${colors[color]}`}>
            <span className="text-[7px] md:text-[9px] font-black uppercase tracking-[0.2em] mb-1 md:mb-2 opacity-50 text-center">{label}</span>
            <span className="text-xl md:text-4xl font-black italic tracking-tighter leading-none mb-1 shadow-glow">{value}</span>
            <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest opacity-40 text-center">{sub}</span>
        </div>
    );
}

function AdminAction({ label, icon, onClick }: { label: string, icon: any, onClick?: () => void }) {
    return (
        <button onClick={onClick} className="flex items-center gap-3 px-6 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:border-slate-700 transition-all">
            {icon} {label}
        </button>
    );
}