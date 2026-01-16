import { PlayerLineupCard } from './PlayerLineupCard';
import { Users, Shirt, Activity } from 'lucide-react';

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
    avgFantasyPoints: number;
    realPoints: number | null;
}

interface Props {
    starters: LineupDto[];
    bench: LineupDto[];
    onToggle: (playerId: number) => void;
    isSaving: boolean;
    isLocked?: boolean;
}

export const LineupList = ({ starters, bench, onToggle, isSaving, isLocked = false }: Props) => {

    // Calculate projected points
    const projectPoints = starters.reduce((acc, p) => acc + p.avgFantasyPoints, 0);

    return (
        <div className="space-y-12">

            {/* Stats Header */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex items-center justify-between group">
                    <div>
                        <div className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mb-1">Starting Five</div>
                        <div className="text-3xl font-black text-white italic leading-none">{starters.length} <span className="text-slate-700">/ 5</span></div>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                        <Users size={24} />
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex items-center justify-between group">
                    <div>
                        <div className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mb-1">Projected Score</div>
                        <div className="text-3xl font-black text-emerald-500 italic leading-none">{projectPoints.toFixed(1)}</div>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <Activity size={24} />
                    </div>
                </div>
            </div>

            {/* Starters Section */}
            <div className="relative">
                <div className="flex items-center gap-3 mb-6 pl-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500">
                        <Shirt size={18} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-200 italic">Quintetto Base</h3>
                    <div className="h-px flex-1 bg-slate-800/50 ml-4"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {starters.length > 0 ? (
                        starters.map(p => (
                            <PlayerLineupCard
                                key={p.id}
                                player={p}
                                isEditable={!isSaving && !isLocked}
                                onToggleStarter={onToggle}
                            />
                        ))
                    ) : (
                        <div className="col-span-full py-16 border-2 border-dashed border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-600 gap-3">
                            <Users size={32} className="opacity-20" />
                            <p className="font-medium italic">Nessun titolare assegnato per questa data.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bench Section */}
            <div className="relative">
                <div className="flex items-center gap-3 mb-6 pl-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500">
                        <Users size={18} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 italic">Second Unit / Bench</h3>
                    <div className="h-px flex-1 bg-slate-800/50 ml-4"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bench.map(p => (
                        <PlayerLineupCard
                            key={p.id}
                            player={p}
                            isEditable={!isSaving && !isLocked}
                            onToggleStarter={onToggle}
                        />
                    ))}
                </div>
            </div>

        </div>
    );
};
