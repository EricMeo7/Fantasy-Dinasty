import { createPortal } from 'react-dom';
import { X, Gavel, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getTeamColors } from '../utils/nbaColors';
import LogoAvatar from './LogoAvatar';

interface Props {
    player: any;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (player: any) => void;
}

export default function NominationModal({ player, isOpen, onClose, onConfirm }: Props) {
    const { t } = useTranslation();

    if (!isOpen || !player) return null;

    const teamColors = getTeamColors(player.nbaTeam);
    const nbaId = player.externalId || 0;

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300">

                {/* ACCENT BORDER (Dynamic) */}
                <div className="absolute inset-0 border-2 rounded-[2.5rem] pointer-events-none opacity-20" style={{ borderColor: teamColors.primary }}></div>

                {/* HERO SECTION */}
                <div className="relative h-64 overflow-hidden">
                    {/* Background Gradient */}
                    <div
                        className="absolute inset-0 opacity-40"
                        style={{ background: `linear-gradient(135deg, ${teamColors.primary} 0%, ${teamColors.secondary} 100%)` }}
                    ></div>

                    {/* Top Right Close */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-full bg-black/20 text-white/50 hover:text-white hover:bg-black/40 transition-all z-20"
                    >
                        <X size={20} />
                    </button>

                    {/* Player Image & Name Overlay */}
                    <div className="absolute inset-0 flex items-end">
                        <div className="relative w-1/2 h-full flex items-end justify-center">
                            <img
                                src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${nbaId}.png`}
                                alt={player.lastName}
                                className="h-[110%] w-auto object-contain object-bottom drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform duration-700"
                                onError={(e) => {
                                    e.currentTarget.src = 'https://www.nba.com/assets/logos/teams/primary/web/NBA.svg';
                                    e.currentTarget.className = 'h-32 opacity-20 mb-8';
                                }}
                            />
                        </div>
                        <div className="w-1/2 p-8 pb-10 text-left relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{player.position}</span>
                                <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{player.nbaTeam}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <h2 className={`font-black text-white italic leading-[0.9] uppercase tracking-tighter drop-shadow-lg ${player.lastName.length > 15 ? 'text-2xl' : 'text-4xl'}`}>
                                    {player.firstName}<br />
                                    <span style={{ color: teamColors.secondary }}>{player.lastName}</span>
                                </h2>
                                {player.nbaTeam && (
                                    <div className="shrink-0 mt-2">
                                        <LogoAvatar
                                            src={`https://www.nba.com/assets/logos/teams/primary/web/${player.nbaTeam}.svg`}
                                            alt={player.nbaTeam}
                                            size="sm"
                                            shape="circle"
                                            className="bg-white/10 p-1"
                                            fallbackType="league"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* STATS GRID */}
                <div className="p-8 pb-4">
                    <div className="grid grid-cols-4 gap-4 mb-8">
                        <StatItem label="PPG" value={player.avgPoints} />
                        <StatItem label="RPG" value={player.avgRebounds} />
                        <StatItem label="APG" value={player.avgAssists} />
                        <StatItem label="FG%" value={(player.fgPercent * 100).toFixed(1)} suffix="%" />
                    </div>

                    <div className="flex items-center justify-between p-6 bg-slate-950/50 rounded-3xl border border-white/5 shadow-inner">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                                <Activity size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{t('market.avg_fantasy_points')}</p>
                                <p className="text-2xl font-black italic text-white leading-none">
                                    {(player.avgFantasyPoints || 0).toFixed(1)} <span className="text-xs uppercase opacity-30">PTF</span>
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{t('draft.base_price')}</p>
                            <p className="text-2xl font-black italic text-emerald-400 leading-none">${player.basePrice} M</p>
                        </div>
                    </div>
                </div>

                {/* FOOTER ACTION */}
                <div className="p-8 pt-4 space-y-4">
                    <button
                        onClick={() => onConfirm(player)}
                        className="w-full h-20 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] flex items-center justify-center gap-4 group transition-all transform active:scale-95 shadow-[0_20px_40px_rgba(37,99,235,0.3)] border-t border-white/20"
                    >
                        <Gavel size={28} className="group-hover:rotate-12 transition-transform" />
                        <span className={`font-black uppercase italic tracking-tighter leading-tight ${player.lastName.length > 15 ? 'text-base' : 'text-xl'}`}>
                            {t('draft.start_auction_for', { name: player.lastName })}
                        </span>
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full py-4 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-[0.3em] transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

function StatItem({ label, value, suffix = "" }: { label: string, value: any, suffix?: string }) {
    return (
        <div className="flex flex-col items-center">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{label}</span>
            <span className="text-lg font-black text-white italic">
                {typeof value === 'number' ? value.toFixed(1) : (Number(value) || 0).toFixed(1)}
                {suffix}
            </span>
        </div>
    );
}
