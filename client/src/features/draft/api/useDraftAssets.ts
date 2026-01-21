import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import type { DraftAsset } from '../types/draft.types';

export const useDraftAssets = () => {
    return useQuery<DraftAsset[]>({
        queryKey: ['draftAssets'],
        queryFn: async () => {
            const response = await api.draft.getMyAssets();
            return response.data;
        },
        enabled: !!localStorage.getItem('selectedLeagueId'),
    });
};
