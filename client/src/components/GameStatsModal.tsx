import { X, Clock, Activity } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

interface DailyPlayer {
    id: number;
    name: string;
    nbaTeam: string;
    opponent: string;
    gameTime: string;
    hasGame: boolean;
    realPoints: number | null;
    externalId: number;

    // Stats Partita Singola
    gamePoints?: number;
    gameRebounds?: number;
    gameAssists?: number;
    gameSteals?: number;
    gameBlocks?: number;
    gameTurnovers?: number;
    gameMinutes?: number;
}

interface Props {
    player: DailyPlayer | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function GameStatsModal({ player, isOpen, onClose }: Props) {
    const { t } = useTranslation();

    if (!isOpen || !player) return null;

    const hasStarted = player.realPoints !== null;

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col">

                {/* Header con Immagine Sfondo sfocata */}
                <div className="relative h-32 bg-slate-800 overflow-hidden">
                    <img
                        src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.externalId}.png`}
                        className="absolute w-full h-full object-cover opacity-30 blur-sm scale-110"
                        alt=""
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>

                    <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition z-20"><X size={20} /></button>

                    <div className="absolute bottom-4 left-6 flex items-end gap-4 z-10">
                        <img
                            src={`https://cdn.nba.com/headshots/nba/latest/260x190/${player.externalId}.png`}
                            className="w-20 h-20 rounded-full border-4 border-slate-900 bg-slate-800 object-cover"
                            alt={player.name}
                        />
                        <div className="mb-1">
                            <h2 className="text-xl font-black text-white leading-none">{player.name}</h2>
                            <p className="text-xs text-slate-400 font-bold mt-1 uppercase">{player.nbaTeam} vs {player.opponent}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {/* Status Partita */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                            <Clock size={16} />
                            <span>{player.gameTime}</span>
                        </div>
                        {hasStarted ? (
                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                                <Activity size={14} className={player.gameTime !== 'Final' ? 'animate-pulse' : ''} />
                                <span className="text-xs font-black uppercase">{player.gameTime === 'Final' ? t('matchup.finished') : t('matchup.live')}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 text-slate-400 rounded-full border border-slate-700">
                                <span className="text-xs font-black uppercase">{t('matchup.not_started')}</span>
                            </div>
                        )}
                    </div>

                    {!hasStarted ? (
                        <div className="text-center py-8 text-slate-500 italic border-2 border-dashed border-slate-800 rounded-xl">
                            {t('matchup.no_stats')}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Punteggio Fantasy Principale */}
                            <div className="text-center">
                                <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{t('matchup.fantasy_points')}</div>
                                <div className="text-5xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                                    {player.realPoints}
                                </div>
                            </div>

                            {/* Griglia Statistiche */}
                            <div className="grid grid-cols-3 gap-3">
                                <StatCard label="PTS" value={player.gamePoints} />
                                <StatCard label="REB" value={player.gameRebounds} />
                                <StatCard label="AST" value={player.gameAssists} />
                                <StatCard label="STL" value={player.gameSteals} />
                                <StatCard label="BLK" value={player.gameBlocks} />
                                <StatCard label="TOV" value={player.gameTurnovers} isBad />
                            </div>

                            <div className="text-center text-xs font-mono text-slate-500 mt-2">
                                {t('matchup.minutes_played')}: {Number(player.gameMinutes ?? 0).toFixed(0)}'
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

function StatCard({ label, value, isBad = false }: { label: string, value?: number, isBad?: boolean }) {
    return (
        <div className={`p-3 rounded-xl border text-center ${isBad ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-800/50 border-slate-700'}`}>
            <div className={`text-[10px] font-black uppercase mb-1 ${isBad ? 'text-red-400' : 'text-slate-500'}`}>{label}</div>
            <div className={`text-xl font-bold ${isBad ? 'text-red-200' : 'text-white'}`}>{value ?? 0}</div>
        </div>
    );
}
