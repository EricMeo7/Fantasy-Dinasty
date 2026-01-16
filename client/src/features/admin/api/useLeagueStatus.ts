import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export const useLeagueStatus = () => {
    return useQuery({
        queryKey: ['league-status'],
        queryFn: async () => {
            const { data } = await api.admin.getStatus();
            return data.status as number;
        },
    });
};
