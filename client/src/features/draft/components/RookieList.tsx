import { useState } from 'react';
import type { RookieDraftDto } from '../types/draft.types';
import { Search, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useModal } from '../../../context/ModalContext';

interface Props {
    rookies: RookieDraftDto[];
    onDraft: (playerId: number) => void;
    isMyTurn: boolean;
    isLoading?: boolean;
}

export default function RookieList({ rookies, onDraft, isMyTurn, isLoading }: Props) {
    const { t } = useTranslation();
    const { showConfirm } = useModal();
    const [search, setSearch] = useState('');
    const [positionFilter, setPositionFilter] = useState<string>('ALL');

    const handleDraftConfirm = (player: RookieDraftDto) => {
        showConfirm({
            title: t('draft.confirm_draft_title'),
            message: t('draft.confirm_draft', { name: player.fullName }),
            confirmText: t('common.confirm'),
            cancelText: t('common.cancel'),
            type: 'confirm'
        }).then(ok => {
            if (ok) onDraft(player.id);
        });
    };

    const filtered = rookies.filter(r => {
        const matchesSearch = r.fullName.toLowerCase().includes(search.toLowerCase());
        const matchesPos = positionFilter === 'ALL' || r.position.includes(positionFilter);
        return matchesSearch && matchesPos;
    });

    return (
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden flex flex-col h-[600px]">
            {/* Header & Filters */}
            <div className="p-4 border-b border-white/5 bg-slate-900/80 backdrop-blur-sm">
                <h3 className="text-lg font-black text-white italic uppercase mb-4">{t('draft.available_rookies')}</h3>

                <div className="flex gap-2 mb-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder={t('draft.search_placeholder')}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <select
                        value={positionFilter}
                        onChange={e => setPositionFilter(e.target.value)}
                        className="bg-slate-800 border border-white/10 rounded-xl px-3 text-sm font-bold text-slate-300 focus:outline-none"
                    >
                        <option value="ALL">{t('draft.all')}</option>
                        <option value="G">G</option>
                        <option value="F">F</option>
                        <option value="C">C</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {filtered.map(player => (
                    <div key={player.id} className="group relative bg-slate-800/40 hover:bg-slate-800 border border-white/5 hover:border-blue-500/30 rounded-xl p-3 flex items-center justify-between transition-all">
                        <div className="flex items-center gap-3">
                            {/* Photo Placeholder using ExternalId if we had the URL logic here, simplified for now */}
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400">
                                {player.position}
                            </div>
                            <div>
                                <div className="font-bold text-slate-200 group-hover:text-white transition-colors">{player.fullName}</div>
                                <div className="text-[10px] uppercase font-black tracking-wider text-slate-500 flex gap-2">
                                    <span>{player.nbaTeam}</span>
                                    {player.realRank && <span className="text-blue-400">{t('draft.rank_hash', { rank: player.realRank })}</span>}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => handleDraftConfirm(player)}
                            disabled={!isMyTurn || isLoading}
                            className={`
                        p-2 rounded-lg transition-all
                        ${isMyTurn
                                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'}
                    `}
                        >
                            <UserPlus size={18} />
                        </button>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="text-center py-10 text-slate-500 text-sm italic">
                        {t('draft.no_players_found')}
                    </div>
                )}
            </div>
        </div>
    );
}
