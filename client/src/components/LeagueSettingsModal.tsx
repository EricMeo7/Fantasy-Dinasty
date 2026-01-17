import { useState, useEffect } from 'react';
import { X, Save, Sliders, DollarSign, Target, Users, Loader2, Image, Trash2, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { useTranslation } from 'react-i18next';
import { useLeagueSettings } from '../features/admin/api/useLeagueSettings';
import { useUpdateSettings } from '../features/admin/api/useUpdateSettings';
import { useLeagueDetails } from '../features/league/api/useLeagueDetails';
import api from '../services/api';
import { CONFIG } from '../config';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function LeagueSettingsModal({ isOpen, onClose }: Props) {
    const { t } = useTranslation();
    const { showAlert, showConfirm } = useModal();
    const currentLeagueId = localStorage.getItem('selectedLeagueId');
    const [activeTab, setActiveTab] = useState<'GENERAL' | 'RULES' | 'MEMBERS' | 'DANGER'>('GENERAL');

    // Data Hooks
    const { data: remoteSettings, isLoading } = useLeagueSettings();
    const { data: leagueDetail, refetch: refetchDetails } = useLeagueDetails();
    const updateSettings = useUpdateSettings();

    // Local State
    const [settings, setSettings] = useState<any>({
        salaryCap: 200,
        salaryFloor: 160,
        minBidAmount: 1,
        pointWeight: 1,
        reboundWeight: 1.2,
        assistWeight: 1.5,
        stealWeight: 3,
        blockWeight: 3,
        turnoverWeight: -1,
        rosterSlotsPG: 1,
        rosterSlotsSG: 1,
        rosterSlotsSF: 1,
        rosterSlotsPF: 1,
        rosterSlotsC: 1,
        rosterSlotsG: 0,
        rosterSlotsF: 0,
        rosterSlotsUtil: 0,
        rosterSlotsBench: 5,
        rosterSlotsIR: 1
    });

    // General State
    const [leagueName, setLeagueName] = useState("");
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [savingGeneral, setSavingGeneral] = useState(false);

    // Danger Zone State
    const [deleteInput, setDeleteInput] = useState("");

    useEffect(() => {
        if (remoteSettings) {
            setSettings(remoteSettings);
        }
        if (leagueDetail) {
            setLeagueName(leagueDetail.name);
            setLogoPreview(`${CONFIG.API_BASE_URL}/league/${currentLeagueId}/logo?t=${new Date().getTime()}`);
        }
    }, [remoteSettings, leagueDetail, currentLeagueId]);

    // HANDLERS

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveGeneral = async () => {
        if (!currentLeagueId) return;
        setSavingGeneral(true);
        try {
            // 1. Update Name
            if (leagueName !== leagueDetail?.name) {
                await api.put(`/league/${currentLeagueId}`, { name: leagueName });
            }

            // 2. Upload Logo
            if (logoFile) {
                const formData = new FormData();
                formData.append('file', logoFile);
                await api.post(`/league/${currentLeagueId}/logo`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            await showAlert({ title: t('common.success'), message: t('success.settings_updated'), type: "success" });
            refetchDetails();
            setLogoFile(null); // Reset file input
        } catch (e: any) {
            showAlert({ title: t('common.error'), message: e.response?.data?.message || t('error.generic'), type: 'error' });
        } finally {
            setSavingGeneral(false);
        }
    };

    const handleKickMember = async (teamId: number, name: string) => {
        const confirmed = await showConfirm({
            title: t('modals.league_settings.remove_user_title'),
            message: t('modals.league_settings.remove_user_confirm', { name }),
            type: "error",
            confirmText: t('modals.league_settings.remove_btn'),
            cancelText: t('common.cancel')
        });

        if (!confirmed || !currentLeagueId) return;

        try {
            await api.delete(`/league/${currentLeagueId}/teams/${teamId}`);
            showAlert({ title: t('common.success'), message: t('success.settings_updated'), type: "success" }); // Reusing generic success or add specific
            refetchDetails();
        } catch (e: any) {
            showAlert({ title: t('common.error'), message: e.response?.data?.message || t('error.generic'), type: "error" });
        }
    };

    const handleDeleteLeague = async () => {
        if (!currentLeagueId) return;
        try {
            await api.delete(`/league/${currentLeagueId}`);
            window.location.href = '/leagues'; // Force redirect out
        } catch (e: any) {
            showAlert({ title: t('common.error'), message: e.response?.data?.message || t('error.generic'), type: "error" });
        }
    };

    const handleSaveRules = async () => {
        const confirmed = await showConfirm({
            title: t('modals.save_settings'),
            message: t('common.are_you_sure_save_settings'),
            type: "confirm"
        });

        if (!confirmed) return;

        try {
            await updateSettings.mutateAsync(settings);
            showAlert({ title: t('common.success'), message: t('success.settings_updated'), type: "success" });
            onClose();
        } catch (e: any) {
            showAlert({ title: t('common.error'), message: e.response?.data?.message || t('error.generic_save_error'), type: 'error' });
        }
    };

    const handleChange = (field: string, value: any) => {
        setSettings({ ...settings, [field]: parseFloat(value) || 0 });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in text-slate-300">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                            <Sliders size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-wide">{t('navbar.league')} {t('modals.league_settings.config')}</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{t('modals.modify_rules')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800 bg-slate-950/30 px-6 gap-6 overflow-x-auto">
                    <TabButton active={activeTab === 'GENERAL'} onClick={() => setActiveTab('GENERAL')} label={t('modals.league_settings.general')} icon={<Sliders size={14} />} />
                    <TabButton active={activeTab === 'RULES'} onClick={() => setActiveTab('RULES')} label={t('modals.league_settings.rules')} icon={<Target size={14} />} />
                    <TabButton active={activeTab === 'MEMBERS'} onClick={() => setActiveTab('MEMBERS')} label={t('modals.league_settings.members')} icon={<Users size={14} />} />
                    <TabButton active={activeTab === 'DANGER'} onClick={() => setActiveTab('DANGER')} label={t('modals.league_settings.danger_zone')} icon={<ShieldAlert size={14} />} color="text-red-500" />
                </div>

                {/* Content Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar relative">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={40} className="animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <>
                            {/* GENERAL TAB */}
                            {activeTab === 'GENERAL' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('modals.league_settings.league_name')}</label>
                                            <input
                                                type="text"
                                                value={leagueName}
                                                onChange={(e) => setLeagueName(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold text-lg focus:border-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-4 flex flex-col items-center">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest self-start">{t('modals.league_settings.league_logo')}</label>
                                            <div className="w-32 h-32 rounded-3xl bg-slate-950 border-2 border-dashed border-slate-800 overflow-hidden flex items-center justify-center relative group cursor-pointer">
                                                {logoPreview ? (
                                                    <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Image className="text-slate-700" size={32} />
                                                )}
                                                <input type="file" accept="image/*" onChange={handleLogoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            </div>
                                            <p className="text-[10px] text-slate-600 uppercase tracking-widest">{t('modals.league_settings.upload_hint')}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* RULES TAB */}
                            {activeTab === 'RULES' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                                    {/* 1. SCORING */}
                                    <section>
                                        <h3 className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                                            <Target size={18} /> {t('modals.league_settings.scoring_system')}
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                            <WeightInput label={t('modals.league_settings.points')} field="pointWeight" val={settings.pointWeight} onChange={handleChange} />
                                            <WeightInput label={t('modals.league_settings.rebounds')} field="reboundWeight" val={settings.reboundWeight} onChange={handleChange} />
                                            <WeightInput label={t('modals.league_settings.assists')} field="assistWeight" val={settings.assistWeight} onChange={handleChange} />
                                            <WeightInput label={t('modals.league_settings.steals')} field="stealWeight" val={settings.stealWeight} onChange={handleChange} />
                                            <WeightInput label={t('modals.league_settings.blocks')} field="blockWeight" val={settings.blockWeight} onChange={handleChange} />
                                            <WeightInput label={t('modals.league_settings.turnovers')} field="turnoverWeight" val={settings.turnoverWeight} onChange={handleChange} isNegative />
                                        </div>
                                    </section>

                                    {/* 2. ECONOMIA */}
                                    <section>
                                        <h3 className="flex items-center gap-2 text-yellow-400 font-bold uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                                            <DollarSign size={18} /> {t('modals.league_settings.economy')}
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-400 uppercase">{t('modals.league_settings.salary_cap')}</label>
                                                <input type="number" value={settings.salaryCap} onChange={e => handleChange('salaryCap', e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono focus:border-yellow-500 focus:outline-none transition" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-400 uppercase">{t('modals.league_settings.salary_floor')}</label>
                                                <input type="number" value={settings.salaryFloor} onChange={e => handleChange('salaryFloor', e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono focus:border-yellow-500 focus:outline-none transition" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-400 uppercase">{t('modals.league_settings.min_bid')}</label>
                                                <input type="number" value={settings.minBidAmount} onChange={e => handleChange('minBidAmount', e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono focus:border-yellow-500 focus:outline-none transition" />
                                            </div>
                                        </div>
                                    </section>

                                    {/* 3. ROSTER */}
                                    <section>
                                        <h3 className="flex items-center gap-2 text-blue-400 font-bold uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                                            <Users size={18} /> {t('modals.roster_config')}
                                        </h3>
                                        <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                                            <SlotInput label={t('modals.league_settings.pg')} field="rosterSlotsPG" val={settings.rosterSlotsPG} onChange={handleChange} />
                                            <SlotInput label={t('modals.league_settings.sg')} field="rosterSlotsSG" val={settings.rosterSlotsSG} onChange={handleChange} />
                                            <SlotInput label={t('modals.league_settings.sf')} field="rosterSlotsSF" val={settings.rosterSlotsSF} onChange={handleChange} />
                                            <SlotInput label={t('modals.league_settings.pf')} field="rosterSlotsPF" val={settings.rosterSlotsPF} onChange={handleChange} />
                                            <SlotInput label={t('modals.league_settings.c')} field="rosterSlotsC" val={settings.rosterSlotsC} onChange={handleChange} />
                                            <SlotInput label={t('modals.league_settings.g')} field="rosterSlotsG" val={settings.rosterSlotsG} onChange={handleChange} />
                                            <SlotInput label={t('modals.league_settings.f')} field="rosterSlotsF" val={settings.rosterSlotsF} onChange={handleChange} />
                                            <SlotInput label={t('modals.league_settings.util')} field="rosterSlotsUtil" val={settings.rosterSlotsUtil} onChange={handleChange} />
                                            <SlotInput label={t('modals.league_settings.bench')} field="rosterSlotsBench" val={settings.rosterSlotsBench} onChange={handleChange} color="text-slate-500" />
                                            <SlotInput label={t('modals.league_settings.ir')} field="rosterSlotsIR" val={settings.rosterSlotsIR} onChange={handleChange} color="text-red-500" />
                                        </div>
                                    </section>

                                </div>
                            )}

                            {/* MEMBERS TAB */}
                            {activeTab === 'MEMBERS' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                    <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4">{t('modals.league_settings.manage_access')}</h3>
                                    {leagueDetail?.standings.map((member: any) => (
                                        <div key={member.teamId} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-800">
                                            <div>
                                                <div className="text-white font-bold text-sm uppercase italic">{member.fantasyTeamName}</div>
                                                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{member.generalManagerName} {member.isAdmin && <span className="text-blue-500 ml-2">(Admin)</span>}</div>
                                            </div>
                                            {!member.isMe && (
                                                <button onClick={() => handleKickMember(member.teamId, member.generalManagerName)} className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all" title={t('modals.league_settings.remove_user_title')}>
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* DANGER ZONE TAB */}
                            {activeTab === 'DANGER' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="bg-red-950/20 border border-red-500/20 p-6 rounded-2xl">
                                        <div className="flex items-start gap-4 text-red-500">
                                            <AlertTriangle size={32} className="shrink-0" />
                                            <div>
                                                <h3 className="font-black uppercase italic tracking-tighter text-xl text-white">{t('modals.league_settings.delete_league')}</h3>
                                                <p className="text-xs text-red-200/60 font-medium mt-2">{t('modals.league_settings.delete_league_desc')}</p>
                                            </div>
                                        </div>
                                        <div className="mt-6 space-y-4">
                                            <label className="text-[10px] font-black text-red-400 uppercase tracking-widest">{t('modals.league_settings.delete_confirm_placeholder', { name: leagueDetail?.name })}</label>
                                            <input
                                                type="text"
                                                value={deleteInput}
                                                onChange={(e) => setDeleteInput(e.target.value)}
                                                placeholder={leagueDetail?.name}
                                                className="w-full bg-red-950/30 border border-red-900/50 text-white p-3 rounded-xl placeholder:text-red-900/50 focus:border-red-500 focus:outline-none"
                                            />
                                            <button
                                                onClick={handleDeleteLeague}
                                                disabled={deleteInput.trim() !== leagueDetail?.name?.trim()}
                                                className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase text-xs tracking-[0.3em] rounded-xl transition shadow-lg shadow-red-500/20"
                                            >
                                                {t('modals.league_settings.delete_league')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Fixed Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-950/50 rounded-b-2xl flex justify-end gap-4 shrink-0 z-10">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 transition">
                        {t('common.cancel')}
                    </button>

                    {activeTab === 'GENERAL' && (
                        <button onClick={handleSaveGeneral} disabled={savingGeneral} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition shadow-lg flex items-center gap-2">
                            {savingGeneral && <Loader2 className="animate-spin" size={14} />} {t('modals.league_settings.save_details')}
                        </button>
                    )}

                    {activeTab === 'RULES' && (
                        <button onClick={handleSaveRules} disabled={updateSettings.isPending} className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition shadow-lg shadow-indigo-500/20 flex items-center gap-2">
                            {updateSettings.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Update Rulebook
                        </button>
                    )}
                </div>
            </div>
        </div >
    );
}

function TabButton({ active, onClick, label, icon, color }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 py-4 px-2 border-b-2 transition-all shrink-0 ${active
                ? `border-indigo-500 text-white`
                : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
        >
            <span className={active ? (color || 'text-indigo-500') : ''}>{icon}</span>
            <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-white' : ''}`}>{label}</span>
        </button>
    );
}

function WeightInput({ label, field, val, onChange, isNegative = false }: any) {
    return (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col items-center">
            <span className={`text-[10px] font-black uppercase mb-2 ${isNegative ? 'text-red-400' : 'text-emerald-400'}`}>{label}</span>
            <input
                type="number"
                step="0.1"
                value={val}
                onChange={e => onChange(field, e.target.value)}
                className="w-full text-center bg-transparent text-white font-bold text-xl border-b border-slate-700 focus:border-blue-500 focus:outline-none p-1"
            />
        </div>
    );
}

function SlotInput({ label, field, val, onChange, color = 'text-white' }: any) {
    return (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
            <span className={`text-[10px] font-black uppercase mb-2 block ${color}`}>{label}</span>
            <div className="flex items-center justify-center gap-2">
                <button onClick={() => onChange(field, Math.max(0, val - 1))} className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400">-</button>
                <span className="font-mono font-bold text-lg w-6">{val}</span>
                <button onClick={() => onChange(field, val + 1)} className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400">+</button>
            </div>
        </div>
    );
}
