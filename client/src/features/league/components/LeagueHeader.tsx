import { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
    leagueName: string;
    inviteCode: string;
}

export const LeagueHeader = ({ inviteCode }: Props) => {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);

    const copyCode = () => {
        navigator.clipboard.writeText(inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex flex-col text-center sm:text-left">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">{t('league.invite_code')}</span>
                <div className="flex items-center gap-3">
                    <code className="text-xl font-black text-white font-mono tracking-tighter">{inviteCode}</code>
                    <button
                        onClick={copyCode}
                        className={`p-2.5 rounded-xl transition-all duration-300 border ${copied ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-blue-500'}`}
                        title={t('league.copy_btn_title')}
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                    <button className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-blue-500 transition-all">
                        <Share2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};
