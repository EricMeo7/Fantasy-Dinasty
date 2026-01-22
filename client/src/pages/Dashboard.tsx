import { useNavigate } from 'react-router-dom';
import {
  /* Users, Trophy, etc removed from import */
  Trophy, ShoppingCart, Gavel,
  PlayCircle, Loader2, ArrowUpRight, Sparkles, ArrowRight,
  Calendar, Activity, TrendingUp
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Hooks
import { useLeagueStatus } from '../features/admin/api/useLeagueStatus';
import { useMatchDetails } from '../features/league/api/useMatchDetails';
import { useMyRoster } from '../features/roster/api/useMyRoster';
import { useMyTeamInfo } from '../features/team/api/useMyTeamInfo'; // NEW
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { CONFIG } from '../config';
import LineupTimer from '../components/LineupTimer';
import SEO from '../components/SEO/SEO';
import LogoAvatar from '../components/LogoAvatar';
import DonationBanner from '../components/DonationBanner';

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // React Query Hooks
  const { data: statusData, isLoading: loadingStatus } = useLeagueStatus();
  const { data: currentMatch, isLoading: loadingMatch } = useMatchDetails();
  const { data: roster = [], isLoading: loadingRoster } = useMyRoster();
  const { data: myTeam } = useMyTeamInfo(); // NEW

  const todayStr = new Date().toISOString().split('T')[0];
  const { data: lockStatus } = useQuery({
    queryKey: ['lineupStatus', todayStr],
    queryFn: () => api.lineup.getStatus(todayStr).then(r => r.data),
  });

  const leagueStatus = statusData ?? 0;
  // hasTeam based on both roster (immediate) and myTeam (robust)
  const hasTeam = roster.length > 0 || !!myTeam;
  const injuredPlayers = roster.filter((p: any) => p.injuryStatus && p.injuryStatus !== 'Active');

  const loading = loadingStatus || loadingMatch || loadingRoster;

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500">
      <Loader2 className="animate-spin text-blue-500 mb-6" size={48} />
      <p className="font-mono animate-pulse tracking-[0.4em] uppercase text-[10px] text-blue-400">{t('dashboard.initializing')}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 relative overflow-hidden">
      <SEO title={t('dashboard.title')} description={t('dashboard.seo_description')} />

      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-5%] right-[-5%] w-[45%] h-[45%] bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[100px]"></div>
      </div>

      <main className="container mx-auto p-4 md:p-12 max-w-7xl relative z-10">

        {/* Header Benvenuto */}
        <div className="mb-8 md:mb-12 mt-4 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8">
          <div className="flex items-center gap-4 md:gap-8">
            <LogoAvatar
              src={myTeam?.id ? `${CONFIG.API_BASE_URL}/team/${myTeam.id}/logo` : undefined}
              alt={myTeam?.name || 'Team'}
              size="xl"
              shape="square"
              className="relative z-10 scale-110 group-hover:scale-125 transition-transform duration-700 bg-transparent border-none"
              fallbackType="team"
              version={myTeam?.logoVersion}
            />
            <div>
              <h2 className="text-3xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-none break-words">
                {t('dashboard.command_central')}
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

        {/* 1. SEZIONE RIEPILOGO ALERTS (Sempre visibile se esiste un team) */}
        {hasTeam && (
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
                    <LogoAvatar
                      src={`${CONFIG.API_BASE_URL}/team/${currentMatch.homeTeamId}/logo`}
                      alt={currentMatch.homeTeam}
                      size="md"
                      shape="square"
                      className="mb-4"
                      fallbackType="team"
                    />
                    <div className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-1 ${currentMatch.homeScore > currentMatch.homeScore ? "text-blue-400" : "text-slate-600"}`}>
                      {currentMatch.homeScore > currentMatch.awayScore && t('dashboard.winning')}
                    </div>
                    <h4 className="text-lg md:text-2xl font-black text-white italic uppercase tracking-tighter leading-none break-words line-clamp-2">{currentMatch.homeTeam}</h4>
                    <span className="text-3xl md:text-5xl font-black text-blue-500 italic mt-2 md:mt-2 tracking-tighter tabular-nums">{currentMatch.homeScore.toFixed(1)}</span>
                  </div>
                  <div className="px-2 md:px-4 flex flex-col items-center pt-10">
                    <div className="text-slate-800 text-[10px] font-black tracking-[0.3em] italic">{t('matchup.vs')}</div>
                    <div className="h-8 md:h-12 w-px bg-gradient-to-b from-transparent via-slate-800 to-transparent mt-2 md:mt-4"></div>
                  </div>
                  <div className="flex flex-col flex-1 text-right items-end">
                    <LogoAvatar
                      src={`${CONFIG.API_BASE_URL}/team/${currentMatch.awayTeamId}/logo`}
                      alt={currentMatch.awayTeam}
                      size="md"
                      shape="square"
                      className="mb-4"
                      fallbackType="team"
                    />
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
                              <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">
                                {p.injuryStatus === 'Out' ? t('common.out') : p.injuryStatus}
                              </span>
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
                    {t('dashboard.syndicate_auction')}
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
                    {t('dashboard.open_market')}
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

        <div className="mt-16 md:mt-24">
          <DonationBanner />
        </div>

      </main>
    </div>
  );
}
