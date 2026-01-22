import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Ruler, Weight, Crosshair, Zap, History, Loader2 } from 'lucide-react';
import api from '../services/api';

// Interfaccia per i dati storici
interface SeasonStat {
    id: number;
    season: string;
    nbaTeam: string;
    avgPoints: number;
    avgRebounds: number;
    avgAssists: number;
    gamesPlayed: number;
    fantasyPoints: number;
}

// Interfaccia completa del giocatore
export interface PlayerFull {
    id: number;
    externalId: number;
    firstName: string;
    lastName: string;
    nbaTeam: string;
    position: string;
    height: string;
    weight: string;

    // Stats Base
    avgPoints: number;
    avgRebounds: number;
    avgAssists: number;
    avgSteals: number;
    avgBlocks: number;

    // Dettaglio Tiro
    fgm: number; fga: number; fgPercent: number;
    threePm: number; threePa: number; threePtPercent: number;
    ftm: number; fta: number; ftPercent: number;

    // Dettaglio Rimbalzi
    offRebounds: number;
    defRebounds: number;

    // Impatto
    personalFouls: number;
    avgTurnovers: number;
    avgMinutes: number;
    plusMinus: number;
    efficiency: number;
    winPct: number;
    doubleDoubles: number;
    tripleDoubles: number;

    fantasyPoints: number;
    gamesPlayed: number;

    // Gestione Roster
    isStarter: boolean;

    injuryStatus?: string;
    injuryBodyPart?: string;
    injuryReturnDate?: string;

    // Dati Contratto
    salaryYear1: number;
    salaryYear2: number;
    salaryYear3: number;
    contractYears: number;

    // Storico
    seasonStats?: SeasonStat[];
}

import { useTranslation } from 'react-i18next';

