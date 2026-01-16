import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export const useSimulateRelease = (playerId: number | null) => {
    return useQuery({
        queryKey: ['simulate-release', playerId],
        queryFn: async () => {
            if (!playerId) return null;
            const resp = await api.team.simulateRelease(playerId);
            return resp.data;
        },
        enabled: !!playerId,
        staleTime: 300000, // 5 minutes
    });
};
