import { useNavigate } from 'react-router-dom';
import {
  Users, Trophy, Calendar, ShoppingCart, Gavel,
  PlayCircle, Loader2, Search, ArrowLeftRight,
  Activity, ArrowUpRight, Sparkles, TrendingUp, ArrowRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Hooks
import { useMyTrades } from '../features/trades/api/useMyTrades';
import { useLeagueStatus } from '../features/admin/api/useLeagueStatus';
import { useMatchDetails } from '../features/league/api/useMatchDetails';
import { useMyRoster } from '../features/roster/api/useMyRoster';
import { useMyTeamInfo } from '../features/team/api/useMyTeamInfo'; // NEW
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { CONFIG } from '../config';
import LineupTimer from '../components/LineupTimer';
import SEO from '../components/SEO/SEO';

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // React Query Hooks
  const { data: statusData, isLoading: loadingStatus } = useLeagueStatus();
  const { data: currentMatch, isLoading: loadingMatch } = useMatchDetails();
  const { data: roster = [], isLoading: loadingRoster } = useMyRoster();
  const { data: trades = [] } = useMyTrades();
  const { data: myTeam } = useMyTeamInfo(); // NEW

  const todayStr = new Date().toISOString().split('T')[0];
  const { data: lockStatus } = useQuery({
    queryKey: ['lineupStatus', todayStr],
    queryFn: () => api.lineup.getStatus(todayStr).then(r => r.data),
  });

  const leagueStatus = statusData ?? 0;
  const pendingTradesCount = trades.filter(t => !t.isMeProposer && !t.didIAccept).length;
  const injuredPlayers = roster.filter((p: any) => p.injuryStatus && p.injuryStatus !== 'Active');
  const hasTeam = roster.length > 0;

  const loading = loadingStatus || loadingMatch || loadingRoster;

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500">
      <Loader2 className="animate-spin text-blue-500 mb-6" size={48} />
      <p className="font-mono animate-pulse tracking-[0.4em] uppercase text-[10px] text-blue-400">{t('dashboard.initializing')}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 relative overflow-hidden">
      <SEO title="Dashboard" description="Gestisci la tua squadra, visualizza le partite e il mercato." />

      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-5%] right-[-5%] w-[45%] h-[45%] bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[100px]"></div>
      </div>

      <main className="container mx-auto p-4 md:p-12 max-w-7xl relative z-10">

        {/* 1. SEZIONE RIEPILOGO ALERTS (Se ci sono novità importanti) */}
        {hasTeam && (currentMatch || injuredPlayers.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 mb-8 md:mb-16 mt-4 animate-in fade-in slide-in-from-top-6 duration-700">

            {/* WIDGET PARTITA CORRENTE */}
            {currentMatch ? (
              <div
                onClick={() => navigate('/matches')}
                className="bg-slate-900/60 backdrop-blur-3xl border border-white/5 hover:border-blue-500/30 rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden group cursor-pointer transition-all duration-500 h-auto min-h-[24rem] md:min-h-[28rem] flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 transition-transform duration-1000"><Trophy size={120} /></div>
                <div className="flex justify-between items-start mb-6 md:mb-8">
                  <div className="flex items-center gap-2 md:gap-3 bg-blue-500/10 border border-blue-500/20 px-3 md:px-4 py-1.5 rounded-full">
                    <Trophy size={14} className="text-blue-500" />
                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">{t('dashboard.active_matchup')}</span>
                  </div>
                  {currentMatch.isPlayed ? (
                    <span className="text-[10px] font-black uppercase bg-slate-950 px-3 py-1 rounded-lg text-slate-500 border border-slate-800">{t('dashboard.archived')}</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      {lockStatus?.lockTime && !lockStatus.isLocked && new Date() < new Date(lockStatus.lockTime) && (
                        <LineupTimer targetDate={new Date(lockStatus.lockTime)} className="py-1 px-3 border-none bg-blue-500/10 text-[9px]" />
                      )}
                      <span className="text-[8px] md:text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 px-3 md:px-4 py-1.5 rounded-full border border-emerald-500/20 animate-pulse">{t('dashboard.network_live')}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 md:gap-4 relative z-10">
                  <div className="flex flex-col flex-1">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-slate-950/80 border border-slate-800 mb-4 overflow-hidden shadow-lg self-start">
                      <img src={`${CONFIG.API_BASE_URL}/team/${currentMatch.homeTeamId}/logo?t=${new Date().getTime()}`} alt={currentMatch.homeTeam} className="w-full h-full object-cover" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                    </div>
                    <div className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-1 ${currentMatch.homeScore > currentMatch.homeScore ? "text-blue-400" : "text-slate-600"}`}>
                      {currentMatch.homeScore > currentMatch.awayScore && t('dashboard.winning')}
                    </div>
                    <h4 className="text-lg md:text-2xl font-black text-white italic uppercase tracking-tighter leading-none break-words line-clamp-2">{currentMatch.homeTeam}</h4>
                    <span className="text-3xl md:text-5xl font-black text-blue-500 italic mt-2 md:mt-2 tracking-tighter tabular-nums">{currentMatch.homeScore.toFixed(1)}</span>
                  </div>
                  <div className="px-2 md:px-4 flex flex-col items-center pt-10">
                    <div className="text-slate-800 text-[10px] font-black tracking-[0.3em] italic">VS</div>
                    <div className="h-8 md:h-12 w-px bg-gradient-to-b from-transparent via-slate-800 to-transparent mt-2 md:mt-4"></div>
                  </div>
                  <div className="flex flex-col flex-1 text-right items-end">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-slate-950/80 border border-slate-800 mb-4 overflow-hidden shadow-lg">
                      <img src={`${CONFIG.API_BASE_URL}/team/${currentMatch.awayTeamId}/logo?t=${new Date().getTime()}`} alt={currentMatch.awayTeam} className="w-full h-full object-cover" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                    </div>
                    <div className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-1 ${currentMatch.awayScore > currentMatch.homeScore ? "text-emerald-400" : "text-slate-600"}`}>
                      {
                        currentMatch.awayScore > currentMatch.homeScore && t('dashboard.leading')}
                    </div>
                    <h4 className="text-lg md:text-2xl font-black text-white italic uppercase tracking-tighter leading-none break-words line-clamp-2">{currentMatch.awayTeam}</h4>
                    <span className="text-3xl md:text-5xl font-black text-emerald-500 italic mt-2 md:mt-2 tracking-tighter tabular-nums">{currentMatch.awayScore.toFixed(1)}</span>
                  </div>
                </div>
                <div className="mt-6 md:mt-10 pt-4 md:pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                  <span className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('dashboard.real_time_stream')}</span>
                  <div className="flex items-center gap-2 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-blue-400 group-hover:text-white transition-colors">
                    {t('dashboard.match_analysis')} <ArrowUpRight size={14} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 border-dashed rounded-[2rem] md:rounded-[3rem] p-8 md:p-12 flex flex-col items-center justify-center text-center h-auto min-h-[20rem] md:h-[28rem]">
                <Calendar size={40} className="text-slate-800 mb-6" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 italic">{t('dashboard.match_matrix_idle')}</p>
              </div>
            )
            }

            {/* WIDGET INFERMIERIA */}
            <div className="bg-slate-900/60 backdrop-blur-3xl border border-white/5 rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col h-auto min-h-[24rem] md:h-[28rem]">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_bottom_right,rgba(239,68,68,0.03),transparent_50%)]"></div>
              <div className="flex justify-between items-center mb-6 md:mb-8 relative z-10">
                <div className="flex items-center gap-2 md:gap-3 bg-red-600/10 border border-red-500/20 px-3 md:px-4 py-1.5 rounded-full">
                  <Activity size={14} className="text-red-500" />
                  <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-red-500">{t('dashboard.physio_intel')}</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                  <TrendingUp size={12} className="text-red-500" />
                  <span className="text-[10px] font-black text-white italic">{injuredPlayers.length} <span className="text-slate-600">{t('dashboard.alerts')}</span></span>
                </div>
              </div>

              <div className="flex-1 relative z-10 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                {
                  injuredPlayers.length > 0 ? (
                    injuredPlayers.map((p: any) => (
                      <div key={p.id} className="flex flex-col gap-3 bg-slate-950/40 p-4 rounded-2xl border border-white/5 hover:border-red-500/30 transition-all group/p">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-slate-900 rounded-xl border border-white/5 overflow-hidden">
                              <img src={`https://cdn.nba.com/headshots/nba/latest/260x190/${p.externalId}.png`} className="h-full object-cover translate-y-2 grayscale group-hover/p:grayscale-0 transition-all" />
                            </div>
                            <div>
                              <div className="text-sm font-black text-white italic uppercase tracking-tighter">{p.lastName}</div>
                              <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{p.nbaTeam}</div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="bg-red-600/10 px-3 py-1 rounded-lg border border-red-500/20 text-center">
                              <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">{p.injuryStatus}</span>
                            </div>
                            {p.injuryBodyPart && (p.injuryBodyPart !== 'TBD') && (
                              <span className="text-[8px] font-bold text-red-500/60 uppercase tracking-widest mt-1 mr-1">{p.injuryBodyPart}</span>
                            )}
                          </div>
                        </div>

                        {p.injuryReturnDate && (
                          <div className="flex items-center gap-2 bg-red-500/5 px-3 py-2 rounded-lg border border-red-500/10 w-full">
                            <Calendar size={10} className="text-red-500 shrink-0" />
                            <span className="text-[9px] font-bold text-red-300 uppercase tracking-wide truncate">{p.injuryReturnDate}</span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-20">
                      <Sparkles size={48} className="mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] leading-relaxed">{t('dashboard.fragility_matrix_integrity')}</p>
                    </div>
                  )
                }
              </div>
            </div>

          </div>
        )}

        {/* Header Benvenuto */}
        <div className="mb-8 md:mb-12 mt-4 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8">
          <div className="flex items-center gap-4 md:gap-8">
            <div className="p-3 md:p-5 bg-slate-900 border border-white/5 rounded-2xl md:rounded-3xl shadow-2xl relative text-blue-500 overflow-hidden group">
              {myTeam?.id ? (
                <img
                  src={`${CONFIG.API_BASE_URL}/team/${myTeam.id}/logo?t=${new Date().getTime()}`}
                  alt={myTeam.name}
                  className="w-16 h-16 md:w-32 md:h-32 object-cover relative z-10 scale-110 group-hover:scale-125 transition-transform duration-700"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    // Fallback to icon will be handled by logic inside or sibling
                    // Actually it's easier to just hide and show icon if error, but here I'm replacing image source.
                    // Let's just keep simple fallback for now or valid image.
                    // If error, I can swap src to placeholder or let it be blank.
                  }}
                />
              ) : (
                <>
                  <Activity size={32} className="relative z-10 animate-in zoom-in-50 duration-1000 hidden md:block" />
                  <Activity size={24} className="relative z-10 animate-in zoom-in-50 duration-1000 md:hidden" />
                </>
              )}
              <div className="absolute inset-0 bg-blue-500/5 blur-xl rounded-full"></div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2 md:mb-4 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl w-fit cursor-default animate-pulse">
                <Sparkles size={14} className="text-amber-500" />
                <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-amber-500">{t('login.beta_version')} v0.1.1.45</span>
              </div>
              <h2 className="text-3xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-none">
                Command <span className="text-blue-500">Central</span>
              </h2>
              <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[8px] md:text-[10px] mt-2 md:mt-3">{t('dashboard.dynasty_console_experience')}</p>
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-4 bg-slate-900/40 p-2 rounded-[2rem] border border-white/5">
            <div className="px-6 py-2">
              <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{t('dashboard.active_assets')}</div>
              <div className="text-xl font-black text-white italic mt-1">{roster.length} <span className="text-[9px] text-slate-800 italic">{t('dashboard.units')}</span></div>
            </div>
          </div>
        </div>

        {/* Griglia Navigazione Principale */}
        <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-8 md:mb-16 animate-in slide-in-from-bottom-6 duration-700">

          {/* Card: IL MIO ROSTER */}
          <button onClick={() => navigate('/roster')} className="group relative text-left outline-none bg-transparent">
            <div className="absolute inset-0 bg-blue-600 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <div className="relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] border border-white/5 bg-slate-900/60 backdrop-blur-3xl p-6 md:p-8 h-full shadow-2xl group-hover:border-blue-500/50 group-hover:-translate-y-2 transition-all duration-500 flex flex-col justify-between min-h-[160px]">
              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 group-hover:scale-125 transition-all duration-1000 text-blue-500"><Users size={120} /></div>
              <div className="p-3 md:p-4 bg-blue-600 rounded-2xl w-fit text-white shadow-[0_10px_20px_rgba(37,99,235,0.3)] mb-6 md:mb-10 transition-transform group-hover:rotate-12"><Users size={24} /></div>
              <div>
                <p className="text-[9px] md:text-[10px] text-slate-600 font-black uppercase tracking-[0.4em] mb-1 group-hover:text-blue-500 transition-colors">{t('dashboard.personnel')}</p>
                <h3 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter leading-none">{t('dashboard.squad_roster')}</h3>
              </div>
            </div>
          </button>

          {/* Card: TUTTI I ROSTER (Esplora Lega) */}
          <button onClick={() => navigate('/league-rosters')} className="group relative text-left outline-none transition-transform active:scale-95 bg-transparent">
            <div className="relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] border border-white/5 bg-slate-900/60 backdrop-blur-3xl p-6 md:p-8 h-full shadow-2xl group-hover:border-emerald-500/50 group-hover:-translate-y-2 transition-all duration-500 flex flex-col justify-between min-h-[160px]">
              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 group-hover:scale-125 transition-all duration-1000 text-emerald-500"><Search size={120} /></div>
              <div className="p-3 md:p-4 bg-emerald-600 rounded-2xl w-fit text-white shadow-[0_10px_20px_rgba(16,185,129,0.3)] mb-6 md:mb-10 transition-transform group-hover:rotate-12"><Search size={24} /></div>
              <div>
                <p className="text-[9px] md:text-[10px] text-slate-600 font-black uppercase tracking-[0.4em] mb-1 group-hover:text-emerald-500 transition-colors">{t('dashboard.intelligence')}</p>
                <h3 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter leading-none">{t('dashboard.franchise_hq')}</h3>
              </div>
            </div>
          </button>

          {/* Card: SCAMBI (Trade Center) */}
          <button onClick={() => navigate('/trades')} className="group relative text-left outline-none bg-transparent">
            <div className="relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] border border-white/5 bg-slate-900/60 backdrop-blur-3xl p-6 md:p-8 h-full shadow-2xl group-hover:border-purple-500/50 group-hover:-translate-y-2 transition-all duration-500 flex flex-col justify-between min-h-[160px]">
              {
                pendingTradesCount > 0 && (
                  <div className="absolute top-6 right-6 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-2xl z-20 animate-bounce border border-white/20">
                    {pendingTradesCount} {t('dashboard.alerts')}
                  </div>
                )
              }
              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 group-hover:scale-125 transition-all duration-1000 text-purple-500"><ArrowLeftRight size={120} /></div>
              <div className="p-3 md:p-4 bg-purple-600 rounded-2xl w-fit text-white shadow-[0_10px_20px_rgba(147,51,234,0.3)] mb-6 md:mb-10 transition-transform group-hover:rotate-12"><ArrowLeftRight size={24} /></div>
              <div>
                <p className="text-[9px] md:text-[10px] text-slate-600 font-black uppercase tracking-[0.4em] mb-1 group-hover:text-purple-500 transition-colors">{t('dashboard.transaction')}</p>
                <h3 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter leading-none">{t('dashboard.trade_hub')}</h3>
              </div>
            </div>
          </button>

          {/* Card: CLASSIFICA LEGA */}
          <button onClick={() => navigate('/league')} className="group relative text-left outline-none bg-transparent">
            <div className="relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] border border-white/5 bg-slate-900/60 backdrop-blur-3xl p-6 md:p-8 h-full shadow-2xl group-hover:border-amber-500/50 group-hover:-translate-y-2 transition-all duration-500 flex flex-col justify-between min-h-[160px]">
              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 group-hover:scale-125 transition-all duration-1000 text-amber-500"><Trophy size={120} /></div>
              <div className="p-3 md:p-4 bg-amber-600 rounded-2xl w-fit text-white shadow-[0_10px_20px_rgba(245,158,11,0.3)] mb-6 md:mb-10 transition-transform group-hover:rotate-12"><Trophy size={24} /></div>
              <div>
                <p className="text-[9px] md:text-[10px] text-slate-600 font-black uppercase tracking-[0.4em] mb-1 group-hover:text-amber-500 transition-colors">{t('dashboard.competitive')}</p>
                <h3 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter leading-none">{t('dashboard.standings')}</h3>
              </div>
            </div>
          </button>

          {/* Card: CALENDARIO */}
          <button onClick={() => navigate('/matches')} className="group relative text-left outline-none bg-transparent">
            <div className="relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] border border-white/5 bg-slate-900/60 backdrop-blur-3xl p-6 md:p-8 h-full shadow-2xl group-hover:border-indigo-500/50 group-hover:-translate-y-2 transition-all duration-500 flex flex-col justify-between min-h-[160px]">
              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 group-hover:scale-125 transition-all duration-1000 text-indigo-500"><Calendar size={120} /></div>
              <div className="p-3 md:p-4 bg-indigo-600 rounded-2xl w-fit text-white shadow-[0_10px_20px_rgba(79,70,229,0.3)] mb-6 md:mb-10 transition-transform group-hover:rotate-12"><Calendar size={24} /></div>
              <div>
                <p className="text-[9px] md:text-[10px] text-slate-600 font-black uppercase tracking-[0.4em] mb-1 group-hover:text-indigo-500 transition-colors">{t('dashboard.operations')}</p>
                <h3 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter leading-none">{t('dashboard.matrix_grid')}</h3>
              </div>
            </div>
          </button>
        </div>

        {/* --- SEZIONE DINAMICA: ASTA LIVE O MERCATO FREE AGENTS --- */}

        {
          leagueStatus === 1 ? (
            /* MODALITÀ DRAFT (ASTA LIVE) */
            <div className="relative overflow-hidden rounded-[2rem] md:rounded-[4rem] border border-blue-500/30 bg-slate-900/80 backdrop-blur-3xl p-6 md:p-20 shadow-[0_60px_120px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-bottom-10 duration-1000 group/draft">
              <div className="absolute top-0 right-0 p-20 opacity-5 pointer-events-none transition-transform duration-[3s] group-hover/draft:scale-150 group-hover/draft:rotate-12"><Gavel size={300} /></div>
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.1),transparent_50%)]"></div>

              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 md:gap-16" >
                <div className="text-center lg:text-left">
                  <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 mb-6 md:mb-10">
                    <div className="inline-flex items-center gap-3 bg-red-600 text-white px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.4em] animate-pulse shadow-[0_0_30px_rgba(220,38,38,0.5)] border-t border-white/20">
                      <Activity size={12} /> {t('market.live_market')}
                    </div>
                    <span className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{t('dashboard.auction_sequence_initialized')}</span>
                  </div>

                  <h2 className="text-3xl md:text-8xl font-black text-white mb-6 md:mb-10 flex flex-col gap-2 uppercase tracking-tighter italic leading-none">
                    <span className="text-blue-500">Syndicate</span> Auction
                  </h2>
                  <p className="text-slate-400 max-w-2xl text-lg md:text-2xl leading-relaxed italic font-medium opacity-80">
                    {t('dashboard.auction_description')}
                  </p>
                </div>

                <button
                  onClick={() => navigate('/live-draft')}
                  className="group relative px-8 py-6 md:px-16 md:py-10 bg-blue-600 hover:bg-blue-550 border-t border-white/20 text-white rounded-[2rem] md:rounded-[2.5rem] font-black italic uppercase tracking-tighter text-xl md:text-4xl transition-all shadow-[0_30px_80px_rgba(37,99,235,0.4)] hover:shadow-[0_40px_100px_rgba(37,99,235,0.6)] active:scale-95 flex items-center justify-center gap-4 md:gap-10 overflow-hidden w-full md:w-auto"
                >
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                  <div className="relative flex items-center gap-4 md:gap-6">
                    <PlayCircle size={32} className="group-hover:rotate-12 transition-transform md:w-12 md:h-12" />
                    {t('market.enter_auction')}
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* MODALITÀ IN SEASON (MERCATO FREE AGENTS) */
            <div className="relative overflow-hidden rounded-[2rem] md:rounded-[4rem] border border-white/5 bg-slate-900/60 backdrop-blur-3xl p-6 md:p-20 shadow-[0_60px_120px_rgba(0,0,0,0.6)] hover:border-emerald-500/20 transition-all duration-700 group/market">
              <div className="absolute top-0 right-0 p-20 opacity-5 pointer-events-none group-hover/market:scale-125 transition-transform duration-1000"><ShoppingCart size={300} /></div>
              <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.05),transparent_60%)]"></div>

              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 md:gap-16">
                <div className="text-center lg:text-left">
                  <div className="inline-flex items-center gap-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-5 py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] mb-6 md:mb-10">
                    {t('dashboard.regular_season_phase')}
                  </div>
                  <h2 className="text-3xl md:text-7xl font-black text-white mb-6 md:mb-10 flex flex-col gap-2 uppercase tracking-tighter italic leading-none">
                    Open <span className="text-emerald-500">Market</span>
                  </h2>
                  <p className="text-slate-500 max-w-xl text-lg md:text-2xl leading-relaxed italic font-bold opacity-80 uppercase tracking-widest">
                    {t('dashboard.market_description')}
                  </p>
                </div>

                <button
                  onClick={() => navigate('/market')}
                  className="group relative px-8 py-6 md:px-16 md:py-8 bg-emerald-600 hover:bg-emerald-550 border-t border-white/20 text-white rounded-[2rem] font-black italic uppercase tracking-tighter text-xl md:text-3xl transition-all shadow-[0_20px_60px_rgba(16,185,129,0.2)] hover:shadow-[0_30px_80px_rgba(16,185,129,0.4)] active:scale-95 flex items-center justify-center gap-4 md:gap-8 overflow-hidden w-full md:w-auto"
                >
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                  <div className="relative flex items-center gap-4">
                    {t('market.explore')}
                    <div className="bg-white/20 p-2 rounded-full group-hover:translate-x-4 transition-transform">
                      <ArrowRight size={20} className="md:w-6 md:h-6" />
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )
        }

      </main>
    </div>
  );
}
