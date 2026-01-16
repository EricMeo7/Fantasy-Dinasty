import { useState } from 'react';
import { X, Trophy, Users, BadgeCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (teams: number, mode: number) => void;
}

export default function PlayoffConfigModal({ isOpen, onClose, onConfirm }: Props) {
    const { t } = useTranslation();
    const [selectedTeams, setSelectedTeams] = useState<number>(4);
    const [mode, setMode] = useState<number>(0);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(selectedTeams, mode);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in text-slate-300">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col relative overflow-hidden max-h-[90vh] overflow-y-auto">

                {/* Decoration */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-indigo-600"></div>

                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                            <Trophy size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-wide">{t('modals.playoff_config.title')}</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{t('modals.playoff_config.subtitle')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8">

                    {/* SECTION 1: PLAYOFF TEAMS */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">{t('modals.playoff_config.format_title')}</h3>
                        <div className="grid grid-cols-2 gap-6">
                            {/* Option 4 Teams */}
                            <button
                                onClick={() => setSelectedTeams(4)}
                                className={`relative p-6 rounded-2xl border transition-all group hover:scale-[1.02] active:scale-95 flex flex-col items-center gap-4 ${selectedTeams === 4
                                    ? 'bg-purple-600/10 border-purple-500 shadow-[0_0_30px_rgba(147,51,234,0.3)]'
                                    : 'bg-slate-950 border-slate-800 hover:border-slate-600 hover:bg-slate-900'
                                    }`}
                            >
                                <div className={`p-4 rounded-full ${selectedTeams === 4 ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'}`}>
                                    <Users size={28} />
                                </div>
                                <div className="text-center">
                                    <div className={`text-2xl font-black ${selectedTeams === 4 ? 'text-white' : 'text-slate-400'}`}>{t('modals.playoff_config.teams_4')}</div>
                                    <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">{t('modals.playoff_config.rounds_2')}</div>
                                </div>
                                {selectedTeams === 4 && <div className="absolute top-3 right-3 text-purple-500"><BadgeCheck size={18} fill="currentColor" className="text-purple-500" /></div>}
                            </button>

                            {/* Option 8 Teams */}
                            <button
                                onClick={() => setSelectedTeams(8)}
                                className={`relative p-6 rounded-2xl border transition-all group hover:scale-[1.02] active:scale-95 flex flex-col items-center gap-4 ${selectedTeams === 8
                                    ? 'bg-purple-600/10 border-purple-500 shadow-[0_0_30px_rgba(147,51,234,0.3)]'
                                    : 'bg-slate-950 border-slate-800 hover:border-slate-600 hover:bg-slate-900'
                                    }`}
                            >
                                <div className={`p-4 rounded-full ${selectedTeams === 8 ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'}`}>
                                    <Users size={28} />
                                </div>
                                <div className="text-center">
                                    <div className={`text-2xl font-black ${selectedTeams === 8 ? 'text-white' : 'text-slate-400'}`}>{t('modals.playoff_config.teams_8')}</div>
                                    <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">{t('modals.playoff_config.rounds_3')}</div>
                                </div>
                                {selectedTeams === 8 && <div className="absolute top-3 right-3 text-purple-500"><BadgeCheck size={18} fill="currentColor" className="text-purple-500" /></div>}
                            </button>
                        </div>
                    </div>

                    {/* SECTION 2: SCHEDULE MODE */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">{t('modals.playoff_config.pacing_title')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { id: 0, label: t('modals.playoff_config.weekly'), sub: t('modals.playoff_config.weekly_sub'), desc: t('modals.playoff_config.weekly_desc') },
                                { id: 1, label: t('modals.playoff_config.split'), sub: t('modals.playoff_config.split_sub'), desc: t('modals.playoff_config.split_desc') },
                                { id: 2, label: t('modals.playoff_config.daily'), sub: t('modals.playoff_config.daily_sub'), desc: t('modals.playoff_config.daily_desc') }
                            ].map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setMode(m.id)}
                                    className={`relative p-4 rounded-xl border transition-all text-left group hover:bg-slate-900 ${mode === m.id
                                        ? 'bg-indigo-600/10 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                                        : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-lg font-black italic uppercase ${mode === m.id ? 'text-white' : 'text-slate-400'}`}>{m.label}</span>
                                        {mode === m.id && <BadgeCheck size={16} className="text-indigo-500" fill="currentColor" />}
                                    </div>
                                    <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">{m.sub}</div>
                                    <div className="text-[10px] text-slate-500 leading-tight">{m.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl hover:bg-slate-800 text-slate-400 font-bold transition">
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-8 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition shadow-lg shadow-purple-600/20 active:scale-95"
                    >
                        {t('modals.playoff_config.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
}
