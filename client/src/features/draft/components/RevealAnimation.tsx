import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import LogoAvatar from '../../../components/LogoAvatar';
import { CONFIG } from '../../../config';

interface TeamCandidate {
    id: number;
    name: string;
}

interface RevealAnimationProps {
    isVisible: boolean;
    winner: TeamCandidate | null;
    onComplete: () => void;
    candidates: TeamCandidate[]; // List of teams to cycle through
}

export function RevealAnimation({ isVisible, winner, onComplete, candidates = [] }: RevealAnimationProps) {
    const [currentCandidate, setCurrentCandidate] = useState<TeamCandidate | null>(null);
    const [showWinner, setShowWinner] = useState(false);

    useEffect(() => {
        if (!isVisible) {
            setShowWinner(false);
            return;
        }

        let timeoutId: NodeJS.Timeout;
        let cycles = 0;
        const maxCycles = 65; // Even more drama: 65 changes

        const runCycle = () => {
            const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)];
            setCurrentCandidate(randomCandidate);
            cycles++;

            if (cycles < maxCycles) {
                // DECELERATION LOGIC:
                // Start fast (50ms) and end very slow (~650ms)
                const progress = cycles / maxCycles;
                const delay = 50 + (Math.pow(progress, 3) * 600);
                timeoutId = setTimeout(runCycle, delay);
            } else {
                // Animation finished - reveal real winner
                setShowWinner(true);
                // Stay on winner for 5 seconds before closing
                setTimeout(onComplete, 5000);
            }
        };

        if (candidates.length > 0) {
            runCycle();
        } else {
            setShowWinner(true);
            setTimeout(onComplete, 3000);
        }

        return () => clearTimeout(timeoutId);
    }, [isVisible, candidates, onComplete]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] grid place-items-center bg-black/95 backdrop-blur-md"
                >
                    <div className="text-center space-y-8 p-12 relative overflow-hidden flex flex-col items-center">

                        {/* Background Confetti/Effects could go here */}

                        <motion.h2
                            className="text-4xl font-black text-white uppercase tracking-[0.2em] mb-8"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            The pick goes to...
                        </motion.h2>

                        <div className="relative w-[400px] h-[400px] flex items-center justify-center">
                            {/* Glowing Container */}
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>

                            <div className="relative w-full h-full bg-slate-900 border-2 border-white/10 rounded-3xl shadow-2xl flex items-center justify-center overflow-hidden">
                                <AnimatePresence mode="wait">
                                    {!showWinner ? (
                                        <motion.div
                                            key={currentCandidate?.id || 'loading'}
                                            initial={{ y: 50, opacity: 0, scale: 0.8, filter: "blur(4px)" }}
                                            animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }}
                                            exit={{ y: -50, opacity: 0, scale: 0.8, filter: "blur(4px)" }}
                                            transition={{ duration: 0.05 }}
                                            className="flex flex-col items-center gap-6"
                                        >
                                            {currentCandidate && (
                                                <LogoAvatar
                                                    src={`${CONFIG.API_BASE_URL}/team/${currentCandidate.id}/logo`}
                                                    alt={currentCandidate.name}
                                                    size="xl"
                                                    shape="circle"
                                                    className="w-32 h-32 border-4 border-slate-700 bg-slate-800"
                                                    fallbackType="team"
                                                />
                                            )}
                                            <div className="text-2xl font-black uppercase italic tracking-tighter text-slate-400">
                                                {currentCandidate?.name || "..."}
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            initial={{ scale: 0.5, opacity: 0, rotateY: 180 }}
                                            animate={{ scale: 1.1, opacity: 1, rotateY: 0 }}
                                            transition={{ type: "spring", damping: 10, stiffness: 100 }}
                                            className="flex flex-col items-center gap-6 z-10"
                                        >
                                            {/* CONFETTI BURST WOULD GO HERE */}
                                            {winner && (
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-yellow-400 blur-3xl opacity-20 animate-pulse"></div>
                                                    <LogoAvatar
                                                        src={`${CONFIG.API_BASE_URL}/team/${winner.id}/logo`}
                                                        alt={winner.name}
                                                        size="xl" // Actually verify if XL is big enough, might need custom class
                                                        shape="circle"
                                                        className="w-48 h-48 border-4 border-yellow-500 shadow-[0_0_60px_rgba(234,179,8,0.5)] z-10 bg-slate-950"
                                                        fallbackType="team"
                                                    />
                                                </div>
                                            )}

                                            <div className="text-center">
                                                <motion.h1
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    transition={{ delay: 0.2 }}
                                                    className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 uppercase italic tracking-tighter pt-4"
                                                >
                                                    {winner?.name}
                                                </motion.h1>
                                                <div className="text-yellow-500 font-bold uppercase tracking-[0.5em] text-xs mt-2">Win!</div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
