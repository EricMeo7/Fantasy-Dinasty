import { UserMinus, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PlayerFull {
    id: number;
    externalId: number;
    firstName: string;
    lastName: string;
    nbaTeam: string;
    position: string;
    avgPoints: number;
    salaryYear1: number;
    salaryYear2: number;
    salaryYear3: number;
    injuryStatus?: string;
    injuryBodyPart?: string;
    injuryReturnDate?: string;
}

interface Props {
    players: PlayerFull[];
    onRelease: (player: PlayerFull) => void;
    onOpenStats: (player: PlayerFull) => void;
}

export const RosterTable = ({ players, onRelease, onOpenStats }: Props) => {
    const { t } = useTranslation();
    return (
        <div className="responsive-table-container">
            <table className="w-full text-left border-collapse min-w-table">
                <thead>
                    <tr className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] bg-slate-950/50">
                        <th className="px-8 py-5">{t('roster.header_player')}</th>
                        <th className="px-8 py-5">{t('roster.header_contract')}</th>
                        <th className="px-8 py-5 text-center">{t('roster.avg_ppg')}</th>
                        <th className="px-8 py-5 text-right">{t('roster.header_actions')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                    {players.map((player) => (
                        <tr key={player.id} className="group hover:bg-white/5 transition-all duration-300">
                            <td className="px-8 py-5">
                                <div className="flex items-center gap-5">
                                    <div
                                        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-800 border border-white/5 shadow-2xl cursor-pointer group-hover:scale-105 transition-transform"
                                        onClick={() => onOpenStats(player)}
                                    >
                                        <img src={`https://cdn.nba.com/headshots/nba/latest/260x190/${player.externalId}.png`} alt={player.lastName} className="h-full w-full object-contain translate-y-2" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                    </div>

                                    <div>
                                        <div onClick={() => onOpenStats(player)} className="font-black text-white uppercase italic tracking-tight text-lg leading-tight group-hover:text-blue-400 cursor-pointer transition-colors flex items-center gap-2">
                                            {player.firstName} {player.lastName}
                                            <span className="text-[10px] not-italic text-slate-500 font-black border border-slate-800 px-2 py-0.5 rounded-lg">{player.position}</span>
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                                            {player.nbaTeam}
                                            {player.injuryStatus && (
                                                <span className="text-[9px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded uppercase tracking-wider"
                                                    title={`${player.injuryBodyPart || ''} - ${player.injuryReturnDate || ''}`}>
                                                    {player.injuryStatus === 'Out' ? 'OUT' : player.injuryStatus}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </td>

                            <td className="px-8 py-5">
                                <div className="flex items-center gap-4">
                                    <div className="bg-slate-950 px-4 py-2 rounded-xl border border-white/5">
                                        <div className="text-xl font-black text-emerald-500 italic leading-none">{player.salaryYear1.toFixed(1)} <span className="text-[10px]">M</span></div>
                                        <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">{t('roster.year1')}</div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="text-[10px] font-black font-mono text-slate-500">{t('roster.y2')}: <span className="text-slate-300">{player.salaryYear2 > 0 ? player.salaryYear2.toFixed(1) : '-'}</span></div>
                                        <div className="text-[10px] font-black font-mono text-slate-500">{t('roster.y3')}: <span className="text-slate-300">{player.salaryYear3 > 0 ? player.salaryYear3.toFixed(1) : '-'}</span></div>
                                    </div>
                                </div>
                            </td>

                            <td className="px-8 py-5 text-center">
                                <div className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-slate-950 border border-slate-800">
                                    <span className="text-2xl font-black text-white italic">{player.avgPoints.toFixed(1)}</span>
                                    <span className="text-[10px] text-slate-500 ml-1 font-black uppercase">{t('roster.pts')}</span>
                                </div>
                            </td>

                            <td className="px-8 py-5">
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => onOpenStats(player)}
                                        className="p-3 rounded-2xl transition-all shadow-xl group/btn active:scale-90 border bg-blue-600/10 border-blue-500/20 text-blue-500 hover:bg-blue-600 hover:text-white hover:border-blue-500"
                                        title={t('roster.view_player_stats_title')}
                                    >
                                        <ChevronRight size={20} className="group-hover/btn:scale-110 transition-transform" />
                                    </button>

                                    <button
                                        onClick={() => onRelease(player)}
                                        className="p-3 bg-slate-950 hover:bg-red-600 border border-slate-800 hover:border-red-500 text-slate-500 hover:text-white rounded-2xl shadow-xl transition-all active:scale-90 group/btn"
                                        title={t('roster.release_player_title')}
                                    >
                                        <UserMinus size={20} className="group-hover/btn:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
