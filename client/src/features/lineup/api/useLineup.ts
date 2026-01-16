import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export const useLineup = (date: string, targetTeamId?: number) => {
    return useQuery({
        queryKey: ['lineup', date, targetTeamId],
        queryFn: async () => {
            const response = await api.lineup.getDailyLineup(date, targetTeamId);
            return response.data;
        },
        staleTime: 60 * 1000,
    });
};
