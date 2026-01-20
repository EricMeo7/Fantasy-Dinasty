import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Trash2,
  Play,
  Lock,
  RefreshCw,
  Settings2,
  Calendar,
  AlertCircle,

  Sliders,
  ChevronRight,
  Sparkles,
  Activity
} from 'lucide-react';
import { AdminAssignmentPanel } from './AdminAssignmentPanel';
import LeagueSettingsModal from './LeagueSettingsModal';
import PlayoffConfigModal from './PlayoffConfigModal';
import { useModal } from '../context/ModalContext';
import { useLeagueStatus } from '../features/admin/api/useLeagueStatus';
import { useUpdateStatus } from '../features/admin/api/useUpdateStatus';
import { useResetMarket } from '../features/admin/api/useResetMarket';
import { useGenerateSchedule } from '../features/admin/api/useGenerateSchedule';


import { useTranslation } from 'react-i18next';

export default function AdminPanel() {
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPlayoffConfig, setShowPlayoffConfig] = useState(false);

  const { showAlert, showConfirm } = useModal();

  const { data: currentStatus } = useLeagueStatus();
  const updateStatus = useUpdateStatus();
  const resetMarket = useResetMarket();
  const generateSchedule = useGenerateSchedule();


  const loading = updateStatus.isPending || resetMarket.isPending || generateSchedule.isPending;

  useEffect(() => {
    const adminFlag = localStorage.getItem('isAdmin') === 'true';
    setIsAdmin(adminFlag);
  }, []);

  const handleResetMarket = async () => {
    const confirmed = await showConfirm({
      title: t('admin.reset_market_title'),
      message: t('admin.reset_market_confirm'),
      type: "error",
      confirmText: t('admin.reset_market_confirm_btn'),
      cancelText: t('modals.cancel')
    });

    if (!confirmed) return;

    try {
      await resetMarket.mutateAsync();
      await showAlert({ title: t('modals.done'), message: t('success.market_reset'), type: "success" });
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.errors?.[0] || errorData?.message || error.message;
      await showAlert({ title: t('common.error'), message: errorMessage, type: "error" });
    }
  };

  const handleChangeStatus = async (newStatus: number, statusName: string) => {
    const confirmed = await showConfirm({
      title: t('admin.change_status_title'),
      message: t('admin.change_status_confirm', { status: statusName }),
      type: "confirm"
    });

    if (!confirmed) return;

    try {
      await updateStatus.mutateAsync(newStatus);
      await showAlert({ title: "Aggiornato", message: t('admin.status_updated', { status: statusName }), type: "success" });
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.errors?.[0] || errorData?.message || (typeof errorData === 'string' ? errorData : error.message);
      await showAlert({ title: t('common.error'), message: t('error.generic') + ": " + errorMessage, type: "error" });
    }
  };

  const handleGenerateScheduleInit = () => {
    setShowPlayoffConfig(true);
  };

  const handleGenerateScheduleConfirm = async (teams: number, mode: number) => {
    const confirmed = await showConfirm({
      title: t('admin.generate_schedule_title'),
      message: t('admin.generate_schedule_confirm') + `\nPlayoff Teams: ${teams}` + `\nMode: ${mode}`,
      type: "confirm",
      confirmText: t('admin.generate_btn')
    });

    if (!confirmed) return;

    try {
      await generateSchedule.mutateAsync({ playoffTeams: teams, mode });
      await showAlert({ title: t('common.success'), message: t('admin.schedule_success'), type: "success" });
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.errors?.[0] || errorData?.message || error.message;
      await showAlert({ title: t('common.error'), message: t('admin.generate_error') + ": " + errorMessage, type: "error" });
    }
  };



  if (!isAdmin) return null;

  return (
    <div className="space-y-12 mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
      <LeagueSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <PlayoffConfigModal isOpen={showPlayoffConfig} onClose={() => setShowPlayoffConfig(false)} onConfirm={handleGenerateScheduleConfirm} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* CORE CONFIGURATION */}
        <div className="xl:col-span-2 space-y-8">
          <div className="rounded-[2.5rem] bg-slate-900/50 backdrop-blur-3xl border border-white/5 p-10 shadow-3xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>

            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-4 text-blue-500">
                <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                  <Settings2 size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">{t('admin.core_architecture')}</h2>
                  <p className="text-[10px] text-slate-500 mt-1.5 font-black uppercase tracking-[0.2em]">{t('admin.core_desc')}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-950 px-5 py-2.5 rounded-2xl border border-slate-800 shadow-inner">
                <Activity size={14} className={`animate-pulse ${currentStatus === 2 ? 'text-emerald-500' : 'text-blue-500'}`} />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {t('admin.status_label')} <span className={currentStatus === 2 ? 'text-emerald-400' : 'text-blue-400'}>
                    {currentStatus === 1 ? 'DRAFT_MODE' : currentStatus === 2 ? 'IN_SEASON' : 'OFF_SEASON'}
                  </span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* SETTINGS CARD */}
              <button
                onClick={() => setShowSettings(true)}
                className="flex flex-col p-8 bg-slate-950/50 hover:bg-slate-950 rounded-[2rem] border border-white/5 transition-all text-left group/btn active:scale-95 shadow-xl"
              >
                <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 w-fit mb-6 border border-indigo-500/20 group-hover/btn:bg-indigo-500 group-hover/btn:text-white transition-all shadow-inner">
                  <Sliders size={28} />
                </div>
                <div className="mb-8">
                  <h4 className="text-xl font-black text-white italic uppercase tracking-tighter leading-none">{t('admin.global_settings')}</h4>
                  <p className="text-xs text-slate-600 font-bold uppercase tracking-widest mt-2">{t('admin.settings_desc')}</p>
                </div>
                <div className="mt-auto flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-indigo-400">
                  <span> {t('admin.configure_ruleset')}</span>
                  <ChevronRight size={18} />
                </div>
              </button>

              {/* STATUS TOGGLE GRID */}
              <div className="grid grid-rows-2 gap-4">
                <button
                  onClick={() => handleChangeStatus(1, "DRAFT MODE")}
                  disabled={loading || currentStatus === 1}
                  className={`p-6 rounded-[2rem] border flex items-center justify-between gap-6 transition-all group/opt active:scale-95 ${currentStatus === 1
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-950/50 border-white/5 hover:bg-slate-900 text-slate-400'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${currentStatus === 1 ? 'bg-white/10' : 'bg-slate-900 text-blue-500'} transition-all`}>
                      <Play size={22} fill={currentStatus === 1 ? "white" : "none"} />
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-black uppercase italic tracking-tight block">{t('admin.auction_mode')}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{t('admin.init_draft_hub')}</span>
                    </div>
                  </div>
                  {currentStatus === 1 && <Sparkles size={16} className="text-white animate-pulse" />}
                </button>

                <button
                  onClick={() => handleChangeStatus(2, "IN SEASON")}
                  disabled={loading || currentStatus === 2}
                  className={`p-6 rounded-[2rem] border flex items-center justify-between gap-6 transition-all group/opt active:scale-95 ${currentStatus === 2
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-950/50 border-white/5 hover:bg-slate-900 text-slate-400'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${currentStatus === 2 ? 'bg-white/10' : 'bg-slate-900 text-emerald-500'} transition-all`}>
                      <Lock size={22} />
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-black uppercase italic tracking-tight block">{t('admin.launch_season')}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{t('admin.activate_market')}</span>
                    </div>
                  </div>
                  {currentStatus === 2 && <Sparkles size={16} className="text-white animate-pulse" />}
                </button>
              </div>
            </div>
          </div>

          {/* GAME OPS DASHBOARD */}
          <div className="rounded-[2.5rem] bg-slate-900/50 backdrop-blur-3xl border border-white/5 p-10 shadow-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-600"></div>

            <div className="flex items-center gap-4 mb-10 text-purple-500">
              <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                <Calendar size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">{t('admin.game_ops')}</h2>
                <p className="text-[10px] text-slate-500 mt-1.5 font-black uppercase tracking-[0.2em]">{t('admin.game_ops_desc')}</p>
              </div>
            </div>

            <div className="bg-slate-950/80 p-6 rounded-[2rem] border border-white/5">
              <h5 className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2 mb-4">
                <Calendar size={12} className="text-purple-500" /> {t('admin.season_engine')}
              </h5>
              <div className="space-y-4">
                <button
                  onClick={handleGenerateScheduleInit}
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white border-t border-white/10 p-6 rounded-2xl flex items-center justify-between transition-all active:scale-95 shadow-[0_15px_30px_rgba(147,51,234,0.3)]"
                >
                  <div className="flex items-center gap-4">
                    <Sparkles size={20} />
                    <span className="text-xs font-black uppercase tracking-widest">{t('admin.build_calendar')}</span>
                  </div>
                  <ChevronRight size={16} />
                </button>
              </div>
              <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mt-4 text-center">{t('admin.generate_matrix')}</p>
            </div>
          </div>
        </div>

        {/* DANGER ZONE - SIDEBAR STYLE */}
        <div className="space-y-8" >
          <div className="rounded-[2.5rem] bg-red-950/10 border border-red-500/20 p-10 shadow-3xl relative overflow-hidden h-full flex flex-col">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-red-600"></div>

            <div className="flex items-center gap-4 mb-10 text-red-500">
              <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20 shadow-inner">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">{t('admin.danger_zone')}</h2>
                <p className="text-[10px] text-red-400 mt-1.5 font-black uppercase tracking-[0.2em]">{t('admin.destructive_protocols')}</p>
              </div>
            </div>

            <div className="bg-red-950/30 rounded-2xl p-6 border border-red-500/10 mb-8">
              <div className="flex gap-3 mb-4">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-red-300/70 leading-relaxed uppercase tracking-widest italic">
                  {t('admin.emergency_desc')}
                </p>
              </div>
            </div>

            <div className="mt-auto">
              <button
                onClick={handleResetMarket}
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-500 text-white border-t border-white/10 p-8 rounded-[2rem] flex flex-col items-center gap-4 transition-all active:scale-95 shadow-[0_20px_50px_rgba(220,38,38,0.4)] group overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform duration-[2s]">
                  <Trash2 size={120} />
                </div>
                <div className="bg-white/20 p-4 rounded-2xl relative z-10 transition-transform group-hover:rotate-12">
                  <RefreshCw className={
                    loading ? "animate-spin" : ""} size={32} />
                </div>
                <div className="text-center relative z-10">
                  <div className="font-black text-xl italic uppercase tracking-tighter">{t('admin.reset_market_title')}</div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-red-100 mt-1">{t('admin.clear_auctions')}</div>
                </div>
              </button>

              <button className="w-full mt-6 py-4 rounded-2xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all text-[9px] font-black uppercase tracking-[0.3em]">
                {t('admin.emergency_hub')}
              </button>
            </div>
          </div>
        </div>
      </div >

      <div className="h-px w-full bg-slate-900"></div>

      {/* 2. SEZIONE ASSEGNAZIONE MANUALE (Tool Potente) */}
      <div className="mt-12">
        <div className="mb-6 px-4">
          <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{t('admin.manual_override_tool')}</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-2">{t('admin.manual_override_desc')}</p>
        </div>
        <AdminAssignmentPanel />
      </div>
    </div >
  );
}