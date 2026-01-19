import { useState, useMemo, useEffect } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';
import type { SortingState, ColumnFiltersState } from '@tanstack/react-table';
import {
    Search,
    Filter,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Activity,
    Users,
    X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useInfinitePlayerPool, useSeasons } from '../features/stats/api/usePlayerPool';
import SEO from '../components/SEO/SEO';
import { TableSkeleton } from '../components/SkeletonLoaders';
import { PremiumSelect } from '../components/PremiumSelect';
import { useInView } from 'react-intersection-observer';

interface PlayerPoolData {
    playerId: number;
    externalId: number;
    name: string;
    position: string;
    nbaTeam: string;
    fantasyTeamName: string | null;
    fantasyTeamId: number | null;
    gamesPlayed: number;
    avgMinutes: number;
    avgPoints: number;
    avgRebounds: number;
    avgAssists: number;
    avgSteals: number;
    avgBlocks: number;
    avgTurnovers: number;
    fgm: number;
    fga: number;
    fgPercent: number;
    threePm: number;
    threePa: number;
    threePtPercent: number;
    ftm: number;
    fta: number;
    ftPercent: number;
    offRebounds: number;
    defRebounds: number;
    plusMinus: number;
    efficiency: number;
    doubleDoubles: number;
    tripleDoubles: number;
    fantasyPoints: number;
    injuryStatus: string | null;
    injuryBodyPart: string | null;
    injuryReturnDate: string | null;
}

const columnHelper = createColumnHelper<PlayerPoolData>();

