export interface DraftAsset {
    id: number;
    season: number;
    round: number;
    slotNumber: number | null;
    originalOwnerTeamId: number;
    originalOwnerTeamName: string;
    currentOwnerTeamId: number;
    currentOwnerTeamName: string;
    isOwn: boolean;
    playerId: number | null;
    playerName: string | null;
    leagueId: number;
}

export interface DraftBoardSlot {
    id: number;
    season: number;
    round: number;
    slotNumber: number | null;
    originalOwnerTeamId: number;
    originalOwnerTeamName: string;
    currentOwnerTeamId: number;
    currentOwnerTeamName: string;
    isTradedPick: boolean;
    isRevealed?: boolean;
    playerId: number | null;
    playerName: string | null;
}

export interface LotteryResult {
    pickId: number;
    slotNumber: number;
    originalOwnerTeamName: string;
    currentOwnerTeamName: string;
    round: number;
}

export interface AssignPickRequest {
    pickId: number;
    playerId: number;
}

export interface AssignPickResult {
    success: boolean;
    message: string;
    contractId: number | null;
    rookieSalary: number | null;
}
