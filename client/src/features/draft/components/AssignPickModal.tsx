import { useState, useEffect } from 'react';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { Search, UserPlus, X } from 'lucide-react';

interface Player {
    id: number;
    firstName: string;
    lastName: string;
    team: string;
    position: string;
    avgPoints: number;
}

interface AssignPickModalProps {
    isOpen: boolean;
    onClose: () => void;
    pickId: number;
    pickLabel: string; // e.g., "Round 1, Pick 1"
    onAssign: () => void;
}

export default function AssignPickModal({ isOpen, onClose, pickId, pickLabel, onAssign }: AssignPickModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Player[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);

    // Debounced search
    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (searchQuery.length > 2) {
                setIsLoading(true);
                try {
                    const response = await api.admin.searchAllPlayers<Player[]>(searchQuery);
                    setSearchResults(response.data);
                } catch (error) {
                    console.error('Search failed:', error);
                    toast.error('Failed to search players');
                } finally {
                    setIsLoading(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleAssign = async () => {
        if (!selectedPlayer) return;

        setIsAssigning(true);
        try {
            await api.draft.assignPick(pickId, selectedPlayer.id);
            toast.success(`Assigned ${selectedPlayer.firstName} ${selectedPlayer.lastName} to pick!`);
            onAssign();
            onClose();
        } catch (error) {
            console.error('Assignment failed:', error);
            toast.error('Failed to assign player. Ensure pick is not already assigned.');
        } finally {
            setIsAssigning(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            <div className="relative bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-start">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Commissioner Tools</div>
                        <h2 className="text-2xl font-black text-white italic tracking-tighter">Assign Pick</h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wide mt-1">{pickLabel}</p>
                    </div>
                </div>

                <div className="p-6">
                    {/* Search Input */}
                    <div className="mb-6 relative">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Search Player Database</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Type player name..."
                                className="w-full bg-slate-800/50 border border-white/10 text-white rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 font-medium"
                                autoFocus
                            />
                            <Search size={16} className="absolute left-3 top-3.5 text-slate-500" />
                        </div>
                    </div>

                    {/* Results / Selected Player */}
                    <div className="min-h-[240px] max-h-[300px] overflow-y-auto custom-scrollbar bg-slate-950/50 rounded-xl border border-white/5 p-2">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full text-slate-500 p-4">
                                <span className="animate-pulse font-mono text-xs uppercase tracking-widest">Searching...</span>
                            </div>
                        ) : selectedPlayer ? (
                            <div className="p-2 h-full flex flex-col justify-center">
                                <div className="glass-card p-5 border-l-4 border-l-emerald-500 relative bg-emerald-500/5 group">
                                    <button
                                        onClick={() => setSelectedPlayer(null)}
                                        className="absolute top-2 right-2 text-slate-500 hover:text-white transition-colors bg-black/20 rounded-full p-1"
                                    >
                                        <X size={14} />
                                    </button>
                                    <div className="font-black text-white text-xl italic tracking-tight">
                                        {selectedPlayer.firstName} {selectedPlayer.lastName}
                                    </div>
                                    <div className="text-slate-400 text-xs font-bold uppercase tracking-wider flex gap-3 mt-1">
                                        <span>{selectedPlayer.team}</span>
                                        <span className="text-slate-600">•</span>
                                        <span>{selectedPlayer.position}</span>
                                    </div>
                                    <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-white/5">
                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Contract Terms</span>
                                        <div className="text-xs text-slate-300">
                                            Rookie Scale Contract (2 Years Guaranteed + 1 Year Team Option)
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : searchResults.length > 0 ? (
                            <ul className="space-y-1">
                                {searchResults.map((player) => (
                                    <li
                                        key={player.id}
                                        onClick={() => setSelectedPlayer(player)}
                                        className="p-3 hover:bg-white/5 cursor-pointer flex justify-between items-center transition-colors rounded-lg group"
                                    >
                                        <div>
                                            <div className="text-slate-200 font-bold text-sm group-hover:text-white transition-colors">
                                                {player.firstName} {player.lastName}
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                                                {player.team} • {player.position}
                                            </div>
                                        </div>
                                        <div className="text-slate-600 group-hover:text-blue-400 text-xs font-black transition-colors">
                                            {player.avgPoints.toFixed(1)} FP
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-600 p-4 opacity-50">
                                <Search size={24} className="mb-2" />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {searchQuery.length > 2 ? 'No players found' : 'Player Database'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-slate-950/30 border-t border-white/5 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAssign}
                        disabled={!selectedPlayer || isAssigning}
                        className={`px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 ${!selectedPlayer || isAssigning ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:bg-emerald-500'
                            }`}
                    >
                        {isAssigning ? (
                            <span className="animate-pulse">Processing...</span>
                        ) : (
                            <>
                                <UserPlus size={14} />
                                Confirm Assignment
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
