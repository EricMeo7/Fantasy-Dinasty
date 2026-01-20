import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Globe, Sparkles, User, BadgeDollarSign, Activity } from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { useAllRosters } from '../features/league/api/useAllRosters';
import PlayerStatsModal, { type PlayerFull } from '../components/PlayerStatsModal';
import SEO from '../components/SEO/SEO';
import LogoAvatar from '../components/LogoAvatar';
import { CONFIG } from '../config';

export default function LeagueRosters() {
  const navigate = useNavigate();
  const { showAlert } = useModal();
  const { data: teams = [], isLoading, isError } = useAllRosters();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  // Stats Modal State
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerFull | null>(null);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  const openStats = (player: any) => {
    setSelectedPlayer(player);
    setIsStatsOpen(true);
  };

  useEffect(() => {
    if (teams.length > 0 && selectedTeamId === null) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  useEffect(() => {
    if (isError) {
      showAlert({
        title: "Errore Caricamento",
        message: "Impossibile scaricare i roster della lega. Riprova più tardi.",
        type: 'error'
      });
    }
  }, [isError, showAlert]);

  const currentTeam = teams.find(t => t.id === selectedTeamId);

  if (isLoading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500">
      <Loader2 className="animate-spin mb-6 text-emerald-500" size={48} />
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-emerald-400">Synchronizing League Rosters...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-12 text-slate-100 font-sans relative overflow-hidden">
      <SEO title="Roster Lega" description="Esplora i roster di tutte le squadre della lega." />

      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] bg-emerald-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="mx-auto max-w-7xl relative z-10">

        {/* Modals */}
        <PlayerStatsModal
          player={selectedPlayer}
          isOpen={isStatsOpen}
          onClose={() => setIsStatsOpen(false)}
        />

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 mb-16">
          <div className="flex items-center gap-8">
            <div className="p-3 md:p-5 bg-slate-900 border border-white/5 rounded-3xl shadow-2xl relative text-emerald-500">
              <Globe size={40} className="relative z-10 animate-in zoom-in-50 duration-1000" />
              <div className="absolute inset-0 bg-emerald-500/5 blur-xl rounded-full"></div>
            </div>
            <div>
              <button
                onClick={() => navigate('/dashboard')}
                className="group flex items-center gap-2 text-slate-600 hover:text-white transition-all text-[9px] font-black uppercase tracking-[0.3em] mb-3"
              >
                <ArrowRight className="rotate-180 group-hover:-translate-x-1 transition-transform" size={12} /> Return to Dashboard
              </button>
              <h1 className="text-3xl md:text-7xl font-black text-white flex flex-wrap items-center gap-2 md:gap-4 tracking-tighter italic uppercase leading-none break-words">
                League <span className="text-emerald-500">Explorer</span>
              </h1>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-3">Real-time Roster Intelligence Sync</p>
            </div>
          </div>

          <div className="bg-slate-950/50 backdrop-blur-3xl px-8 py-4 rounded-[2rem] border border-white/5 shadow-2xl flex items-center gap-4 hidden md:flex">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Consensus</span>
              <span className="text-xl font-black text-white italic tracking-tighter leading-none mt-1">{teams.length} <span className="text-[10px] text-slate-600">TEAMS</span></span>
            </div>
            <div className="h-8 w-px bg-slate-800 mx-2"></div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Status</span>
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none mt-2 flex items-center gap-2">
                <Activity size={12} className="animate-pulse" /> ACTIVE_MONITORING
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
          {/* SIDEBAR: Lista Squadre */}
          <div className="w-full lg:w-80 space-y-3 shrink-0">
            <div className="px-6 mb-6">
              <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Select Organization</h3>
            </div>
            <div className="space-y-2">
              {teams.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTeamId(t.id)}
                  className={`group w-full text-left p-6 rounded-[2rem] border transition-all relative overflow-hidden active:scale-[0.98] ${selectedTeamId === t.id
                    ? 'bg-emerald-600 border-emerald-500 shadow-[0_20px_40px_rgba(16,185,129,0.3)]'
                    : 'bg-slate-900/60 border-white/5 hover:bg-slate-900'
                    }`}
                >
                  <div className="flex flex-col relative z-10">
                    <div className={`text-base font-black italic uppercase tracking-tighter leading-none mb-1.5 ${selectedTeamId === t.id ? 'text-white' : 'text-slate-200 group-hover:text-emerald-400'}`}>
                      {t.teamName}
                    </div>
                    <div className={`text-[9px] uppercase font-black tracking-widest ${selectedTeamId === t.id ? 'text-emerald-200' : 'text-slate-600'}`}>
                      GM: {t.ownerName}
                    </div>
                  </div>
                  {selectedTeamId === t.id && (
                    <div className="absolute top-1/2 -translate-y-1/2 right-6 opacity-30">
                      <Sparkles size={24} className="text-white" />
                    </div>
                  )
                  }
                </button>
              ))}
            </div>
          </div>

          {/* MAIN: Dettaglio Roster */}
          <div className="flex-1 w-full min-w-0" >
            {
              currentTeam ? (
                <div className="bg-slate-900/60 backdrop-blur-3xl rounded-[2rem] md:rounded-[3rem] border border-white/5 overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-right-8 duration-700">

                  {/* Team Header Panel */}
                  <div className="p-6 md:p-12 bg-slate-950/40 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-end gap-10" >
                    <div className="flex items-center gap-6">
                      <LogoAvatar
                        src={`${CONFIG.API_BASE_URL}/team/${currentTeam.id}/logo?t=${new Date().getTime()}`}
                        alt={currentTeam.teamName}
                        size="lg"
                        shape="square"
                        className="bg-slate-900 border-emerald-500/20 shadow-2xl"
                        fallbackType="team"
                      />
                      <div>
                        <div className="inline-flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 px-3 py-1 rounded-full mb-3 shadow-inner">
                          <Sparkles size={12} className="text-emerald-500" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Syndicate Registered Franchise</span>
                        </div>
                        <h2 className="text-3xl md:text-6xl font-black text-white tracking-tighter italic uppercase leading-none">{currentTeam.teamName}</h2>
                        <p className="text-slate-500 font-black text-[10px] mt-4 uppercase tracking-[0.3em]">
                          Commanding Officer: <span className="text-white italic">{currentTeam.ownerName}</span>
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-950 rounded-[2rem] p-6 border border-white/5 shadow-inner flex flex-col items-end">
                      <div className="text-3xl md:text-4xl font-black text-white italic tracking-tighter leading-none">{currentTeam.players.length}<span className="text-xs text-slate-700 ml-2 uppercase tracking-widest">/15</span></div>
                      <div className="text-[9px] text-slate-600 uppercase font-black tracking-widest mt-2">Active Roster Size</div>
                    </div>
                  </div>

                  {/* Roster Table */}
                  <div className="p-8 responsive-table-container min-h-[500px]">
                    < table className="w-full text-left border-separate border-spacing-y-3 min-w-table" >
                      <thead>
                        <tr className="text-[10px] uppercase text-slate-600 font-black tracking-[0.2em]">
                          <th className="px-6 py-4">Contract Profile</th>
                          <th className="px-6 py-4 text-center">Fiscal Impact</th>
                          <th className="px-6 py-4 text-center">Lease</th>
                          <th className="px-6 py-4 text-right">System Status</th>
                        </tr>
                      </thead>
                      <tbody className="">
                        {
                          currentTeam.players.map((p) => (
                            <tr
                              key={p.id}
                              onClick={() => openStats(p)}
                              className="group hover:bg-white/5 transition-all duration-300 cursor-pointer"
                            >
                              <td className="px-6 py-5 bg-slate-950/40 rounded-l-3xl border-y border-l border-white/5 group-hover:border-blue-500/30 transition-all">
                                <div className="flex items-center gap-5">
                                  <div className="relative">
                                    <div className="h-14 w-14 rounded-2xl bg-slate-900 overflow-hidden border border-white/5 shrink-0 shadow-2xl group-hover:scale-105 transition-transform group-hover:border-blue-500/30">
                                      <img src={`https://cdn.nba.com/headshots/nba/latest/260x190/${p.externalId}.png`} className="h-full object-cover translate-y-3" onError={(e) => { e.currentTarget.style.display = 'none'; }} alt="" />
                                    </div>
                                    <span className="absolute -top-2 -right-2 bg-slate-950 border border-slate-800 text-blue-500 px-2 py-0.5 rounded-lg text-[10px] font-black shadow-lg">{p.position}</span>
                                  </div>
                                  <div>
                                    <div className="text-lg font-black text-white italic uppercase tracking-tighter leading-none group-hover:text-blue-400 transition-colors">{p.firstName} {p.lastName}</div>
                                    <div className="text-[9px] font-black text-slate-700 uppercase tracking-widest mt-1.5">NBA INTEL: {p.nbaTeam}</div>
                                  </div>
                                </div>
                              </td >
                              <td className="px-6 py-5 bg-slate-950/40 border-y border-white/5 group-hover:border-blue-500/30 transition-all text-center">
                                <div className="inline-flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-xl border border-white/5 shadow-inner">
                                  <BadgeDollarSign size={14} className="text-emerald-500" />
                                  <span className="text-base font-black text-emerald-400 font-mono tracking-tighter italic">{p.salaryYear1.toFixed(1)} M</span>
                                </div>
                              </td >
                              <td className="px-6 py-5 bg-slate-950/40 border-y border-white/5 group-hover:border-blue-500/30 transition-all text-center">
                                <div className="text-lg font-black text-slate-400 italic font-mono">{p.contractYears}Y</div>
                                <div className="text-[8px] font-black text-slate-700 uppercase tracking-widest mt-1">Term Left</div>
                              </td >
                              <td className="px-6 py-5 bg-slate-950/40 rounded-r-3xl border-y border-r border-white/5 group-hover:border-blue-500/30 transition-all text-right">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-xl bg-slate-950 border-slate-800 text-slate-400">
                                  {p.position}
                                </div>
                              </td>
                            </tr >
                          ))
                        }
                      </tbody >
                    </table >

                    {
                      currentTeam.players.length === 0 && (
                        <div className="h-96 flex flex-col items-center justify-center text-center opacity-30">
                          <User size={80} className="mb-6" />
                          <h4 className="text-2xl font-black italic uppercase italic tracking-tighter">Empty Reserve</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest">No active player entities found in this franchise</p>
                        </div>
                      )}
                  </div>
                </div>
              ) : (
                <div className="h-[700px] flex flex-col items-center justify-center text-center bg-slate-900/40 backdrop-blur-3xl border border-dashed border-white/10 rounded-[4rem] px-20">
                  <Sparkles size={120} className="text-slate-900 mb-10 opacity-40 animate-pulse" />
                  <h3 className="text-3xl font-black italic uppercase text-white tracking-tighter">Protocol Standby</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 mt-4 leading-relaxed">Initiate data stream by selecting a franchise entity from the multi-league command matrix.</p>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}