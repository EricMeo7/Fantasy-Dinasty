import { useEffect, useState, useRef } from 'react';
import { HubConnectionBuilder, HubConnection, LogLevel, HubConnectionState } from '@microsoft/signalr';
import { useAuth } from '@/hooks/useAuth';
import { useMyTeamInfo } from '../features/team/api/useMyTeamInfo';
import type { RookieDraftStateDto, RookieDraftDto } from '../features/draft/types/draft.types';
import DraftTimer from '../features/draft/components/DraftTimer';
import RookieList from '../features/draft/components/RookieList';
import toast from 'react-hot-toast';
import { ChevronRight, Users, PlayCircle, Loader2, Wifi, Lock, Mic, Shield, ChevronDown, TrendingUp } from 'lucide-react';
import LogoAvatar from '../components/LogoAvatar';
import { useTranslation } from 'react-i18next';
import { CONFIG } from '../config';
import SEO from '../components/SEO/SEO';
import api from '../services/api';
import { useModal } from '../context/ModalContext';

export default function RookieDraft() {
    const { t } = useTranslation();
    const { token } = useAuth();
    const { data: teamInfo } = useMyTeamInfo();
    const { showConfirm } = useModal();

    // State
    const [connection, setConnection] = useState<HubConnection | null>(null);
    const [draftState, setDraftState] = useState<RookieDraftStateDto | null>(null);
    const [rookies, setRookies] = useState<RookieDraftDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'board' | 'rosters'>('board');
    const isConnecting = useRef(false);

    const leagueId = teamInfo?.leagueId;

    useEffect(() => {
        if (!token || !leagueId || isConnecting.current) return;

        isConnecting.current = true;
        const newConnection = new HubConnectionBuilder()
            .withUrl(`${CONFIG.HUB_BASE_URL}/drafthub?leagueId=${leagueId}`, {
                accessTokenFactory: () => token
            })
            .configureLogging(LogLevel.Information)
            .withAutomaticReconnect()
            .build();

        setConnection(newConnection);

        return () => {
            newConnection.stop();
            isConnecting.current = false;
        };
    }, [token, leagueId]);

    useEffect(() => {
        if (connection && connection.state === HubConnectionState.Disconnected) {
            connection.start()
                .then(() => {
                    console.log('Connected to DraftHub (Rookie)');
                    connection.invoke('GetRookieDraftState', leagueId);
                    connection.invoke('GetAvailableRookies', leagueId);
                })
                .catch(e => console.error('Connection failed: ', e));

            connection.on('UpdateRookieDraftState', (state: RookieDraftStateDto) => {
                setDraftState(state);
                setIsLoading(false);
            });

            connection.on('UpdateAvailableRookies', (list: RookieDraftDto[]) => {
                setRookies(list);
            });

            connection.on('PlayerPicked', (payload: any) => {
                toast.success(`${payload.playerName} selected! ($${payload.salaryY1} x 3y)`, {
                    duration: 4000,
                    icon: '🏀'
                });
                setRookies(prev => prev.filter(p => p.id !== payload.playerId));
                if (payload.nextPick) {
                    setDraftState(prev => prev ? ({ ...prev, currentPick: payload.nextPick }) : null);
                } else {
                    setDraftState(prev => prev ? ({ ...prev, currentPick: undefined }) : null);
                }
            });

            connection.on('UpdateRookieBudgets', (update: { deltas: { u: string, b: number, r: number }[] }) => {
                setDraftState(prev => {
                    if (!prev) return prev;
                    const updatedTeams = prev.teams.map(team => {
                        const delta = update.deltas.find(d => d.u === team.userId);
                        if (delta) {
                            return {
                                ...team,
                                remainingBudget: delta.b,
                                rosterCount: delta.r
                            };
                        }
                        return team;
                    });
                    return { ...prev, teams: updatedTeams };
                });
            });

            connection.on('Error', (msg: string) => {
                toast.error(msg);
            });
        }
    }, [connection, leagueId]);

    const handleDraft = async (playerId: number) => {
        if (!connection) return;
        try {
            await connection.invoke('SelectRookie', playerId);
        } catch (err) {
            console.error(err);
            toast.error("Failed to draft player");
        }
    };

    const handleStartDraft = async () => {
        if (!leagueId) return;
        const ok = await showConfirm({
            title: t('draft.start_confirm_title'),
            message: t('draft.start_confirm_msg'),
            type: "confirm"
        });
        if (ok) {
            await connection?.invoke("StartRookieDraft", leagueId);
        }
    };

    if (isLoading && !draftState) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="animate-spin mb-6 text-blue-500" size={48} />
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-blue-400">{t('draft.initializing_engine')}</p>
            </div>
        );
    }

    if (!draftState) return null;

    const myId = teamInfo?.userId;
    const isMyTurn = draftState.currentPick?.teamId === teamInfo?.id;
    const isAdmin = teamInfo?.isAdmin;
    const onlineCount = draftState.onlineParticipants?.length || 0;
    const totalCount = draftState.teams?.length || 0;

    const toggleTeamExpand = (teamId: string) => {
        setExpandedTeamId(expandedTeamId === teamId ? null : teamId);
    };

    const handleUndoLast = () => {
        showConfirm({
            title: t('draft.undo_pick_confirm_title'),
            message: t('draft.undo_pick_confirm_msg'),
            type: "confirm"
        }).then(ok => ok && connection?.invoke("UndoRookiePick", leagueId));
    };

    const handleRepairPicks = async () => {
        try {
            await api.post(`/league/${leagueId}/rookie-draft/repair-picks`);
            toast.success(t('draft.repair_picks_success'));
            await connection?.invoke("GetRookieDraftState", leagueId);
        } catch (err: any) {
            toast.error(err.response?.data?.message || t('draft.repair_failed'));
        }
    };

    const handleCleanupRookies = async () => {
        try {
            await api.post(`/league/${leagueId}/rookie-draft/cleanup-rookies`);
            toast.success(t('draft.cleanup_rookies_success'));
            await connection?.invoke("GetAvailableRookies", leagueId);
        } catch (err: any) {
            toast.error(t('draft.cleanup_failed'));
        }
    };

    // LOBBY VIEW
    if (!draftState.isActive) {
        return (
            <div className="min-h-screen bg-slate-950 text-white p-6 relative flex flex-col items-center justify-center font-sans">
                <SEO title="Rookie Draft Lobby" description="Sala d'attesa per il draft rookie." />

                {/* Header Stats */}
                <div className="absolute top-8 left-8 flex items-center gap-4">
                    <LogoAvatar
                        src={`${CONFIG.API_BASE_URL}/league/${leagueId}/logo`}
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
                            <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-xs">WAR ROOM ACCESS</p>
                            <div className="h-px w-20 bg-slate-800"></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
                        {draftState.teams.map(team => {
                            const isOnline = draftState.onlineParticipants?.includes(team.userId);
                            return (
                                <div key={team.userId} className={`relative p-5 rounded-3xl border transition-all duration-500 overflow-hidden ${isOnline ? 'bg-blue-500/5 border-blue-500/20 shadow-2xl shadow-blue-900/10' : 'bg-slate-900 border-slate-800 opacity-40'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-blue-500 shadow-[0_0_15px_#3b82f6]' : 'bg-slate-700'}`}></div>
                                        <div className="flex-1">
                                            <div className={`font-black uppercase italic tracking-tight ${isOnline ? 'text-white' : 'text-slate-500'}`}>{team.teamName}</div>
                                            <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{isOnline ? t('draft.connected') : t('draft.waiting')}</div>
                                        </div>
                                    </div>
                                    {isOnline && <div className="absolute -right-4 -bottom-4 p-4 opacity-5 text-blue-500"><Wifi size={40} /></div>}
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
                                {isAdmin ? "Start the linear drafting sequence for this season." : t('draft.wait_instructions')}
                            </p>

                            {isAdmin && (
                                <button
                                    onClick={handleStartDraft}
                                    className="w-full bg-blue-600 hover:bg-blue-550 border-t border-white/20 text-white font-black py-5 rounded-2xl shadow-[0_20px_40px_rgba(37,99,235,0.4)] transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 text-lg uppercase tracking-tighter italic"
                                >
                                    <PlayCircle size={28} /> {t('draft.start_draft')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // LIVE DRAFT VIEW
    return (
        <div className="min-h-screen bg-slate-950 text-white p-2 md:p-4 flex flex-col font-sans pb-10">
            <SEO title="Rookie Draft Live" description="Partecipa al draft rookie in tempo reale." />

            {/* PREMIUM HEADER */}
            <header className="flex flex-col md:flex-row justify-between items-center px-4 md:px-6 py-4 bg-slate-900 border border-white/5 shrink-0 rounded-[2rem] shadow-2xl mb-2 md:mb-4 relative z-50 gap-4 md:gap-0">
                <div className="flex items-center gap-4 w-full md:w-auto justify-center md:justify-start">
                    <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase italic leading-none">Rookie Draft</h1>
                        <div className="flex items-center gap-2 mt-1 justify-center md:justify-start">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Live Board Synchronization</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-end flex-wrap">
                    {isAdmin && (
                        <div className="bg-slate-800/50 px-4 py-2 rounded-full border border-yellow-500/20 flex items-center gap-2">
                            <Shield size={14} className="text-yellow-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500">Commish Mode</span>
                        </div>
                    )}

                    {teamInfo && (
                        <div className="flex gap-2 md:gap-4 shrink-0">
                            <div className="bg-slate-950 border border-slate-800 px-3 md:px-5 py-2.5 rounded-2xl flex items-center gap-3 shadow-inner">
                                <Users size={16} className="text-blue-400" />
                                <div className="text-center md:text-right">
                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Your Team</p>
                                    <p className="text-sm md:text-lg font-black italic text-white leading-none truncate max-w-[120px]">{teamInfo.name}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* MOBILE TABS */}
            <div className="flex lg:hidden gap-2 mb-4">
                <button
                    onClick={() => setActiveTab('board')}
                    className={`flex-1 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${activeTab === 'board' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-900 text-slate-500'}`}
                >
                    Draft Board
                </button>
                <button
                    onClick={() => setActiveTab('rosters')}
                    className={`flex-1 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${activeTab === 'rosters' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-900 text-slate-500'}`}
                >
                    GM Tracking
                </button>
            </div>

            <div className={`flex flex-1 gap-6 ${activeTab === 'rosters' ? 'flex-col' : 'flex-col lg:flex-row'}`}>
                {/* LEFT: MAIN ACTION AREA */}
                <div className={`flex-[3] flex flex-col gap-6 ${activeTab === 'board' ? 'flex' : 'hidden lg:flex'}`}>

                    {/* CURRENT PICK HIGHLIGHT */}
                    {draftState.currentPick ? (
                        <div className="bg-slate-900 border border-blue-500/30 rounded-[3rem] p-6 md:p-8 relative overflow-hidden shadow-2xl shadow-blue-500/10">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[80px] rounded-full pointer-events-none" />
                            <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                                <DraftTimer deadline={draftState.currentPick.deadline} />
                                <div className="h-16 w-px bg-white/10 hidden md:block" />
                                <div className="flex-1 text-center md:text-left">
                                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-2">
                                        {t('draft.on_clock')} • {t('draft.pick_hash', { number: draftState.currentPick.pickNumber })}
                                    </div>
                                    <div className="flex items-center justify-center md:justify-start gap-4">
                                        <LogoAvatar alt={draftState.currentPick.teamName} fallbackType="team" className="w-14 h-14 border-2 border-white shadow-lg" />
                                        <div className="text-3xl md:text-5xl font-black text-white italic tracking-tighter leading-none">
                                            {draftState.currentPick.teamName}
                                        </div>
                                    </div>
                                </div>
                                {isMyTurn && (
                                    <div className="bg-blue-600 px-6 py-3 rounded-2xl animate-pulse shadow-lg shadow-blue-600/40">
                                        <span className="text-white font-black uppercase text-xs tracking-widest">{t('draft.your_turn_msg')}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-10 bg-slate-900 rounded-[3rem] border border-white/5 text-center">
                            <div className="text-2xl font-black text-slate-500 uppercase italic italic tracking-tighter">{t('draft.completed_paused')}</div>
                        </div>
                    )}

                    {/* ROOKIE POOL */}
                    <div className="flex-1 min-h-0">
                        <RookieList
                            rookies={rookies}
                            onDraft={handleDraft}
                            isMyTurn={!!isMyTurn}
                            isLoading={!draftState?.currentPick}
                        />
                    </div>
                </div>

                {/* RIGHT: TRACKER SIDEBAR */}
                <div className={`bg-slate-900 border border-white/5 rounded-[3rem] shadow-2xl flex flex-col overflow-hidden ${activeTab === 'rosters' ? 'flex w-full' : 'hidden lg:flex lg:w-96'}`}>
                    <div className="p-8 border-b border-slate-800 bg-slate-800/30">
                        <div className="flex items-center gap-3 mb-1">
                            <Users size={20} className="text-blue-500" />
                            <h3 className="font-black text-white uppercase italic tracking-tighter text-xl">GM Tracking</h3>
                        </div>
                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">REAL-TIME ROSTER AUDIT</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">

                        {/* COMMISSIONER ZONE */}
                        {isAdmin && (
                            <div className="mb-6 px-2">
                                <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Shield size={14} /> Commissioner Zone
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => connection?.invoke("PauseRookieDraft", leagueId)}
                                        className="bg-slate-950 border border-slate-800 hover:border-yellow-500/30 hover:bg-yellow-500/5 text-slate-400 hover:text-yellow-500 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Pause Draft
                                    </button>
                                    <button
                                        onClick={handleUndoLast}
                                        className="bg-slate-950 border border-slate-800 hover:border-red-500/30 hover:bg-red-500/5 text-slate-400 hover:text-red-500 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
                                    >
                                        {t('draft.undo_pick')}
                                    </button>
                                    <button
                                        onClick={handleRepairPicks}
                                        className="bg-yellow-600/10 border border-yellow-500/20 hover:bg-yellow-600/20 text-yellow-500 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all col-span-2"
                                    >
                                        {t('draft.repair_season_index')}
                                    </button>
                                    <button
                                        onClick={handleCleanupRookies}
                                        className="bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600/20 text-blue-400 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all col-span-2"
                                    >
                                        {t('draft.cleanup_vets')}
                                    </button>
                                </div>
                            </div>
                        )}
                        {/* UPCOMING PICKS PREVIEW */}
                        <div className="mb-6">
                            <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
                                <ChevronRight size={14} /> Next Up
                            </h4>
                            <div className="space-y-2">
                                {draftState.upcomingPicks.map((pick) => (
                                    <div key={pick.id} className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-2xl border border-white/5 mx-2">
                                        <div className="font-mono text-slate-600 text-[10px] font-black w-6">#{pick.pickNumber}</div>
                                        <LogoAvatar alt={pick.teamName} fallbackType="team" className="w-8 h-8 rounded-full" />
                                        <div className="text-[11px] font-black text-slate-400 truncate uppercase mt-0.5">{pick.teamName}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="h-px bg-slate-800 mx-4" />

                        {/* TEAMS LIST */}
                        <div className="space-y-3">
                            {draftState.teams.map((team) => {
                                const isOnline = draftState.onlineParticipants?.includes(team.userId);
                                const isExpanded = expandedTeamId === team.userId;
                                return (
                                    <div key={team.userId} className={`group rounded-[2rem] border transition-all duration-300 overflow-hidden shadow-lg ${team.userId === myId ? 'bg-blue-500/5 border-blue-500/20' : isExpanded ? 'bg-slate-800 border-slate-700' : 'bg-slate-950 border-slate-900 hover:border-slate-800'}`}>
                                        <div onClick={() => toggleTeamExpand(team.userId)} className="p-5 cursor-pointer flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] ${isOnline ? 'bg-blue-500' : 'bg-slate-800 shadow-none'}`}></div>
                                                <div>
                                                    <div className={`font-black uppercase italic tracking-tight text-sm ${team.userId === myId ? 'text-blue-400' : 'text-slate-100'}`}>{team.teamName}</div>
                                                    <div className="flex gap-3 text-[9px] font-black uppercase tracking-widest mt-1">
                                                        <span className="text-slate-500">{team.rosterCount} PLAYERS</span>
                                                        <span className="text-slate-800">/</span>
                                                        <span className="text-emerald-500">$ {team.remainingBudget.toFixed(1)}M</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-500' : 'text-slate-700'}`}>
                                                <ChevronDown size={18} />
                                            </div>
                                        </div>
                                        {isExpanded && (
                                            <div className="bg-slate-950/50 p-4 border-t border-slate-800 mx-2 mb-2 rounded-[1.5rem]">
                                                {team.players.length === 0 ? (
                                                    <div className="text-slate-700 italic text-[10px] px-2 py-4 text-center">No rookies acquired.</div>
                                                ) : (
                                                    <ul className="space-y-2">
                                                        {team.players.map((p, idx) => (
                                                            <li key={idx} className="bg-slate-900 border border-slate-800/50 px-3 py-2 rounded-xl flex justify-between items-center hover:bg-slate-800 transition-colors">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[9px] font-black w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-blue-500">{p.position}</span>
                                                                    <span className="text-[11px] font-black text-slate-300 uppercase italic tracking-tight">{p.name}</span>
                                                                </div>
                                                                <span className="text-[9px] font-mono font-black text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded-lg border border-emerald-500/10 shrink-0">{p.salary}M</span>
                                                            </li>
                                                        ))}
                                                    </ul>
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
        </div>
    );
}
