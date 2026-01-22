import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export interface TeamInfo {
    id: number;
    name: string;
    userId: string;
    leagueId: number;
    isAdmin: boolean;
    logoVersion: number;
}

export const useMyTeamInfo = () => {
    const token = localStorage.getItem('token');
    return useQuery({
        queryKey: ['my-team', token],
        queryFn: async () => {
            const { data } = await api.team.getMyTeam();
            return data as TeamInfo;
        },
        staleTime: Infinity,
        enabled: !!token,
        retry: false
    });
};
