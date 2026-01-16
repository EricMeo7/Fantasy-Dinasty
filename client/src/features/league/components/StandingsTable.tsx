import { Crown, ShieldCheck, ChevronRight } from 'lucide-react';

interface Standing {
    teamId: number;
    fantasyTeamName: string;
    generalManagerName: string;
    isAdmin: boolean;
    isMe: boolean;
    gamesPlayed: number;
    wins: number;
    losses: number;
    totalPoints: number;
    winPercentage: number;
}

interface Props {
    standings: Standing[];
    title?: string;
    icon?: React.ReactNode;
    color?: string;
}

export const StandingsTable = ({ standings, title = "Classifica Lega", icon, color = "text-yellow-500" }: Props) => {
    return (
        <div className={`bg-slate-900/50 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-md flex flex-col h-full`}>
            <div className="px-8 py-6 border-b border-slate-800 bg-slate-800/20 flex justify-between items-center shrink-0">
                <h3 className="font-black text-white uppercase tracking-widest italic flex items-center gap-3">
                    {icon || <Crown size={20} className={color} />}
                    {title}
                </h3>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Regular Season
                </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar flex-1">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10">
                        <tr className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] bg-slate-950/80 backdrop-blur-sm">
                            <th className="px-8 py-5">Rank</th>
                            <th className="px-8 py-5">Team & GM</th>
                            <th className="px-8 py-5 text-center">Record</th>
                            <th className="px-8 py-5 text-center">Fantasy Points</th>
                            <th className="px-8 py-5 text-center text-slate-700">PCT</th>
                            <th className="px-8 py-5"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {standings.map((team, index) => (
                            <tr key={index} className={`group hover:bg-white/5 transition-all duration-300 ${team.isMe ? 'bg-blue-600/10 shadow-[inset_4px_0_0_0_#3b82f6] relative z-10' : ''}`}>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm italic shadow-lg ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-slate-950 scale-110' :
                                            index === 1 ? 'bg-slate-300 text-slate-900' :
                                                index === 2 ? 'bg-orange-600 text-white' :
                                                    'bg-slate-800 text-slate-500'
                                            }`}>
                                            {index + 1}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <div className="font-black text-white uppercase italic tracking-tight flex items-center gap-2 group-hover:text-blue-400 transition-colors">
                                                {team.fantasyTeamName}
                                                {team.isMe && <span className="bg-blue-500 text-[8px] px-1.5 py-0.5 rounded font-black italic text-white ml-1 shadow-lg shadow-blue-500/20">YOU</span>}
                                                {team.isAdmin && <ShieldCheck size={14} className="text-blue-500" />}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{team.generalManagerName}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <div className="flex justify-center items-center font-black italic text-lg tracking-tighter">
                                        <span className="text-white">{team.wins}</span>
                                        <span className="text-slate-700 mx-1">-</span>
                                        <span className="text-slate-500">{team.losses}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-center font-mono">
                                    <span className="text-emerald-500 font-black text-lg italic">{team.totalPoints.toFixed(1)}</span>
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <span className="text-slate-600 text-xs font-black tracking-widest italic">
                                        {(team.winPercentage * 100).toFixed(1)}%
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ChevronRight size={18} className="text-slate-700" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {standings.length === 0 && (
                <div className="py-20 text-center">
                    <p className="text-slate-600 italic font-medium">Nessuna squadra iscritta a questa lega.</p>
                </div>
            )}
        </div>
    );
};
