import { useState } from 'react';
import { useDraftBoard } from '../features/draft/api/useDraftBoard';
import type { DraftBoardSlot } from '../features/draft/types/draft.types';
import { useNavigate } from 'react-router-dom';
import { useMyTeamInfo } from '../features/team/api/useMyTeamInfo';
import api from '../services/api';
import toast from 'react-hot-toast';
import AssignPickModal from '../features/draft/components/AssignPickModal';
import SEO from '../components/SEO/SEO';
import { PremiumSelect } from '../components/PremiumSelect';
import { Loader2, Calendar } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import { useTranslation } from 'react-i18next'; // Added

export default function DraftBoard() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();
    const [selectedSeason, setSelectedSeason] = useState(currentYear + 1);

    // Admin Modal State
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedSlotForAssign, setSelectedSlotForAssign] = useState<DraftBoardSlot | null>(null);
    const [isLotteryConfirmOpen, setIsLotteryConfirmOpen] = useState(false);

    const { data: slots, isLoading, error, refetch } = useDraftBoard(selectedSeason);
    const { data: teamInfo } = useMyTeamInfo();
    const isLeagueAdmin = teamInfo?.isAdmin || false;

    const handleRunLottery = () => {
        setIsLotteryConfirmOpen(true);
    };

    const executeRunLottery = async () => {
        try {
            await api.draft.runLottery(selectedSeason);
            toast.success(t('draft.lottery') + ' ' + t('common.success'));
            navigate('/lottery');
        } catch (error) {
            console.error('Lottery failed:', error);
            toast.error(t('common.error'));
        }
    };

    const handleSlotClick = (slot: DraftBoardSlot) => {
        if (!isLeagueAdmin) return;
        setSelectedSlotForAssign(slot);
        setIsAssignModalOpen(true);
    };

    // Get available seasons (current + 3)
    const availableSeasons = [currentYear, currentYear + 1, currentYear + 2, currentYear + 3];
    const seasonOptions = availableSeasons.map(s => ({ value: s.toString(), label: `${t('common.season')} ${s}` }));

    // Group by round
    const round1 = slots?.filter(s => s.round === 1).sort((a, b) => {
        if (a.slotNumber === null) return 1;
        if (b.slotNumber === null) return -1;
        return a.slotNumber - b.slotNumber;
    }) || [];

    const round2 = slots?.filter(s => s.round === 2).sort((a, b) => {
        if (a.slotNumber === null) return 1;
        if (b.slotNumber === null) return -1;
        return a.slotNumber - b.slotNumber;
    }) || [];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 relative overflow-hidden">
            <SEO title={t('draft.board')} description="View the complete draft order and pick ownership." />

            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute top-[-5%] right-[-5%] w-[45%] h-[45%] bg-blue-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[100px]"></div>
            </div>

            <main className="container mx-auto p-4 md:p-12 max-w-7xl relative z-10">
                {/* Header */}
                <div className="flex flex-col lg:flex-row items-end justify-between gap-6 mb-12">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-purple-400 mb-4">
                            Draft Center
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-none">
                            {t('draft.board')}
                        </h1>
                        <p className="text-slate-500 font-bold uppercase tracking-widest mt-2 max-w-xl">
                            Overview for {selectedSeason}
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
                        {isLeagueAdmin && (
                            <button
                                onClick={handleRunLottery}
                                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-widest text-sm rounded-xl transition-all shadow-lg shadow-yellow-500/20 active:scale-95"
                            >
                                🎲 {t('draft.lottery')} (Run)
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/draft-assets')}
                            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-200 font-black uppercase tracking-widest text-sm rounded-xl transition-all active:scale-95"
                        >
                            {t('draft.myPicks')}
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-10 w-full md:w-64">
                    <PremiumSelect
                        label={t('common.season')}
                        value={selectedSeason.toString()}
                        onChange={(val) => setSelectedSeason(parseInt(val))}
                        options={seasonOptions}
                        icon={<Calendar size={16} />}
                    />
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
                        <p className="font-mono animate-pulse tracking-[0.3em] uppercase text-xs">{t('common.loading')}</p>
                    </div>
                ) : error ? (
                    <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-3xl text-center text-red-400">
                        {t('common.error')}
                    </div>
                ) : (!slots || slots.length === 0) ? (
                    <div className="glass-card p-12 text-center rounded-3xl border border-dashed border-white/10 bg-slate-900/40">
                        <p className="text-slate-500 font-bold uppercase tracking-widest">{t('draft.empty', { defaultValue: 'No draft picks found' })}</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* Round 1 */}
                        {round1.length > 0 && (
                            <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent"></div>
                                    <h2 className="text-2xl font-black text-yellow-500 uppercase italic tracking-tighter">{t('draft.round')} 1</h2>
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {round1.map((slot) => (
                                        <DraftSlotCard
                                            key={slot.id}
                                            slot={slot}
                                            isAdmin={isLeagueAdmin}
                                            onClick={() => handleSlotClick(slot)}
                                            t={t} // Pass translation function
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Round 2 */}
                        {round2.length > 0 && (
                            <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
                                    <h2 className="text-2xl font-black text-blue-400 uppercase italic tracking-tighter">{t('draft.round')} 2</h2>
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {round2.map((slot) => (
                                        <DraftSlotCard
                                            key={slot.id}
                                            slot={slot}
                                            isAdmin={isLeagueAdmin}
                                            onClick={() => handleSlotClick(slot)}
                                            t={t}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Admin Assign Modal */}
            {isLeagueAdmin && selectedSlotForAssign && (
                <AssignPickModal
                    isOpen={isAssignModalOpen}
                    onClose={() => setIsAssignModalOpen(false)}
                    pickId={selectedSlotForAssign.id}
                    pickLabel={`${t('draft.round')} ${selectedSlotForAssign.round}, ${t('draft.pick')} ${selectedSlotForAssign.slotNumber || 'TBD'}`}
                    onAssign={refetch}
                />
            )}

            {/* Lottery Confirmation Modal */}
            <ConfirmationModal
                isOpen={isLotteryConfirmOpen}
                onClose={() => setIsLotteryConfirmOpen(false)}
                onConfirm={executeRunLottery}
                title={t('draft.lottery')}
                message={t('draft.start_confirm_msg')}
                confirmText={t('common.confirm')}
                variant="warning"
            />
        </div>
    );
}

function DraftSlotCard({ slot, isAdmin, onClick, t }: { slot: DraftBoardSlot, isAdmin: boolean, onClick: () => void, t: any }) {
    const slotText = slot.slotNumber ? `#${slot.slotNumber}` : 'TBD';
    const isTradedPick = slot.isTradedPick;

    return (
        <div
            onClick={isAdmin ? onClick : undefined}
            className={`
                relative p-5 rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-md shadow-xl transition-all duration-300 group
                ${isAdmin ? 'cursor-pointer hover:border-blue-500/50 hover:shadow-blue-500/10' : 'hover:border-white/20'}
                ${isTradedPick ? 'border-l-4 border-l-purple-500' : ''}
            `}
        >
            {/* Admin Edit Overlay Hint */}
            {isAdmin && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] font-black bg-blue-500 text-white px-2 py-0.5 rounded uppercase tracking-widest">{t('common.edit')}</span>
                </div>
            )}

            {/* Slot Number */}
            <div className="text-center mb-4">
                <div className={`text-4xl font-black italic tracking-tighter ${slot.round === 1 ? 'text-yellow-400' : 'text-blue-400'
                    }`}>
                    {slotText}
                </div>
                {slot.slotNumber && (
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">{t('draft.pick')}</div>
                )}
            </div>

            {/* Current Owner */}
            <div className="mb-3">
                <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">{t('trades.to_label')}</div>
                <div className="text-white font-bold text-sm truncate">{slot.currentOwnerTeamName}</div>
            </div>

            {/* Original Owner (if traded) */}
            {isTradedPick && (
                <div className="mb-3 pt-2 border-t border-white/5">
                    <div className="text-[8px] text-purple-400 font-black uppercase tracking-widest mb-1">{t('trades.from_label')}</div>
                    <div className="text-slate-300 text-xs truncate">{slot.originalOwnerTeamName}</div>
                </div>
            )}

            {/* Drafted Player */}
            {slot.playerName && (
                <div className="mt-3 pt-3 border-t border-white/5 bg-emerald-500/5 -mx-5 -mb-5 p-4 rounded-b-2xl border-t-emerald-500/20">
                    <div className="text-[8px] text-emerald-500 font-black uppercase tracking-widest mb-1">Drafted</div>
                    <div className="text-emerald-400 font-bold text-sm truncate">{slot.playerName}</div>
                </div>
            )}
        </div>
    );
}
