import { useState } from 'react';
import { Search, Sparkles, Loader2, X, User, UserPlus, ChevronRight, AlertTriangle, UserMinus, Save } from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { useTranslation } from 'react-i18next';
import { useLeagueMembers } from '../features/admin/api/useLeagueMembers';
import { useSearchPlayers } from '../features/admin/api/useSearchPlayers';
import { useAssignPlayer } from '../features/admin/api/useAssignPlayer';



export const AdminAssignmentPanel = () => {
    const { t } = useTranslation();
    const { showAlert, showConfirm } = useModal();
    const [isOpen, setIsOpen] = useState(false);

    // Dati Form
    const [searchQuery, setSearchQuery] = useState('');
    const [searchTrigger, setSearchTrigger] = useState('');

    const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
    const [targetUserId, setTargetUserId] = useState('');
    const [salary, setSalary] = useState(1);
    const [years, setYears] = useState(1);

    const { data: members = [] } = useLeagueMembers();
    const { data: searchResults = [], isFetching: isSearching } = useSearchPlayers(searchTrigger);
    const assignPlayer = useAssignPlayer();

    const handleSearch = () => {
        if (searchQuery.length < 3) return;
        setSearchTrigger(searchQuery);
    };

    const handleAssign = async () => {
        if (!selectedPlayer || !targetUserId) return;

        const confirmed = await showConfirm({
            title: t('admin.confirm_assign_title'),
            message: t('admin.confirm_assign_msg', { player: `${selectedPlayer.firstName} ${selectedPlayer.lastName} ` }),
            confirmText: t('admin.assign_btn'),
            type: "confirm"
        });

        if (!confirmed) return;

        try {
            await assignPlayer.mutateAsync({
                playerId: selectedPlayer.id,
                targetUserId,
                salary: Number(salary),
                years: Number(years)
            });

            await showAlert({ title: t('modals.done'), message: t('modals.player_assigned'), type: "success" });

            setIsOpen(false);
            setSearchQuery('');
            setSearchTrigger('');
            setSelectedPlayer(null);
            setTargetUserId('');
        } catch (e: any) {
            showAlert({ title: t('common.error'), message: e.response?.data || t('admin.assign_error'), type: "error" });
        }
    };

    return (
        <div className="mb-12">
            {!isOpen ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-full group bg-slate-900/50 hover:bg-slate-900 border border-white/5 p-8 rounded-[2rem] flex items-center justify-between transition-all shadow-2xl"
                >
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-500 group-hover:scale-110 transition-transform shadow-inner">
                            <UserPlus size={24} />
                        </div>
                        <div className="text-left">
                            <h4 className="text-xl font-black text-white italic uppercase tracking-tighter leading-none">{t('admin.manual_tool_title')}</h4>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1.5 transition-colors group-hover:text-emerald-500">{t('admin.manual_tool_desc')}</p>
                        </div>
                    </div>
                    <ChevronRight className="text-slate-800 group-hover:text-emerald-500 transition-colors" size={32} />
                </button>
            ) : (
                <div className="bg-slate-900 border border-emerald-500/30 p-10 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.6)] relative animate-in zoom-in duration-500 overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                        <UserPlus size={180} />
                    </div>

                    <button onClick={() => setIsOpen(false)} className="absolute top-8 right-8 text-slate-600 hover:text-white transition-colors bg-slate-950 p-3 rounded-2xl border border-slate-800"><X size={20} /></button>

                    <div className="flex items-center gap-4 mb-10">
                        <div className="p-3 bg-red-600/10 rounded-2xl border border-red-500/20 text-red-500 shadow-inner">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">{t('admin.force_assign_title')}</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">{t('admin.force_assign_desc')}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-8">
                            {/* 1. CERCA GIOCATORE */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-4">1. Global Player Search</label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                        placeholder="Enter player last name (min 3 chars)..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 pl-14 text-white font-black italic tracking-tight focus:border-emerald-500/50 outline-none transition-all placeholder-slate-800 shadow-inner"
                                    />
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 transition-colors group-focus-within:text-emerald-500">
                                        <Search size={22} />
                                    </div>
                                    <button
                                        onClick={handleSearch}
                                        disabled={isSearching}
                                        className="absolute right-3 top-2.5 bottom-2.5 px-6 bg-emerald-600 hover:bg-emerald-550 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-30"
                                    >
                                        {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Execute'}
                                    </button>
                                </div>

                                {/* Risultati Ricerca */}
                                {
                                    searchResults.length > 0 && !selectedPlayer && (
                                        <div className="mt-4 max-h-60 overflow-y-auto bg-slate-950/80 backdrop-blur-3xl border border-slate-800 rounded-2xl shadow-2xl divide-y divide-slate-800">
                                            {searchResults.map((p: any) => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => setSelectedPlayer(p)}
                                                    className="p-5 hover:bg-emerald-600/10 cursor-pointer flex justify-between items-center group/item transition-all"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                                                            <img src={`https://cdn.nba.com/headshots/nba/latest/260x190/${p.externalId}.png`} className="h-full object-cover translate-y-2" onError={e => e.currentTarget.style.display = 'none'} />
                                                        </div >
                                                        <div>
                                                            <div className="text-sm font-black text-white italic group-hover/item:text-emerald-400">{p.firstName} {p.lastName}</div>
                                                            <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{p.nbaTeam} • {p.position}</div>
                                                        </div>
                                                    </div >
                                                    {
                                                        p.currentOwner ? (
                                                            <span className="text-[9px] font-black bg-red-500/10 text-red-500 px-3 py-1 rounded-full border border-red-500/20 uppercase">GM: {p.currentOwner}</span>
                                                        ) : (
                                                            <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20 uppercase">Free Agent</span>
                                                        )
                                                    }
                                                </div >
                                            ))
                                            }
                                        </div >
                                    )}

                                {
                                    selectedPlayer && (
                                        <div className="mt-4 p-6 bg-emerald-600/10 border border-emerald-500/30 rounded-2xl flex justify-between items-center shadow-inner relative overflow-hidden group/card">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover/card:scale-150 transition-transform">
                                                <Sparkles size={100} />
                                            </div>
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className="h-14 w-14 bg-slate-900 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                                                    <img src={`https://cdn.nba.com/headshots/nba/latest/260x190/${selectedPlayer.externalId}.png`
                                                    } className="h-full object-cover translate-y-3" />
                                                </div>
                                                <div>
                                                    <div className="text-xl font-black text-white italic tracking-tighter uppercase">{selectedPlayer.firstName} {selectedPlayer.lastName}</div>
                                                    <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Selected for Assignment</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSelectedPlayer(null)}
                                                className="relative z-10 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-[9px] font-black text-red-500 uppercase tracking-widest hover:bg-red-600 hover:text-white hover:border-red-500 transition-all"
                                            >
                                                <UserMinus size={14} />
                                            </button>
                                        </div>
                                    )
                                }
                            </div >

                            {/* 2. SELEZIONA TEAM */}
                            < div className="space-y-3" >
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-4">2. Destination Squad Entity</label>
                                <div className="relative">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none">
                                        <User size={22} />
                                    </div>
                                    <select
                                        value={targetUserId}
                                        onChange={e => setTargetUserId(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 pl-14 text-white font-black italic tracking-tight focus:border-emerald-500/50 outline-none transition-all appearance-none cursor-pointer shadow-inner"
                                    >
                                        <option value="">Select target GM...</option>
                                        {
                                            members.map((m: any) => (
                                                <option key={m.userId} value={m.userId}>{m.teamName.toUpperCase()} ({m.ownerName})</option>
                                            ))
                                        }
                                    </select >
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none">
                                        <ChevronRight size={18} className="rotate-90" />
                                    </div>
                                </div>
                            </div >
                        </div >

                        <div className="space-y-8 h-full flex flex-col">
                            {/* 3. CONTRATTO */}
                            <div className="space-y-6 flex-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-4">3. Contract Parameters</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="bg-slate-950/80 p-6 rounded-[2rem] border border-white/5 shadow-inner">
                                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Yearly Salary (M)</label>
                                        <div className="mt-3 flex items-center gap-4">
                                            <input
                                                type="number"
                                                step="0.5"
                                                value={salary}
                                                onChange={e => setSalary(Number(e.target.value))}
                                                className="bg-transparent text-3xl font-black text-emerald-500 italic w-24 outline-none"
                                            />
                                            <div className="bg-slate-900 px-3 py-1 rounded-lg text-[10px] font-black text-slate-500">$ MILLION</div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-950/80 p-6 rounded-[2rem] border border-white/5 shadow-inner">
                                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Lease Duration</label>
                                        <div className="mt-2 flex gap-2">
                                            {
                                                [1, 2, 3].map(yr => (
                                                    <button
                                                        key={yr}
                                                        onClick={() => setYears(yr)}
                                                        className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${years === yr ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-900 text-slate-600 hover:text-slate-300'}`}
                                                    >
                                                        {yr} {yr === 1 ? 'YR' : 'YRS'}
                                                    </button>
                                                ))
                                            }
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-blue-600/5 rounded-[2rem] p-6 border border-blue-500/10 flex gap-4 items-center">
                                    <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg"><Sparkles size={20} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-blue-100/90 leading-tight uppercase tracking-widest italic">
                                            Assignment protocol will directly inject the player into the target roster, generating the necessary contract ledger entries.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleAssign}
                                disabled={!selectedPlayer || !targetUserId || assignPlayer.isPending}
                                className="w-full py-6 bg-emerald-600 hover:bg-emerald-550 border-t border-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black italic uppercase tracking-tighter text-2xl rounded-[1.5rem] shadow-[0_20px_50px_rgba(16,185,129,0.3)] flex items-center justify-center gap-4 transform transition-all active:scale-95"
                            >
                                {
                                    assignPlayer.isPending ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                                Initialize Assignment
                            </button>
                        </div>
                    </div >
                </div >
            )}
        </div >
    );
}