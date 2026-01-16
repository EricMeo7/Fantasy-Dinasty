import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export const useTeamBudget = () => {
    return useQuery({
        queryKey: ['team-budget'],
        queryFn: async () => {
            const response = await api.getTeamBudget();
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minuti (budget cambia meno spesso)
    });
};
