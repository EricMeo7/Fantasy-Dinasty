import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';

export const useLeaveLeague = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (leagueId: number) => api.league.leave(leagueId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-leagues'] });
        },
    });
};
