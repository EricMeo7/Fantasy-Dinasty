import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';

export const useUpdateInjuries = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (deep: boolean = false) => api.post(`/admin/update-official-injuries?deep=${deep}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roster'] });
            queryClient.invalidateQueries({ queryKey: ['lineups'] });
        },
    });
};
