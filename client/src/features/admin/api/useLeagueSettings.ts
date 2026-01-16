import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export const useLeagueSettings = () => {
    return useQuery({
        queryKey: ['league-settings'],
        queryFn: async () => {
            const { data } = await api.admin.getSettings<any>();
            return data;
        },
    });
};