export default function PlayerPool() {
    const { t } = useTranslation();

    const [season, setSeason] = useState<string>(""); // Empty = Current
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");
    const [sorting, setSorting] = useState<SortingState>([{ id: 'fantasyPoints', desc: true }]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    const params = useMemo(() => {
        const getFilter = (id: string) => columnFilters.find(f => f.id === id)?.value as number | undefined;

        return {
            season: season || undefined,
            nameSearch: debouncedSearch,
            position: columnFilters.find(f => f.id === 'position')?.value as string,
            minPts: getFilter('avgPoints'),
            minReb: getFilter('avgRebounds'),
            minAst: getFilter('avgAssists'),
            minStl: getFilter('avgSteals'),
            minBlk: getFilter('avgBlocks'),
            minFpts: getFilter('fantasyPoints'),
            minMin: getFilter('avgMinutes'),
            minGp: getFilter('gamesPlayed'),
            minFgPct: getFilter('fgPercent'),
            min3pPct: getFilter('threePtPercent'),
            minFtPct: getFilter('ftPercent'),
            sortBy: sorting[0]?.id,
            isDescending: sorting[0]?.desc,
            pageSize: 50,
        };
    }, [season, sorting, columnFilters, debouncedSearch]);

    const {
        data: infinitData,
        isLoading,
        isFetchingNextPage,
        fetchNextPage,
        hasNextPage
    } = useInfinitePlayerPool(params);

    const { ref, inView } = useInView();

    useEffect(() => {
        if (inView && hasNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, fetchNextPage]);

    const players = useMemo(() => {
        return infinitData?.pages.flatMap(page => page.players) ?? [];
    }, [infinitData]);


    const { data: seasons = [] } = useSeasons();

    const positionOptions = useMemo(() => [
        { value: "", label: t('player_stats.all_positions') },
        { value: "G", label: t('league_settings.g') },
        { value: "F", label: t('league_settings.f') },
        { value: "C", label: t('league_settings.c') },
    ], [t]);

    const seasonOptions = useMemo(() => {
        const options = [{ value: "", label: t('roster.current') }];
        seasons.forEach((s: string) => options.push({ value: s, label: s }));
        return options;
    }, [seasons, t]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const columns = useMemo(() => [
        columnHelper.accessor('name', {
            header: () => <span className="flex items-center gap-2">{t('player_stats.columns.player')}</span>,
            cell: info => (
                <div className="flex items-center gap-3 py-2">
                    <div className="h-10 w-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden shrink-0">
                        <img
                            src={`https://cdn.nba.com/headshots/nba/latest/260x190/${info.row.original.externalId}.png`}
                            className="h-full w-full object-cover pt-1"
                            alt=""
                            onError={(e) => e.currentTarget.style.display = 'none'}
                        />
                    </div>
                    <div>
                        <div className="font-bold text-white leading-tight">{info.getValue()}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">
                            {info.row.original.nbaTeam}
                        </div>
                    </div>
                </div>
            ),
        }),
        columnHelper.accessor('position', {
            header: 'POS',
            cell: info => <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white/5 px-2 py-0.5 rounded">{info.getValue()}</span>
        }),
        columnHelper.accessor('fantasyTeamName', {
            header: () => <span>{t('player_stats.columns.status')}</span>,
            cell: info => {
                const teamName = info.getValue();
                if (teamName) {
                    return (
                        <Link to={`/team/${info.row.original.fantasyTeamId}`} className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-3 py-1 rounded-full text-xs font-bold border border-blue-500/20">
                            <Users size={12} /> {teamName}
                        </Link>
                    );
                }
                return (
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                        {t('player_stats.status.free_agent')}
                    </span>
                );
            },
        }),
        columnHelper.accessor('gamesPlayed', { header: 'GP', cell: info => info.getValue() ?? 0 }),
        columnHelper.accessor('avgMinutes', { header: 'MIN', cell: info => (info.getValue() ?? 0).toFixed(1) }),
        columnHelper.accessor('avgPoints', { header: 'PTS', cell: info => <span className="text-white font-bold">{(info.getValue() ?? 0).toFixed(1)}</span> }),
        columnHelper.accessor('avgRebounds', { header: 'REB', cell: info => (info.getValue() ?? 0).toFixed(1) }),
        columnHelper.accessor('offRebounds', { header: 'OREB', cell: info => (info.getValue() ?? 0).toFixed(1) }),
        columnHelper.accessor('defRebounds', { header: 'DREB', cell: info => (info.getValue() ?? 0).toFixed(1) }),
        columnHelper.accessor('avgAssists', { header: 'AST', cell: info => (info.getValue() ?? 0).toFixed(1) }),
        columnHelper.accessor('avgSteals', { header: 'STL', cell: info => (info.getValue() ?? 0).toFixed(1) }),
        columnHelper.accessor('avgBlocks', { header: 'BLK', cell: info => (info.getValue() ?? 0).toFixed(1) }),
        columnHelper.accessor('avgTurnovers', { header: 'TOV', cell: info => (info.getValue() ?? 0).toFixed(1) }),
        columnHelper.accessor('fgm', { header: 'FGM', cell: info => (info.getValue() ?? 0).toFixed(1) }),
        columnHelper.accessor('fga', { header: 'FGA', cell: info => (info.getValue() ?? 0).toFixed(1) }),
        columnHelper.accessor('fgPercent', { header: 'FG%', cell: info => `${((info.getValue() ?? 0) * 100).toFixed(1)}%` }),
        columnHelper.accessor('threePm', { header: '3PM', cell: info => (info.getValue() ?? 0).toFixed(1) }),
        columnHelper.accessor('threePa', { header: '3PA', cell: info => (info.getValue() ?? 0).toFixed(1) }),
        columnHelper.accessor('threePtPercent', { header: '3P%', cell: info => `${((info.getValue() ?? 0) * 100).toFixed(1)}%` }),
        columnHelper.accessor('ftm', { header: 'FTM', cell: info => (info.getValue() ?? 0).toFixed(1) }),
        columnHelper.accessor('fta', { header: 'FTA', cell: info => (info.getValue() ?? 0).toFixed(1) }),
        columnHelper.accessor('ftPercent', { header: 'FT%', cell: info => `${((info.getValue() ?? 0) * 100).toFixed(1)}%` }),
        columnHelper.accessor('plusMinus', { header: '+/-', cell: info => (info.getValue() ?? 0).toFixed(1) }),
        columnHelper.accessor('efficiency', { header: 'EFF', cell: info => (info.getValue() ?? 0).toFixed(1) }),
        columnHelper.accessor('fantasyPoints', {
            header: 'FPTS',
            cell: info => <span className="text-yellow-400 font-bold font-mono">{(info.getValue() ?? 0).toFixed(1)}</span>
        }),
        columnHelper.accessor('injuryStatus', {
            header: 'Status',
            cell: info => info.getValue() && (
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${info.getValue() === 'Active' ? 'bg-emerald-500/10 text-emerald-500' :
                    info.getValue() === 'Out' ? 'bg-red-500/10 text-red-500' :
                        'bg-yellow-500/10 text-yellow-500'
                    }`}>
                    {info.getValue()}
                </span>
            )
        }),
        columnHelper.accessor('injuryReturnDate', { header: 'Return', cell: info => info.getValue() || '-' }),
    ], [t]);

    const [showFilters, setShowFilters] = useState(false);

    const table = useReactTable({
        data: players,
        columns,
        state: {
            sorting,
            columnFilters,
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        manualSorting: true, // Server-side sorting
        manualFiltering: true, // Server-side filtering
    });

    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-slate-200 relative overflow-hidden">
            {/* Sidebar Filtri */}
            <div className={`fixed top-0 right-0 w-80 h-full bg-slate-900/95 backdrop-blur-2xl z-[200] border-l border-white/10 transform transition-transform duration-300 shadow-[0_0_50px_rgba(0,0,0,0.5)] ${showFilters ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-6 border-b border-white/5">
                        <h3 className="text-xl font-bold text-white flex items-center gap-3 italic uppercase italic tracking-tighter">
                            <Filter className="text-blue-500" size={20} />
                            {t('player_stats.filters_sidebar_title')}
                        </h3>
                        <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                            <X className="text-white/60" size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                        <FilterInput
                            label={t('player_stats.filters_advanced.min_fpts', 'Min Fantasy Points')}
                            value={columnFilters.find(f => f.id === 'fantasyPoints')?.value as number}
                            onChange={(v) => setColumnFilters(prev => v !== undefined ? [...prev.filter(f => f.id !== 'fantasyPoints'), { id: 'fantasyPoints', value: v }] : prev.filter(f => f.id !== 'fantasyPoints'))}
                        />
                        <FilterInput
                            label={t('player_stats.filters_advanced.min_min', 'Min Minutes')}
                            value={columnFilters.find(f => f.id === 'avgMinutes')?.value as number}
                            onChange={(v) => setColumnFilters(prev => v !== undefined ? [...prev.filter(f => f.id !== 'avgMinutes'), { id: 'avgMinutes', value: v }] : prev.filter(f => f.id !== 'avgMinutes'))}
                        />
                        <FilterInput
                            label={t('player_stats.filters_advanced.min_gp', 'Min Games Played')}
                            value={columnFilters.find(f => f.id === 'gamesPlayed')?.value as number}
                            onChange={(v) => setColumnFilters(prev => v !== undefined ? [...prev.filter(f => f.id !== 'gamesPlayed'), { id: 'gamesPlayed', value: v }] : prev.filter(f => f.id !== 'gamesPlayed'))}
                        />
                        <FilterInput
                            label={t('player_stats.filters_advanced.min_pts', 'Min Points')}
                            value={columnFilters.find(f => f.id === 'avgPoints')?.value as number}
                            onChange={(v) => setColumnFilters(prev => v !== undefined ? [...prev.filter(f => f.id !== 'avgPoints'), { id: 'avgPoints', value: v }] : prev.filter(f => f.id !== 'avgPoints'))}
                        />
                        <FilterInput
                            label={t('player_stats.filters_advanced.min_reb', 'Min Rebounds')}
                            value={columnFilters.find(f => f.id === 'avgRebounds')?.value as number}
                            onChange={(v) => setColumnFilters(prev => v !== undefined ? [...prev.filter(f => f.id !== 'avgRebounds'), { id: 'avgRebounds', value: v }] : prev.filter(f => f.id !== 'avgRebounds'))}
                        />
                        <FilterInput
                            label={t('player_stats.filters_advanced.min_ast', 'Min Assists')}
                            value={columnFilters.find(f => f.id === 'avgAssists')?.value as number}
                            onChange={(v) => setColumnFilters(prev => v !== undefined ? [...prev.filter(f => f.id !== 'avgAssists'), { id: 'avgAssists', value: v }] : prev.filter(f => f.id !== 'avgAssists'))}
                        />
                        <FilterInput
                            label={t('player_stats.filters_advanced.min_stl', 'Min Steals')}
                            value={columnFilters.find(f => f.id === 'avgSteals')?.value as number}
                            onChange={(v) => setColumnFilters(prev => v !== undefined ? [...prev.filter(f => f.id !== 'avgSteals'), { id: 'avgSteals', value: v }] : prev.filter(f => f.id !== 'avgSteals'))}
                        />
                        <FilterInput
                            label={t('player_stats.filters_advanced.min_blk', 'Min Blocks')}
                            value={columnFilters.find(f => f.id === 'avgBlocks')?.value as number}
                            onChange={(v) => setColumnFilters(prev => v !== undefined ? [...prev.filter(f => f.id !== 'avgBlocks'), { id: 'avgBlocks', value: v }] : prev.filter(f => f.id !== 'avgBlocks'))}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FilterInput
                                label={t('player_stats.filters_advanced.min_fg_pct', 'Min FG%')}
                                value={columnFilters.find(f => f.id === 'fgPercent')?.value as number}
                                onChange={(v) => setColumnFilters(prev => v !== undefined ? [...prev.filter(f => f.id !== 'fgPercent'), { id: 'fgPercent', value: v }] : prev.filter(f => f.id !== 'fgPercent'))}
                            />
                            <FilterInput
                                label={t('player_stats.filters_advanced.min_ft_pct', 'Min FT%')}
                                value={columnFilters.find(f => f.id === 'ftPercent')?.value as number}
                                onChange={(v) => setColumnFilters(prev => v !== undefined ? [...prev.filter(f => f.id !== 'ftPercent'), { id: 'ftPercent', value: v }] : prev.filter(f => f.id !== 'ftPercent'))}
                            />
                        </div>
                    </div>

                    <div className="p-6 border-t border-white/5 bg-slate-900/50">
                        <button
                            onClick={() => {
                                setColumnFilters([]);
                                setSearchTerm("");
                                setShowFilters(false);
                            }}
                            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 py-4 rounded-2xl font-black italic uppercase tracking-wider transition-all border border-red-500/20"
                        >
                            {t('common.reset')}
                        </button>
                    </div>
                </div>
            </div>
            <SEO title={t('player_stats.title')} description={t('player_stats.subtitle')} />

            <div className="max-w-7xl mx-auto space-y-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-50">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-slate-900 border border-white/5 rounded-3xl shadow-2xl text-blue-500">
                            <Activity size={32} />
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-6xl font-black text-white italic uppercase tracking-tighter leading-none">
                                Player <span className="text-blue-500">Stats</span>
                            </h1>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-3">{t('player_stats.subtitle')}</p>
                        </div>
                    </div>

                    {/* Season Selector */}
                    <div className="w-full md:w-48">
                        <PremiumSelect
                            label={t('player_stats.season')}
                            value={season}
                            onChange={setSeason}
                            options={seasonOptions}
                        />
                    </div>
                </div>

                {/* Filters Panel */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/40 p-1 rounded-3xl border border-white/5 backdrop-blur-xl relative z-40">
                    <div className="relative group flex-1 md:col-span-3">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder={t('player_stats.search_placeholder')}
                            className="w-full bg-transparent p-6 pl-14 text-sm font-medium text-white focus:outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 pr-1">
                        <div className="hidden md:block flex-1">
                            <PremiumSelect
                                value={(table.getColumn('position')?.getFilterValue() as string) || ""}
                                onChange={(val) => table.getColumn('position')?.setFilterValue(val)}
                                options={positionOptions}
                                icon={<Filter size={16} />}
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center border border-white/10 group active:scale-95"
                        >
                            <Filter size={20} className="group-hover:rotate-12 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Table Container */}
                <div className="responsive-table-container bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative z-10">
                    {isLoading ? (
                        <div className="p-8">
                            <TableSkeleton rows={10} />
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-table">
                            <thead>
                                {table.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id} className="bg-slate-950/50">
                                        {headerGroup.headers.map(header => (
                                            <th
                                                key={header.id}
                                                className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors group"
                                                onClick={header.column.getToggleSortingHandler()}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    {{
                                                        asc: <ArrowUp size={12} className="text-blue-500" />,
                                                        desc: <ArrowDown size={12} className="text-blue-500" />,
                                                    }[header.column.getIsSorted() as string] ?? (
                                                            header.column.getCanSort() && <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 text-slate-700 transition-opacity" />
                                                        )}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody>
                                {table.getRowModel().rows.map(row => (
                                    <tr key={row.id} className="group hover:bg-white/[0.02] transition-colors border-b border-white/[0.02] last:border-0">
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id} className="px-8 py-5">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* Infinite Scroll Trigger */}
                    <div ref={ref} className="h-10 w-full flex items-center justify-center">
                        {isFetchingNextPage && (
                            <div className="flex items-center gap-3 text-blue-500 font-bold uppercase italic tracking-widest text-[10px]">
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                Loading more players...
                            </div>
                        )}
                    </div>

                    {!isLoading && players.length === 0 && (
                        <div className="py-32 flex flex-col items-center justify-center opacity-30">
                            <Users size={64} className="mb-6" />
                            <p className="font-black uppercase tracking-[0.3em] text-sm">{t('market.no_players')}</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

function FilterInput({ label, value, onChange }: { label: string, value: number | undefined, onChange: (v: number | undefined) => void }) {
    return (
        <div className="space-y-2">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">{label}</label>
            <input
                type="number"
                step="0.1"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="0.0"
            />
        </div>
    );
}
