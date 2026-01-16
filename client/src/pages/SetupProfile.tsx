import { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { User, Shield, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { useTranslation } from 'react-i18next';

export default function SetupProfile() {
  const { t } = useTranslation();
  const [gmName, setGmName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showAlert } = useModal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/auth/setup-profile', {
        generalManagerName: gmName,
        fantasyTeamName: teamName
      });

      navigate('/dashboard');
    } catch (error) {
      console.error("Errore setup:", error);
      showAlert({
        title: t('setup_profile.error_title'),
        message: t('setup_profile.error_msg'),
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 relative overflow-hidden font-sans">

      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

        {/* Brand Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 px-4 py-1.5 rounded-full mb-6">
            <Sparkles size={14} className="text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">{t('setup_profile.initialize_franchise')}</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white italic uppercase tracking-tighter leading-none mb-4">
            {t('setup_profile.mission')} <span className="text-blue-500">{t('setup_profile.scout')}</span>
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">{t('setup_profile.subtitle_new')}</p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-3xl p-10 md:p-14 rounded-[3.5rem] border border-white/5 shadow-[0_50px_100px_rgba(0,0,0,0.6)]">
          <form onSubmit={handleSubmit} className="space-y-10">

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-4">
                {t('setup_profile.gm_name')}
              </label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-blue-500">
                  <User size={24} />
                </div>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 pl-16 text-white font-black italic tracking-tight focus:border-blue-500/50 outline-none transition-all placeholder-slate-800 shadow-inner"
                  placeholder={t('setup_profile.gm_placeholder')}
                  value={gmName}
                  onChange={(e) => setGmName(e.target.value)
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-4">
                {t('setup_profile.team_name')}
              </label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-blue-500">
                  <Shield size={24} />
                </div>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 pl-16 text-white font-black italic tracking-tight focus:border-blue-500/50 outline-none transition-all placeholder-slate-800 shadow-inner"
                  placeholder={t('setup_profile.team_placeholder')}
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-550 border-t border-white/20 text-white py-6 rounded-2xl font-black italic uppercase tracking-tighter text-2xl shadow-[0_20px_50px_rgba(37,99,235,0.4)] transform transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-6"
              >
                {
                  loading ? <Loader2 className="animate-spin" size={28} /> : (
                    <>
                      <span> Authorize Access</span>
                      <div className="bg-white/10 p-2 rounded-full">
                        <ArrowRight size={24} />
                      </div>
                    </>
                  )}
              </button>
              <p className="text-center text-[9px] font-black text-slate-700 uppercase tracking-[0.3em] mt-8 leading-relaxed">
                By continuing, you initialize a unique franchise entry <br /> point in the Syndicate global database.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
