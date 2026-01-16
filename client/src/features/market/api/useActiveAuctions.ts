import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export const useActiveAuctions = () => {
    return useQuery({
        queryKey: ['active-auctions'],
        queryFn: async () => {
            const response = await api.market.getActiveAuctions();
            return response.data;
        },
        refetchInterval: 15000,
    });
};
