import { useMutation } from '@tanstack/react-query';
import api from '../../../services/api';

export const useUpdateNbaSchedule = () => {
    return useMutation({
        mutationFn: async () => {
            // Direct axios call as 'api' service might not have this method typings yet
            return api.post('/admin/update-nba-schedule');
        }
    });
};
