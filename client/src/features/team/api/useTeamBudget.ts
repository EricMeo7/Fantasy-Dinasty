import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export interface SeasonBudget {
    season: string;
    totalCap: number;
    contracts: number;
    deadMoney: number;
    freeSpace: number;
}

export interface DeadCapDetail {
    playerName: string;
    season: string;
    amount: number;
}

export interface TeamFinanceOverview {
    years: SeasonBudget[];
    deadCapDetails: DeadCapDetail[];
}

export const useTeamBudget = () => {
    return useQuery<TeamFinanceOverview>({
        queryKey: ['team-budget'],
        queryFn: async () => {
            const resp = await api.team.getBudget();
            return resp.data;
        },
        staleTime: 60000,
    });
};
