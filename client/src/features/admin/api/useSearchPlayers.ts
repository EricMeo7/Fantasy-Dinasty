import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export interface AdminSearchPlayer {
    id: number;
    firstName: string;
    lastName: string;
    nbaTeam: string;
    currentOwner: string | null;
}

export const useSearchPlayers = (query: string) => {
    return useQuery({
        queryKey: ['admin-search-players', query],
        queryFn: async () => {
            if (!query || query.length < 3) return [];
            const { data } = await api.admin.searchAllPlayers<AdminSearchPlayer[]>(query);
            return data;
        },
        enabled: query.length >= 3,
    });
};
