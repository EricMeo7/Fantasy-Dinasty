import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';

export const useUpdateSettings = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (settings: any) => api.admin.updateSettings(settings),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['league-settings'] });
        },
    });
};
