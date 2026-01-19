import { useNavigate } from 'react-router-dom';
import { Trophy, Loader2, Activity, Globe, ArrowRight } from 'lucide-react';
import { useLeagueDetails } from '../features/league/api/useLeagueDetails';
import { CONFIG } from '../config';
import { LeagueHeader } from '../features/league/components/LeagueHeader';
import { StandingsTable } from '../features/league/components/StandingsTable';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO/SEO';

export default function League() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { data: league, isLoading, isError } = useLeagueDetails();

    const [activeTab, setActiveTab] = useState<'EAST' | 'WEST'>('EAST'); // State for tabs

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="animate-spin mb-8 text-amber-500" size={64} />
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-amber-400">{t('league.retrieving_matrix')}</p>
            </div>
        );
    }

    if (isError || !league) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-red-500 gap-8">
                <div className="p-6 bg-red-600/10 rounded-full border border-red-500/20 shadow-2xl"><Activity size={48} /></div>
                <p className="font-black italic text-2xl tracking-tighter uppercase leading-none">{t('league.feed_compromised')}</p>
                <button onClick={() => window.location.reload()} className="px-10 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-2xl active:scale-95">{t('league.request_resync')}</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-slate-100 font-sans pb-32 relative overflow-hidden">
            <SEO title="Classifica" description="Consulta la classifica della lega." />

            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute top-[30%] right-[-10%] w-[40%] h-[40%] bg-amber-600/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="mx-auto max-w-7xl relative z-10">

                {/* Navigation & Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 mb-16">
                    <div className="flex items-center gap-8">
                        <div className="p-5 bg-slate-900 border border-white/5 rounded-3xl shadow-2xl relative text-amber-500">
                            <Trophy size={40} className="relative z-10 animate-in zoom-in-50 duration-1000" />
                            <div className="absolute inset-0 bg-amber-500/5 blur-xl rounded-full"></div>
                        </div>
                        <div>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="group flex items-center gap-2 text-slate-600 hover:text-white transition-all text-[9px] font-black uppercase tracking-[0.3em] mb-3"
                            >
                                <ArrowRight className="rotate-180 group-hover:-translate-x-1 transition-transform" size={12} /> {t('league.return_dashboard')}
                            </button>
                            <h1 className="text-3xl md:text-7xl font-black text-white flex flex-col md:flex-row md:items-center gap-1 md:gap-4 tracking-tighter italic uppercase leading-none">
                                {t('league.title')} <span className="text-amber-500 text-3xl md:text-8xl md:px-2">{t('league.matrix')}</span>
                            </h1>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-3">{t('league.description')}</p>
                        </div>
                    </div>

                    <div className="bg-slate-950/50 backdrop-blur-3xl px-8 py-5 rounded-[2rem] border border-white/5 shadow-2xl flex items-center gap-6">
                        <LeagueHeader leagueName={league.name} inviteCode={league.inviteCode} />
                    </div>
                </div>

                {/* Standings Table Container */}
                <div className="relative">
                    <div className="absolute -top-10 left-8 px-6 py-2 bg-slate-950 border border-slate-800 rounded-t-2xl border-b-0 inline-flex items-center gap-3 z-20">
                        <div className="h-1.5 w-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('league.ranking_intel')}</span>
                    </div>

                    <div className="bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] border border-white/5 overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom-10 duration-1000 relative">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-600 via-amber-400 to-transparent opacity-50"></div>

                        <div className="px-10 py-10 border-b border-white/5 bg-slate-950/40 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-5">
                                <div className="h-16 w-16 rounded-2xl border border-amber-500/20 overflow-hidden relative bg-slate-900 flex items-center justify-center">
                                    <img
                                        src={`${CONFIG.API_BASE_URL}/league/${localStorage.getItem('selectedLeagueId')}/logo?t=${new Date().getTime()}`}
                                        alt={t('modals.league_settings.league_logo')}
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                        }}
                                    />
                                    <div className="hidden absolute inset-0 flex items-center justify-center text-amber-500">
                                        <Globe size={24} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-black text-white uppercase tracking-tighter text-3xl italic leading-none">{league.name}</h3>
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-2">{t('league.active_season')}</p>
                                </div>
                            </div>

                            {/* TABS SWITCHER */}
                            {league.standings.some((s: any) => s.division === 1 || s.division === 2) && (
                                <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-full border border-white/10">
                                    <button
                                        onClick={() => setActiveTab('EAST')}
                                        className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'EAST' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                    >
                                        {t('league.eastern')}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('WEST')}
                                        className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'WEST' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                    >
                                        {t('league.western')}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="p-8 md:p-12">
                            {/* Logic to split if divisions exist */}
                            {league.standings.some((s: any) => s.division === 1 || s.division === 2) ? (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {activeTab === 'EAST' ? (
                                        /* EAST */
                                        <div className="h-[600px]">
                                            <StandingsTable
                                                standings={league.standings.filter((s: any) => s.division === 1)}
                                                title={t('league.eastern_conference')}
                                                color="text-indigo-400"
                                                icon={<span className="text-2xl mr-2">⚡</span>}
                                            />
                                        </div>
                                    ) : (
                                        /* WEST */
                                        <div className="h-[600px]">
                                            <StandingsTable
                                                standings={league.standings.filter((s: any) => s.division === 2)}
                                                title={t('league.western_conference')}
                                                color="text-rose-400"
                                                icon={<span className="text-2xl mr-2">🔥</span>}
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="h-[600px]">
                                    <StandingsTable standings={league.standings} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Passive Text */}
                <div className="mt-16 flex flex-col md:flex-row justify-between items-center gap-8 px-10 opacity-20">
                    <div className="flex items-center gap-4">
                        <Activity size={18} className="text-amber-500" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">{t('league.system_parity')}</span>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.3em]">{t('league.global_leaderboard')}</span>
                </div>
            </div>
        </div>
    );
}
