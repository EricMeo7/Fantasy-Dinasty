import { useState, useEffect } from 'react';
import { X, Gavel, DollarSign, Calendar, AlertCircle, CheckCircle2, User } from 'lucide-react';
import { type BidRequest } from '../services/api';
import { usePlaceBid } from '../features/market/api/usePlaceBid';

// Interfaccia flessibile per accettare sia il DTO della lista che il PlayerFull
interface Props {
    player: any | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void; // Callback per ricaricare la lista dopo l'offerta
}

export default function BidModal({ player, isOpen, onClose, onSuccess }: Props) {
    const [amount, setAmount] = useState<number>(1);
    const [years, setYears] = useState<number>(1);
    // Remove manual loading state, use hook's isPending
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const { mutateAsync: placeBid, isPending: loading } = usePlaceBid();

    // --- LOGICA DI CALCOLO MINIMUM BID ---
    const getMinTotalBid = (targetYears: number) => {
        if (!player) return 1;

        // SCENARIO 1: NUOVA ASTA
        if (!player.hasActiveAuction) {
            return (player.minBid || 1) * targetYears;
        }

        // SCENARIO 2: RILANCIO
        // Regola: Bisogna battere il salary annuo (Year1) o pareggiarlo con più anni.
        const currentY1 = Math.floor(player.currentOffer / Math.max(1, player.currentYears));

        // Se offro più anni del corrente, posso pareggiare lo stipendio
        if (targetYears > player.currentYears) {
            const minTotal = currentY1 * targetYears;
            // Validazione strict: se minTotal / targetYears < currentY1 (per arrotondamenti), aggiungi
            // Ma poiché usiamo interi, math floor e * int dovrebbe tornare.
            // Tuttavia, se l'offerta attuale è 10 su 1 anno (Y1=10)
            // E io faccio 2 anni. Min = 20. Y1 = 10. Batte?
            // Regola: (newY1 == currentY1 && newYears > currentYears) => TRUE.
            return Math.max(minTotal, (player.minBid || 1));
        }

        // Se offro stessi anni o meno, devo battere lo stipendio
        // Devo avere Y1 = currentY1 + 1
        const targetY1 = currentY1 + 1;
        const minTotal = targetY1 * targetYears;
        return Math.max(minTotal, (player.minBid || 1));
    };

    const minBidForSelectedYears = getMinTotalBid(years);

    // Reset dello stato quando si apre il modale
    useEffect(() => {
        if (isOpen && player) {
            const initialYears = 1;
            const minForInitial = getMinTotalBid(initialYears);

            setAmount(minForInitial);
            setYears(initialYears);

            setError(null);
            setSuccessMsg(null);
        }
    }, [isOpen, player]);

    // Recalculate input when years change if current input is too low
    useEffect(() => {
        if (isOpen && player) {
            const min = getMinTotalBid(years);
            if (amount < min) {
                setAmount(min);
            }
        }
    }, [years]);

    if (!isOpen || !player) return null;

    // --- LOGICA DI CALCOLO STIPENDI (Replica visiva della Regola 8) ---
    const calculateSalaryStructure = (total: number, yrs: number) => {
        // Evitiamo divisioni per 0 o numeri negativi
        if (total <= 0 || yrs <= 0) return [0, 0, 0];

        const base = Math.floor(total / yrs);
        const remainder = total - (base * yrs);

        const structure = [];
        for (let i = 0; i < yrs; i++) {
            structure.push(base);
        }
        // Il resto va sull'ultimo anno
        if (remainder > 0 && structure.length > 0) {
            structure[yrs - 1] += remainder;
        }
        return structure;
    };

    const salaryStructure = calculateSalaryStructure(amount, years);
    const year1Cost = salaryStructure.length > 0 ? salaryStructure[0] : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Client Side Validation
        if (amount < minBidForSelectedYears) {
            setError(`L'offerta è troppo bassa. Il minimo per ${years} anni è ${minBidForSelectedYears}M.`);
            return;
        }

        const payload: BidRequest = {
            playerId: player.id,
            totalAmount: Number(amount),
            years: years
        };

        try {
            await placeBid(payload);
            setSuccessMsg(`Offerta piazzata con successo!`);
            // Chiudiamo dopo breve delay per far leggere il messaggio
            setTimeout(() => {
                onSuccess(); // Ricarica i dati nella pagina padre
                onClose();
            }, 1000);
        } catch (err: any) {
            // Gestione errori dal backend
            let msg = err.response?.data?.message || err.response?.data || "Errore durante l'offerta.";
            if (msg.includes("BID_TOO_LOW")) {
                msg = `Offerta troppo bassa. Il minimo calcolato è ${minBidForSelectedYears}M.`;
            }
            setError(msg);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 border-b border-slate-700">
                    <div className="flex justify-between items-start mb-2">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Gavel className={player.hasActiveAuction ? "text-red-500" : "text-emerald-400"} />
                            {player.hasActiveAuction ? "Rilancia Asta" : "Nuova Asta"}
                        </h2>
                        <button onClick={onClose} className="text-slate-500 hover:text-white transition"><X /></button>
                    </div>
                    <div className="text-slate-400">
                        Per <span className="text-white font-bold">{player.firstName} {player.lastName}</span>
                        {player.minBid > 1 && !player.hasActiveAuction && (
                            <span className="ml-2 text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">Base: {player.minBid}M</span>
                        )}
                    </div>

                    {/* BOX INFO AVVERSARIO (Solo se asta attiva) */}
                    {player.hasActiveAuction && (
                        <div className="mt-4 bg-slate-950/50 border border-slate-700 rounded-lg p-3 flex justify-between items-center animate-in slide-in-from-top-2">
                            <div>
                                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Offerta da battere</div>
                                <div className="text-white font-mono font-bold text-lg flex items-baseline gap-1">
                                    {player.currentOffer} M <span className="text-slate-500 text-sm font-normal">x {player.currentYears} anni</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Attuale Vincente</div>
                                <div className="flex items-center justify-end gap-1 text-emerald-400 font-bold text-sm bg-emerald-900/20 px-2 py-1 rounded">
                                    <User size={12} />
                                    {player.highBidderName || "Sconosciuto"}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Form Scrollabile */}
                <div className="overflow-y-auto custom-scrollbar">
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">

                        {/* Input Totale Offerta */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-bold uppercase text-slate-500">La tua Offerta Totale (Mln $)</label>
                                <span className="text-xs text-emerald-400 font-bold">Min: {minBidForSelectedYears}M</span>
                            </div>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-3 text-emerald-500" size={20} />
                                <input
                                    type="number"
                                    min={minBidForSelectedYears}
                                    step="0.5"
                                    value={amount}
                                    onChange={(e) => setAmount(Number(e.target.value))}
                                    className={`w-full bg-slate-800 border rounded-xl py-3 pl-10 pr-4 text-white font-mono text-xl font-bold focus:outline-none focus:ring-1 transition placeholder-slate-600
                                        ${amount < minBidForSelectedYears ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-700 focus:border-emerald-500 focus:ring-emerald-500'}
                                    `}
                                    placeholder="Es. 75"
                                />
                            </div>
                        </div>

                        {/* Selezione Anni */}
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Durata Contratto</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[1, 2, 3].map((y) => (
                                    <button
                                        key={y}
                                        type="button"
                                        onClick={() => setYears(y)}
                                        className={`py-3 rounded-xl border font-bold transition flex flex-col items-center justify-center gap-1 ${years === y
                                            ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/50 scale-105'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'
                                            }`}
                                    >
                                        <span className="text-lg">{y} Anni</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Anteprima Struttura Salariale */}
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 mb-3">
                                <Calendar size={14} /> Struttura Stipendio (Stimata)
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                {salaryStructure.map((sal, index) => (
                                    <div key={index} className={`rounded p-2 transition-all ${index === 0 ? 'bg-emerald-900/20 border border-emerald-500/30 shadow-sm' : 'bg-slate-800 border border-slate-700/50'}`}>
                                        <div className="text-[10px] text-slate-500 uppercase font-bold">Anno {index + 1}</div>
                                        <div className={`font-mono font-bold text-lg ${index === 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                                            {sal.toFixed(1)}
                                        </div>
                                    </div>
                                ))}
                                {/* Placeholder per anni vuoti */}
                                {[...Array(3 - years)].map((_, i) => (
                                    <div key={`empty-${i}`} className="rounded p-2 bg-slate-800/20 border border-slate-800/50 border-dashed opacity-50 flex flex-col justify-center min-h-[66px]">
                                        <div className="text-slate-700 font-mono text-sm">-</div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-center text-slate-400">
                                Valore comparativo Anno 1: <span className="text-white font-bold bg-slate-700 px-1.5 py-0.5 rounded ml-1">{year1Cost.toFixed(1)} M</span>
                            </div>
                        </div>

                        {/* Messaggi Errore / Successo */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-start gap-3 animate-in shake">
                                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {successMsg && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm flex items-start gap-3 animate-in zoom-in">
                                <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
                                <span className="font-bold">{successMsg}</span>
                            </div>
                        )}

                        {/* Bottone Submit */}
                        <button
                            type="submit"
                            disabled={loading || !!successMsg}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition flex items-center justify-center gap-2 mt-4"
                        >
                            {loading ? (
                                <>Invio in corso...</>
                            ) : (
                                <>{player.hasActiveAuction ? 'RILANCIA ORA' : 'APRI ASTA'}</>
                            )}
                        </button>

                    </form>
                </div>
            </div>
        </div>
    );
}