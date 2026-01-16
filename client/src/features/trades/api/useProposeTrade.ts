import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';

export interface ProposeTradeRequest {
    offers: {
        fromUserId: string;
        toUserId: string;
        playerId: number;
    }[];
}

export const useProposeTrade = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: ProposeTradeRequest) => api.trades.propose(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trades'] });
        },
    });
};
