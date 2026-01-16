import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';

export const useRejectTrade = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (tradeId: number) => api.trades.reject(tradeId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trades'] });
        },
    });
};
