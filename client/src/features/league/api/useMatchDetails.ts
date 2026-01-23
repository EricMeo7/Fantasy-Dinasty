import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export interface MatchPlayer {
    id: number;
    name: string;
    position: string;
    nbaTeam: string;
    todayScore: number;
    weeklyScore: number;
    bestScoreDate?: string;  // Date when weeklyScore was achieved (yyyy-MM-dd)
    status: string;
}

export interface MatchDetails {
    id: number;
    weekNumber: number;
    weekStartDate: string;
    weekEndDate: string;
    isPlayed: boolean;
    homeTeam: string;
    homeTeamId: number;
    homeUserId: string;
    homeScore: number;
    homePlayers: MatchPlayer[];
    awayTeam: string;
    awayTeamId: number;
    awayUserId: string;
    awayScore: number;
    awayPlayers: MatchPlayer[];
}

export const useMatchDetails = (matchId?: number) => {
    return useQuery({
        queryKey: ['match-details', matchId || 'current'],
        queryFn: async () => {
            if (matchId) {
                const { data } = await api.match.getDetails<MatchDetails>(matchId);
                return data;
            } else {
                const { data } = await api.match.getCurrent<MatchDetails>();
                return data;
            }
        },
        refetchInterval: (query) => {
            // Refetch every 30 seconds if it's an active match (not played)
            const data = query.state.data as MatchDetails | undefined;
            return data && !data.isPlayed ? 30000 : false;
        }
    });
};
