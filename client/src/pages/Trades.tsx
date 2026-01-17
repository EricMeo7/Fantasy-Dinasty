import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, RefreshCcw, LayoutGrid, Inbox } from 'lucide-react';
import { useAllRosters } from '../features/league/api/useAllRosters';
import { useMyTrades } from '../features/trades/api/useMyTrades';
import { useMyTeamInfo } from '../features/team/api/useMyTeamInfo';
import { TradeCard } from '../features/trades/components/TradeCard';
import { TradeBuilder } from '../features/trades/components/TradeBuilder';
import { CONFIG } from '../config';
import SEO from '../components/SEO/SEO';
import { useTranslation } from 'react-i18next';
import { CardSkeleton } from '../components/SkeletonLoaders';
import { EmptyState } from '../components/EmptyState';

export default function Trades() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'build' | 'pending'>('build');
    const navigate = useNavigate();

    // Fetch all rosters for the builder
    const { data: teams = [], isLoading: loadingRosters } = useAllRosters();
    const { data: pendingTrades = [], isLoading: loadingTrades } = useMyTrades();
    const { data: myTeam } = useMyTeamInfo();

    const isInitialLoading = (loadingRosters || loadingTrades) && teams.length === 0;

    if (isInitialLoading) return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-12">
            <div className="mx-auto max-w-7xl">
                <div className="h-16 w-64 bg-slate-800 animate-pulse rounded-2xl mb-12" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-slate-100 font-sans relative overflow-hidden">
            <SEO title="Scambi" description="Negozia scambi di giocatori." />

            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]"></div>
            </div>

            <div className="max-w-none px-4 md:px-6 relative z-10">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 mb-16">
                    <div className="flex items-center gap-8">
                        <div className="p-5 bg-slate-900 border border-white/5 rounded-3xl shadow-2xl relative text-blue-500 overflow-hidden group">
                            {myTeam?.id ? (
                                <img
                                    src={`${CONFIG.API_BASE_URL}/team/${myTeam.id}/logo?t=${new Date().getTime()}`}
                                    alt={myTeam.name}
                                    className="w-16 h-16 object-cover relative z-10 scale-110 group-hover:scale-125 transition-transform duration-700"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.className += ' flex items-center justify-center';
                                        (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="relative z-10 animate-in spin-in-180 duration-1000"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>';
                                    }}
                                />
                            ) : (
                                <RefreshCcw size={40} className="relative z-10 animate-in spin-in-180 duration-1000" />
                            )}
                            <div className="absolute inset-0 bg-blue-500/5 blur-xl rounded-full"></div>
                        </div>
                        <div>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="group flex items-center gap-2 text-slate-600 hover:text-white transition-all text-[9px] font-black uppercase tracking-[0.3em] mb-3"
                            >
                                <ArrowRight className="rotate-180 group-hover:-translate-x-1 transition-transform" size={12} /> Return to Dashboard
                            </button>
                            <h1 className="text-3xl md:text-7xl font-black text-white flex flex-col md:flex-row md:items-center gap-1 md:gap-4 tracking-tighter italic uppercase leading-none">
                                Trade <span className="text-blue-500">Center</span>
                            </h1>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-3">Dynasty Transaction Engine</p>
                        </div>
                    </div>

                    <div className="flex bg-slate-900/50 backdrop-blur-3xl p-2 rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden self-center lg:self-auto">
                        <button
                            onClick={() => setActiveTab('build')}
                            className={`px-10 py-4 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 active:scale-95 ${activeTab === 'build' ? 'bg-blue-600 text-white shadow-[0_10px_20px_rgba(37,99,235,0.3)] border-t border-white/10' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <LayoutGrid size={16} /> Negotiator
                        </button>
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-10 py-4 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 active:scale-95 ${activeTab === 'pending' ? 'bg-blue-600 text-white shadow-[0_10px_20px_rgba(37,99,235,0.3)] border-t border-white/10' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <Inbox size={16} />
                            Inbox
                            {pendingTrades.length > 0 && (
                                <span className="bg-red-500 h-5 w-5 rounded-full flex items-center justify-center text-[9px] text-white shadow-lg animate-pulse border border-white/20">
                                    {pendingTrades.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                    {activeTab === 'build' ? (
                        <TradeBuilder
                            teams={teams}
                            myTeamId={myTeam?.id?.toString()}
                            onSuccess={() => setActiveTab('pending')}
                        />
                    ) : (
                        <div className="max-w-4xl mx-auto space-y-10">
                            {pendingTrades.length === 0 ? (
                                <EmptyState
                                    icon={Inbox}
                                    title={t('trades.no_trades_title') || "Inbox Empty"}
                                    description={t('trades.no_trades_desc') || "You have no pending trade offers at the moment."}
                                    action={{
                                        label: t('trades.start_negotiation') || "Start Negotiation",
                                        onClick: () => setActiveTab('build')
                                    }}
                                />
                            ) : (
                                pendingTrades.map((trade) => (
                                    <TradeCard key={trade.id} trade={trade} />
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}