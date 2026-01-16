import { MinusCircle, PlusCircle, AlertTriangle, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LineupDto {
    id: number;
    playerId: number;
    name: string;
    position: string;
    nbaTeam: string;
    isStarter: boolean;
    benchOrder: number;
    hasGame: boolean;
    opponent: string;
    gameTime: string;
    injuryStatus: string | null;
    injuryBodyPart?: string | null;
    avgFantasyPoints: number;
    realPoints: number | null;
}

interface Props {
    player: LineupDto;
    isEditable: boolean;
    onToggleStarter: (playerId: number) => void;
}

export const PlayerLineupCard = ({ player, isEditable, onToggleStarter }: Props) => {
    const { t } = useTranslation();

    return (
        <div className={`group relative flex items-center justify-between p-4 rounded-[1.5rem] border transition-all duration-300 shadow-lg
            ${player.isStarter
                ? 'bg-slate-900 border-blue-500/30 hover:border-blue-500/50'
                : 'bg-slate-950 border-slate-800/50 hover:border-slate-700'
            }`}>

            {/* Left: Info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs italic border shadow-inner shrink-0 transition-colors
                    ${player.isStarter
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-500 group-hover:bg-slate-700'
                    }`}>
                    {player.position}
                </div>

                <div className="truncate">
                    <div className="font-black text-white uppercase italic tracking-tight flex items-center gap-2 group-hover:text-blue-400 transition-colors truncate">
                        {player.name}
                        {player.injuryStatus && player.injuryStatus !== 'Active' && (
                            <span className="shrink-0 text-red-500 bg-red-500/10 p-1 rounded-lg" title={player.injuryBodyPart || player.injuryStatus}>
                                <AlertTriangle size={12} />
                            </span>
                        )}
                    </div>
                    <div className="text-[9px] uppercase font-black tracking-[0.2em] mt-1 flex items-center gap-2 flex-wrap">
                        <span className="text-slate-500">{player.nbaTeam}</span>
                        {player.hasGame ? (
                            <span className="text-blue-500 bg-blue-500/5 border border-blue-500/20 px-2 py-0.5 rounded italic">
                                vs {player.opponent} <span className="text-[8px] text-slate-700">•</span> {player.gameTime}
                            </span>
                        ) : (
                            <span className="text-slate-700 italic">No Game</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Right: Actions / Stats */}
            <div className="flex items-center gap-6 ml-4">
                <div className="text-right shrink-0">
                    <div className="text-[8px] text-slate-600 font-black uppercase tracking-[0.2em] mb-0.5 flex items-center justify-end gap-1">
                        <Activity size={10} /> AVG
                    </div>
                    <div className={`font-black italic text-lg leading-none ${player.isStarter ? 'text-emerald-500' : 'text-slate-500'}`}>
                        {player.avgFantasyPoints.toFixed(1)}
                    </div>
                </div>

                {isEditable && (
                    <button
                        onClick={() => onToggleStarter(player.playerId)}
                        className={`p-3 rounded-2xl transition-all active:scale-90 shadow-xl border
                            ${player.isStarter
                                ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-600 hover:text-white hover:border-red-500'
                                : 'bg-emerald-600/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-600 hover:text-white hover:border-emerald-500'
                            }`}
                        title={player.isStarter ? t('lineup.move_to_bench') : t('lineup.move_to_starters')}
                    >
                        {player.isStarter ? <MinusCircle size={20} /> : <PlusCircle size={20} />}
                    </button>
                )}
            </div>
        </div>
    );
};
