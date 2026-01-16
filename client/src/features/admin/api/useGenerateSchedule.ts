import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';

export const useGenerateSchedule = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { playoffTeams: number; mode: number }) => api.admin.generateSchedule(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['league-schedule'] });
        },
    });
};
