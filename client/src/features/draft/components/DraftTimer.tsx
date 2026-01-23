import { useEffect, useState } from 'react';

interface Props {
    deadline?: string; // ISO date string
    totalSeconds?: number;
}

export default function DraftTimer({ deadline, totalSeconds = 120 }: Props) {
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (!deadline) {
            setTimeLeft(0);
            return;
        }

        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const end = new Date(deadline).getTime();
            const diff = Math.max(0, Math.floor((end - now) / 1000));
            setTimeLeft(diff);
        };

        calculateTimeLeft(); // Initial call
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [deadline]);

    const progress = Math.min(100, (timeLeft / totalSeconds) * 100);

    // Color logic
    let colorClass = "text-emerald-400";
    let barClass = "bg-emerald-500";

    if (timeLeft <= 30) {
        colorClass = "text-red-500 animate-pulse";
        barClass = "bg-red-500";
    } else if (timeLeft <= 60) {
        colorClass = "text-yellow-400";
        barClass = "bg-yellow-500";
    }

    if (!deadline) return <div className="text-slate-500 font-mono text-sm">WAITING...</div>;

    return (
        <div className="flex flex-col items-center justify-center w-full">
            <div className={`text-4xl font-black font-mono tracking-widest ${colorClass}`}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </div>

            <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div
                    className={`h-full transition-all duration-1000 linear ${barClass}`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}
