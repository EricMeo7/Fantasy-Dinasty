import { Gavel, User, Activity, Timer } from 'lucide-react';
import AuctionTimer from '../../../components/AuctionTimer';
import { useTranslation } from 'react-i18next';

interface FreeAgentDto {
    id: number;
    externalId: number;
    firstName: string;
    lastName: string;
    nbaTeam: string;
    position: string;
    avgPoints: number;
    avgFantasyPoints: number;
    avgRebounds: number;
    avgAssists: number;
    injuryStatus?: string;
    injuryBodyPart?: string;
    hasActiveAuction: boolean;
    auctionEndTime?: string;
    currentOffer?: number;
    currentYears?: number;
    highBidderName?: string;
    minBid: number;
}

interface Props {
    player: FreeAgentDto;
    onOpenDetails: (player: FreeAgentDto) => void;
    onOpenBid: (player: FreeAgentDto) => void;
    onAuctionExpire: () => void;
}

export const FreeAgentCard = ({ player, onOpenDetails, onOpenBid, onAuctionExpire }: Props) => {
    const { t } = useTranslation();

    return (
        <div className={`group relative overflow-hidden rounded-[2.5rem] border shadow-2xl transition-all duration-500 flex flex-col h-full bg-slate-900 ${player.hasActiveAuction
            ? 'border-emerald-500/30'
            : 'border-slate-800'
            }`}>
            {/* Player Image & Team Badge */}
            <div
                className="relative h-56 bg-gradient-to-b from-slate-800 to-slate-950 flex justify-center items-end overflow-hidden cursor-pointer"
                onClick={() => onOpenDetails(player)}
            >
                <div className="absolute top-5 right-5 flex flex-col gap-2 items-end z-10">
                    <div className="px-3 py-1.5 bg-slate-950/80 backdrop-blur-xl border border-white/5 rounded-full text-[10px] font-black tracking-widest text-white shadow-lg">
                        {player.nbaTeam}
                    </div>
                    {player.injuryStatus && (
                        <div className="px-3 py-1.5 bg-red-600/90 backdrop-blur-xl border border-red-500/20 rounded-full text-[10px] font-black tracking-widest text-white shadow-lg">
                            {player.injuryStatus === 'Out' ? 'OUT' : player.injuryStatus}
                        </div>
                    )}
                </div>

                {player.hasActiveAuction && (
                    <div className="absolute top-5 left-5 px-3 py-1.5 bg-emerald-500 text-[10px] font-black uppercase tracking-widest text-slate-950 rounded-full z-10 flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-pulse">
                        <Gavel size={12} /> {t('market.auction_live')}
                    </div>
                )}

                <img
                    src={`https://cdn.nba.com/headshots/nba/latest/260x190/${player.externalId}.png`}
                    alt={player.lastName}
                    className="h-full object-contain translate-y-4 group-hover:scale-110 group-hover:translate-y-2 transition-all duration-700"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />

                <User className="absolute bottom-0 text-slate-900/40 h-32 w-32 -z-10" />

                <div className="absolute bottom-4 left-4 h-10 w-10 flex items-center justify-center rounded-2xl bg-blue-600 text-sm font-black text-white shadow-2xl z-20 italic">
                    {player.position}
                </div>
            </div>

            {/* Info & Content */}
            <div className="p-6 pt-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tight leading-tight group-hover:text-blue-400 transition-colors">
                        {player.firstName} <span className="block">{player.lastName}</span>
                    </h3>
                </div>

                {player.hasActiveAuction ? (
                    <div className="mt-auto mb-5 bg-slate-950/50 rounded-[1.5rem] p-4 border border-emerald-500/20 shadow-inner">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2 text-[9px] text-slate-500 uppercase font-black tracking-widest">
                                <Timer size={12} className="text-emerald-500" /> {t('market.ends_in')}
                            </div>
                            <div className="text-white font-mono font-black italic">
                                <AuctionTimer endTime={player.auctionEndTime!} onExpire={onAuctionExpire} />
                            </div>
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-2xl font-black text-white italic leading-none">{player.currentOffer?.toFixed(1)} <span className="text-xs">M</span></div>
                                <div className="text-[10px] text-slate-500 font-black uppercase mt-1 tracking-widest">{player.currentYears} {t('market.years')}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[8px] text-slate-600 uppercase font-black tracking-[0.2em]">{t('market.winning')}</div>
                                <div className="text-[11px] font-black text-emerald-400 uppercase italic truncate max-w-[100px] leading-tight">
                                    {player.highBidderName}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mt-auto grid grid-cols-3 gap-2 mb-6">
                        <StatItem label="FPT" value={player.avgFantasyPoints} color="emerald" />
                        <StatItem label="PTS" value={player.avgPoints} color="blue" />
                        <div className={`p-2 rounded-xl border flex flex-col items-center justify-center text-amber-400 bg-amber-400/5 border-amber-400/10`}>
                            <div className="text-[8px] font-black uppercase tracking-widest opacity-60">BASE</div>
                            <div className="text-sm font-black italic">{player.minBid}M</div>
                        </div>
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={() => onOpenDetails(player)}
                        className="p-4 rounded-2xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750 transition-all border border-slate-700 shadow-lg"
                        title="Visualizza Report Scout"
                    >
                        <Activity size={20} />
                    </button>
                    <button
                        onClick={() => onOpenBid(player)}
                        className={`flex-1 flex items-center justify-center gap-3 rounded-2xl py-4 text-xs font-black uppercase tracking-widest text-white transition-all shadow-xl active:scale-95 border-t border-white/10 ${player.hasActiveAuction
                            ? 'bg-red-600 hover:bg-red-500 shadow-red-900/30'
                            : 'bg-emerald-600 hover:bg-emerald-550 shadow-emerald-900/30'
                            }`}
                    >
                        <Gavel size={18} /> {player.hasActiveAuction ? t('market.raise') : t('market.bid')}
                    </button>
                </div>
            </div>
        </div>
    );
};

function StatItem({ label, value, color }: { label: string, value: number, color: string }) {
    const colorClasses: any = {
        emerald: 'text-emerald-400 bg-emerald-400/5 border-emerald-400/10',
        blue: 'text-blue-400 bg-blue-400/5 border-blue-400/10',
        amber: 'text-amber-400 bg-amber-400/5 border-amber-400/10',
    };

    return (
        <div className={`p-2 rounded-xl border flex flex-col items-center justify-center ${colorClasses[color]}`}>
            <div className="text-[8px] font-black uppercase tracking-widest opacity-60">{label}</div>
            <div className="text-sm font-black italic">{value.toFixed(1)}</div>
        </div>
    );
}
