import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';

export const useResetMarket = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => api.admin.resetMarket(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['free-agents'] });
            queryClient.invalidateQueries({ queryKey: ['auctions'] });
        },
    });
};
