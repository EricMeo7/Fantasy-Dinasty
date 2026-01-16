import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';

export const useReleasePlayer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (playerId: number) => api.team.releasePlayer(playerId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-roster'] });
            queryClient.invalidateQueries({ queryKey: ['team-budget'] });
            queryClient.invalidateQueries({ queryKey: ['lineup'] });
        },
    });
};
