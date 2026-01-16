import { Calendar, AlertOctagon, TrendingDown, DollarSign } from 'lucide-react';

interface SeasonBudget {
    season: string;
    totalCap: number;
    contracts: number;
    deadMoney: number;
    freeSpace: number;
}

interface DeadCapDetail {
    playerName: string;
    season: string;
    amount: number;
}

interface FinanceOverview {
    years: SeasonBudget[];
    deadCapDetails: DeadCapDetail[];
}

interface Props {
    finance: FinanceOverview | null;
}

export const BudgetOverview = ({ finance }: Props) => {
    if (!finance) return null;

    const getWidth = (val: number, max: number) => Math.min(100, (val / max) * 100);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {finance.years.map((y, idx) => (
                    <div key={idx} className={`group rounded-[2rem] border p-8 relative overflow-hidden transition-all duration-500 shadow-2xl ${idx === 0
                            ? 'bg-slate-900 border-emerald-500/30 ring-4 ring-emerald-500/5'
                            : 'bg-slate-900/50 border-slate-800'
                        }`}>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl border ${idx === 0 ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                    <Calendar size={18} />
                                </div>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Stagione {y.season}</div>
                            </div>
                            {idx === 0 && <span className="text-[8px] font-black bg-emerald-500 text-slate-950 px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg shadow-emerald-500/20">Active Now</span>}
                        </div>

                        <div className="relative mb-6">
                            <div className="text-4xl font-black text-white italic tracking-tighter leading-none flex items-baseline gap-1">
                                <span className="text-xl text-slate-600 not-italic">$</span>{y.freeSpace.toFixed(1)} <span className="text-sm uppercase text-slate-500">M</span>
                            </div>
                            <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-2">Available Cap Space</div>
                        </div>

                        <div className="space-y-4">
                            <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex shadow-inner border border-white/5">
                                <div className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-1000" style={{ width: `${getWidth(y.contracts, y.totalCap)}%` }}></div>
                                <div className="h-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all duration-1000" style={{ width: `${getWidth(y.deadMoney, y.totalCap)}%` }}></div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <BudgetLine label="Active Contracts" value={y.contracts} color="blue" />
                                <BudgetLine label="Dead Money" value={y.deadMoney} color="red" />
                            </div>
                        </div>

                        <div className="absolute -right-8 -bottom-8 p-4 opacity-[0.03] text-white group-hover:scale-110 transition-transform duration-700">
                        <DollarSign size={160} />
                    </div>
                    </div>
                ))}
        </div>

            {
        finance.deadCapDetails.length > 0 && (
                <div className="bg-red-500/5 backdrop-blur-xl border border-red-500/20 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 text-red-500">
                        <TrendingDown size={100} />
                    </div>
                    <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                        <AlertOctagon size={16} /> Dead Money Audit Report
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                        {finance.deadCapDetails.map((d, i) => (
                            <div key={i} className="bg-slate-950/80 border border-red-900/30 rounded-2xl p-4 flex justify-between items-center group hover:border-red-500/50 transition-all">
                                <div>
                                    <div className="font-black text-white uppercase italic tracking-tight text-sm leading-none mb-1">{d.playerName}</div>
                                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none">{d.season}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-black text-red-500 text-lg italic leading-none">-{d.amount} M</div>
                                    <div className="text-[8px] font-black text-red-900 uppercase tracking-tighter mt-1 leading-none uppercase">Penalty Fee</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

function BudgetLine({ label, value, color }: { label: string, value: number, color: 'blue' | 'red' }) {
    const colorClasses = color === 'blue' ? 'bg-blue-500 text-blue-400' : 'bg-red-500 text-red-400';
    return (
        <div className="flex justify-between items-center">
            <div className ="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${colorClasses.split(' ')[0]}`
}></div>
    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
            </div>
    <span className={`text-[11px] font-black font-mono italic ${colorClasses.split(' ')[1]}`}>{value.toFixed(1)} M</span>
        </div>
    );
}
