import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';

export interface JoinLeagueRequest {
    code: string;
    myTeamName: string;
}

export interface JoinLeagueResponse {
    leagueId: number;
    message: string;
}

export const useJoinLeague = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (request: JoinLeagueRequest) => {
            const { data } = await api.league.join<JoinLeagueResponse>(request);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-leagues'] });
        },
    });
};
