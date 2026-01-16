import { useMutation, useQueryClient } from '@tanstack/react-query';
import api, { type BidRequest } from '../../../services/api';

export const usePlaceBid = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: BidRequest) => api.market.placeBid(data),
        onMutate: async (_newBid) => {
            // 1. Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['market-players'] });

            // 2. Snapshot previous value
            const previousPlayers = queryClient.getQueryData(['market-players']);

            // 3. Optimistically update (Complex due to list structure, skipping deep update for now, just Toast)
            // Ideally we find the player in the list and update "currentBid" locally.

            return { previousPlayers };
        },
        onSuccess: () => {
            // Invalidate to refetch fresh data
            queryClient.invalidateQueries({ queryKey: ['market-players'] });
            queryClient.invalidateQueries({ queryKey: ['team-budget'] });
        },
        onError: (_err, _newBid, context) => {
            // Rollback
            if (context?.previousPlayers) {
                queryClient.setQueryData(['market-players'], context.previousPlayers);
            }
        }
    });
};
