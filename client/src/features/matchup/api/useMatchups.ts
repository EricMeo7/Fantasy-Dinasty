import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export const useMatchups = () => {
    return useQuery({
        queryKey: ['matchups'],
        queryFn: async () => {
            const { data } = await api.match.getLeagueSchedule<any[]>();
            return data;
        },
        staleTime: 60 * 1000, // 1 minuto per Live Scores
    });
};
