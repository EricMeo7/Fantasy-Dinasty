import { useEffect, useState, useRef } from 'react';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import api from '../services/api';
import { CONFIG } from '../config';
import { useNavigate } from 'react-router-dom';
import { Gavel, User, Mic, PlayCircle, Loader2, DollarSign, Users, ChevronDown, Lock, Shield, Wifi, Timer, Activity, TrendingUp, Search } from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { useTranslation } from 'react-i18next';

const HUB_URL = `${CONFIG.HUB_BASE_URL}/drafthub`;

interface TeamSummary {
    userId: string;
    teamName: string;
    remainingBudget: number;
    rosterCount: number;
    players: string[];
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
    bidEndTime: string;
    teams: TeamSummary[];
}

export default function LiveDraft() {
    const { t } = useTranslation();
    const [connection, setConnection] = useState<HubConnection | null>(null);
    const [draftState, setDraftState] = useState<DraftState | null>(null);
    const [freeAgents, setFreeAgents] = useState<any[]>([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [myBidAmount, setMyBidAmount] = useState<number>(0);
    const [myBidYears, setMyBidYears] = useState<number>(1);
    const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showAdminPanel, setShowAdminPanel] = useState(false);

    const toggleTeamExpand = (teamId: string) => {
        setExpandedTeamId(expandedTeamId === teamId ? null : teamId);
    };

    const navigate = useNavigate();
    const { showAlert, showConfirm } = useModal();
    const isConnecting = useRef(false);

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

            connection.on('PlayerSold', (data: any) => showAlert({ title: t('draft.sold'), message: `${data.playerName} ${t('draft.sold_to')} ${data.winner}`, type: 'success' }));
            connection.on('Error', (msg: string) => showAlert({ title: t('common.error'), message: msg, type: 'error' }));
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

    const handleNominate = async (player: any) => {
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
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-400">Inizializzazione Draft Engine...</p>
        </div>
    );

    const onlineCount = draftState.onlineParticipants?.length || 0;
    const totalCount = draftState.teams.length;

    // LOBBY VIEW
    if (!draftState.isActive) return (
        <div className="min-h-screen bg-slate-950 text-white p-6 relative flex flex-col items-center justify-center">
            {/* Header / Stats Overlay */}
            <div className="absolute top-8 left-8 flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-blue-500">
                    <Shield size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-black uppercase italic tracking-tighter">Draft Lobby</h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{onlineCount} / {totalCount} GM ONLINE</p>
                </div>
            </div>

            <div className="max-w-4xl w-full">
                <div className="text-center mb-16">
                    <h1 className="text-6xl md:text-8xl font-black text-white italic tracking-tighter uppercase leading-none mb-4">
                        Waiting Room
                    </h1>
                    <div className="flex items-center justify-center gap-4">
                        <div className="h-px w-20 bg-slate-800"></div>
                        <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-xs">Prepare for the auction</p>
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
                                        <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{isOnline ? 'CONNECTED' : 'WAITING...'}</div>
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
                            {isAdmin ? 'Ready to launch?' : 'Locked by Commissioner'}
                        </h3>
                        <p className="text-slate-500 text-sm font-medium mb-8">
                            {isAdmin ? "The draft will begin as soon as you press start. Ensure all participants have their rosters ready." : "Please wait while the commissioner prepares the draft board and confirms participants arrivals."}
                        </p>

                        {isAdmin && (
                            <button
                                onClick={handleStartDraft}
                                className="w-full bg-blue-600 hover:bg-blue-550 border-t border-white/20 text-white font-black py-5 rounded-2xl shadow-[0_20px_40px_rgba(37,99,235,0.4)] transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 text-lg uppercase tracking-tighter italic"
                            >
                                <PlayCircle size={28} /> Start Final Auction
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    // LIVE DRAFT VIEW
    const auctionRunning = draftState.currentPlayerId !== null;
    const myTeam = draftState.teams.find(t => t.userId === myId);

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 flex flex-col h-screen overflow-hidden font-sans">

            {/* NEW PREMIUM HEADER */}
            <header className="flex justify-between items-center px-6 py-4 bg-slate-900 border border-white/5 shrink-0 rounded-[2rem] shadow-2xl mb-4 relative z-50">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none">Live <span className="text-emerald-500">Auction</span></h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Global Sync Active</span>
                        </div>
                    </div>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => setShowAdminPanel(!showAdminPanel)}
                        className={`bg-slate-800 hover:bg-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 px-6 py-2 rounded-full border border-slate-700 flex items-center gap-2 transition-all ${showAdminPanel ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/20 bg-slate-900' : ''}`}
                    >
                        <Shield size={14} className="text-blue-400" /> Commissioner Zone
                    </button>
                )}

                {myTeam && (
                    <div className="flex gap-4">
                        <div className="bg-slate-950 border border-slate-800 px-5 py-2.5 rounded-2xl flex items-center gap-3 group shadow-inner">
                            <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                                <DollarSign size={16} />
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Rem. Budget</p>
                                <p className="text-lg font-black font-mono italic text-white leading-none">{myTeam.remainingBudget.toFixed(1)} M</p>
                            </div>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 px-5 py-2.5 rounded-2xl flex items-center gap-3 shadow-inner">
                            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
                                <Users size={16} />
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Roster Size</p>
                                <p className="text-lg font-black italic text-white leading-none">{myTeam.rosterCount} <span className="text-xs">/ 12</span></p>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {showAdminPanel && isAdmin && (
                <div className="mb-4 bg-slate-900/50 backdrop-blur-3xl border-2 border-dashed border-blue-900/30 rounded-[2rem] p-6 animate-in slide-in-from-top-4 duration-500 shadow-2xl relative z-40">
                    <h3 className="text-blue-500 font-black uppercase text-xs tracking-widest mb-4 flex items-center gap-2 italic">
                        <Shield size={16} /> Supervisor Command Center
                    </h3>
                    <div className="flex flex-wrap gap-4">
                        <AdminAction
                            label="Pause Session"
                            icon={<Lock size={14} />}
                            onClick={async () => {
                                if (await showConfirm({ title: "Pause Draft?", message: "This will return everyone to the lobby.", type: "confirm" }))
                                    await connection?.invoke("PauseDraft", parseInt(localStorage.getItem('selectedLeagueId')!));
                            }}
                        />
                        <AdminAction
                            label="Undo Pick"
                            icon={<User size={14} />}
                            onClick={async () => {
                                if (await showConfirm({ title: "Undo Last Pick?", message: "This will remove the last sold player and refund budget.", type: "confirm" }))
                                    await connection?.invoke("RemoveLastPick", parseInt(localStorage.getItem('selectedLeagueId')!));
                            }}
                        />
                        <button
                            onClick={async () => {
                                if (await showConfirm({ title: "Force Stop?", message: "Current bid will be cancelled.", type: "confirm" }))
                                    await connection?.invoke("ResetCurrentRound", parseInt(localStorage.getItem('selectedLeagueId')!));
                            }}
                            className="bg-red-500/10 hover:bg-red-500 border border-red-500/30 text-red-500 hover:text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ml-auto">
                            Force Stop & Reset
                        </button>
                    </div>
                </div>
            )
            }

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* LEFT: MAIN ACTION AREA */}
                <div className="flex-[3] flex flex-col gap-6">
                    <div className={`relative flex-1 bg-slate-900 border rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center p-12 transition-all duration-700 overflow-hidden
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
                                <div className="mb-10">
                                    <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.3em] inline-flex items-center gap-2 mb-4">
                                        <Gavel size={14} /> Bid in Progress
                                    </span>
                                    <h2 className="text-6xl md:text-8xl font-black text-white italic tracking-tighter uppercase leading-none drop-shadow-2xl">
                                        {draftState.currentPlayerName}
                                    </h2>
                                </div>

                                <div className="grid grid-cols-3 gap-6 mb-12">
                                    <AuctionStat label="Current Bid" value={draftState.currentBidTotal.toFixed(1)} sub={`x ${draftState.currentBidYears}Y`} color="emerald" />
                                    <AuctionStat label="Annual Avg" value={draftState.currentBidYear1.toFixed(1)} sub="Calculated" color="blue" />
                                    <AuctionStat label="Time Left" value={`${timeLeft}s`} sub="Critical Time" color={timeLeft < 10 ? "red" : "white"} />
                                </div>

                                <div className="bg-slate-950/80 backdrop-blur-md px-10 py-4 rounded-full inline-flex items-center gap-4 mb-12 border border-white/5 shadow-2xl">
                                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Winning Bid</span>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                                            <User size={16} />
                                        </div>
                                        <span className="text-xl font-black italic uppercase tracking-tight text-white">{draftState.highBidderName}</span>
                                    </div>
                                </div>

                                <div className="bg-slate-950/90 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/5 max-w-xl mx-auto shadow-2xl">
                                    <div className="flex gap-4 mb-6">
                                        <div className="relative flex-1 group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-black p-2 bg-emerald-500/10 rounded-lg">
                                                <DollarSign size={20} />
                                            </div>
                                            <input
                                                type="number"
                                                value={myBidAmount}
                                                onChange={e => setMyBidAmount(Number(e.target.value))}
                                                className="w-full bg-slate-900 border border-slate-800 group-hover:border-emerald-500/30 transition-colors rounded-2xl py-6 pl-16 pr-6 text-2xl text-white font-black italic focus:outline-none shadow-inner"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {
                                                [1, 2, 3].map(y => (
                                                    <button
                                                        key={y}
                                                        onClick={() => setMyBidYears(y)}
                                                        className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${myBidYears === y ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'}`}
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
                                        className="w-full py-6 bg-emerald-600 hover:bg-emerald-550 border-t border-white/20 active:scale-[0.98] disabled:opacity-30 rounded-2xl font-black text-xl uppercase italic tracking-tighter shadow-2xl transition-all"
                                    >
                                        Place Secure Bid
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in duration-500 max-w-4xl relative z-10">
                                <div className="text-center mb-10">
                                    <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.3em] inline-flex items-center gap-2 mb-4">
                                        <Timer size={14} /> Turn Transition
                                    </span>
                                    <h2 className={`text-5xl md:text-6xl font-black uppercase italic tracking-tighter leading-none ${isMyTurn ? 'text-white' : 'text-slate-600'}`}>
                                        {isMyTurn ? 'Nomination Phase' : 'Waiting for Scout'}
                                    </h2>
                                </div>

                                {
                                    isMyTurn ? (
                                        <div className="w-full flex-1 overflow-hidden flex flex-col bg-slate-950/50 rounded-[2.5rem] border border-white/5 shadow-2xl">
                                            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                                                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Available Free Agents</h4>
                                                <div className="relative w-64">
                                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                                                    <input type="text" placeholder="Search player..." className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 pl-9 pr-2 text-[10px] text-white focus:outline-none" />
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                                {
                                                    freeAgents.map(p => (
                                                        <div key={p.id} className="group relative flex items-center justify-between p-4 bg-slate-900/50 border border-transparent hover:border-blue-500/30 hover:bg-slate-900 transition-all rounded-[1.5rem] shadow-lg">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center font-black text-xs text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all">{p.position}</div>
                                                                <div>
                                                                    <div className="font-black text-white uppercase italic tracking-tight text-lg leading-none">{p.firstName} {p.lastName}</div>
                                                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{p.nbaTeam} <span className="text-slate-700 mx-1">•</span> <span className="text-emerald-500">Base: {Math.max(1, p.minBid || Math.round(p.avgPoints || 1))} M</span></div>
                                                                </div>
                                                            </div>
                                                            <button onClick={() => handleNominate(p)} className="bg-blue-600 hover:bg-blue-550 text-white font-black px-6 py-3 rounded-xl text-[10px] uppercase tracking-widest shadow-xl transition-all">
                                                                Nominate
                                                            </button>
                                                        </div>
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
                                                <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] mt-2">Scanning Roster Desires...</p>
                                            </div>
                                        </div>
                                    )}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: LIVE ROSTER TRACKER */}
                <div className="w-96 bg-slate-900 border border-white/5 rounded-[3rem] shadow-2xl flex flex-col overflow-hidden">
                    <div className="p-8 border-b border-slate-800 bg-slate-800/30">
                        <div className="flex items-center gap-3 mb-1">
                            <Users size={20} className="text-blue-500" />
                            <h3 className="font-black text-white uppercase italic tracking-tighter text-xl">Gm Tracking</h3>
                        </div>
                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Live Budget & Roster Matrix</p>
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
                                                        <div className="text-slate-700 italic text-[10px] px-2 py-4 text-center">No players acquired yet.</div>
                                                    ) : (
                                                        <ul className="space-y-2">
                                                            {
                                                                team.players.map((p, idx) => {
                                                                    const [name, cap] = p.split(' (');
                                                                    return (
                                                                        <li key={idx} className="bg-slate-900 border border-slate-800/50 px-3 py-2 rounded-xl flex justify-between items-center">
                                                                            <span className="text-[11px] font-black text-slate-300 uppercase italic tracking-tight">{name}</span>
                                                                            <span className="text-[9px] font-mono font-black text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded-lg border border-emerald-500/10 shrink-0">{cap.replace(')', '')}</span>
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
                </div>
            </div>
        </div>
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
        <div className={`p-6 rounded-[2rem] border shadow-xl flex flex-col items-center justify-center transition-all ${colors[color]}`}>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] mb-2 opacity-50">{label}</span>
            <span className="text-4xl font-black italic tracking-tighter leading-none mb-1 shadow-glow">{value}</span>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-40">{sub}</span>
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