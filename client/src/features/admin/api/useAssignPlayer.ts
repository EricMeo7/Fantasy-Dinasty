import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';

export interface AssignPlayerRequest {
    playerId: number;
    targetUserId: string;
    salary: number;
    years: number;
}

export const useAssignPlayer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: AssignPlayerRequest) => api.admin.assignPlayer(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['league-members'] });
            queryClient.invalidateQueries({ queryKey: ['all-rosters'] });
            queryClient.invalidateQueries({ queryKey: ['my-roster'] });
        },
    });
};
