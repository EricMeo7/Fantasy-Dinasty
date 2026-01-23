import { useDraftAssets } from '../features/draft/api/useDraftAssets';
import type { DraftAsset } from '../features/draft/types/draft.types';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import SEO from '../components/SEO/SEO';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next'; // Added

export default function DraftAssets() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { data: assets, isLoading, error, refetch } = useDraftAssets();

    const handleInitDraft = async () => {
        try {
            await api.draft.init();
            toast.success(t('draft.initializing_engine'));
            refetch();
        } catch (error) {
            console.error('Failed to init draft:', error);
            toast.error(t('common.error'));
        }
    };

    // Group assets by season
    const assetsBySeason = assets?.reduce((acc, asset) => {
        if (!acc[asset.season]) {
            acc[asset.season] = [];
        }
        acc[asset.season].push(asset);
        return acc;
    }, {} as Record<number, DraftAsset[]>);

    const seasons = assetsBySeason ? Object.keys(assetsBySeason).map(Number).sort() : [];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 relative overflow-hidden">
            <SEO title={`${t('draft.myPicks')} | Fantasy Basket`} description="View and manage your draft picks." />

            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute top-[-5%] right-[-5%] w-[45%] h-[45%] bg-purple-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[100px]"></div>
            </div>

            <main className="container mx-auto p-4 md:p-12 max-w-7xl relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-end justify-between gap-6 mb-12">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4">
                            {t('draft.portfolio')}
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-none">
                            {t('draft.myPicks')}
                        </h1>
                        <p className="text-slate-500 font-bold uppercase tracking-widest mt-2 max-w-xl">
                            {t('draft.assets_subtitle')}
                        </p>
                    </div>

                    <button
                        onClick={() => navigate('/draft-board')}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest text-sm rounded-xl transition-all shadow-lg shadow-purple-600/20 active:scale-95"
                    >
                        {t('draft.view_board')}
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <Loader2 className="animate-spin text-purple-500 mb-4" size={48} />
                        <p className="font-mono animate-pulse tracking-[0.3em] uppercase text-xs">{t('common.loading')}</p>
                    </div>
                ) : error ? (
                    <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-3xl text-center text-red-400">
                        {t('common.error')}
                    </div>
                ) : (!assets || assets.length === 0) ? (
                    <div className="glass-card p-12 text-center rounded-3xl border border-dashed border-white/10 bg-slate-900/40">
                        <p className="text-slate-300 text-lg mb-6">{t('draft.no_players', { defaultValue: 'You don\'t own any draft picks yet.' })}</p>

                        <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl max-w-lg mx-auto">
                            <button
                                onClick={handleInitDraft}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-colors shadow-lg shadow-blue-600/20"
                            >
                                {t('common.confirm')} (Init)
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {seasons.map((season) => (
                            <div key={season} className="animate-in fade-in slide-in-from-bottom-5 duration-700">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                                    <h2 className="text-3xl font-black text-white/20 uppercase italic tracking-tighter">{t('common.season')} {season}</h2>
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {assetsBySeason![season].map((asset) => (
                                        <DraftPickCard key={asset.id} asset={asset} t={t} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

function DraftPickCard({ asset, t }: { asset: DraftAsset, t: any }) {
    const roundLabel = `${t('draft.round')} ${asset.round}`;
    const slotText = asset.slotNumber ? `#${asset.slotNumber}` : 'TBD';
    const isTradedPick = !asset.isOwn;

    return (
        <div className="relative p-6 rounded-3xl border border-white/5 bg-slate-900/40 backdrop-blur-md shadow-xl hover:bg-slate-800/40 transition-all duration-300 group overflow-hidden">

            {/* Background Glow */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none transition-opacity ${asset.round === 1 ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>

            {/* Round Badge */}
            <div className="flex items-center justify-between mb-6 relative z-10">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${asset.round === 1
                    ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                    {roundLabel}
                </span>
                {isTradedPick && (
                    <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-black uppercase tracking-widest rounded-full">
                        Acquired
                    </span>
                )}
            </div>

            {/* Slot Number */}
            <div className="text-center mb-6 relative z-10">
                <div className="text-6xl font-black text-white italic tracking-tighter drop-shadow-2xl">{slotText}</div>
                {asset.slotNumber && (
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-2">{t('draft.pick')}</div>
                )}
            </div>

            {/* Original Team */}
            <div className="border-t border-white/5 pt-4 relative z-10">
                <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Original Rights</div>
                <div className="text-slate-300 font-bold text-sm tracking-wide">{asset.originalOwnerTeamName}</div>
            </div>

            {/* Player (if drafted) */}
            {asset.playerName && (
                <div className="mt-4 pt-4 border-t border-white/5 bg-emerald-500/5 -mx-6 -mb-6 p-5 text-center border-t-emerald-500/10">
                    <div className="text-[9px] text-emerald-500 font-black uppercase tracking-widest mb-1">Selected Player</div>
                    <div className="text-emerald-400 font-black text-lg italic tracking-tight">{asset.playerName}</div>
                </div>
            )}
        </div>
    );
}
