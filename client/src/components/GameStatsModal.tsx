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

    gameFgm?: number;
    gameFga?: number;
    gameThreePm?: number;
    gameThreePa?: number;
    gameFtm?: number;
    gameFta?: number;

    gameOffRebounds?: number;
    gameDefRebounds?: number;

    // FP Contributions
    gamePointsFp?: number;
    gameReboundsFp?: number;
    gameAssistsFp?: number;
    gameStealsFp?: number;
    gameBlocksFp?: number;
    gameTurnoversFp?: number;
    gameOffReboundsFp?: number;
    gameDefReboundsFp?: number;

    gameFgmFp?: number;
    gameFgaFp?: number;
    gameFtmFp?: number;
    gameFtaFp?: number;
    gameThreePmFp?: number;
    gameThreePaFp?: number;
    gameWinFp?: number;
    gameLossFp?: number;
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
            <div className="relative w-full max-w-sm max-h-[90vh] overflow-hidden rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col">

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

                <div className="p-6 overflow-y-auto flex-1">
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
                                <div className="text-6xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                                    {player.realPoints?.toFixed(1)}
                                </div>
                            </div>

                            {/* Scoring Stats Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                <StatCard label="PTS" value={player.gamePoints} fpValue={player.gamePointsFp} />
                                <StatCard label="AST" value={player.gameAssists} fpValue={player.gameAssistsFp} />
                                <StatCard label="STL" value={player.gameSteals} fpValue={player.gameStealsFp} />
                                <StatCard label="BLK" value={player.gameBlocks} fpValue={player.gameBlocksFp} />
                                <StatCard label="TOV" value={player.gameTurnovers} fpValue={player.gameTurnoversFp} isBad />
                                {/* Empty slot or efficiency? Let's use MIN for now or just 5 items + rebounds below? */}
                                <div className="flex flex-col items-center justify-center p-2">
                                    <div className="text-[10px] font-mono text-slate-500">MIN</div>
                                    <div className="text-xl font-bold text-white">{Number(player.gameMinutes ?? 0).toFixed(0)}'</div>
                                </div>
                            </div>

                            {/* Rebounds Split */}
                            <div className="grid grid-cols-3 gap-3">
                                <StatCard label="OREB" value={player.gameOffRebounds} fpValue={player.gameOffReboundsFp} />
                                <StatCard label="DREB" value={player.gameDefRebounds} fpValue={player.gameDefReboundsFp} />
                                <div className="p-3 rounded-xl border border-slate-700 bg-slate-800/50 flex flex-col items-center justify-center">
                                    <div className="text-[9px] font-black uppercase text-slate-500 mb-1">TOT REB</div>
                                    <div className="text-2xl font-black text-white">{(player.gameOffRebounds ?? 0) + (player.gameDefRebounds ?? 0)}</div>
                                    <div className="mt-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                                        {((player.gameReboundsFp ?? 0) + (player.gameOffReboundsFp ?? 0) + (player.gameDefReboundsFp ?? 0)) > 0 ? '+' : ''}
                                        {((player.gameReboundsFp ?? 0) + (player.gameOffReboundsFp ?? 0) + (player.gameDefReboundsFp ?? 0)).toFixed(1)} FP
                                    </div>
                                </div>
                            </div>

                            {/* Win/Loss & Bonus */}
                            {(player.gameWinFp !== 0 || player.gameLossFp !== 0) && (
                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700 flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Game Result</span>
                                        <span className={`text-xs font-black ${(player.gameWinFp ?? 0) > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                                            {(player.gameWinFp ?? 0) > 0 ? `WIN (+${player.gameWinFp})` : (player.gameLossFp ?? 0) < 0 ? `LOSS (${player.gameLossFp})` : '-'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Shooting Splits & Detail */}
                            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-700 pb-1">Shooting Details</h4>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-400">FG</span>
                                        <span className="text-sm font-black text-white">{player.gameFgm ?? '-'}/{player.gameFga ?? '-'}</span>
                                        <div className="text-[9px] text-slate-500 mt-1">
                                            {player.gameFgmFp !== 0 && <span className="text-emerald-500 mr-1">{player.gameFgmFp}</span>}
                                            {player.gameFgaFp !== 0 && <span className="text-red-400">{player.gameFgaFp}</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-400">3PT</span>
                                        <span className="text-sm font-black text-white">{player.gameThreePm ?? '-'}/{player.gameThreePa ?? '-'}</span>
                                        <div className="text-[9px] text-slate-500 mt-1">
                                            {player.gameThreePmFp !== 0 && <span className="text-emerald-500 mr-1">{player.gameThreePmFp}</span>}
                                            {player.gameThreePaFp !== 0 && <span className="text-red-400">{player.gameThreePaFp}</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-400">FT</span>
                                        <span className="text-sm font-black text-white">{player.gameFtm ?? '-'}/{player.gameFta ?? '-'}</span>
                                        <div className="text-[9px] text-slate-500 mt-1">
                                            {player.gameFtmFp !== 0 && <span className="text-emerald-500 mr-1">{player.gameFtmFp}</span>}
                                            {player.gameFtaFp !== 0 && <span className="text-red-400">{player.gameFtaFp}</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

function StatCard({ label, value, fpValue, isBad = false }: { label: string, value?: number, fpValue?: number, isBad?: boolean }) {
    if (value === undefined || value === null) return (
        <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col items-center justify-center opacity-50">
            <div className="text-[10px] font-black uppercase text-slate-600">{label}</div>
            <div className="text-lg font-bold text-slate-700">-</div>
        </div>
    );

    return (
        <div className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center ${isBad ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-800/50 border-slate-700'}`}>
            <div className={`text-[9px] font-black uppercase mb-1 ${isBad ? 'text-red-400' : 'text-slate-500'}`}>{label}</div>
            <div className={`text-2xl font-black leading-none ${isBad ? 'text-red-200' : 'text-white'}`}>{value}</div>

            {/* FP Contribution Badge */}
            <div className={`mt-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isBad ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {fpValue && fpValue > 0 ? '+' : ''}{fpValue?.toFixed(1)} FP
            </div>
        </div>
    );
}
