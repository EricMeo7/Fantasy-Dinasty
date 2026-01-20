import React from 'react';
import { createPortal } from 'react-dom';
import { Send, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StickyTradeBarProps {
    totalOutgoing: number;
    totalIncoming: number;
    onPropose: () => void;
    isPending: boolean;
    isDisabled: boolean;
    myTeamName: string;
    targetTeamNames: string[];
}

export const StickyTradeBar: React.FC<StickyTradeBarProps> = ({
    totalOutgoing,
    totalIncoming,
    onPropose,
    isPending,
    isDisabled,
    myTeamName,
    targetTeamNames
}) => {
    const { t } = useTranslation();

    const outgoingColor = totalOutgoing > 100 ? 'text-red-500' : 'text-emerald-500';
    const incomingColor = totalIncoming > 100 ? 'text-red-500' : 'text-blue-400';

    return createPortal(
        <div className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-xl border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-[100] animate-in slide-in-from-bottom-full duration-500">
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="grid grid-cols-3 gap-6 items-center">
                    {/* Left: Outgoing Salary */}
                    <div className="flex flex-col">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                            {t('trades.sending_label')} ({myTeamName})
                        </div>
                        <div className={`text-2xl font-mono font-black ${outgoingColor}`}>
                            ${totalOutgoing.toFixed(1)}M
                        </div>
                    </div>

                    {/* Center: Propose Button */}
                    <div className="flex justify-center">
                        <button
                            onClick={onPropose}
                            disabled={isDisabled || isPending}
                            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:opacity-50 text-white px-8 py-4 rounded-xl font-bold uppercase tracking-wide text-base transition-all active:scale-95 disabled:cursor-not-allowed flex items-center gap-3 shadow-xl disabled:shadow-none"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    {t('common.loading')}
                                </>
                            ) : (
                                <>
                                    <Send size={20} />
                                    {t('trades.propose_trade')}
                                </>
                            )}
                        </button>
                    </div>

                    {/* Right: Incoming Salary */}
                    <div className="flex flex-col items-end">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                            {t('trades.receiving_label')} ({targetTeamNames.join(', ')})
                        </div>
                        <div className={`text-2xl font-mono font-black ${incomingColor}`}>
                            ${totalIncoming.toFixed(1)}M
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
