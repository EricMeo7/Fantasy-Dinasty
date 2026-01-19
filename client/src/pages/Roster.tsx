import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowRight, Shirt, LayoutDashboard, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMyRoster } from '../features/roster/api/useMyRoster';
import { useTeamBudget } from '../features/team/api/useTeamBudget';
import { useMyTeamInfo } from '../features/team/api/useMyTeamInfo'; // NEW
import { BudgetOverview } from '../features/roster/components/BudgetOverview';
import { useReleasePlayer } from '../features/team/api/useReleasePlayer';
import { RosterTable } from '../features/roster/components/RosterTable';
import { PlayerCard } from '../features/roster/components/PlayerCard';
import PlayerStatsModal, { type PlayerFull } from '../components/PlayerStatsModal';
import ReleaseModal from '../components/ReleaseModal';
import TeamSettingsModal from '../components/TeamSettingsModal';
// i18next import restored above
import { CONFIG } from '../config';
import SEO from '../components/SEO/SEO';

import { toast } from 'react-hot-toast';
import { TableSkeleton } from '../components/SkeletonLoaders';
import { EmptyState } from '../components/EmptyState';
import LogoAvatar from '../components/LogoAvatar';

export default function Roster() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    // useModal hook removed as showAlert is no longer used here

    // React Query Hooks
    const { data: players = [], isLoading: loadingRoster } = useMyRoster();
    const { data: finance } = useTeamBudget();
    const { data: myTeam } = useMyTeamInfo();

    // Local State for Modals
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerFull | null>(null);
    const [isStatsOpen, setIsStatsOpen] = useState(false);
    const [releaseTarget, setReleaseTarget] = useState<PlayerFull | null>(null);
    const [isReleaseOpen, setIsReleaseOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [, setIsReleasing] = useState(false);

    // Actions
    const handleReleaseClick = (player: any) => {
        setReleaseTarget(player);
        setIsReleaseOpen(true);
    };

    const { mutate: releasePlayer } = useReleasePlayer();

    const confirmRelease = async () => {
        if (!releaseTarget) return;
        setIsReleasing(true);

        const toastId = toast.loading(t('common.processing'));

        releasePlayer(releaseTarget.id, {
            onSuccess: () => {
                toast.success(t('roster.player_released_success'), { id: toastId });
                setIsReleaseOpen(false);
                setIsReleasing(false);
            },
            onError: (error: any) => {
                console.error("Errore taglio:", error);
                const msg = error.response?.data?.message || error.response?.data || t('roster.release_error');
                toast.error(msg, { id: toastId });
                setIsReleasing(false);
            }
        });
    };

    const openStats = (player: any) => {
        setSelectedPlayer(player);
        setIsStatsOpen(true);
    };

    const isInitialLoading = loadingRoster && players.length === 0;

    return (
        <div className="min-h-screen bg-slate-950 p-4 md:p-12 text-slate-100 font-sans pb-32 relative overflow-hidden">
            <SEO title={t('roster.header_player')} description={t('roster.seo_description')} />

            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-indigo-900/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="mx-auto max-w-7xl relative z-10">

                {/* Modals */}
                <PlayerStatsModal
                    player={selectedPlayer}
                    isOpen={isStatsOpen}
                    onClose={() => setIsStatsOpen(false)}
                />

                <ReleaseModal
                    player={releaseTarget}
                    isOpen={isReleaseOpen}
                    onClose={() => setIsReleaseOpen(false)}
                    onConfirm={confirmRelease}
                />

                <TeamSettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                />

                {/* Header Navigation */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-8 md:mb-16">
                    <div className="flex items-center gap-4 md:gap-8">
                        <LogoAvatar
                            src={myTeam?.id ? `${CONFIG.API_BASE_URL}/team/${myTeam.id}/logo?t=${new Date().getTime()}` : undefined}
                            alt={myTeam?.name || 'Team'}
                            size="xl"
                            shape="square"
                            className="bg-transparent border-none scale-110 group-hover:scale-125 transition-transform duration-700"
                            fallbackType="team"
                        />
                        <div>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="group flex items-center gap-2 text-slate-600 hover:text-white transition-all text-[9px] font-black uppercase tracking-[0.3em] mb-3"
                            >
                                <ArrowRight className="rotate-180 group-hover:-translate-x-1 transition-transform" size={12} /> {t('roster.return_dashboard')}
                            </button>
                            <div className="flex items-center gap-4">
                                <h1 className="text-3xl md:text-7xl font-black text-white flex items-center gap-4 tracking-tighter italic uppercase leading-none">
                                    {myTeam?.name || t('roster.personnel_roster')} <span className="text-blue-500">{t('roster.title').split(' ')[1]}</span>
                                </h1>
                                <button onClick={() => setIsSettingsOpen(true)} className="p-2 md:p-3 rounded-full bg-slate-900/50 border border-white/10 text-slate-500 hover:text-white hover:bg-slate-800 transition-all hover:scale-105" title={t('team_settings.title')}>
                                    <Settings size={20} />
                                </button>
                            </div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-3">{t('roster.squad_entity_config')}</p>
                        </div>
                    </div >

                    <button
                        onClick={() => navigate('/lineup')}
                        className="group flex items-center gap-4 px-8 py-4 rounded-3xl bg-slate-900/50 backdrop-blur-xl border border-white/5 text-slate-400 hover:text-white transition-all shadow-2xl hover:border-blue-500/30 w-full md:w-auto justify-between md:justify-start"
                    >
                        <div className="flex flex-col text-right">
                            <span className="text-[8px] font-black uppercase tracking-[0.3em]">{t('roster.tactical_hub')}</span>
                            <span className="text-[11px] font-black uppercase tracking-widest">{t('roster.manage_lineup')}</span>
                        </div>
                        <div className="p-2 bg-slate-800 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-lg"><LayoutDashboard size={20} /></div>
                    </button>
                </div >

                {/* Budget Section */}
                < div className="mb-8 md:mb-16 animate-in fade-in slide-in-from-top-6 duration-700" >
                    {finance && <BudgetOverview finance={finance} />}
                </div >

                {/* Roster Container */}
                < div className="relative" >
                    <div className="absolute -top-10 left-4 md:left-8 px-6 py-2 bg-slate-950 border border-slate-800 rounded-t-2xl border-b-0 inline-flex items-center gap-3 z-20">
                        <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('roster.active_unit_roster')}</span>
                    </div>

                    <div className="bg-slate-900/40 backdrop-blur-3xl rounded-[2rem] md:rounded-[3rem] border border-white/5 overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom-8 duration-1000 relative">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-blue-400 to-transparent opacity-50"></div>

                        <div className="px-6 py-6 md:px-10 md:py-8 border-b border-white/5 bg-slate-950/40 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20 text-blue-500"><Users size={24} /></div>
                                <h3 className="font-black text-white uppercase tracking-tighter text-2xl italic leading-none">{t('roster.squad_intelligence')}</h3>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="h-8 w-px bg-slate-800"></div>
                                <div className="flex flex-col items-end">
                                    <span className="text-xl font-black text-white italic tabular-nums leading-none">{players.length} <span className="text-[10px] text-slate-700">/ 15</span></span>
                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">{t('roster.personnel_count')}</span>
                                </div>
                            </div>
                        </div>

                        {
                            isInitialLoading ? (
                                <div className="p-8 pb-12">
                                    <TableSkeleton rows={10} cols={6} />
                                </div>
                            ) : players.length === 0 ? (
                                <EmptyState
                                    icon={Shirt}
                                    title={t('roster.no_players_title')}
                                    description={t('roster.no_players_desc')}
                                    action={{
                                        label: t('roster.go_to_market'),
                                        onClick: () => navigate('/market')
                                    }}
                                />
                            ) : (
                                <div className="p-8 pb-12">
                                    {/* Desktop View */}
                                    <div className="hidden lg:block">
                                        <RosterTable
                                            players={players}
                                            onRelease={handleReleaseClick}
                                            onOpenStats={openStats}
                                        />
                                    </div>

                                    {/* Mobile View */}
                                    <div className="lg:hidden flex flex-col gap-6">
                                        {players.map((p: any) => (
                                            <PlayerCard
                                                key={p.id}
                                                player={p}
                                                onRelease={handleReleaseClick}
                                                onOpenStats={openStats}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )
                        }
                    </div>
                </div >

            </div >
        </div >
    );
}
