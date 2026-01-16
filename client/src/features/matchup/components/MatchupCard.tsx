import { Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MatchupDto {
    id: number;
    weekNumber: number;
    isPlayed: boolean;
    homeTeam: string;
    homeTeamId: number;
    homeScore: number;
    awayTeam: string;
    awayTeamId: number;
    awayScore: number;
    isBye: boolean;
}

interface Props {
    match: MatchupDto;
}

export const MatchupCard = ({ match }: Props) => {
    const navigate = useNavigate();
    if (match.isBye) {
        return (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 flex flex-col items-center justify-center h-full min-h-[100px] hover:border-slate-600 transition">
                <div className="text-slate-500 font-bold mb-1">{match.homeTeam}</div>
                <div className="text-xs text-slate-600 uppercase font-black tracking-widest bg-slate-900/50 px-3 py-1 rounded-full">Riposo</div>
            </div>
        );
    }

    const isLive = !match.isPlayed && match.homeScore > 0; // Semplificazione Logic Live
    const homeWinner = match.homeScore > match.awayScore;
    const awayWinner = match.awayScore > match.homeScore;

    const isPlaceholder = match.homeTeamId === 0 || match.awayTeamId === 0;

    return (
        <div
            onClick={() => !match.isBye && !isPlaceholder && navigate(`/matchup/${match.id}`)}
            className={`bg-slate-800 rounded-xl border border-slate-700 p-0 overflow-hidden transition shadow-lg group ${!match.isBye && !isPlaceholder ? 'hover:border-slate-500 cursor-pointer hover:scale-[1.02]' : ''}`}
        >
            {/* Header Status */}
            <div className={`h-1 w-full ${match.isPlayed ? 'bg-slate-600' : isLive ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}></div>

            <div className="p-4 grid grid-cols-3 items-center gap-2">
                {/* Home Team */}
                <div className={`text-right ${homeWinner && match.isPlayed ? 'opacity-100' : 'opacity-80'}`}>
                    <div className={`font-bold truncate text-sm mb-1 ${homeWinner && match.isPlayed ? 'text-yellow-400' : 'text-white'}`}>
                        {match.homeTeam}
                    </div>
                    <div className="font-mono text-2xl font-bold tracking-tighter text-white">
                        {match.homeScore.toFixed(1)}
                    </div>
                </div>

                {/* VS / Status */}
                <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">
                        {match.isPlayed ? 'FINAL' : 'VS'}
                    </span>
                    {match.isPlayed && (
                        homeWinner ? <Trophy size={14} className="text-yellow-500 -ml-8" /> :
                            awayWinner ? <Trophy size={14} className="text-yellow-500 -mr-8" /> : null
                    )}
                </div>

                {/* Away Team */}
                <div className={`text-left ${awayWinner && match.isPlayed ? 'opacity-100' : 'opacity-80'}`}>
                    <div className={`font-bold truncate text-sm mb-1 ${awayWinner && match.isPlayed ? 'text-yellow-400' : 'text-white'}`}>
                        {match.awayTeam}
                    </div>
                    <div className="font-mono text-2xl font-bold tracking-tighter text-white">
                        {match.awayScore.toFixed(1)}
                    </div>
                </div>
            </div>
        </div>
    );
};
