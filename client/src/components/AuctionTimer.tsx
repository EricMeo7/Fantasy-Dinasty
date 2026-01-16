import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface Props {
  endTime: string; // ISO string dal backend
  onExpire?: () => void;
}

export default function AuctionTimer({ endTime, onExpire }: Props) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const distance = end - now;

      if (distance < 0) {
        setIsExpired(true);
        setTimeLeft("SCADUTA");
        if (onExpire) onExpire();
        return;
      }

      // Calcolo giorni, ore, minuti, secondi
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      // Se manca meno di 1 ora, diventa "Urgente" (rosso)
      if (distance < 3600000) setUrgent(true);
      else setUrgent(false);

      if (days > 0) {
          setTimeLeft(`${days}g ${hours}h`);
      } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m`);
      } else {
          // Mostra secondi solo se manca meno di 1 ora
          setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  return (
    <div className={`flex items-center gap-1 font-mono font-bold text-sm ${isExpired ? 'text-slate-500' : urgent ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
        <Clock size={14} />
        <span>{timeLeft}</span>
    </div>
  );
}