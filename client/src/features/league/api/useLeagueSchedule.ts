import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export interface MatchupEntry {
    id: number;
    weekNumber: number;
    homeTeam: string;
    awayTeam: string;
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number;
    awayScore: number;
    isPlayed: boolean;
}

export const useLeagueSchedule = () => {
    return useQuery({
        queryKey: ['league-schedule'],
        queryFn: async () => {
            const { data } = await api.match.getLeagueSchedule<MatchupEntry[]>();
            return data;
        },
    });
};
