import { useEffect, useState } from 'react';
import { AlertTriangle, X, DollarSign, Calculator } from 'lucide-react';
import api from '../services/api';
import { type PlayerFull } from './PlayerStatsModal';
import { useTranslation } from 'react-i18next';

interface Props {
  player: PlayerFull | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

interface Penalty {
  season: string;
  amount: number;
  playerName: string; // Usato per la descrizione
}

export default function ReleaseModal({ player, isOpen, onClose, onConfirm }: Props) {
  const { t } = useTranslation();
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && player) {
      fetchSimulation();
    }
  }, [isOpen, player]);

  const fetchSimulation = async () => {
    if (!player) return;
    setLoading(true);
    try {
      const { data } = await api.simulateRelease(player.id);
      setPenalties(data);
    } catch (error) {
      console.error("Errore simulazione", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !player) return null;

  const totalHit = penalties.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-red-500/50 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header Pericolo */}
        <div className="bg-red-950/50 p-6 border-b border-red-900/50 flex items-start gap-4">
          <div className="p-3 bg-red-500/10 rounded-full text-red-500 shrink-0">
            <AlertTriangle size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t('modals.release_player')}</h2>
            <p className="text-red-300 text-sm mt-1">
              Stai per rilasciare <span className="font-bold text-white">{player.firstName} {player.lastName}</span>.
            </p>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6">
          <p className="text-slate-400 text-sm mb-4">
            Questa azione è <strong>irreversibile</strong>. Il contratto è garantito e verrà applicato il seguente <strong>Dead Money</strong> (penalità) sul tuo Salary Cap:
          </p>

          {loading ? (
            <div className="py-8 text-center text-slate-500 flex flex-col items-center gap-2">
              <Calculator className="animate-bounce" /> Calcolo impatto salariale...
            </div>
          ) : (
            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden mb-6">
              {penalties.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 border-b border-slate-800 last:border-0">
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase">{p.season}</div>
                    <div className="text-sm text-slate-300">{p.playerName}</div>
                  </div>
                  <div className="font-mono font-bold text-red-400 flex items-center">
                    - {p.amount.toFixed(1)} M
                  </div>
                </div>
              ))}
              <div className="bg-red-900/10 p-3 flex justify-between items-center">
                <span className="text-sm font-bold text-red-200 uppercase">Totale Perso</span>
                <span className="font-mono font-bold text-red-500 text-lg">- {totalHit.toFixed(1)} M</span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
            >
              {t('modals.cancel')}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-900/20 transition flex items-center justify-center gap-2"
            >
              <DollarSign size={18} /> Conferma Taglio
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}