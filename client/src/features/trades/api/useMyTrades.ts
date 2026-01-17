import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export interface TradeOffer {
    fromUserId: string;
    fromTeamId: number; // NEW
    fromTeamName: string;
    toUserId: string;
    toTeamId: number; // NEW
    toTeamName: string;
    playerId: number;
    playerName: string;
    playerPosition: string;
    playerExternalId?: number;
}

export interface Trade {
    id: number;
    proposerId: string;
    status: string;
    createdAt: string;
    offers: TradeOffer[];
    acceptedUserIds: string[];
    isMeProposer: boolean;
    didIAccept: boolean;
    canIAccept: boolean;
}

export const useMyTrades = () => {
    return useQuery<Trade[]>({
        queryKey: ['trades'],
        queryFn: async () => {
            const resp = await api.trades.getTrades();
            return resp.data;
        },
        staleTime: 30000, // 30 seconds
    });
};
