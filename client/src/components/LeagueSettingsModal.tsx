import { useState, useEffect } from 'react';
import { X, Save, Sliders, DollarSign, Target, Users, Loader2 } from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { useTranslation } from 'react-i18next';
import { useLeagueSettings } from '../features/admin/api/useLeagueSettings';
import { useUpdateSettings } from '../features/admin/api/useUpdateSettings';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function LeagueSettingsModal({ isOpen, onClose }: Props) {
    const { t } = useTranslation();
    const { showAlert, showConfirm } = useModal();

    const { data: remoteSettings, isLoading } = useLeagueSettings();
    const updateSettings = useUpdateSettings();

    // Config State (Local for editing)
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

    useEffect(() => {
        if (remoteSettings) {
            setSettings(remoteSettings);
        }
    }, [remoteSettings]);

    const handleSave = async () => {
        const confirmed = await showConfirm({
            title: t('modals.save_settings'),
            message: t('common.are_you_sure_save_settings'), // Adding this key in next step or assuming generic confirm message
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
                            <h2 className="text-xl font-black text-white uppercase tracking-wide">{t('navbar.league')} Config</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{t('modals.modify_rules')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
                        <X size={24} />
                    </button>
                </div>

                {/* Content Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={40} className="animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <>
                            {/* 1. SCORING SYSTEM */}
                            <section>
                                <h3 className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                                    <Target size={18} /> Sistema di Punteggio ( Punti Fantasy )
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                    <WeightInput label="Punti" field="pointWeight" val={settings.pointWeight} onChange={handleChange} />
                                    <WeightInput label="Rimbalzi" field="reboundWeight" val={settings.reboundWeight} onChange={handleChange} />
                                    <WeightInput label="Assist" field="assistWeight" val={settings.assistWeight} onChange={handleChange} />
                                    <WeightInput label="Recuperi" field="stealWeight" val={settings.stealWeight} onChange={handleChange} />
                                    <WeightInput label="Stoppate" field="blockWeight" val={settings.blockWeight} onChange={handleChange} />
                                    <WeightInput label="Palle Perse" field="turnoverWeight" val={settings.turnoverWeight} onChange={handleChange} isNegative />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 italic">* I valori indicano quanti Punti Fantasy vale ogni singola statistica reale.</p>
                            </section>

                            {/* 2. ECONOMIA & CAP */}
                            <section>
                                <h3 className="flex items-center gap-2 text-yellow-400 font-bold uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                                    <DollarSign size={18} /> Economia
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Salary Cap (M$)</label>
                                        <input type="number" value={settings.salaryCap} onChange={e => handleChange('salaryCap', e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono focus:border-yellow-500 focus:outline-none transition" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Salary Floor (M$)</label>
                                        <input type="number" value={settings.salaryFloor} onChange={e => handleChange('salaryFloor', e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono focus:border-yellow-500 focus:outline-none transition" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Offerta Minima ($)</label>
                                        <input type="number" value={settings.minBidAmount} onChange={e => handleChange('minBidAmount', e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono focus:border-yellow-500 focus:outline-none transition" />
                                    </div>
                                </div>
                            </section>

                            {/* 3. ROSTER CONFIGURATION */}
                            <section>
                                <h3 className="flex items-center gap-2 text-blue-400 font-bold uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                                    <Users size={18} /> {t('modals.roster_config')}
                                </h3>
                                <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                                    <SlotInput label="PG" field="rosterSlotsPG" val={settings.rosterSlotsPG} onChange={handleChange} />
                                    <SlotInput label="SG" field="rosterSlotsSG" val={settings.rosterSlotsSG} onChange={handleChange} />
                                    <SlotInput label="SF" field="rosterSlotsSF" val={settings.rosterSlotsSF} onChange={handleChange} />
                                    <SlotInput label="PF" field="rosterSlotsPF" val={settings.rosterSlotsPF} onChange={handleChange} />
                                    <SlotInput label="C" field="rosterSlotsC" val={settings.rosterSlotsC} onChange={handleChange} />
                                    <SlotInput label="Guard (G)" field="rosterSlotsG" val={settings.rosterSlotsG} onChange={handleChange} />
                                    <SlotInput label="Forward (F)" field="rosterSlotsF" val={settings.rosterSlotsF} onChange={handleChange} />
                                    <SlotInput label="Utility" field="rosterSlotsUtil" val={settings.rosterSlotsUtil} onChange={handleChange} />
                                    <SlotInput label="Bench" field="rosterSlotsBench" val={settings.rosterSlotsBench} onChange={handleChange} color="text-slate-500" />
                                    <SlotInput label="IR (Injured)" field="rosterSlotsIR" val={settings.rosterSlotsIR} onChange={handleChange} color="text-red-500" />
                                </div>
                            </section>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-950/50 rounded-b-2xl flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 transition">
                        {t('common.cancel')}
                    </button>
                    <button onClick={handleSave} disabled={updateSettings.isPending} className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition shadow-lg shadow-indigo-500/20 flex items-center gap-2">
                        {updateSettings.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {t('modals.save_settings')}
                    </button>
                </div>
            </div>
        </div>
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
