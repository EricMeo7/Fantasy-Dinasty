import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, RefreshCcw, LayoutGrid, Inbox, Sparkles } from 'lucide-react';
import { useAllRosters } from '../features/league/api/useAllRosters';
import { useMyTrades } from '../features/trades/api/useMyTrades';
import { TradeCard } from '../features/trades/components/TradeCard';
import { TradeBuilder } from '../features/trades/components/TradeBuilder';
import SEO from '../components/SEO/SEO';

export default function Trades() {
    const [activeTab, setActiveTab] = useState<'build' | 'pending'>('build');
    const navigate = useNavigate();

    // Fetch all rosters for the builder
    const { data: teams = [], isLoading: loadingRosters } = useAllRosters();
    const { data: pendingTrades = [], isLoading: loadingTrades } = useMyTrades();

    const loading = loadingRosters || loadingTrades;

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="animate-spin mb-6 text-blue-500" size={48} />
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-blue-400">Interfacing with Trade Protocols...</p>
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

            <div className="mx-auto max-w-7xl relative z-10">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 mb-16">
                    <div className="flex items-center gap-8">
                        <div className="p-5 bg-slate-900 border border-white/5 rounded-3xl shadow-2xl relative text-blue-500">
                            <RefreshCcw size={40} className="relative z-10 animate-in spin-in-180 duration-1000" />
                            <div className="absolute inset-0 bg-blue-500/5 blur-xl rounded-full"></div>
                        </div>
                        <div>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="group flex items-center gap-2 text-slate-600 hover:text-white transition-all text-[9px] font-black uppercase tracking-[0.3em] mb-3"
                            >
                                <ArrowRight className="rotate-180 group-hover:-translate-x-1 transition-transform" size={12} /> Return to Dashboard
                            </button>
                            <h1 className="text-5xl md:text-7xl font-black text-white flex items-center gap-4 tracking-tighter italic uppercase leading-none">
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
                        <TradeBuilder teams={teams} onSuccess={() => setActiveTab('pending')} />
                    ) : (
                        <div className="max-w-4xl mx-auto space-y-10">
                            {pendingTrades.length === 0 ? (
                                <div className="relative overflow-hidden">
                                    <div className="text-center py-48 bg-slate-900/40 backdrop-blur-3xl rounded-[4rem] border border-white/5 shadow-inner">
                                        <div className="p-6 bg-slate-950/50 rounded-3xl w-fit mx-auto mb-8 border border-slate-800 shadow-2xl relative">
                                            <Sparkles size={48} className="text-slate-800" />
                                            <div className="absolute inset-0 bg-blue-500/5 blur-2xl rounded-full"></div>
                                        </div>
                                        <p className="text-slate-600 font-black uppercase text-xs tracking-[0.4em] italic mb-2">Protocol Standby</p>
                                        <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">No active trade documents found in current league cycle</p>
                                    </div>
                                </div>
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