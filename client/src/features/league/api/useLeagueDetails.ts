import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export const useLeagueDetails = () => {
    return useQuery({
        queryKey: ['league-details'],
        queryFn: async () => {
            const { data } = await api.league.getLeagueDetails<any>();
            return data;
        },
        staleTime: 5 * 60 * 1000, // 5 minuti
    });
};
