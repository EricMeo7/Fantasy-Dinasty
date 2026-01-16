import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';

export const useUpdateStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (newStatus: number) => api.admin.changeStatus(newStatus),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['league-status'] });
        },
    });
};
