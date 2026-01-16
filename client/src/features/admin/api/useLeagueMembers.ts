import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export interface LeagueMember {
    userId: string;
    teamName: string;
    ownerName: string;
}

export const useLeagueMembers = () => {
    return useQuery({
        queryKey: ['league-members'],
        queryFn: async () => {
            const { data } = await api.admin.getMembers<LeagueMember[]>();
            return data;
        },
    });
};
