import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export const usePlayerDetails = (playerId: number | null) => {
    return useQuery({
        queryKey: ['player-details', playerId],
        queryFn: async () => {
            if (!playerId) return null;
            const response = await api.market.getPlayerDetails(playerId);
            return response.data;
        },
        enabled: !!playerId,
        staleTime: 5 * 60 * 1000,
    });
};
