import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';

export interface DailyPlayer {
    id: number;
    playerId: number;
    externalId: number;
    name: string;
    position: string;
    nbaTeam: string;
    isStarter: boolean;
    benchOrder: number;
    hasGame: boolean;
    opponent: string;
    gameTime: string;
    injuryStatus: string | null;
    realPoints: number | null;

    // Detailed Stats
    gamePoints?: number;
    gameRebounds?: number;
    gameAssists?: number;
    gameSteals?: number;
    gameBlocks?: number;
    gameTurnovers?: number;
    gameMinutes?: number;

    gameFgm?: number;
    gameFga?: number;
    gameThreePm?: number;
    gameThreePa?: number;
    gameFtm?: number;
    gameFta?: number;

    gameOffRebounds?: number;
    gameDefRebounds?: number;

    // FP Contributions
    gamePointsFp?: number;
    gameReboundsFp?: number;
    gameAssistsFp?: number;
    gameStealsFp?: number;
    gameBlocksFp?: number;
    gameTurnoversFp?: number;
    gameOffReboundsFp?: number;
    gameDefReboundsFp?: number;
    gameFgmFp?: number;
    gameFgaFp?: number;
    gameFtmFp?: number;
    gameFtaFp?: number;
    gameThreePmFp?: number;
    gameThreePaFp?: number;
    gameWinFp?: number;
    gameLossFp?: number;

    avgFantasyPoints: number;
    weeklyBestScore?: number;
    slot: string; // "PG", "C", "BN" etc.
}

export const useDailyLineup = (dateStr: string, teamUserId?: string) => {
    return useQuery({
        queryKey: ['lineup', dateStr, teamUserId || 'me'],
        queryFn: async () => {
            // Logic for targetTeamId should ideally use the numeric Team ID if possible, 
            // but the legacy component passed teamUserId.
            // Wait, let's look at api.ts: getDailyLineup: (date: string, targetTeamId?: number)
            // The backend handler for /lineup/day accepts targetTeamId (int).

            // I'll need to figure out the numeric teamId if viewing another team.
            // For now, let's assume teamUserId is passed as number or string.
            const tid = teamUserId ? parseInt(teamUserId) : undefined;
            const { data } = await api.lineup.getDailyLineup<DailyPlayer[]>(dateStr, tid);
            return data;
        },
        enabled: !!dateStr,
        staleTime: 10 * 1000,
    });
};

export const useSaveLineup = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { date: string, starterSlots: Record<string, number>, bench: number[] }) => {
            await api.lineup.saveLineup(data);
        },
        onMutate: async (newData) => {
            // 1. Cancel any outgoing refetches so they don't overwrite our optimistic update
            await queryClient.cancelQueries({ queryKey: ['lineup', newData.date] });

            // 2. Snapshot the previous value
            const previousLineup = queryClient.getQueryData<DailyPlayer[]>(['lineup', newData.date]);

            // 3. Optimistically update to the new value
            if (previousLineup) {
                const starterMap = new Map<number, string>();
                Object.entries(newData.starterSlots).forEach(([slot, playerId]) => starterMap.set(playerId, slot));

                const benchSet = new Set(newData.bench);

                const optimisticLineup = previousLineup.map(p => {
                    if (starterMap.has(p.playerId)) {
                        const slot = starterMap.get(p.playerId)!;
                        // Feature: Manual Bench Slots (BN-G, BN-F)
                        // They are passed in starterSlots but are NOT starters
                        if (slot.startsWith('BN-')) {
                            return { ...p, isStarter: false, slot: slot, benchOrder: 0 }; // Order will be fixed by server or inferred? 
                            // Logic in Matchup.tsx puts them in Bench list too? 
                            // Wait, Matchup.tsx puts them in starterSlots map AND bench list? 
                            // No, in saveLineup: if p.slot startsWith BN, it goes to starterSlots. 
                            // AND it goes to bench list because !p.isStarter.
                            // So it hits this block first (starterMap).
                            // We should probably rely on BENCH ORDER from bench list if available?
                            // But let's just set isStarter false and slot.
                        }
                        return { ...p, isStarter: true, slot: slot, benchOrder: 0 };
                    } else if (benchSet.has(p.playerId)) {
                        const idx = newData.bench.indexOf(p.playerId);
                        return { ...p, isStarter: false, slot: 'BN', benchOrder: idx + 1 };
                    }
                    // Should not happen if data is consistent, but keep as is if not in either list
                    return p;
                });

                queryClient.setQueryData(['lineup', newData.date], optimisticLineup);
            }

            // Return a context object with the snapshotted value
            return { previousLineup };
        },
        onError: (_err, newData, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            if (context?.previousLineup) {
                queryClient.setQueryData(['lineup', newData.date], context.previousLineup);
            }
        },
        onSettled: (_, __, newData) => {
            // Always refetch after error or success to ensure server sync
            queryClient.invalidateQueries({ queryKey: ['lineup', newData.date] });
        },
    });
};
