import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function LineupTimer({ targetDate, className }: { targetDate: Date; className?: string }) {
    const { t } = useTranslation();
    const [timeLeft, setTimeLeft] = useState('');
    const [isCritical, setIsCritical] = useState(false);
    const [isLocked, setIsLocked] = useState(false);

    useEffect(() => {
        const update = () => {
            const now = new Date();
            const diff = targetDate.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft(t('lineup.locked'));
                setIsLocked(true);
                return;
            }

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${h}${t('time.h')} ${m}${t('time.m')} ${s}${t('time.s')}`);
            setIsCritical(diff < 1000 * 60 * 60); // < 1 hour
            setIsLocked(false);
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [targetDate]);

    return (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${isLocked
            ? 'bg-slate-800 border-slate-700 text-slate-500'
            : isCritical
                ? 'bg-red-500/10 border-red-500 text-red-500 animate-pulse'
                : 'bg-blue-500/10 border-blue-500 text-blue-400'
            } ${className}`}>
            <Clock size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                {isLocked ? t('lineup.lineup_locked') : t('lineup.lock_in')} <span className="font-mono text-xs ml-1">{!isLocked && timeLeft}</span>
            </span>
        </div>
    );
}

export default LineupTimer;
