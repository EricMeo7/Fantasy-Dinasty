import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export interface PlayerPoolParams {
    season?: string;
    nameSearch?: string;
    position?: string;
    nbaTeam?: string;
    minPts?: number;
    minReb?: number;
    minAst?: number;
    minStl?: number;
    minBlk?: number;
    minFpts?: number;
    minMin?: number;
    minGp?: number;
    minFgPct?: number;
    min3pPct?: number;
    minFtPct?: number;
    onlyFreeAgents?: boolean;
    sortBy?: string;
    isDescending?: boolean;
    page?: number;
    pageSize?: number;
}

export interface PlayerPoolResponse {
    players: any[];
    totalCount: number;
}

export const usePlayerPool = (params: PlayerPoolParams) => {
    return useQuery({
        queryKey: ['playerPricePool', params],
        queryFn: async () => {
            const { data } = await api.stats.getPlayers(params);
            return data as PlayerPoolResponse;
        },
        placeholderData: (previousData) => previousData,
    });
};

export const useInfinitePlayerPool = (params: Omit<PlayerPoolParams, 'page'>) => {
    const pageSize = params.pageSize || 50;
    return useInfiniteQuery({
        queryKey: ['playerPricePoolInfinite', params],
        queryFn: async ({ pageParam = 1 }) => {
            const { data } = await api.stats.getPlayers({ ...params, page: pageParam, pageSize });
            return data as PlayerPoolResponse;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            const totalLoaded = allPages.length * pageSize;
            return totalLoaded < lastPage.totalCount ? allPages.length + 1 : undefined;
        },
        placeholderData: (previousData) => previousData,
    });
};

export const useSeasons = () => {
    return useQuery({
        queryKey: ['seasons'],
        queryFn: async () => {
            const { data } = await api.stats.getSeasons();
            return data as string[];
        }
    });
};
