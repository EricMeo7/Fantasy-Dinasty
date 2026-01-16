import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export const useMyRoster = () => {
    return useQuery({
        queryKey: ['my-roster'],
        queryFn: async () => {
            const response = await api.getMyRoster();
            return response.data;
        },
        staleTime: 60 * 1000, // 1 minuto
    });
};
