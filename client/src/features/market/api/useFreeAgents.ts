import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export const useFreeAgents = () => {
    return useQuery({
        queryKey: ['free-agents'],
        queryFn: async () => {
            const response = await api.market.getFreeAgents();
            return response.data;
        },
        staleTime: 1000 * 60 * 60,
    });
};
