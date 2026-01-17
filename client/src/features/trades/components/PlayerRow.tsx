import React from 'react';
import { Check } from 'lucide-react';

interface PlayerRowProps {
    player: {
        id: number;
        externalId: number;
        firstName: string;
        lastName: string;
        position: string;
        nbaTeam: string;
        avgPoints: number;
        fantasyPoints: number;
        salaryYear1: number;
        salaryYear2: number;
        salaryYear3: number;
        injuryStatus?: string;
    };
    isSelected: boolean;
    onSelect: () => void;
    disabled?: boolean;
}

export const PlayerRow: React.FC<PlayerRowProps> = ({
    player,
    isSelected,
    onSelect,
    disabled = false
}) => {
    return (
        <button
            onClick={onSelect}
            disabled={disabled}
            className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${disabled
                ? 'opacity-30 cursor-not-allowed bg-slate-950/20'
                : isSelected
                    ? 'bg-blue-500/10 border border-blue-500/30 ring-1 ring-blue-500/20'
                    : 'bg-slate-950/40 border border-white/5 hover:border-blue-500/20 hover:bg-slate-900/60'
                }`}
        >
            {/* Avatar */}
            <div className="h-8 w-8 bg-slate-900 rounded-lg overflow-hidden border border-white/5 shrink-0">
                <img
                    src={`https://cdn.nba.com/headshots/nba/latest/260x190/${player.externalId}.png`}
                    className="h-full object-cover translate-y-1"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                    alt=""
                />
            </div>

            {/* Name */}
            <div className="flex-1 text-left min-w-0">
                <div className="font-bold text-white text-sm truncate">
                    {player.firstName} {player.lastName}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                    {player.nbaTeam}
                </div>
            </div>

            {/* Position */}
            <div className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800 uppercase shrink-0">
                {player.position}
            </div>

            {/* Fantasy Points */}
            <div className="text-xs font-bold text-emerald-400 shrink-0 min-w-[45px] text-right">
                {player.fantasyPoints?.toFixed(1)} FP
            </div>

            {/* Salary - Always show all 3 years */}
            <div className="flex items-center gap-1 shrink-0">
                <div className="text-xs font-mono font-bold text-white">
                    {player.salaryYear1.toFixed(1)}M
                </div>
                <span className="text-slate-700">/</span>
                <div className="text-[10px] font-mono font-semibold text-slate-400">
                    {player.salaryYear2.toFixed(1)}M
                </div>
                <span className="text-slate-700">/</span>
                <div className="text-[10px] font-mono font-semibold text-slate-500">
                    {player.salaryYear3.toFixed(1)}M
                </div>
            </div>

            {/* Injury Badge - Top-left to avoid checkbox overlap */}
            {player.injuryStatus && (
                <div className="absolute top-2 left-2 text-[9px] font-bold text-white bg-red-600 px-1.5 py-0.5 rounded uppercase shadow-lg z-10">
                    {player.injuryStatus}
                </div>
            )}

            {/* Selection Indicator */}
            <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${isSelected
                ? 'bg-blue-500 border-blue-500'
                : 'border-slate-700'
                }`}>
                {isSelected && <Check size={14} className="text-white" />}
            </div>
        </button>
    );
};
