import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Trade } from '../api/useMyTrades';
import { useAcceptTrade } from '../api/useAcceptTrade';
import { useRejectTrade } from '../api/useRejectTrade';
import { CONFIG } from '../../../config';
import { CheckCircle2, Clock, Loader2, ArrowRight, ShieldAlert, Sparkles, XCircle } from 'lucide-react';
import LogoAvatar from '../../../components/LogoAvatar';

interface TradeCardProps {
    trade: Trade;
}

export const TradeCard: React.FC<TradeCardProps> = ({ trade }) => {
    const { t } = useTranslation();
    const { mutate: accept, isPending: isAccepting } = useAcceptTrade();
    const { mutate: reject, isPending: isRejecting } = useRejectTrade();

    const actionLoading = isAccepting || isRejecting;

    return (
        <div className="group relative bg-slate-900/60 backdrop-blur-3xl rounded-[3rem] border border-white/5 overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom-6 duration-700">

            {/* Status Header */}
            <div className="p-8 bg-slate-950/40 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 px-10">
                <div className="flex items-center gap-6" >
                    <div className={`p-4 rounded-2xl shadow-inner border ${trade.isMeProposer
                        ? 'bg-blue-600/10 text-blue-500 border-blue-500/20 shadow-blue-500/10'
                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/10'
                        }`}>
                        {trade.isMeProposer ? <Sparkles size={24} /> : <ShieldAlert size={24} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-xl font-black text-white italic uppercase tracking-tighter leading-none">
                                {trade.isMeProposer ? t('trades.sent_proposal') : t('trades.incoming_request')}
                            </h4>
                            <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest border border-slate-800 px-2 py-0.5 rounded-lg">#TX-{trade.id}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                            {t('trades.initialized')} <span className="text-slate-400">{new Date(trade.createdAt).toLocaleDateString()}</span>
                        </p>
                    </div>
                </div>

                <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                        {t('trades.negotiation_round')}
                    </div>
                </div>
            </div>

            {/* Players Grid */}
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                {
                    trade.offers.map((off, oIdx) => (
                        <div
                            key={`o-${trade.id}-${oIdx}`}
                            className="relative bg-slate-950/50 p-6 rounded-[2rem] border border-white/5 flex items-center gap-6 group/item transition-all hover:bg-slate-950 overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover/item:scale-150 transition-transform">
                                <ArrowRight size={80} className="-rotate-45" />
                            </div>

                            <div className="h-16 w-16 bg-slate-900 rounded-[1.25rem] flex items-center justify-center shrink-0 border border-white/5 overflow-hidden shadow-2xl relative z-10">
                                <img
                                    src={`https://cdn.nba.com/headshots/nba/latest/260x190/${off.playerExternalId}.png`}
                                    className="h-full object-cover translate-y-3 transition-transform group-hover/item:scale-110"
                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                    alt=""
                                />
                            </div>

                            <div className="min-w-0 relative z-10">
                                <div className="text-lg font-black text-white italic uppercase tracking-tighter truncate leading-none mb-3">{off.playerName}</div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 bg-slate-900 px-2.5 py-1 rounded-lg w-fit border border-white/5">
                                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{t('trades.from')}</span>
                                        <LogoAvatar
                                            src={`${CONFIG.API_BASE_URL}/team/${off.fromTeamId}/logo?t=${new Date().getTime()}`}
                                            alt={off.fromTeamName}
                                            size="xs"
                                            shape="square"
                                            className="bg-slate-800"
                                            fallbackType="team"
                                        />
                                        <span className="text-[9px] font-black text-white uppercase truncate max-w-[100px]">{off.fromTeamName}</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-blue-600/10 px-2.5 py-1 rounded-lg w-fit border border-blue-500/20">
                                        <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{t('trades.towards')}</span>
                                        <LogoAvatar
                                            src={`${CONFIG.API_BASE_URL}/team/${off.toTeamId}/logo?t=${new Date().getTime()}`}
                                            alt={off.toTeamName}
                                            size="xs"
                                            shape="square"
                                            className="bg-slate-800"
                                            fallbackType="team"
                                        />
                                        <span className="text-[9px] font-black text-blue-400 uppercase truncate max-w-[100px]">{off.toTeamName}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
            </div>

            {/* Actions Bar */}
            <div className="p-8 bg-slate-950/80 backdrop-blur-3xl flex flex-col sm:flex-row justify-end gap-4 border-t border-white/5 px-10">
                {
                    trade.isMeProposer && (
                        <button
                            onClick={() => reject(trade.id)}
                            disabled={actionLoading}
                            className="px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20 active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3"
                        >
                            <XCircle size={18} />
                            {t('trades.abort_proposition')}
                        </button>
                    )
                }

                {
                    !trade.isMeProposer && !trade.didIAccept && (
                        <>
                            <button
                                onClick={() => reject(trade.id)}
                                disabled={actionLoading}
                                className="px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-red-500 transition-all active:scale-95 disabled:opacity-30"
                            >
                                {t('trades.reject_request')}
                            </button>
                            <button
                                onClick={() => accept(trade.id)}
                                disabled={actionLoading}
                                className="px-14 py-5 bg-emerald-600 hover:bg-emerald-550 border-t border-white/10 text-white rounded-2xl text-[11px] font-black uppercase italic tracking-tighter shadow-[0_15px_35px_rgba(16,185,129,0.3)] transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-30"
                            >
                                {
                                    isAccepting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                                {t('trades.execute_agreement')}
                            </button>
                        </>
                    )
                }

                {
                    !trade.isMeProposer && trade.didIAccept && (
                        <div className="flex items-center gap-4 text-emerald-500 px-10 py-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 shadow-inner">
                            <div className="bg-emerald-500 p-2 rounded-lg text-slate-950 shadow-lg"><Clock size={18} /></div>
                            <div className="text-left">
                                <span className="text-[10px] font-black uppercase tracking-widest block leading-none">{t('trades.protocol_executed')}</span>
                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">{t('trades.waiting_signatures')}</span>
                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    );
};
