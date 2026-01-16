import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';

export const useUpdateScores = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => api.admin.updateScores(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matchups'] });
            queryClient.invalidateQueries({ queryKey: ['standings'] });
        },
    });
};