interface Props {
    player: PlayerFull | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function PlayerStatsModal({ player: initialPlayer, isOpen, onClose }: Props) {
    const { t } = useTranslation();
    const [fullPlayer, setFullPlayer] = useState<PlayerFull | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [activeTab, setActiveTab] = useState<'season' | 'history'>('season');

    useEffect(() => {
        if (isOpen && initialPlayer) {
            // OPTIMIZATION: Check if we already have the full details (e.g. seasonStats is present)
            // to avoid a redundant fetch and flicker.
            if (initialPlayer.seasonStats && initialPlayer.seasonStats.length > 0) {
                setFullPlayer(initialPlayer);
                setLoadingHistory(false);
            } else {
                setFullPlayer(initialPlayer); // Set initial for header info
                fetchFullDetails(initialPlayer.id);
            }
            setActiveTab('season');
        }
    }, [isOpen, initialPlayer?.id]); // Depend on ID to avoid excessive re-runs

    const fetchFullDetails = async (id: number) => {
        setLoadingHistory(true);
        try {
            const { data } = await api.getPlayerDetails(id);
            setFullPlayer(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingHistory(false);
        }
    };

    if (!isOpen || !fullPlayer) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[85vh] my-auto">

                {/* HEADER */}
                <div className="relative bg-gradient-to-r from-slate-800 to-slate-950 p-6 flex items-end border-b border-slate-700 shrink-0">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-slate-400 hover:text-white transition z-20"><X size={20} /></button>

                    <div className="flex items-center gap-6 w-full">
                        <div className="h-28 w-28 rounded-full border-4 border-slate-700 overflow-hidden bg-slate-800 shrink-0">
                            <img
                                src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${fullPlayer.externalId}.png`}
                                className="h-full w-full object-cover object-top pt-2"
                                alt={fullPlayer.lastName}
                                onError={(e) => e.currentTarget.style.display = 'none'}
                            />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-3xl font-bold text-white">{fullPlayer.firstName} {fullPlayer.lastName}</h2>
                            <div className="flex items-center gap-3 mt-1 text-slate-400 text-sm">
                                <span className="font-bold text-emerald-400 bg-emerald-900/20 px-2 py-0.5 rounded">{fullPlayer.nbaTeam}</span>
                                {fullPlayer.injuryStatus && (
                                    <div className="flex border border-red-500/30 rounded bg-red-900/10 overflow-hidden">
                                        <div className="bg-red-600 px-2 py-0.5 text-xs font-bold text-white uppercase flex items-center gap-1">
                                            {fullPlayer.injuryStatus}
                                        </div>
                                        {fullPlayer.injuryReturnDate && (
                                            <div className="px-2 py-0.5 text-[10px] font-mono text-red-200 flex items-center border-l border-red-500/30 bg-red-950/30">
                                                {fullPlayer.injuryReturnDate}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <span>{fullPlayer.position}</span>
                                <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
                                <div className="flex items-center gap-1"><Ruler size={14} /> {fullPlayer.height}</div>
                                <div className="flex items-center gap-1"><Weight size={14} /> {fullPlayer.weight} lbs</div>
                            </div>

                            {/* Info Contratto */}
                            <div className="mt-3 flex gap-4 text-xs font-mono text-slate-300">
                                <div className="bg-slate-800 px-2 py-1 rounded border border-slate-700">
                                    {t('modals.stats.salary')} <span className="text-emerald-400 font-bold">{fullPlayer.salaryYear1?.toFixed(1)} M</span>
                                </div>
                                {fullPlayer.contractYears > 1 && (
                                    <div className="bg-slate-800 px-2 py-1 rounded border border-slate-700">
                                        {t('modals.stats.expires_in', { years: fullPlayer.contractYears })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="text-right hidden sm:block">
                            <div className="text-xs text-slate-500 uppercase font-bold">{t('modals.stats.fantasy_pts')}</div>
                            <div className="text-3xl font-mono font-bold text-yellow-400">{fullPlayer.fantasyPoints?.toFixed(1)}</div>
                        </div>
                    </div>
                </div>

                {/* TABS */}
                <div className="flex bg-slate-900/50 p-1 rounded-xl mb-6 border border-white/5">
                    <button
                        onClick={() => setActiveTab('season')}
                        className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition ${activeTab === 'season' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        {t('roster.season')}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition ${activeTab === 'history' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        {loadingHistory ? <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={14} /> {t('modals.stats.loading_history')}</span> : t('modals.stats.career_history')}
                    </button>
                </div>

                {/* CONTENT */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">

                    {activeTab === 'season' ? (
                        <div className="space-y-6">
                            {/* Statistiche Principali */}
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                <StatBox label="PTS" value={fullPlayer.avgPoints} color="text-white" />
                                <StatBox label="REB" value={fullPlayer.avgRebounds} color="text-blue-400" />
                                <StatBox label="AST" value={fullPlayer.avgAssists} color="text-amber-400" />
                                <StatBox label="STL" value={fullPlayer.avgSteals} color="text-emerald-400" />
                                <StatBox label="BLK" value={fullPlayer.avgBlocks} color="text-rose-400" />
                                <StatBox label="MIN" value={fullPlayer.avgMinutes} color="text-slate-300" />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Shooting Splits */}
                                <div className="space-y-4">
                                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase border-b border-slate-800 pb-2">
                                        <Crosshair size={16} /> {t('modals.stats.shooting_splits')}
                                    </h3>
                                    <div className="bg-slate-800/40 rounded-xl p-4 space-y-4">
                                        <SplitRow label="FG" made={fullPlayer.fgm} att={fullPlayer.fga} pct={fullPlayer.fgPercent} color="text-emerald-400" />
                                        <SplitRow label="3PT" made={fullPlayer.threePm} att={fullPlayer.threePa} pct={fullPlayer.threePtPercent} color="text-blue-400" />
                                        <SplitRow label="FT" made={fullPlayer.ftm} att={fullPlayer.fta} pct={fullPlayer.ftPercent} color="text-amber-400" />
                                    </div>
                                </div>

                                {/* Impact & Hustle */}
                                <div className="space-y-4">
                                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase border-b border-slate-800 pb-2">
                                        <Zap size={16} /> {t('modals.stats.impact_hustle')}
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <DetailBox label="Turnovers" value={fullPlayer.avgTurnovers} icon="TOV" bad={true} />
                                        <DetailBox label="Personal Fouls" value={fullPlayer.personalFouls} icon="PF" bad={true} />
                                        <DetailBox label="Off. Rebounds" value={fullPlayer.offRebounds} icon="OREB" />
                                        <DetailBox label="Def. Rebounds" value={fullPlayer.defRebounds} icon="DREB" />
                                        <DetailBox label="+/-" value={fullPlayer.plusMinus} icon="+/-" color={fullPlayer.plusMinus >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                                        <DetailBox label="Win %" value={fullPlayer.winPct * 100} icon="%" suffix="%" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* TAB STORICO */
                        <div className="space-y-4">
                            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase border-b border-slate-800 pb-2">
                                <History size={16} /> {t('modals.stats.last_5_seasons')}
                            </h3>

                            {loadingHistory ? (
                                <div className="text-center py-20 flex flex-col items-center text-slate-500">
                                    <Loader2 size={32} className="animate-spin mb-2 text-emerald-500" />
                                    {t('modals.stats.fetching_history')}
                                </div>
                            ) : !fullPlayer.seasonStats || fullPlayer.seasonStats.length === 0 ? (
                                <div className="text-center py-10 text-slate-500">{t('modals.stats.no_history')}</div>
                            ) : (
                                <div className="responsive-table-container rounded-xl border border-slate-800">
                                    <table className="w-full text-sm text-left text-slate-400 min-w-table">
                                        <thead className="text-xs text-slate-500 uppercase bg-slate-800">
                                            <tr>
                                                <th className="px-4 py-3">{t('modals.stats.season')}</th>
                                                <th className="px-4 py-3">{t('modals.stats.team')}</th>
                                                <th className="px-4 py-3 text-center">{t('modals.stats.gp')}</th>
                                                <th className="px-4 py-3 text-right text-white">PTS</th>
                                                <th className="px-4 py-3 text-right text-blue-400">REB</th>
                                                <th className="px-4 py-3 text-right text-amber-400">AST</th>
                                                <th className="px-4 py-3 text-right text-yellow-400">{t('modals.stats.fantasy')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {fullPlayer.seasonStats
                                                .sort((a, b) => b.season.localeCompare(a.season))
                                                .map((stat) => (
                                                    <tr key={stat.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition">
                                                        <td className="px-4 py-3 font-bold text-slate-300">{stat.season}</td>
                                                        <td className="px-4 py-3">{stat.nbaTeam}</td>
                                                        <td className="px-4 py-3 text-center">{stat.gamesPlayed}</td>
                                                        <td className="px-4 py-3 text-right font-mono text-white font-bold">{stat.avgPoints.toFixed(1)}</td>
                                                        <td className="px-4 py-3 text-right font-mono">{stat.avgRebounds.toFixed(1)}</td>
                                                        <td className="px-4 py-3 text-right font-mono">{stat.avgAssists.toFixed(1)}</td>
                                                        <td className="px-4 py-3 text-right font-mono font-bold text-yellow-400">{stat.fantasyPoints.toFixed(1)}</td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

// --- SUBCOMPONENTS (Stili grafici per le card statistiche) ---

const StatBox = ({ label, value, color }: any) => (
    <div className="bg-slate-800/60 p-3 rounded-lg text-center border border-slate-700/50">
        <div className="text-[10px] text-slate-500 uppercase font-bold">{label}</div>
        <div className={`text-2xl font-mono font-bold ${color}`}>{value?.toFixed(1)}</div>
    </div>
);

const SplitRow = ({ label, made, att, pct, color }: any) => (
    <div className="flex items-center justify-between">
        <div className="w-12 font-bold text-slate-300">{label}</div>
        <div className="flex-1 px-4">
            <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full ${color.replace('text', 'bg')}`} style={{ width: `${Math.min(pct * 100, 100)}%` }}></div>
            </div>
        </div>
        <div className="text-right min-w-[80px]">
            <div className={`font-mono font-bold ${color}`}>{(pct * 100).toFixed(1)}%</div>
            <div className="text-[10px] text-slate-500">{made?.toFixed(1)} / {att?.toFixed(1)}</div>
        </div>
    </div>
);

const DetailBox = ({ label, value, icon, color = "text-white", bad = false, suffix = "" }: any) => (
    <div className="flex items-center justify-between bg-slate-800/40 p-3 rounded-lg border border-slate-800">
        <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">{label}</div>
            <div className={`font-mono font-bold text-lg ${color}`}>{value?.toFixed(1)}{suffix}</div>
        </div>
        <div className={`text-xs font-bold px-2 py-1 rounded ${bad ? 'bg-red-900/20 text-red-400' : 'bg-slate-700 text-slate-300'}`}>
            {icon}
        </div>
    </div>
);