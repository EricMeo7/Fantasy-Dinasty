import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';

export const useAcceptTrade = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (tradeId: number) => api.trades.accept(tradeId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trades'] });
            queryClient.invalidateQueries({ queryKey: ['my-roster'] });
            queryClient.invalidateQueries({ queryKey: ['team-budget'] });
        },
    });
};
