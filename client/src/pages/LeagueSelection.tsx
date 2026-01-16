import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, LogOut, ArrowRight, Trophy, Loader2, Sparkles, LayoutGrid, Globe } from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { useTranslation } from 'react-i18next';
import { useMyLeagues, type LeagueListMember } from '../features/league/api/useMyLeagues';
import { useCreateLeague } from '../features/league/api/useCreateLeague';
import { useJoinLeague } from '../features/league/api/useJoinLeague';
import SEO from '../components/SEO/SEO';

export default function LeagueSelection() {
  const { t } = useTranslation();
  const [view, setView] = useState<'list' | 'create' | 'join'>('list');

  // Form States
  const [leagueName, setLeagueName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const navigate = useNavigate();
  const { showAlert } = useModal();

  const { data: leagues = [], isLoading } = useMyLeagues();
  const createLeague = useCreateLeague();
  const joinLeague = useJoinLeague();

  const selectLeague = (league: LeagueListMember) => {
    localStorage.setItem('selectedLeagueId', league.leagueId.toString());
    localStorage.setItem('isAdmin', league.isAdmin ? 'true' : 'false');
    navigate('/dashboard');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await createLeague.mutateAsync({ leagueName, myTeamName: teamName });
      await showAlert({ title: t('common.success'), message: `Lega creata! Codice invito: ${data.code}`, type: 'success' });
      setView('list');
      setLeagueName('');
      setTeamName('');
    } catch (err: any) {
      showAlert({ title: t('common.error'), message: err.response?.data || t('success.creation_error'), type: 'error' });
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await joinLeague.mutateAsync({ code: inviteCode, myTeamName: teamName });
      await showAlert({ title: t('common.welcome'), message: "Ti sei unito alla lega!", type: 'success' });
      setView('list');
      setInviteCode('');
      setTeamName('');
    } catch (err: any) {
      showAlert({ title: t('common.error'), message: err.response?.data || t('success.join_error'), type: 'error' });
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (isLoading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500">
      <Loader2 className="animate-spin mb-6 text-emerald-500" size={48} />
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-400">Syncing Multi-League Data...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 pt-[calc(1.5rem+var(--sat))] md:p-12 md:pt-12 flex flex-col items-center justify-center relative overflow-hidden">
      <SEO title="Selezione Lega" description="Seleziona o crea la tua lega fanatsy." />
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-6xl relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-16 px-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-900 border border-white/10 rounded-2xl text-emerald-500 shadow-2xl">
              <LayoutGrid size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">
                Fantasy <span className="text-emerald-500">Hub</span>
              </h1>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Multi-League Control Center</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-slate-600 hover:text-white flex items-center gap-2 group transition-all text-[10px] font-black uppercase tracking-widest bg-slate-900/50 px-6 py-3 rounded-2xl border border-slate-800">
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" /> {t('common.logout')}
          </button>
        </div>

        {view === 'list' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">

            <div className="text-center mb-12">
              <h2 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter leading-none mb-4">Choose your <span className="text-blue-500">Arena</span></h2>
              <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Select a competition to enter the management dashboard</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {leagues.map(league => (
                <div
                  key={league.leagueId}
                  onClick={() => selectLeague(league)}
                  className="group relative bg-slate-900/50 backdrop-blur-xl border border-white/5 hover:border-emerald-500/50 p-8 rounded-[3rem] cursor-pointer transition-all hover:-translate-y-2 hover:shadow-[0_40px_80px_rgba(0,0,0,0.5)] flex flex-col"
                >
                  <div className="flex justify-between items-start mb-10">
                    <div className="p-5 bg-slate-950 rounded-[1.5rem] border border-slate-800 text-emerald-500 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner group-hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                      <Trophy size={32} />
                    </div>
                    {league.isAdmin && (
                      <span className="text-[9px] font-black bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full border border-blue-500/20 uppercase tracking-widest flex items-center gap-2">
                        <Sparkles size={10} /> Commissioner
                      </span>
                    )}
                  </div>

                  <div className="mt-auto">
                    <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none mb-2 group-hover:text-emerald-400 transition-colors">
                      {league.leagueName}
                    </h3>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Team: <span className="text-slate-300">{league.myTeamName}</span></p>

                    <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] group-hover:translate-x-2 transition-transform">
                      <span>Enter Management</span>
                      <ArrowRight size={18} />
                    </div>
                  </div>

                  {/* Decorative background number or logo could go here */}
                </div>
              ))
              }

              {/* Card "Nuova Lega" */}
              <div className="grid grid-rows-2 gap-6 min-h-[320px]">
                <button
                  onClick={() => setView('create')}
                  className="group border border-white/5 bg-slate-900/40 hover:bg-slate-900 hover:border-blue-500/30 rounded-[2.5rem] flex items-center gap-6 px-10 text-slate-500 hover:text-white transition-all shadow-xl"
                >
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                    <Plus size={24} />
                  </div>
                  <div className="text-left">
                    <span className="font-black italic uppercase tracking-tighter text-2xl block leading-none" > Create League</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-700 group-hover:text-blue-500 transition-colors">Become a Commissioner</span>
                  </div>
                </button>
                <button
                  onClick={() => setView('join')}
                  className="group border border-white/5 bg-slate-900/40 hover:bg-slate-900 hover:border-emerald-500/30 rounded-[2.5rem] flex items-center gap-6 px-10 text-slate-500 hover:text-white transition-all shadow-xl"
                >
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner">
                    <Users size={24} />
                  </div>
                  <div className="text-left">
                    <span className="font-black italic uppercase tracking-tighter text-2xl block leading-none text-nowrap">Join with Code</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-700 group-hover:text-emerald-500 transition-colors">Connect with Friends</span>
                  </div>
                </button>
              </div>
            </div>

            {
              leagues.length === 0 && (
                <div className="bg-blue-600/5 border border-blue-500/20 rounded-[2rem] p-10 text-center max-w-2xl mx-auto shadow-2xl animate-pulse">
                  <Globe size={48} className="mx-auto text-blue-500 mb-6 opacity-40" />
                  <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">No active leagues found</h3>
                  <p className="text-slate-500 text-sm mt-3">Explore the possibilities and start your dynasty today. Create a league or ask for an invite code.</p>
                </div>
              )}
          </div>
        )}

        {/* Form CREAZIONE */}
        {
          view === 'create' && (
            <div className="max-w-xl mx-auto bg-slate-900/80 backdrop-blur-3xl p-12 rounded-[4rem] border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.5)] animate-in zoom-in duration-500">
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-blue-600/10 rounded-3xl flex items-center justify-center text-blue-500 mb-6 mx-auto border border-blue-500/20 shadow-inner">
                  <Plus size={32} />
                </div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">{t('league_selection.title')}</h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] mt-2">Define your custom fantasy ecosystem</p>
              </div>

              <form onSubmit={handleCreate} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-4">Empire Name</label>
                  <input type="text" placeholder="e.g. Gotham City Dynasty" value={leagueName} onChange={e => setLeagueName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl text-white font-black italic tracking-tight focus:border-blue-500/50 transition-all outline-none shadow-inner" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-4">Your Team Name</label>
                  <input type="text" placeholder="e.g. Scofield Mambas" value={teamName} onChange={e => setTeamName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl text-white font-black italic tracking-tight focus:border-blue-500/50 transition-all outline-none shadow-inner" required />
                </div>

                <div className="flex gap-4 mt-12">
                  <button type="button" onClick={() => setView('list')} className="flex-1 py-5 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all text-slate-400">Back</button>
                  <button type="submit" disabled={createLeague.isPending} className="flex-[2] py-5 bg-blue-600 hover:bg-blue-550 border-t border-white/10 text-white font-black uppercase italic tracking-tighter rounded-2xl flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(37,99,235,0.3)] transform transition-all active:scale-95 text-lg">
                    {createLeague.isPending ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={20} />}
                    Establish League
                  </button>
                </div>
              </form>
            </div>
          )
        }

        {/* Form JOIN */}
        {
          view === 'join' && (
            <div className="max-w-xl mx-auto bg-slate-900/80 backdrop-blur-3xl p-12 rounded-[4rem] border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.5)] animate-in zoom-in duration-500">
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-emerald-600/10 rounded-3xl flex items-center justify-center text-emerald-500 mb-6 mx-auto border border-emerald-500/20 shadow-inner">
                  <Users size={32} />
                </div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">Join Competition</h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] mt-2">Enter an invite code to connect</p>
              </div>

              <form onSubmit={handleJoin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-4">Secret Invite Code</label>
                  <input type="text" placeholder="CODE-123-XYZ" value={inviteCode} onChange={e => setInviteCode(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl text-white font-black italic tracking-tight focus:border-emerald-500/50 transition-all outline-none uppercase shadow-inner" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-4">Your Team Name</label>
                  <input type="text" placeholder="e.g. Scofield Mambas" value={teamName} onChange={e => setTeamName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl text-white font-black italic tracking-tight focus:border-emerald-500/50 transition-all outline-none shadow-inner" required />
                </div>

                <div className="flex gap-4 mt-12">
                  <button type="button" onClick={() => setView('list')} className="flex-1 py-5 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all text-slate-400">Back</button>
                  <button type="submit" disabled={joinLeague.isPending} className="flex-[2] py-5 bg-emerald-600 hover:bg-emerald-550 border-t border-white/10 text-white font-black uppercase italic tracking-tighter rounded-2xl flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(16,185,129,0.3)] transform transition-all active:scale-95 text-lg">
                    {joinLeague.isPending ? <Loader2 className="animate-spin" size={24} /> : <ArrowRight size={20} />}
                    Connect to Arena
                  </button>
                </div>
              </form>
            </div>
          )
        }

      </div>
    </div>
  );
}
