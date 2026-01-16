import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';

export const useUpdateLineup = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { date: string, starterSlots: Record<string, number>, bench: number[] }) => {
            return await api.lineup.saveLineup(data);
        },
        onSuccess: (_, variables) => {
            // Invalidate lineup query for the specific date
            queryClient.invalidateQueries({ queryKey: ['lineup', variables.date] });
        },
    });
};
