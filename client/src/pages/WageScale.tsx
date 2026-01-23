import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import { useMyTeamInfo } from '../features/team/api/useMyTeamInfo';
import { ShieldCheck, Loader2, Save, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import SEO from '../components/SEO/SEO';

interface RookieWageScale {
    id: number;
    pickNumber: number;
    year1Salary: number;
    year2Salary: number;
    year3OptionPercentage: number; // e.g. 200 for +200%
}

export default function WageScale() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { data: teamInfo } = useMyTeamInfo();
    const isAdmin = teamInfo?.isAdmin;

    const [isEditing, setIsEditing] = useState(false);

    // FETCH
    const { data: scales, isLoading } = useQuery({
        queryKey: ['wage-scale'],
        queryFn: async () => {
            const leagueId = localStorage.getItem('selectedLeagueId');
            if (!leagueId) throw new Error("No league selected");
            const res = await api.get(`/league/${leagueId}/wage-scale`);
            return res.data as RookieWageScale[];
        }
    });

    // UPDATE MUTATION (Admin only) - Simulation of batch update or single update
    // Ideally we would want a Save All or individual row save. For simplicity here: Edit -> Save All?
    // Let's implement a readonly view by default.
    // Since I don't see a specific API endpoint for updating the scale in the user prompts yet, 
    // I will assume standard API structure or mocked save for now if endpoints missing.
    // The user prompt mentioned: "Modifying the RookieDraftService... for commissioners to manage these wage scales."
    // I will assume `PUT /api/league/{leagueId}/wage-scale` exists or will exist.

    const [editedScales, setEditedScales] = useState<RookieWageScale[]>([]);

    useEffect(() => {
        if (scales) setEditedScales(scales);
    }, [scales]);

    const initMutation = useMutation({
        mutationFn: async () => {
            const leagueId = localStorage.getItem('selectedLeagueId');
            await api.post(`/league/${leagueId}/rookie-scale/init-default`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wage-scale'] });
            toast.success("Initial scale created");
        },
        onError: () => toast.error("Failed to init")
    });

    const saveMutation = useMutation({
        mutationFn: async (newScales: RookieWageScale[]) => {
            const leagueId = localStorage.getItem('selectedLeagueId');
            await api.post(`/league/${leagueId}/rookie-scale`, newScales);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wage-scale'] });
            setIsEditing(false);
            toast.success(t('common.saved'));
        },
        onError: (err) => {
            console.error(err);
            toast.error(t('common.error_saving'));
        }
    });

    const handleSave = () => {
        saveMutation.mutate(editedScales);
    };

    const handleCancel = () => {
        if (scales) setEditedScales(scales);
        setIsEditing(false);
    };

    const handleChange = (id: number, field: keyof RookieWageScale, value: string) => {
        setEditedScales(prev => prev.map(s => {
            if (s.id !== id) return s;
            return { ...s, [field]: parseFloat(value) || 0 };
        }));
    };

    return (
        <div className="min-h-screen bg-slate-950 p-4 md:p-8 font-sans text-slate-200 pb-20">
            <SEO title={t('draft.wageScale')} description="Rookie Wage Scale and Contract Values" />

            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black italic uppercase text-white tracking-tighter">
                            {t('draft.wageScale')}
                        </h1>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">
                            {t('draft.contract_values_subtitle', { defaultValue: 'Standard Rookie Contracts' })}
                        </p>
                    </div>

                    {isAdmin && (
                        <div className="flex gap-2">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={handleCancel}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all text-xs font-black uppercase tracking-widest"
                                    >
                                        <RotateCcw size={14} /> {t('common.cancel')}
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saveMutation.isPending}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all text-xs font-black uppercase tracking-widest"
                                    >
                                        {saveMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                                        {t('common.save')}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all text-xs font-black uppercase tracking-widest"
                                >
                                    <ShieldCheck size={14} /> {t('common.edit')}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="animate-spin text-blue-500" />
                    </div>
                ) : !scales || scales.length === 0 ? (
                    <div className="p-8 bg-slate-900 border border-white/5 rounded-3xl text-center">
                        <p className="text-slate-400 mb-4">{t('draft.no_wage_scale')}</p>
                        {isAdmin && (
                            <button
                                onClick={() => initMutation.mutate()}
                                disabled={initMutation.isPending}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
                            >
                                {initMutation.isPending ? <Loader2 className="animate-spin inline mr-2" /> : null}
                                {t('draft.init_default_scale', { defaultValue: 'Initialize Standards' })}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-slate-900 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-white/5 border-b border-white/5">
                                        <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                            {t('draft.pick')}
                                        </th>
                                        <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">
                                            {t('draft.year1')} (M$)
                                        </th>
                                        <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">
                                            {t('draft.year2')} (M$)
                                        </th>
                                        <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">
                                            {t('draft.year3_option')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {(isEditing ? editedScales : scales)
                                        .sort((a, b) => a.pickNumber - b.pickNumber)
                                        .map((scale) => (
                                            <tr key={scale.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4 font-mono font-bold text-blue-400">
                                                    #{scale.pickNumber}
                                                </td>
                                                <td className="p-4 text-right font-mono text-white">
                                                    {isEditing ? (
                                                        <input
                                                            type="number" step="0.1"
                                                            className="bg-slate-800 border-white/10 rounded px-2 py-1 w-20 text-right"
                                                            value={scale.year1Salary}
                                                            onChange={e => handleChange(scale.id, 'year1Salary', e.target.value)}
                                                        />
                                                    ) : (
                                                        `${scale.year1Salary.toFixed(1)}M`
                                                    )}
                                                </td>
                                                <td className="p-4 text-right font-mono text-white">
                                                    {isEditing ? (
                                                        <input
                                                            type="number" step="0.1"
                                                            className="bg-slate-800 border-white/10 rounded px-2 py-1 w-20 text-right"
                                                            value={scale.year2Salary}
                                                            onChange={e => handleChange(scale.id, 'year2Salary', e.target.value)}
                                                        />
                                                    ) : (
                                                        `${scale.year2Salary.toFixed(1)}M`
                                                    )}
                                                </td>
                                                <td className="p-4 text-right font-mono text-emerald-400">
                                                    {isEditing ? (
                                                        <div className="flex justify-end items-center gap-1">
                                                            <span className="text-slate-500 text-xs">+</span>
                                                            <input
                                                                type="number" step="1"
                                                                className="bg-slate-800 border-white/10 rounded px-2 py-1 w-16 text-right"
                                                                value={scale.year3OptionPercentage}
                                                                onChange={e => {
                                                                    const val = parseFloat(e.target.value);
                                                                    handleChange(scale.id, 'year3OptionPercentage', val.toString());
                                                                }}
                                                            />
                                                            <span className="text-slate-500 text-xs">%</span>
                                                        </div>
                                                    ) : (
                                                        `+ ${scale.year3OptionPercentage}%`
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
