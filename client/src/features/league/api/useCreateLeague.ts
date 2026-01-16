import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';

export interface CreateLeagueRequest {
    leagueName: string;
    myTeamName: string;
}

export interface CreateLeagueResponse {
    leagueId: number;
    code: string;
    message: string;
}

export const useCreateLeague = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (request: CreateLeagueRequest) => {
            const { data } = await api.league.create<CreateLeagueResponse>(request);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-leagues'] });
        },
    });
};
