import { useState, useEffect } from 'react';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { CONFIG } from '../config';
import api from '../services/api';
import { useDraftBoard } from '../features/draft/api/useDraftBoard';
import type { DraftBoardSlot } from '../features/draft/types/draft.types';
import { useMyTeamInfo } from '../features/team/api/useMyTeamInfo';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO/SEO';
import { Loader2, PlayCircle, Lock } from 'lucide-react';
import LogoAvatar from '../components/LogoAvatar';
import { useModal } from '../context/ModalContext';
import { LotteryOddsModal } from '../features/draft/components/LotteryOddsModal';
import { RevealAnimation } from '../features/draft/components/RevealAnimation';
import confetti from 'canvas-confetti';

interface LotteryTeamDto {
    userId: string;
    teamName: string;
    teamId: number;
}

interface LotteryState {
    leagueId: number;
    isActive: boolean;
    onlineParticipants: string[];
    teams: LotteryTeamDto[];
}

export default function Lottery() {
    const navigate = useNavigate();
    const { showConfirm } = useModal();
    const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
    const { data: teamInfo } = useMyTeamInfo();
    const isLeagueAdmin = teamInfo?.isAdmin || false;

    const [connection, setConnection] = useState<HubConnection | null>(null);
    const [lotteryState, setLotteryState] = useState<LotteryState | null>(null);
    const [showOddsModal, setShowOddsModal] = useState(false);
    const [odds, setOdds] = useState<any[]>([]);
    const [showAnimation, setShowAnimation] = useState(false);
    const [animationWinner, setAnimationWinner] = useState<{ id: number, name: string } | null>(null);
    const [candidateTeams, setCandidateTeams] = useState<{ id: number, name: string }[]>([]);

    // Fetch League Details for Season
    useEffect(() => {
        api.league.getLeagueDetails().then((res) => {
            const seasonStr = (res.data as any).currentSeason;
            if (seasonStr && seasonStr.includes('-')) {
                const year = parseInt(seasonStr.split('-')[0]) + 1; // 2025 -> 2026
                setSelectedSeason(year);
            } else if (seasonStr) {
                setSelectedSeason(parseInt(seasonStr));
            } else {
                setSelectedSeason(new Date().getFullYear());
            }
        }).catch(err => {
            console.error("Failed to load league season", err);
            setSelectedSeason(new Date().getFullYear());
        });
    }, []);

    // Fetch odds
    const fetchOdds = () => {
        if (selectedSeason) {
            api.draft.getLotteryProbabilities(selectedSeason)
                .then(res => {
                    setOdds(res.data);
                    // Map odds to candidate objects
                    if (candidateTeams.length === 0) {
                        setCandidateTeams(res.data.map((o: any) => ({
                            id: o.teamId,
                            name: o.teamName
                        })));
                    }
                })
                .catch(err => console.error("Failed to load odds", err));
        }
    };

    // Initial Fetch
    useEffect(() => {
        fetchOdds();
    }, [selectedSeason]);

    // Draft Board Data
    const { data: allSlots, refetch } = useDraftBoard(selectedSeason || 0);
    const lotteryPicks = allSlots?.filter(s => s.round === 1 && s.slotNumber).sort((a, b) => a.slotNumber! - b.slotNumber!) || [];

    useEffect(() => {
        if (!selectedSeason) return;
        const token = localStorage.getItem('token');
        const leagueId = localStorage.getItem('selectedLeagueId');

        if (!token || !leagueId) {
            navigate('/login');
            return;
        }

        const newConnection = new HubConnectionBuilder()
            .withUrl(`${CONFIG.HUB_BASE_URL}/lotteryhub?leagueId=${leagueId}`, {
                accessTokenFactory: () => token
            })
            .withAutomaticReconnect()
            .build();

        setConnection(newConnection);

        return () => {
            newConnection.stop();
        };
    }, [navigate, selectedSeason]);

    useEffect(() => {
        if (connection) {
            connection.start()
                .then(() => {
                    console.log('Connected to LotteryHub');
                })
                .catch(e => console.error('Connection failed: ', e));

            connection.on('LotteryStateUpdated', (state: LotteryState) => {
                setLotteryState(state);
            });

            connection.on('PickRevealed', (pick: DraftBoardSlot) => {
                console.log("Pick Revealed via SignalR:", pick);
                if (pick.slotNumber && pick.slotNumber <= 4) { // Only animate Top 4
                    setAnimationWinner({
                        id: pick.originalOwnerTeamId,
                        name: pick.originalOwnerTeamName
                    });
                    setShowAnimation(true);
                    // Refetch will happen after animation
                } else {
                    refetch();
                    toast(`Pick #${pick.slotNumber} Revealed: ${pick.currentOwnerTeamName}!`, { icon: '🎰' });
                }
            });

            return () => {
                connection.off('LotteryStateUpdated');
                connection.off('PickRevealed');
            };
        }
    }, [connection, refetch]);


    const handleStartLottery = async () => {
        const leagueId = localStorage.getItem('selectedLeagueId');
        if (!leagueId) return;

        const ok = await showConfirm({
            title: "Start Lottery Simulation",
            message: "This will begin the live lottery event. Are you sure?",
            type: "confirm"
        });

        if (ok) {
            try {
                // 1. Run the simulation backend logic
                if (selectedSeason) {
                    await api.draft.runLottery(selectedSeason);
                }

                // 2. Open the room via SignalR
                await connection?.invoke("StartLottery", parseInt(leagueId));

                toast.success("Lottery simulation started!");
            } catch (error) {
                console.error("Failed to start lottery:", error);
                toast.error("Failed to start simulation. Check console.");
            }
        }
    };

    const handleRevealNext = async () => {
        if (!selectedSeason) return;
        try {
            await api.draft.revealLottery(selectedSeason!);
        } catch (error) {
            console.error('Failed to reveal:', error);
            toast.error("Failed to reveal pick");
        }
    };

    const handleAnimationComplete = () => {
        setShowAnimation(false);
        const winner = animationWinner;
        setAnimationWinner(null);
        refetch();

        if (winner) {
            toast.success(`Pick revealed: ${winner.name}`);
            if (lotteryPicks.find(p => p.originalOwnerTeamId === winner.id)?.slotNumber === 1) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
        }
    };

    // --- LOADING STATE ---
    if (!lotteryState) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="animate-spin mb-6 text-yellow-500" size={48} />
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-yellow-400">Connecting to Lottery Headquarters...</p>
        </div>
    );

    const onlineCount = lotteryState.onlineParticipants?.length || 0;
    const totalCount = lotteryState.teams.length;

    // --- RENDER HELPERS ---

    // Header Section (Shared)
    const renderHeader = () => (
        <div className="mb-8 md:mb-12 mt-4 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8">
            <div className="flex items-center gap-4 md:gap-8">
                <LogoAvatar
                    src={`${CONFIG.API_BASE_URL}/league/${localStorage.getItem('selectedLeagueId')}/logo`}
                    alt="League Logo"
                    size="xl"
                    shape="square"
                    className="relative z-10 scale-110 group-hover:scale-125 transition-transform duration-700 bg-transparent border-none"
                    fallbackType="league"
                />
                <div>
                    <h2 className="text-3xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-none break-words">
                        Draft Lottery {selectedSeason}
                    </h2>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[8px] md:text-[10px] mt-2 md:mt-3">
                        {lotteryState?.isActive ? "Live Event In Progress" : "Waiting for Commissioner"}
                    </p>
                </div>
            </div>
            <div className="flex gap-4">
                <button
                    onClick={() => navigate('/draft-board')}
                    className="px-6 py-2 bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-200 font-black uppercase tracking-widest text-xs rounded-xl transition-all active:scale-95"
                >
                    Board
                </button>
                <button
                    onClick={() => setShowOddsModal(true)}
                    className="px-6 py-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-400 font-black uppercase tracking-widest text-xs rounded-xl transition-all active:scale-95"
                >
                    View Odds
                </button>
            </div>
        </div>
    );

    // --- MAIN RENDER ---
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 relative overflow-hidden">
            <SEO title={`Draft Lottery ${selectedSeason}`} description="Live NBA Draft Lottery event." />

            {/* Background decoration (Shared with Dashboard) */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute top-[-5%] right-[-5%] w-[45%] h-[45%] bg-yellow-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[100px]"></div>
            </div>

            <main className="container mx-auto p-4 md:p-12 max-w-7xl relative z-10">
                {renderHeader()}

                {/* CONTENT AREA */}
                {!lotteryState ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <Loader2 className="animate-spin mb-6 text-yellow-500" size={48} />
                        <p className="font-mono text-xs uppercase tracking-[0.3em] text-yellow-400">Connecting to HQ...</p>
                    </div>
                ) : !lotteryState.isActive ? (
                    /* LOBBY VIEW */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Status Card */}
                        <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-10 flex flex-col justify-center items-center text-center shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(234,179,8,0.05),transparent_50%)]"></div>

                            <div className="mb-8 p-6 bg-slate-800/50 rounded-full border border-white/5">
                                <Lock size={48} className="text-slate-500" />
                            </div>

                            <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-4">Waiting Room</h3>
                            <p className="text-slate-400 max-w-md text-lg leading-relaxed font-medium">
                                The Commissioner has not started the lottery simulation yet.
                                <br />
                                <span className="text-sm opacity-60 uppercase tracking-widest mt-2 block">
                                    {onlineCount} / {totalCount} GMs Connected
                                </span>
                            </p>

                            {isLeagueAdmin && (
                                <div className="mt-10 w-full max-w-sm">
                                    <button
                                        onClick={handleStartLottery}
                                        className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 rounded-2xl shadow-[0_10px_30px_rgba(234,179,8,0.2)] hover:shadow-[0_20px_40px_rgba(234,179,8,0.4)] transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 text-lg uppercase tracking-tighter italic"
                                    >
                                        <PlayCircle size={24} /> Start Simulation
                                    </button>

                                </div>
                            )}
                        </div>

                        {/* Online List */}
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[3rem] p-8 flex flex-col">
                            <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-4">Participating Teams</h4>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 max-h-[500px] pr-2">
                                {lotteryState.teams.map((team) => {
                                    const isOnline = lotteryState.onlineParticipants?.includes(team.userId);
                                    return (
                                        <div key={team.userId} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-950/50 border-white/5 opacity-50'}`}>
                                            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-slate-700'}`}></div>
                                            <span className={`font-bold text-sm ${isOnline ? 'text-white' : 'text-slate-500'}`}>{team.teamName}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ACTIVE LOTTERY VIEW */
                    <div className="flex flex-col gap-8">
                        {/* Main Board */}
                        <div className="w-full bg-slate-900/80 backdrop-blur-3xl rounded-[2rem] border border-white/10 shadow-2xl relative animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent"></div>

                            {/* Table Header */}
                            <div className="grid grid-cols-12 bg-white/5 p-4 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] border-b border-white/5">
                                <div className="col-span-2 text-center">Pick</div>
                                <div className="col-span-7 pl-4">Franchise</div>
                                <div className="col-span-3 text-right pr-4">Status</div>
                            </div>

                            <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {lotteryPicks.map((pick) => (
                                    <LotteryRow key={pick.id} pick={pick} />
                                ))}
                            </div>
                        </div>

                        {/* Admin Controls */}
                        {isLeagueAdmin && (
                            <div className="flex justify-center mt-6">
                                <button
                                    onClick={handleRevealNext}
                                    className="group relative px-12 py-5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black rounded-full font-black uppercase tracking-widest text-xl transition-all shadow-[0_20px_50px_rgba(234,179,8,0.3)] hover:shadow-[0_30px_60px_rgba(234,179,8,0.5)] active:scale-95 overflow-hidden"
                                >
                                    <span className="relative z-10 flex items-center gap-3">
                                        Reveal Next Pick
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Modals & Overlays */}
            <LotteryOddsModal
                isOpen={showOddsModal}
                onClose={() => setShowOddsModal(false)}
                odds={odds}
            />

            <RevealAnimation
                isVisible={showAnimation}
                winner={animationWinner}
                onComplete={handleAnimationComplete}
                candidates={candidateTeams}
            />

        </div>
    );
}

// Sub-component remains similar but styled to match
function LotteryRow({ pick }: { pick: DraftBoardSlot }) {
    const isHidden = pick.isRevealed === false;

    return (
        <div className={`grid grid-cols-12 p-4 items-center transition-all duration-700 ${isHidden
            ? 'bg-slate-800/10'
            : 'bg-gradient-to-r from-emerald-500/5 to-transparent'
            }`}>
            <div className="col-span-2 text-center">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto text-lg font-black italic tracking-tighter border transition-all duration-500 ${isHidden
                    ? 'bg-slate-800 text-slate-600 border-slate-700'
                    : 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                    }`}>
                    {pick.slotNumber}
                </div>
            </div>
            <div className="col-span-7 pl-6">
                {isHidden ? (
                    <div className="flex items-center gap-3 text-slate-700 animate-pulse">
                        <span className="text-xs font-black uppercase tracking-widest">Envelope Sealed</span>
                    </div>
                ) : (
                    <div className="flex flex-col animate-in fade-in slide-in-from-left-4 duration-500">
                        <span className="text-white font-black text-xl italic tracking-tighter">{pick.currentOwnerTeamName}</span>
                        {pick.isTradedPick && (
                            <span className="text-[9px] text-purple-400 font-bold uppercase tracking-widest">
                                via {pick.originalOwnerTeamName}
                            </span>
                        )}
                    </div>
                )}
            </div>
            <div className="col-span-3 text-right pr-4">
                {!isHidden && (
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                        Confirmed
                    </span>
                )}
            </div>
        </div>
    );
}
