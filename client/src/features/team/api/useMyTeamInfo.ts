import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export interface TeamInfo {
    id: number;
    name: string;
    userId: string;
    leagueId: number;
    isAdmin: boolean;
}

export const useMyTeamInfo = () => {
    return useQuery({
        queryKey: ['my-team', localStorage.getItem('token')],
        queryFn: async () => {
            const { data } = await api.team.getMyTeam();
            return data as TeamInfo;
        },
        staleTime: Infinity,
    });
};
