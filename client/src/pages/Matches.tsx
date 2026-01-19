import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronLeft, ChevronRight, Loader2, Sparkles, Activity, Clock, ArrowRight, Grid, X } from 'lucide-react';
import { useMatchups } from '../features/matchup/api/useMatchups';
import { MatchupCard } from '../features/matchup/components/MatchupCard';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO/SEO';


export default function Matches() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { data: schedule = [], isLoading, isError } = useMatchups();
    const [selectedWeek, setSelectedWeek] = useState<number>(1);
    const [isWeekSelectorOpen, setIsWeekSelectorOpen] = useState(false);

    // Group schedule by Week if it comes flat
    const weeks = Array.from(new Set(schedule.map((m: any) => m.weekNumber))).sort((a: any, b: any) => Number(a) - Number(b));

    // Default to the first unplayed week or current week if possible
    useEffect(() => {
        if (schedule.length > 0) {
            const firstUnplayed = schedule.find((m: any) => !m.isPlayed);
            if (firstUnplayed) {
                setSelectedWeek(firstUnplayed.weekNumber);
            }
        }
    }, [schedule]);

    const currentWeekMatches = schedule.filter((m: any) => m.weekNumber === selectedWeek);

    const handlePrev = () => {
        if (selectedWeek > 1) setSelectedWeek(p => p - 1);
    };

    const handleNext = () => {
        if (selectedWeek < (weeks.length || 24)) setSelectedWeek(p => p + 1);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="animate-spin mb-8 text-blue-500" size={64} />
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-blue-400">{t('matches.synchronizing')}</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-red-500 gap-8">
                <div className="p-6 bg-red-600/10 rounded-full border border-red-500/20 shadow-2xl"><Activity size={48} /></div>
                <div className="text-center capitalize font-black italic text-2xl tracking-tighter">{t('matches.interrupted')}</div>
                <button onClick={() => window.location.reload()
                } className="px-10 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">{t('matches.resync')}</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-white font-sans pb-32 relative overflow-hidden">
            <SEO title={t('matches.title')} description={t('matches.seo_description')} />

            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="mx-auto max-w-6xl relative z-10">

                {/* Navigation & Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 mb-16">
                    <div className="flex items-center gap-8">
                        <div className="p-5 bg-slate-900 border border-white/5 rounded-3xl shadow-2xl relative text-blue-500">
                            <Calendar size={40} className="relative z-10 animate-in slide-in-from-left-4 duration-700" />
                            <div className="absolute inset-0 bg-blue-500/5 blur-xl rounded-full"></div>
                        </div>
                        <div>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="group flex items-center gap-2 text-slate-600 hover:text-white transition-all text-[9px] font-black uppercase tracking-[0.3em] mb-3"
                            >
                                <ArrowRight className="rotate-180 group-hover:-translate-x-1 transition-transform" size={12} /> {t('matches.return_dashboard')}
                            </button>
                            <h1 className="text-5xl md:text-7xl font-black text-white flex items-center gap-4 tracking-tighter italic uppercase leading-none">
                                {t('matches.match')} <span className="text-blue-500">{t('matches.grid')}</span>
                            </h1>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-3">{t('matches.subtitle')}</p>
                        </div>
                    </div>

                    <div className="bg-slate-950/50 backdrop-blur-3xl px-8 py-4 rounded-[2rem] border border-white/5 shadow-2xl flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('matches.status_label')}</span>
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mt-2 flex items-center gap-2">
                                <Clock size={12} className="animate-spin-slow" /> {t('matches.live_monitoring')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-12">
                    {/* Week Selector */}
                    <div className="relative">
                        <div className="absolute -top-10 left-8 px-6 py-2 bg-slate-950 border border-slate-800 rounded-t-2xl border-b-0 inline-flex items-center gap-3 z-20">
                            <Sparkles size={14} className="text-blue-500" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('matches.temporal_navigation')}</span>
                        </div>

                        <div className="flex items-center justify-between bg-slate-900/60 backdrop-blur-3xl rounded-[3rem] p-10 border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative group z-20">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-transparent to-emerald-600/5 rounded-[3rem]"></div>

                            <button
                                onClick={handlePrev}
                                disabled={selectedWeek <= 1}
                                className="relative z-10 p-5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-white/5 disabled:opacity-30 disabled:hover:bg-slate-950 transition-all text-white shadow-2xl active:scale-90"
                            >
                                <ChevronLeft size={32} />
                            </button>

                            <div className="text-center relative z-10">
                                <span className="text-[12px] text-slate-600 uppercase font-black tracking-[0.4em] block mb-4 italic">{t('matches.fiscal_week_control')}</span>
                                <div
                                    onClick={() => setIsWeekSelectorOpen(!isWeekSelectorOpen)}
                                    className="flex items-baseline justify-center gap-3 bg-slate-950/80 px-10 py-3 rounded-[2rem] border border-white/5 shadow-inner hover:scale-105 hover:bg-slate-900 cursor-pointer transition-all duration-300 relative"
                                >
                                    <span className="text-6xl font-black text-white italic tracking-tighter tabular-nums">{selectedWeek}</span>
                                    <span className="text-slate-800 font-black text-2xl italic tracking-widest">/ {weeks.length}</span>

                                    {/* Hint for interaction */}
                                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1">
                                            <Grid size={10} /> {t('matches.change_week')}
                                        </span>
                                    </div>
                                </div>

                                {/* Week Selector Overlay */}
                                {isWeekSelectorOpen && (
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-[300px] z-50 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="bg-slate-950/90 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                                            <div className="flex justify-between items-center mb-4 px-2">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('matches.select_week')}</span>
                                                <button onClick={() => setIsWeekSelectorOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto pr-1 small-scrollbar">
                                                {weeks.map((week: any) => (
                                                    <button
                                                        key={week}
                                                        onClick={() => {
                                                            setSelectedWeek(week);
                                                            setIsWeekSelectorOpen(false);
                                                        }}
                                                        className={`p-3 rounded-xl text-sm font-black italic transition-all ${selectedWeek === week
                                                            ? 'bg-blue-600 text-white shadow-lg scale-105'
                                                            : 'bg-slate-900 text-slate-500 hover:bg-slate-800 hover:text-white'
                                                            }`}
                                                    >
                                                        {week}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentWeekMatches.length > 0 && currentWeekMatches[0].weekStart && (
                                    <span className="mt-5 inline-block px-4 py-1.5 rounded-full bg-slate-950 border border-white/10 text-[9px] text-blue-400 font-black uppercase tracking-widest shadow-xl">
                                        {new Date(currentWeekMatches[0].weekStart).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                        {' — '}
                                        {new Date(currentWeekMatches[0].weekEnd).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                    </span>
                                )}
                            </div>

                            <button
                                onClick={handleNext}
                                disabled={selectedWeek >= (weeks.length || 24)}
                                className="relative z-10 p-5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-white/5 disabled:opacity-30 disabled:hover:bg-slate-950 transition-all text-white shadow-2xl active:scale-90"
                            >
                                <ChevronRight size={32} />
                            </button>
                        </div>
                    </div>

                    {/* Matches Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        {
                            currentWeekMatches.length > 0 ? (
                                currentWeekMatches.map((match: any) => (
                                    <MatchupCard key={match.id} match={match} />
                                ))
                            ) : (
                                <div className="col-span-full text-center py-32 bg-slate-900/40 backdrop-blur-3xl border-2 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center justify-center group">
                                    <Activity size={80} className="text-slate-900 mb-8 group-hover:scale-110 transition-transform duration-700" />
                                    <h4 className="text-3xl font-black italic uppercase text-slate-700 tracking-tighter leading-none mb-4">{t('matches.dormant_schedule')}</h4>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-800">{t('matches.dormant_desc')}</p>
                                </div>
                            )
                        }
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-16 text-center opacity-20">
                    <p className="text-[9px] font-black uppercase tracking-[0.5em]">{t('matches.global_sync_operational')}</p>
                </div>
            </div>
        </div>
    );
}
