import { UserMinus, ChevronRight, TrendingUp } from 'lucide-react';
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
}

interface Props {
    player: PlayerFull;
    onRelease: (player: PlayerFull) => void;
    onOpenStats: (player: PlayerFull) => void;
}

export const PlayerCard = ({ player, onRelease, onOpenStats }: Props) => {
    const { t } = useTranslation();
    return (
        <div className="group relative flex flex-col p-6 rounded-[2rem] border transition-all duration-300 shadow-2xl bg-slate-900 border-white/5">
            {/* Header: Persona & Team */}
            <div className="flex items-center gap-5 mb-6">
                <div
                    className="relative w-16 h-16 shrink-0 bg-slate-800 rounded-2xl border border-white/5 overflow-hidden shadow-2xl transition-transform cursor-pointer hover:scale-105"
                    onClick={() => onOpenStats(player)}
                >
                    <img
                        src={`https://cdn.nba.com/headshots/nba/latest/260x190/${player.externalId}.png`}
                        className="h-full w-full object-contain translate-y-3"
                        onError={(e) => e.currentTarget.style.display = 'none'}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent"></div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black italic shadow-lg bg-slate-950 text-slate-500 border border-slate-800">
                            {player.position}
                        </span>
                    </div>
                    <h3
                        onClick={() => onOpenStats(player)}
                        className="text-xl font-black text-white uppercase italic tracking-tighter truncate leading-none group-hover:text-blue-400 transition-colors cursor-pointer"
                    >
                        {player.firstName} {player.lastName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{player.nbaTeam}</p>
                        {player.injuryStatus && (
                            <span className="text-[9px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded uppercase tracking-wider" title={player.injuryBodyPart}>
                                {player.injuryStatus === 'Out' ? 'OUT' : player.injuryStatus}
                            </span>
                        )}
                    </div>
                </div>

                <ChevronRight className="text-slate-800 group-hover:text-blue-500 transition-colors" size={20} />
            </div>

            {/* Financial Data */}
            <div className="bg-slate-950/80 rounded-2xl p-4 border border-white/5 shadow-inner mb-6">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-1.5 font-bold">
                        <TrendingUp size={12} className="text-emerald-500" /> {t('roster.active_contract')}
                    </span>
                    <span className="text-[9px] font-black text-emerald-500/80 uppercase tracking-widest">{t('roster.market_value')}</span>
                </div>

                <div className="flex justify-between items-end">
                    <div>
                        <div className="text-2xl font-black text-white italic tracking-tighter leading-none">
                            {player.salaryYear1.toFixed(1)} <span className="text-xs text-slate-500">M</span>
                        </div>
                        <div className="text-[9px] font-black text-slate-700 uppercase tracking-widest mt-1">{t('roster.season_cap')}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-700 uppercase">{t('roster.y2')}:</span>
                            <span className="text-xs font-black font-mono text-slate-400">{player.salaryYear2 > 0 ? player.salaryYear2.toFixed(1) : '-'} M</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-700 uppercase">{t('roster.y3')}:</span>
                            <span className="text-xs font-black font-mono text-slate-400">{player.salaryYear3 > 0 ? player.salaryYear3.toFixed(1) : '-'} M</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-auto">
                <button
                    onClick={() => onOpenStats(player)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 border bg-blue-600 hover:bg-blue-550 text-white shadow-blue-500/20 border-t border-white/10"
                >
                    {t('roster.view_stats')}
                </button>

                <button
                    onClick={() => onRelease(player)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-slate-950 border border-slate-800 text-slate-600 hover:bg-red-600 hover:text-white hover:border-red-500 transition-all shadow-xl active:scale-95 py-4"
                    title={t('roster.release_waivers_title')}
                >
                    <UserMinus size={18} />
                </button>
            </div>
        </div>
    );
};
