import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import {
    ArrowLeft, X, Activity, Loader2, Shirt, Plus,
    ChevronUp, ChevronDown, Lock, CalendarOff
} from 'lucide-react';
import { useModal } from '../context/ModalContext';
import GameStatsModal from '../components/GameStatsModal';
import { useTranslation } from 'react-i18next';
import { CONFIG } from '../config';
import api from '../services/api';
import SEO from '../components/SEO/SEO';

// Features / API
import { useMatchDetails } from '../features/league/api/useMatchDetails';
import { useDailyLineup, useSaveLineup, type DailyPlayer } from '../features/lineup/api/useDailyLineup';
import { useMyTeamInfo } from '../features/team/api/useMyTeamInfo';

const STARTER_SLOTS = ['PG', 'SG', 'SF', 'PF', 'C'];

export default function Matchup() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { matchId } = useParams();
    const queryClient = useQueryClient();
    const { showAlert } = useModal();

    // 1. DATA FETCHING (React Query)
    const { data: myTeam } = useMyTeamInfo();
    const { data: matchup, isLoading: loadingMatch } = useMatchDetails(matchId ? parseInt(matchId) : undefined);

    // States for selection
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [viewingTeamId, setViewingTeamId] = useState<number | null>(null);

    // Initialization of selection
    // Date Initialization
    useEffect(() => {
        if (matchup && !selectedDate) {
            const start = new Date(matchup.weekStartDate);
            const end = new Date(matchup.weekEndDate);
            const today = new Date();

            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);

            if (today >= start && today <= end) {
                setSelectedDate(today);
            } else {
                setSelectedDate(start);
            }
        }
    }, [matchup, selectedDate]);

    // Team Initialization / Auto-Switch on User Change
    useEffect(() => {
        if (matchup && myTeam) {
            // Should we switch?
            // If I am Home, switch to Home. If I am Away, switch to Away.
            // This runs on mount AND when myTeam updates (User Switch).
            if (matchup.homeUserId === myTeam.userId) {
                setViewingTeamId(matchup.homeTeamId);
            } else if (matchup.awayUserId === myTeam.userId) {
                setViewingTeamId(matchup.awayTeamId);
            } else if (!viewingTeamId) {
                // Not playing, default to Home if not set
                setViewingTeamId(matchup.homeTeamId);
            }
        } else if (matchup && !viewingTeamId) {
            setViewingTeamId(matchup.homeTeamId);
        }
    }, [matchup, myTeam?.userId, myTeam?.id]); // Depend on ID changes to trigger reset

    // Helper for formatting
    const formatDateIso = (date: Date) => {
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().split('T')[0];
    };

    const dateStr = selectedDate ? formatDateIso(selectedDate) : '';
    const { data: rosterRaw = [], isLoading: loadingLineup } = useDailyLineup(dateStr, viewingTeamId?.toString());
    const { data: lockStatus } = useQuery({
        queryKey: ['lineupStatus', dateStr],
        queryFn: () => api.lineup.getStatus(dateStr).then(r => r.data),
        enabled: !!dateStr
    });

    const saveMutation = useSaveLineup();

    // Local roster state for optimistic updates / drag-drop
    // Actually we can keep it purely derived from query data if we want, 
    // but the complex swap logic might benefit from a local state.
    // However, to keep it clean, I'll try to use mutateAsync and invalidation.
    // The previous implementation used a local state for roster. 
    // I'll keep a local state that syncs with query data to allow snappy UX.
    const [roster, setRoster] = useState<DailyPlayer[]>([]);
    useEffect(() => {
        if (rosterRaw.length > 0) setRoster(rosterRaw);
    }, [rosterRaw]);

    // 2. SIGNALR CONNECTION
    useEffect(() => {
        if (!matchup?.id) return;
        let isStopped = false;

        const connection = new HubConnectionBuilder()
            .withUrl(`${CONFIG.HUB_BASE_URL}/matchuphub`)
            .withAutomaticReconnect()
            .configureLogging(LogLevel.Warning)
            .build();

        const startConnection = async () => {
            try {
                await connection.start();
                if (isStopped) {
                    await connection.stop();
                    return;
                }
                console.log("SignalR Connected");
            } catch (err) {
                if (!isStopped) {
                    console.error("SignalR Connection Error: ", err);
                }
            }
        };

        startConnection();

        connection.on("ReceiveScoreUpdate", () => {
            queryClient.invalidateQueries({ queryKey: ['match-details'] });
            queryClient.invalidateQueries({ queryKey: ['lineup'] });
        });

        return () => {
            isStopped = true;
            if (connection.state === "Connected") {
                connection.stop();
            }
        };
    }, [matchup?.id, queryClient]);

    // 3. LOGICA PERMESSI
    const isReadOnly = useMemo(() => {
        if (!myTeam || !viewingTeamId || !selectedDate) return true;

        // 1. Basic Owner Check
        if (myTeam.id !== viewingTeamId) return true;

        // 2. Server-side Lock Check
        if (lockStatus?.isLocked) return true;

        // 3. Time/Date Locking Logic (Fallback/Local)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const selected = new Date(selectedDate);
        selected.setHours(0, 0, 0, 0);

        // Past days are strictly locked
        if (selected < today) return true;

        // Today: Lock if ANY game has started (Client-side fallback)
        if (selected.getTime() === today.getTime()) {
            // Redundant if server status works, but safe to keep
            // Check roster for active/finished games
            const anyGameStarted = roster.some(p => {
                if (!p.hasGame) return false;
                const status = (p.gameTime || "").toUpperCase();
                return status.includes("FINAL") || status.includes("Q") || status.includes("HALF") || status.includes("OT") || status.includes("END");
            });
            if (anyGameStarted) return true;
        }

        return false;
    }, [myTeam, viewingTeamId, selectedDate, roster, lockStatus]);

    const weekDays = useMemo(() => {
        if (!matchup) return [];
        const start = new Date(matchup.weekStartDate);
        const end = new Date(matchup.weekEndDate);

        // Calculate difference in days (inclusive)
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const days = [];
        // Loop for inclusive range (0 to diffDays)
        for (let i = 0; i <= diffDays; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            days.push(d);
        }
        return days;
    }, [matchup]);

    // MODAL STATS
    const [statsPlayer, setStatsPlayer] = useState<DailyPlayer | null>(null);
    const [isStatsOpen, setIsStatsOpen] = useState(false);
    const [showBenchForSlot, setShowBenchForSlot] = useState<string | null>(null);

    const [isWeeklyRecapOpen, setIsWeeklyRecapOpen] = useState(false);

    // --- LOGICA GESTIONE SQUADRA ---
    const isRoleCompatible = (slot: string, playerPos: string) => {
        const pPos = playerPos.trim().toUpperCase();
        if (slot === 'PG' || slot === 'SG') return pPos.includes('G') || pPos === 'PG' || pPos === 'SG';
        if (slot === 'SF' || slot === 'PF') return pPos.includes('F') || pPos === 'SF' || pPos === 'PF';
        if (slot === 'C') return pPos.includes('C');
        return false;
    };

    // Explicit assigned map derived from ROSTER state (which contains persisted 'slot' info)
    const assignedMap = useMemo(() => {
        const assigned: Record<string, DailyPlayer | undefined> = {};
        const starters = roster.filter(p => p.isStarter);

        // Priority 1: Players with explicit valid slot assignment
        starters.forEach(p => {
            if (p.slot && STARTER_SLOTS.includes(p.slot)) {
                assigned[p.slot] = p;
            }
        });

        // Priority 2: Auto-fill logic for legacy/fallback (Only if slot is empty or invalid)
        // This is tricky. If we rely on explicit slot, we should trust it. 
        // If data comes freshly with empty slots (fallback), we might auto-assign.
        // But auto-assignment needs to update the ROSTER state so we can save it explicitly.
        // For now, let's trust explicit slot. If missing, maybe they show up in bench or weird state?
        // Let's implement a "Healing" pass? 
        // No, let's keep it simple: If p.isStarter but p.slot is valid, trust it.
        // If p.isStarter but p.slot is invalid/missing, try to auto-assign for DISPLAY but likely won't save correctly unless moved.
        // Let's rely on explicit slot.
        return assigned;
    }, [roster]);

    const saveLineup = async (newRoster: DailyPlayer[]) => {
        if (isReadOnly || !selectedDate) return;

        setRoster([...newRoster]); // Optimistic

        // Build explicit Slot Map
        const starterSlots: Record<string, number> = {};
        newRoster.filter(p => p.isStarter).forEach(p => {
            if (p.slot) starterSlots[p.slot] = p.playerId;
        });

        const bench = newRoster.filter(p => !p.isStarter)
            .sort((a, b) => (a.benchOrder || 99) - (b.benchOrder || 99))
            .map(p => p.playerId);

        try {
            await saveMutation.mutateAsync({
                date: formatDateIso(selectedDate),
                starterSlots, // Send Map
                bench
            });
        } catch (e: any) {
            const msg = e.response?.data?.message || e.response?.data || t('matchup.save_failed');
            showAlert({ title: t('common.error'), message: msg, type: 'error' });
        }
    };

    const handleRemoveStarter = (player: DailyPlayer) => {
        const maxOrder = Math.max(...roster.filter(p => !p.isStarter).map(p => p.benchOrder || 0), 0);
        const newRoster = roster.map(p => p.playerId === player.playerId ? { ...p, isStarter: false, slot: 'BN', benchOrder: maxOrder + 1 } : p);
        saveLineup(newRoster);
    };

    const handleSelectPlayer = (playerIn: DailyPlayer) => {
        if (!showBenchForSlot) return;
        let newRoster = [...roster];

        // Target explicit slot
        const targetSlot = showBenchForSlot;

        // 1. CLEAR THE SLOT: Find ANYONE currently claiming this slot (even if Limbo/DoubleBooked) and bench them
        // This is more robust than using assignedMap which might hide data issues.
        let maxBenchOrder = Math.max(...newRoster.filter(p => !p.isStarter).map(p => p.benchOrder || 0), 0);

        newRoster = newRoster.map(p => {
            if (p.isStarter && p.slot === targetSlot) {
                maxBenchOrder++;
                return { ...p, isStarter: false, slot: 'BN', benchOrder: maxBenchOrder };
            }
            return p;
        });

        // 2. ASSIGN NEW PLAYER
        newRoster = newRoster.map(p => p.playerId === playerIn.playerId
            ? { ...p, isStarter: true, slot: targetSlot, benchOrder: 0 }
            : p);

        setShowBenchForSlot(null);
        saveLineup(newRoster);
    };

    const handleReorderBench = (player: DailyPlayer, direction: 'up' | 'down') => {
        const bench = roster.filter(p => !p.isStarter).sort((a, b) => (a.benchOrder || 99) - (b.benchOrder || 99));
        const index = bench.findIndex(p => p.playerId === player.playerId);
        if (index === -1) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === bench.length - 1) return;

        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [bench[index], bench[swapIndex]] = [bench[swapIndex], bench[index]];
        bench.forEach((p, idx) => p.benchOrder = idx + 1);

        const starters = roster.filter(p => p.isStarter);
        saveLineup([...starters, ...bench]);
    };

    const handleOpenStats = (p: DailyPlayer) => {
        setStatsPlayer(p);
        setIsStatsOpen(true);
    };

    const dailyTotal = roster.filter(p => p.isStarter).reduce((sum, p) => sum + (p.realPoints || 0), 0);
    const allBench = roster.filter(p => !p.isStarter).sort((a, b) => (a.benchOrder || 99) - (b.benchOrder || 99));

    if (loadingMatch) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="font-mono text-xs uppercase tracking-widest">{t('matchup.entering_court')}</p>
        </div>
    );

    if (!matchup) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
            <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl border border-slate-800 animate-in zoom-in duration-500">
                <CalendarOff size={40} className="text-slate-600" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-3">{t('matchup.no_schedule_title')}</h2>
            <p className="text-sm font-bold text-slate-500 max-w-xs leading-relaxed uppercase tracking-wide">
                {t('matchup.no_schedule_desc')}
            </p>
            <button onClick={() => navigate('/dashboard')} className="mt-8 px-10 py-4 bg-slate-900 border border-slate-700 hover:border-emerald-500 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all shadow-lg hover:shadow-emerald-500/10 active:scale-95 flex items-center gap-2 group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                {t('matchup.return_dashboard')}
            </button>
        </div>
    );

    if (!selectedDate) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="font-mono text-xs uppercase tracking-widest">{t('matchup.entering_court')}</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans pb-20">
            <SEO title={t('matchup.title')} description={t('matchup.seo_description')} />
            <div className="max-w-4xl mx-auto">
                <GameStatsModal player={statsPlayer} isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} />
                <WeeklyRecapModal
                    isOpen={isWeeklyRecapOpen}
                    onClose={() => setIsWeeklyRecapOpen(false)}
                    players={viewingTeamId === matchup.homeTeamId ? matchup.homePlayers : matchup.awayPlayers}
                    teamName={viewingTeamId === matchup.homeTeamId ? matchup.homeTeam : matchup.awayTeam}
                />

                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex justify-between items-center">
                        <button onClick={() => navigate('/matches')} className="flex items-center text-slate-500 hover:text-white font-bold uppercase text-xs tracking-widest transition-colors group">
                            <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> {t('navbar.calendar')}
                        </button>
                        <div className="text-right">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">{t('dashboard.daily_score')}</span>
                            <span className="text-3xl font-black text-emerald-400">{dailyTotal.toFixed(1)}</span>
                            <button onClick={() => setIsWeeklyRecapOpen(true)} className="block ml-auto mt-1 text-[9px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest underline decoration-blue-500/30 hover:decoration-blue-400 transition-all">
                                {t('matchup.weekly_recap')}
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-center bg-slate-900 p-1 rounded-2xl border border-slate-800 self-center shadow-2xl">
                        <button
                            onClick={() => setViewingTeamId(matchup.homeTeamId)}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${viewingTeamId === matchup.homeTeamId ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-950/50 flex-shrink-0">
                                <img
                                    src={`${CONFIG.API_BASE_URL}/team/${matchup.homeTeamId}/logo?t=${new Date().getTime()}`}
                                    alt={matchup.homeTeam}
                                    className="w-full h-full object-cover"
                                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                />
                            </div>
                            <span>{matchup.homeTeam} {myTeam?.id === matchup.homeTeamId && ` (${t('league.you')})`}</span>
                        </button>
                        <button
                            onClick={() => setViewingTeamId(matchup.awayTeamId)}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${viewingTeamId === matchup.awayTeamId ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-950/50 flex-shrink-0">
                                <img
                                    src={`${CONFIG.API_BASE_URL}/team/${matchup.awayTeamId}/logo?t=${new Date().getTime()}`}
                                    alt={matchup.awayTeam}
                                    className="w-full h-full object-cover"
                                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                />
                            </div>
                            <span>{matchup.awayTeam} {myTeam?.id === matchup.awayTeamId && ` (${t('league.you')})`}</span>
                        </button>
                    </div>

                    {/* Timer Alert */}
                    {!isReadOnly && lockStatus?.lockTime && !lockStatus.isLocked && (
                        <div className="flex justify-center mt-2 animate-in fade-in slide-in-from-top-2">
                            <LineupTimer targetDate={new Date(lockStatus.lockTime)} />
                        </div>
                    )}

                    {isReadOnly && (
                        <div className="flex items-center justify-center gap-3 text-amber-500 bg-amber-500/5 p-3 rounded-2xl border border-amber-500/20 text-[10px] font-black uppercase tracking-[0.2em]">
                            <Lock size={14} /> {t('matchup.read_only')}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-7 gap-2 mb-8">
                    {weekDays.map((day, idx) => {
                        const isSelected = day.toDateString() === selectedDate.toDateString();
                        const isToday = day.toDateString() === new Date().toDateString();
                        return (
                            <button key={idx} onClick={() => setSelectedDate(day)} className={`relative flex flex-col items-center justify-center py-4 rounded-2xl border transition-all duration-300 ${isSelected ? 'bg-blue-600 border-blue-400 text-white shadow-xl scale-105 z-10' : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800 hover:border-slate-700'}`}>
                                <span className="text-[9px] font-black uppercase tracking-widest">{day.toLocaleDateString(undefined, { weekday: 'short' }).replace('.', '')}</span>
                                <span className="text-xl font-black my-1 italic">{day.getDate()}</span>
                                {isToday && <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>}
                            </button>
                        )
                    })}
                </div>

                {loadingLineup ? (
                    <div className="h-[500px] flex flex-col items-center justify-center bg-slate-900/30 rounded-[3rem] border-2 border-slate-800 border-dashed mb-10">
                        <Activity className="animate-spin mb-4 text-blue-500" size={48} />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{t('matchup.preparing_court')}</span>
                    </div>
                ) : (
                    <div className="relative w-full aspect-[3/4] md:aspect-video bg-[#0f111a] border-4 border-slate-800 rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] mb-10">
                        <div className="absolute inset-0 z-10 p-8 grid grid-rows-3 gap-8">
                            <div className="flex justify-around items-center">
                                <CourtPlayerCard slot="PG" player={assignedMap['PG']} onSelect={() => setShowBenchForSlot('PG')} onRemove={handleRemoveStarter} onStats={handleOpenStats} isReadOnly={isReadOnly} />
                                <CourtPlayerCard slot="SG" player={assignedMap['SG']} onSelect={() => setShowBenchForSlot('SG')} onRemove={handleRemoveStarter} onStats={handleOpenStats} isReadOnly={isReadOnly} />
                            </div>
                            <div className="flex justify-around items-center">
                                <CourtPlayerCard slot="SF" player={assignedMap['SF']} onSelect={() => setShowBenchForSlot('SF')} onRemove={handleRemoveStarter} onStats={handleOpenStats} isReadOnly={isReadOnly} />
                                <CourtPlayerCard slot="PF" player={assignedMap['PF']} onSelect={() => setShowBenchForSlot('PF')} onRemove={handleRemoveStarter} onStats={handleOpenStats} isReadOnly={isReadOnly} />
                            </div>
                            <div className="flex justify-center items-center">
                                <CourtPlayerCard slot="C" player={assignedMap['C']} onSelect={() => setShowBenchForSlot('C')} onRemove={handleRemoveStarter} onStats={handleOpenStats} isReadOnly={isReadOnly} />
                            </div>
                        </div>
                    </div>
                )}

                {!loadingLineup && (
                    <div className="space-y-8">
                        {/* Helper logic for grouping */}
                        {(() => {

                            // Forwards: Has F, but exclude if already in Guards (e.g. G/F show in Guards, or preference?)
                            // Standard convention: Primary position. But simplest string check:
                            // Let's iterate and exclusive bucket.


                            // Detect Limbo Players (Starters not in assignedMap due to conflict or invalid slot)
                            const assignedIds = new Set(Object.values(assignedMap).filter(p => p).map(p => p!.playerId));
                            const limboPlayers = roster.filter(p => p.isStarter && !assignedIds.has(p.playerId));

                            const guards: typeof allBench = [];
                            const forwards: typeof allBench = [];
                            const centers: typeof allBench = [];
                            const others: typeof allBench = [];

                            // Helper to push to buckets
                            const bucketPlayer = (p: typeof roster[0]) => {
                                const pos = p.position.toUpperCase();
                                if (pos.includes('G')) guards.push(p);
                                else if (pos.includes('F')) forwards.push(p);
                                else if (pos.includes('C')) centers.push(p);
                                else others.push(p);
                            };

                            allBench.forEach(bucketPlayer);
                            limboPlayers.forEach(bucketPlayer); // Add Limbo players to buckets so they appear

                            const groups = [
                                { title: t('matchup.guards'), icon: <Shirt size={18} />, list: guards },
                                { title: t('matchup.forwards'), icon: <Shirt size={18} />, list: forwards },
                                { title: t('matchup.centers'), icon: <Activity size={18} />, list: centers },
                                { title: t('matchup.others'), icon: <Activity size={18} />, list: others }
                            ];

                            return groups.map((group) => {
                                if (group.list.length === 0) return null;
                                return (
                                    <div key={group.title} className="space-y-4">
                                        <div className="flex items-center gap-3 text-slate-500 pl-4 border-b border-white/5 pb-2">
                                            {group.icon}
                                            <h4 className="text-xs font-black uppercase tracking-[0.3em]">{group.title} <span className="text-slate-700 ml-1">({group.list.length})</span></h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {group.list.map((p, groupIdx) => {
                                                // Find original index in valid sorted bench for ordering buttons logic
                                                const originalIdx = allBench.findIndex(b => b.playerId === p.playerId);
                                                const isLimbo = originalIdx === -1;
                                                return (
                                                    <BenchPlayerCard
                                                        key={p.playerId}
                                                        p={p}
                                                        idx={originalIdx}
                                                        displayIdx={groupIdx}
                                                        totalBench={allBench.length}
                                                        onMoveUp={() => !isLimbo && handleReorderBench(p, 'up')}
                                                        onMoveDown={() => !isLimbo && handleReorderBench(p, 'down')}
                                                        onStats={handleOpenStats}
                                                        isReadOnly={isReadOnly}
                                                        isLimbo={isLimbo}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                )}

                {showBenchForSlot && (
                    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border-white/5">
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                                <div><h3 className="font-black text-white uppercase tracking-widest italic leading-none">{t('matchup.insert_player')} {showBenchForSlot}</h3><p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-wider">{t('matchup.compatible_players_subtitle')}</p></div>
                                <button onClick={() => setShowBenchForSlot(null)} className="p-3 hover:bg-slate-700 rounded-full text-slate-400 transition-colors"><X size={24} /></button>
                            </div>
                            <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-2">
                                {roster.filter(p => !p.isStarter && isRoleCompatible(showBenchForSlot!, p.position)).map(p => (
                                    <button key={p.playerId} onClick={() => handleSelectPlayer(p)} className="w-full p-4 rounded-2xl bg-slate-800/50 hover:bg-blue-600 border border-slate-700 hover:border-blue-400 flex items-center justify-between transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-600 bg-slate-950 shrink-0">
                                                <img src={`https://cdn.nba.com/headshots/nba/latest/260x190/${p.externalId}.png`} className="h-full w-full object-cover" />
                                            </div>
                                            <div className="text-left"><div className="font-black text-white text-sm uppercase italic">{p.name}</div><div className="text-[10px] font-bold text-slate-500 group-hover:text-blue-100 uppercase">{p.nbaTeam} {p.hasGame && ` vs ${p.opponent}`}</div></div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-black text-emerald-400 group-hover:text-white">{p.avgFantasyPoints?.toFixed(1)} FP</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function CourtPlayerCard({ slot, player, onSelect, onRemove, onStats, isReadOnly }: any) {
    if (!player) {
        return (
            <button onClick={!isReadOnly ? onSelect : undefined} className={`w-28 h-28 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-700 bg-slate-800/20 transition-all group ${!isReadOnly ? 'hover:bg-blue-600/10 hover:border-blue-500 hover:scale-110 shadow-lg hover:shadow-blue-500/10' : 'opacity-40 cursor-default'}`}>
                <Plus size={24} className={`text-slate-600 mb-1 transition-colors ${!isReadOnly ? 'group-hover:text-blue-400' : ''}`} />
                <span className="text-[10px] font-black text-slate-600 group-hover:text-blue-400 uppercase tracking-widest">{slot}</span>
            </button>
        );
    }
    return (
        <div className="relative w-32 flex flex-col items-center animate-in zoom-in duration-500 group">
            <div onClick={() => onStats(player)} className={`relative w-20 h-20 rounded-2xl border-2 overflow-hidden bg-slate-900 shadow-2xl cursor-pointer hover:scale-110 transition-transform ${player.injuryStatus === 'Out' ? 'border-red-500' : 'border-emerald-500'}`}>
                <img src={`https://cdn.nba.com/headshots/nba/latest/260x190/${player.externalId}.png`} alt={player.name} className="w-full h-full object-cover object-top" />
            </div>
            <div onClick={() => onStats(player)} className="mt-[-15px] bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl px-3 py-2 text-center shadow-2xl min-w-[120px] z-10 cursor-pointer hover:bg-slate-800 transition">
                <div className="text-[10px] font-black text-white uppercase italic tracking-tight truncate">{player.name}</div>
                <div className="flex justify-center items-center gap-1 text-[9px] mt-0.5 font-bold uppercase">
                    {player.hasGame ? (
                        <>
                            <span className="text-blue-400">{player.opponent}</span>
                            <span className="text-slate-700">•</span>
                            {player.realPoints !== null ? (
                                <span className={`${player.weeklyBestScore && player.realPoints === player.weeklyBestScore && player.realPoints > 0 ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-emerald-400'} font-black`}>
                                    {player.realPoints} {player.weeklyBestScore && player.realPoints === player.weeklyBestScore && player.realPoints > 0 && "★"}
                                </span>
                            ) : (
                                <span className="text-slate-500 font-mono tracking-tighter">{player.gameTime}</span>
                            )}
                        </>
                    ) : <span className="text-slate-600 italic">No Game</span>}
                    {player.injuryStatus === 'Out' && <span className="ml-1 text-[8px] bg-red-600 text-white px-1 rounded font-black">OUT</span>}
                </div>
            </div>
            {!isReadOnly && (
                <button onClick={(e) => { e.stopPropagation(); onRemove(player); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-xl hover:scale-125 transition-transform border-2 border-slate-950"><X size={12} strokeWidth={4} /></button>
            )}
        </div>
    );
}


function BenchPlayerCard({ p, idx, displayIdx, onMoveUp, onMoveDown, onStats, totalBench, isReadOnly, isLimbo }: any) {
    const { t } = useTranslation();
    return (
        <div className={`bg-slate-900 border ${isLimbo ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-800'} p-4 rounded-[1.5rem] flex items-center gap-4 transition-all hover:border-slate-600 group shadow-lg`}>
            {!isReadOnly && (
                <div className="flex flex-col gap-1 items-center justify-center shrink-0">
                    <button onClick={onMoveUp} disabled={isLimbo || idx === 0} className="text-slate-700 hover:text-blue-500 disabled:opacity-30 transition-colors"><ChevronUp size={20} /></button>
                    <div className={`text-[10px] font-black w-7 h-7 flex items-center justify-center rounded-lg bg-slate-950 ${isLimbo ? 'text-amber-500 border-amber-900' : 'text-slate-500 border-slate-800'} border shadow-inner italic`}>{isLimbo ? '!' : `#${displayIdx + 1}`}</div>
                    <button onClick={onMoveDown} disabled={isLimbo || idx === totalBench - 1} className="text-slate-700 hover:text-blue-500 disabled:opacity-30 transition-colors"><ChevronDown size={20} /></button>
                </div>
            )}
            <div className="flex items-center gap-4 overflow-hidden flex-1 cursor-pointer" onClick={() => onStats(p)}>
                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 group-hover:border-slate-500 transition-colors">
                    <img src={`https://cdn.nba.com/headshots/nba/latest/260x190/${p.externalId}.png`} className="w-full h-full object-cover object-top" />
                </div>
                <div className="truncate">
                    <div className="text-sm font-black text-slate-200 truncate uppercase italic">{p.name} <span className="text-[10px] text-slate-600 font-bold not-italic">({p.position})</span></div>
                    <div className="flex items-center gap-2 text-[10px] mt-1 font-black uppercase">
                        <span className="text-slate-500">{p.nbaTeam}</span>
                        {p.hasGame ? <span className="text-blue-400 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/20">{p.opponent}</span> : <span className="text-slate-700 italic">No Game</span>}
                        {p.injuryStatus === 'Out' && <span className="text-red-500 bg-red-500/5 px-2 py-0.5 rounded border border-red-500/20">OUT</span>}
                    </div>
                </div>
            </div>
            <div className="text-right pointer-events-none">
                {p.realPoints !== null ? (
                    <div><div className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Live</div><div className="text-xl font-black text-emerald-500 italic leading-none">{p.realPoints.toFixed(1)}</div></div>
                ) : (
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none">{t('matchup.avg')}</span>
                        <span className="text-lg font-black text-amber-500 italic leading-none mt-1">{p.avgFantasyPoints?.toFixed(1) || '--'}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function WeeklyRecapModal({ isOpen, onClose, players, teamName }: any) {
    const { t } = useTranslation();
    if (!isOpen || !players) return null;

    const sortedPlayers = [...players].sort((a: any, b: any) => b.weeklyScore - a.weeklyScore);
    const totalWeeklyScore = sortedPlayers.reduce((sum: number, p: any) => sum + (p.weeklyScore || 0), 0);

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                    <div>
                        <h3 className="font-black text-white uppercase tracking-widest italic text-lg">{t('matchup.weekly_recap')}</h3>
                        <div className="text-xs text-blue-400 font-bold uppercase mt-1">{teamName} • {t('matchup.total')}: {totalWeeklyScore.toFixed(1)}</div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
                </div>
                <div className="p-4 overflow-y-auto custom-scrollbar space-y-2">
                    {sortedPlayers.map((p: any, idx: number) => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-800 hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="text-xs font-black text-slate-600 w-6 italic">#{idx + 1}</div>
                                <div>
                                    <div className="text-xs font-black text-slate-200 uppercase">{p.name}</div>
                                    <div className="text-[9px] font-bold text-slate-500 uppercase">{p.nbaTeam} • {p.position}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-black text-emerald-400">{p.weeklyScore?.toFixed(1) || '0.0'}</div>
                                <div className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">PTS</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

import LineupTimer from '../components/LineupTimer';