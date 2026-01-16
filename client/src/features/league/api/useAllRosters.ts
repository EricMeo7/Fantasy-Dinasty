import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export interface RosterPlayer {
    id: number;
    firstName: string;
    lastName: string;
    externalId: number;
    position: string;
    nbaTeam: string;
    avgPoints: number;
    salaryYear1: number;
    salaryYear2: number;
    salaryYear3: number;
    contractYears: number;
    isStarter: boolean;
}

export interface TeamRoster {
    id: number;
    userId: string;
    teamName: string;
    ownerName: string;
    players: RosterPlayer[];
}

export const useAllRosters = () => {
    return useQuery({
        queryKey: ['all-rosters'],
        queryFn: async () => {
            const { data } = await api.league.getAllRosters<TeamRoster[]>();
            return data;
        },
    });
};
