import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, ArrowRight, Send, Trash2, AlertCircle, Sparkles, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { useProposeTrade } from '../api/useProposeTrade';
import { useModal } from '../../../context/ModalContext';

interface PlayerDetails {
    id: number;
    externalId: number;
    firstName: string;
    lastName: string;
    position: string;
    nbaTeam: string;
    avgPoints: number;
    salaryYear1: number;
    salaryYear2: number;
    salaryYear3: number;
    injuryStatus?: string;
    injuryBodyPart?: string;
}

interface TeamRoster {
    id: number;
    userId: string;
    teamName: string;
    ownerName: string;
    players: PlayerDetails[];
}

interface TradeOffer {
    fromUserId: string;
    toUserId: string;
    playerId: number;
    salary: number;
    playerName: string;
}

interface TradeBuilderProps {
    teams: TeamRoster[];
    onSuccess: () => void;
}

export const TradeBuilder: React.FC<TradeBuilderProps> = ({ teams, onSuccess }) => {
    const { t } = useTranslation();
    const [selectedOffers, setSelectedOffers] = useState<TradeOffer[]>([]);
    const { mutate: propose, isPending } = useProposeTrade();
    const { showAlert, showConfirm } = useModal();

    const addOffer = (fromUserId: string, toUserId: string, player: PlayerDetails) => {
        if (!fromUserId || !toUserId || fromUserId === toUserId) return;

        if (selectedOffers.some(o => o.playerId === player.id)) {
            showAlert({ title: t('common.error'), message: t('trades.player_already_added'), type: 'error' });
            return;
        }

        setSelectedOffers([...selectedOffers, {
            fromUserId,
            toUserId,
            playerId: player.id,
            salary: player.salaryYear1,
            playerName: `${player.firstName} ${player.lastName}`
        }]);
    };

    const removeOffer = (pid: number) => {
        setSelectedOffers(selectedOffers.filter(o => o.playerId !== pid));
    };

    const calculateImpact = (userId: string) => {
        if (!userId) return 0;
        const incoming = selectedOffers.filter(o => o.toUserId === userId).reduce((sum, o) => sum + o.salary, 0);
        const outgoing = selectedOffers.filter(o => o.fromUserId === userId).reduce((sum, o) => sum + o.salary, 0);
        return incoming - outgoing;
    };

    const handlePropose = async () => {
        if (selectedOffers.length === 0) return;

        const confirm = await showConfirm({
            title: "Inizia Negoziazione?",
            message: "Stai per inviare questa proposta formale. Una volta firmata da tutte le parti, sarà soggetta a revisione del cap. Confermi?",
            confirmText: "Invia Proposta",
            type: 'confirm'
        });

        if (!confirm) return;

        propose({
            offers: selectedOffers.map(o => ({
                fromUserId: o.fromUserId,
                toUserId: o.toUserId,
                playerId: o.playerId
            }))
        }, {
            onSuccess: () => {
                showAlert({ title: t('common.success'), message: t('success.trade_proposed'), type: 'success' });
                setSelectedOffers([]);
                onSuccess();
            },
            onError: (e: any) => {
                const msg = e.response?.data?.message || e.response?.data || t('common.error');
                showAlert({ title: t('common.error'), message: t('error.trade_proposal_failed') + ":\n" + msg, type: 'error' });
            }
        });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {teams.map((team) => {
                        const teamIdentifier = team.userId || String(team.id);
                        const impact = calculateImpact(teamIdentifier);

                        return (
                            <div
                                key={teamIdentifier}
                                className={`group relative bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] border transition-all duration-500 shadow-2xl overflow-hidden ${impact > 0
                                    ? 'border-red-500/30 ring-4 ring-red-500/5 shadow-red-500/10'
                                    : impact < 0
                                        ? 'border-emerald-500/30 ring-4 ring-emerald-500/10 shadow-emerald-500/10'
                                        : 'border-white/5'
                                    }`}
                            >
                                <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-800 transition-colors group-hover:bg-slate-700"></div>
                                {impact !== 0 && (
                                    <div className={`absolute top-0 left-0 h-1.5 transition-all duration-500 ${impact > 0 ? 'bg-red-500 w-full shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 w-full shadow-[0_0_15px_rgba(16,185,129,0.5)]'}`}></div>
                                )}

                                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-950/40">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-blue-500 transition-colors shadow-inner">
                                            <Users size={20} />
                                        </div>
                                        <div className="overflow-hidden">
                                            <h4 className="font-black text-white italic uppercase text-lg tracking-tighter truncate leading-none">{team.teamName}</h4>
                                            <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-1 truncate">{team.ownerName}</p>
                                        </div>
                                    </div>
                                    <div className={`shrink-0 flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-widest shadow-xl ${impact > 0
                                        ? 'bg-red-500/10 border-red-500/20 text-red-500'
                                        : impact < 0
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                            : 'bg-slate-950 border-slate-800 text-slate-700'
                                        }`}>
                                        {impact > 0 ? <TrendingUp size={12} /> : impact < 0 ? <TrendingDown size={12} /> : null}
                                        {impact === 0 ? 'NEUTRAL' : `${impact > 0 ? '+' : ''}${impact.toFixed(1)} M`}
                                    </div>
                                </div>

                                <div className="p-4 max-h-[500px] overflow-y-auto custom-scrollbar-hidden space-y-3">
                                    {team.players.map((p) => {
                                        const locked = selectedOffers.some(o => o.playerId === p.id);
                                        return (
                                            <div key={p.id} className={`p-4 rounded-2xl border transition-all relative overflow-hidden group/item ${locked ? 'bg-slate-950/80 opacity-30 grayscale border-transparent' : 'bg-slate-950/40 border-white/5 hover:border-blue-500/30'}`}>

                                                <div className="flex justify-between items-center mb-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-12 w-12 bg-slate-900 rounded-2xl overflow-hidden border border-white/5 shrink-0 shadow-2xl transition-transform group-hover/item:scale-110">
                                                            <img
                                                                src={`https://cdn.nba.com/headshots/nba/latest/260x190/${p.externalId}.png`}
                                                                className="h-full object-cover translate-y-2"
                                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                                                alt=""
                                                            />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-[8px] font-black text-slate-500 border border-slate-800 px-1.5 py-0.5 rounded uppercase">{p.position}</span>
                                                                <span className="text-[9px] font-black text-emerald-500 italic">{p.avgPoints?.toFixed(1)} FP</span>
                                                                {p.injuryStatus && <span className="text-[8px] font-black text-white bg-red-600 px-1.5 py-0.5 rounded uppercase tracking-wider">{p.injuryStatus}</span>}
                                                            </div>
                                                            <div className="text-sm font-black text-white italic uppercase tracking-tighter truncate leading-tight group-hover/item:text-blue-400">{p.firstName} {p.lastName}</div>
                                                        </div>
                                                    </div>

                                                    {!locked && (
                                                        <div className="relative group/sel">
                                                            < select
                                                                onChange={(e) => addOffer(teamIdentifier, e.target.value, p)}
                                                                className="appearance-none bg-blue-600/10 hover:bg-blue-600 border border-blue-500/20 rounded-xl text-[9px] font-black px-4 py-2 text-blue-400 hover:text-white outline-none transition-all cursor-pointer w-28 uppercase tracking-widest text-center"
                                                                defaultValue=""
                                                            >
                                                                <option value="" disabled>SELECT DEST</option>
                                                                {
                                                                    teams.map((t) => {
                                                                        const tid = t.userId || String(t.id);
                                                                        if (tid === teamIdentifier) return null;
                                                                        return <option key={tid} value={tid} className="bg-slate-900">{t.teamName.toUpperCase()}</option>
                                                                    })
                                                                }
                                                            </select >
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-3 rounded-xl border border-white/5 shadow-inner">
                                                    <div className="text-center bg-slate-900/50 py-1 rounded-lg border border-white/5">
                                                        <div className="text-[7px] text-slate-700 font-black uppercase tracking-widest leading-none mb-1">Season 1</div>
                                                        <div className="text-[11px] font-black font-mono text-emerald-500">{p.salaryYear1.toFixed(1)}M</div>
                                                    </div>
                                                    <div className="text-center py-1">
                                                        <div className="text-[7px] text-slate-700 font-black uppercase tracking-widest leading-none mb-1">Season 2</div>
                                                        <div className="text-[11px] font-black font-mono text-slate-400">{p.salaryYear2 > 0 ? p.salaryYear2.toFixed(1) + 'M' : '-'}</div>
                                                    </div>
                                                    <div className="text-center py-1">
                                                        <div className="text-[7px] text-slate-700 font-black uppercase tracking-widest leading-none mb-1">Season 3</div>
                                                        <div className="text-[11px] font-black font-mono text-slate-400">{p.salaryYear3 > 0 ? p.salaryYear3.toFixed(1) + 'M' : '-'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-8 flex flex-col h-full">
                {/* PROPOSAL CARD */}
                <div className="bg-slate-900/60 backdrop-blur-3xl rounded-[3rem] p-10 shadow-[0_50px_100px_rgba(0,0,0,0.6)] sticky top-28 border border-white/5 border-t-blue-500 flex flex-col min-h-[500px]">
                    <div className="flex items-center gap-4 mb-10 overflow-hidden">
                        <div className="p-4 bg-blue-600 rounded-3xl shadow-[0_10px_20px_rgba(37,99,235,0.3)] text-white shrink-0">
                            <Send size={24} className="-rotate-12" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">Draft Hub</h3>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Components ({selectedOffers.length})</p>
                        </div>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar-hidden mb-10">
                        {selectedOffers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-10 text-center bg-slate-950/50 rounded-[2.5rem] border-2 border-dashed border-slate-800 h-64">
                                <ArrowLeftRight size={48} className="text-slate-800 mb-6" />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] leading-relaxed text-slate-700 px-4">Assign players to explore transaction dynamics</p>
                            </div>
                        ) : (
                            selectedOffers.map((off) => {
                                const fromTeam = teams.find(t => (t.userId || String(t.id)) === off.fromUserId);
                                const toTeam = teams.find(t => (t.userId || String(t.id)) === off.toUserId);
                                return (
                                    <div key={off.playerId} className="bg-slate-950 p-5 rounded-2xl border border-white/5 flex flex-col gap-4 animate-in slide-in-from-right-4 group/row shadow-xl">
                                        <div className="flex justify-between items-center">
                                            <div className="text-sm font-black text-white italic uppercase tracking-tight">{off.playerName}</div>
                                            <button
                                                onClick={() => removeOffer(off.playerId)}
                                                className="p-2 bg-slate-900 rounded-xl text-slate-700 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-white/5">
                                            <div className="flex flex-col flex-1">
                                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Exporter</span>
                                                <span className="text-[10px] font-black text-blue-400 uppercase truncate">{fromTeam?.teamName}</span>
                                            </div>
                                            <ArrowRight size={16} className="text-slate-700" />
                                            <div className="flex flex-col flex-1 text-right">
                                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Importer</span>
                                                <span className="text-[10px] font-black text-white uppercase truncate">{toTeam?.teamName}</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    <div className="pt-8 border-t border-white/5">
                        <button
                            onClick={handlePropose}
                            disabled={selectedOffers.length === 0 || isPending}
                            className="w-full bg-blue-600 hover:bg-blue-550 border-t border-white/10 text-white py-6 rounded-2xl font-black uppercase italic tracking-tighter text-2xl shadow-[0_20px_50px_rgba(37,99,235,0.4)] transform transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-4"
                        >
                            {
                                isPending ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
                            {
                                isPending ? "Processing..." : "Initialize Deal"}
                        </button>
                    </div>
                </div>

                {/* RULES CARD */}
                <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[2rem] p-8 shadow-2xl">
                    <div className="flex items-center gap-4 text-amber-500 mb-6">
                        <div className="p-2 bg-amber-500/10 rounded-lg"><AlertCircle size={20} /></div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Fair-Trade Protocols</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-bold uppercase tracking-widest italic">
                        Syndicate servers will execute a Triple-Year CAP audit. All involved entities must maintain fiscal integrity (+0.0) across the 3G-Lease period.
                    </p>
                </div>
            </div>
        </div>
    );
};

function Loader2({ className, size }: { className: string, size: number }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    )
}
