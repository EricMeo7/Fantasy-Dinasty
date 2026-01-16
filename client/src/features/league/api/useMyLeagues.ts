import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export interface LeagueListMember {
    leagueId: number;
    leagueName: string;
    myTeamName: string;
    isAdmin: boolean;
}

export const useMyLeagues = () => {
    return useQuery({
        queryKey: ['my-leagues'],
        queryFn: async () => {
            const { data } = await api.league.getMyLeagues<LeagueListMember[]>();
            return data;
        },
    });
};
