import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import type { DraftBoardSlot } from '../types/draft.types';

export const useDraftBoard = (season: number) => {
    return useQuery<DraftBoardSlot[]>({
        queryKey: ['draftBoard', season],
        queryFn: async () => {
            const response = await api.draft.getBoard(season);
            return response.data;
        },
        enabled: !!localStorage.getItem('selectedLeagueId') && season > 0,
    });
};
