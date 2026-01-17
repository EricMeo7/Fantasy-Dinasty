import { useState, useEffect } from 'react';
import { X, Save, Image, Loader2, BadgeCheck } from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { CONFIG } from '../config';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function TeamSettingsModal({ isOpen, onClose }: Props) {
    const { t } = useTranslation();
    const { showAlert } = useModal();
    const [team, setTeam] = useState<any>(null);
    const [name, setName] = useState("");
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const currentLeagueId = localStorage.getItem('selectedLeagueId');

    useEffect(() => {
        if (!isOpen) return;
        fetchTeam();
    }, [isOpen]);

    const fetchTeam = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/team/my-team', {
                headers: { 'X-League-Id': currentLeagueId }
            });
            setTeam(data);
            setName(data.name);
            setLogoPreview(`${CONFIG.API_BASE_URL}/team/${data.id}/logo?t=${new Date().getTime()}`);
        } catch (e) {
            console.error(e);
            showAlert({ title: t('common.error'), message: t('team_settings.error_fetch'), type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        if (!team) return;
        setSaving(true);
        try {
            // 1. Update Name
            if (name !== team.name) {
                await api.put(`/team/${team.id}`, { name });
            }

            // 2. Upload Logo
            if (logoFile) {
                const formData = new FormData();
                formData.append('file', logoFile);
                await api.post(`/team/${team.id}/logo`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            showAlert({ title: t('common.success'), message: t('team_settings.success_update'), type: "success" });
            fetchTeam(); // Refresh
            setLogoFile(null);
            onClose();
            // Force reload to show new logo in Navbar etc? maybe context update needed, but simple reload works for now or let React Query handle if linked
            // window.location.reload(); 
        } catch (e: any) {
            showAlert({ title: t('common.error'), message: e.response?.data?.message || t('error.generic_save_error'), type: "error" });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in text-slate-300">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                            <BadgeCheck size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-wide">{t('modals.team_settings.title')}</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{t('modals.team_settings.identity')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 size={40} className="animate-spin text-blue-500" />
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-center">
                                <div className="w-32 h-32 rounded-3xl bg-slate-950 border-2 border-dashed border-slate-800 overflow-hidden flex items-center justify-center relative group cursor-pointer hover:border-blue-500 transition-colors">
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <Image className="text-slate-700 group-hover:text-blue-500 transition-colors" size={32} />
                                    )}
                                    <input type="file" accept="image/*" onChange={handleLogoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    <div className="absolute bottom-0 left-0 w-full bg-black/60 text-[8px] text-center py-1 font-bold uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 transition-opacity">{t('modals.team_settings.upload_logo')}</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('modals.team_settings.team_name')}</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold text-lg focus:border-blue-500 focus:outline-none transition"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-950/50 rounded-b-2xl flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 transition">
                        {t('common.cancel')}
                    </button>
                    <button onClick={handleSave} disabled={saving || loading} className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50">
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {t('modals.team_settings.save_changes')}
                    </button>
                </div>

            </div>
        </div>
    );
}
