import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, ArrowLeft, ChevronLeft, ChevronRight, Filter, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFreeAgents } from '../features/market/api/useFreeAgents';
import { useActiveAuctions } from '../features/market/api/useActiveAuctions';
import { FreeAgentCard } from '../features/market/components/FreeAgentCard';
import PlayerStatsModal from '../components/PlayerStatsModal';
import BidModal from '../components/BidModal';
import SEO from '../components/SEO/SEO';
import { CardSkeleton } from '../components/SkeletonLoaders';
import { EmptyState } from '../components/EmptyState';

import { useMyRoster } from '../features/roster/api/useMyRoster';
import { useLeagueSettings } from '../features/admin/api/useLeagueSettings';
import { RosterValidator } from '../utils/RosterValidator';
import { useModal } from '../context/ModalContext';

export default function Market() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Server State
    const { data: staticPlayers = [], isLoading: isStaticLoading } = useFreeAgents();
    const { data: activeAuctions = [], refetch: refetchAuctions } = useActiveAuctions();

    const isInitialLoading = isStaticLoading && staticPlayers.length === 0;

    // Local State
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [inputPage, setInputPage] = useState('1'); // Local state for input

    // Sync input when page changes externally (prev/next buttons)
    useEffect(() => {
        setInputPage(currentPage.toString());
    }, [currentPage]);

    const playersPerPage = 12;

    const [selectedDetailsPlayer, setSelectedDetailsPlayer] = useState<any>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [bidPlayer, setBidPlayer] = useState<any>(null);
    const [isBidOpen, setIsBidOpen] = useState(false);

    // Merge & Sort State
    const players = useMemo(() => {
        if (!staticPlayers.length) return [];

        const auctionMap = new Map();
        if (activeAuctions && activeAuctions.length > 0) {
            activeAuctions.forEach((a: any) => auctionMap.set(a.playerId, a));
        }

        return staticPlayers.map((p: any) => {
            const auction = auctionMap.get(p.id);
            if (auction) {
                return {
                    ...p,
                    hasActiveAuction: true,
                    currentOffer: auction.currentOffer,
                    currentYears: auction.currentYears,
                    highBidderName: auction.highBidderName,
                    auctionEndTime: auction.endTime
                };
            }
            return {
                ...p,
                hasActiveAuction: false,
                currentOffer: 0,
                currentYears: 0,
                highBidderName: '',
                auctionEndTime: null
            };
        }).sort((a: any, b: any) => {
            if (a.hasActiveAuction !== b.hasActiveAuction) {
                return a.hasActiveAuction ? -1 : 1;
            }
            return b.avgFantasyPoints - a.avgFantasyPoints;
        });
    }, [staticPlayers, activeAuctions]);

    const handleRefresh = () => refetchAuctions();

    // Filtering & Pagination
    const filteredPlayers = players.filter((p: any) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const indexOfLastPlayer = currentPage * playersPerPage;
    const indexOfFirstPlayer = indexOfLastPlayer - playersPerPage;
    const currentPlayers = filteredPlayers.slice(indexOfFirstPlayer, indexOfLastPlayer);
    const totalPages = Math.ceil(filteredPlayers.length / playersPerPage);

    const paginate = (pageNumber: number) => {
        setCurrentPage(pageNumber);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };


    // Validation Dependencies
    const { data: myRoster } = useMyRoster();
    const { data: leagueSettings } = useLeagueSettings();
    const { showAlert } = useModal();

    const openDetails = (player: any) => { setSelectedDetailsPlayer(player); setIsDetailsOpen(true); };

    const openBidModal = (player: any) => {
        // Validation: Can I fit this player?
        if (leagueSettings && myRoster) {
            const validation = RosterValidator.canAddPlayer(
                myRoster.map((p: any) => ({ id: p.id, position: p.position })),
                { id: player.id, position: player.position },
                {
                    guards: leagueSettings.roleLimitGuards || 5,
                    forwards: leagueSettings.roleLimitForwards || 5,
                    centers: leagueSettings.roleLimitCenters || 3
                }
            );

            if (!validation.valid) {
                showAlert({
                    title: t('draft.roster_limit_exceeded') || "Roster Limit",
                    message: validation.reason || t('draft.roster_full_msg') || "Roster Full",
                    type: "error"
                });
                return;
            }
        }

        setBidPlayer(player);
        setIsBidOpen(true);
    }

    if (isInitialLoading) return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-12">
            <div className="mx-auto max-w-7xl">
                <div className="h-12 w-48 bg-slate-800 animate-pulse rounded-xl mb-12" />
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 p-4 md:p-6 text-slate-100 font-sans pb-24">
            <SEO title="Mercato" description="Cerca free agent e partecipa alle aste." />

            <PlayerStatsModal player={selectedDetailsPlayer} isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} />
            <BidModal
                player={bidPlayer}
                isOpen={isBidOpen}
                onClose={() => setIsBidOpen(false)}
                onSuccess={() => { handleRefresh(); setIsBidOpen(false); }}
            />

            <div className="mx-auto max-w-7xl">
                <button onClick={() => navigate('/dashboard')} className="mb-8 flex items-center text-xs font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition group">
                    <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Dashboard
                </button>

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-12">
                    <div className="flex-1">
                        <h1 className="text-3xl md:text-5xl font-black text-white flex items-center gap-4 tracking-tighter uppercase italic leading-none">
                            <Users className="text-emerald-500" size={48} /> {t('market.title')}
                        </h1>
                        <div className="flex items-center gap-4 mt-3">
                            <p className="text-slate-400 font-medium text-lg leading-none">{t('market.market_description')}</p>
                            <div className="h-px flex-1 bg-slate-800/50"></div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-hover:text-emerald-500 transition-colors" />
                            <input
                                type="text"
                                placeholder={t('market.search_placeholder')}
                                className="w-full sm:w-80 rounded-2xl bg-slate-900 border border-slate-800 p-4 pl-12 text-white focus:border-emerald-500 focus:outline-none transition-all shadow-xl"
                                value={searchTerm}
                                onChange={handleSearchChange}
                            />
                        </div>
                        <button className="flex items-center gap-2 px-6 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-white hover:border-slate-700 transition shadow-xl font-black uppercase text-[10px] tracking-widest">
                            <Filter size={16} /> Filters
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
                    {currentPlayers.length > 0 ? (
                        currentPlayers.map((player: any) => (
                            <FreeAgentCard
                                key={player.id}
                                player={player}
                                onOpenDetails={openDetails}
                                onOpenBid={openBidModal}
                                onAuctionExpire={() => handleRefresh()}
                            />
                        ))
                    ) : (
                        <div className="col-span-full">
                            <EmptyState
                                icon={Search}
                                title={t('market.no_results_title') || "No Players Found"}
                                description={t('market.no_results_desc') || "We couldn't find any players matching your search criteria."}
                                action={{
                                    label: t('market.clear_search') || "Clear Search",
                                    onClick: () => setSearchTerm('')
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-16 pb-10">
                        <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-2xl border border-white/5 shadow-xl backdrop-blur-md">
                            <button
                                onClick={() => paginate(1)}
                                disabled={currentPage === 1}
                                className="p-3 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white disabled:opacity-20 transition"
                                title="First Page"
                            >
                                <ChevronsLeft size={20} />
                            </button>
                            <button
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-3 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white disabled:opacity-20 transition"
                                title="Previous Page"
                            >
                                <ChevronLeft size={20} />
                            </button>

                            <div className="flex items-center gap-3 px-4 border-l border-r border-white/5 mx-2">
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest hidden sm:inline">Page</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={inputPage}
                                    onChange={(e) => setInputPage(e.target.value)}
                                    onBlur={() => {
                                        const val = parseInt(inputPage);
                                        if (!isNaN(val) && val >= 1 && val <= totalPages) {
                                            paginate(val);
                                        } else {
                                            setInputPage(currentPage.toString()); // Revert if invalid
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const val = parseInt(inputPage);
                                            if (!isNaN(val) && val >= 1 && val <= totalPages) {
                                                paginate(val);
                                                (e.target as HTMLInputElement).blur();
                                            } else {
                                                setInputPage(currentPage.toString());
                                            }
                                        }
                                    }}
                                    className="w-16 bg-slate-950/50 rounded-lg py-1 px-2 text-center font-black text-white italic outline-none focus:ring-1 focus:ring-emerald-500 transition-all appearance-none"
                                />
                                <span className="text-slate-700 font-black">/</span>
                                <span className="text-slate-500 font-black">{totalPages}</span>
                            </div>

                            <button
                                onClick={() => paginate(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-3 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white disabled:opacity-20 transition"
                                title="Next Page"
                            >
                                <ChevronRight size={20} />
                            </button>
                            <button
                                onClick={() => paginate(totalPages)}
                                disabled={currentPage === totalPages}
                                className="p-3 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white disabled:opacity-20 transition"
                                title="Last Page"
                            >
                                <ChevronsRight size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
