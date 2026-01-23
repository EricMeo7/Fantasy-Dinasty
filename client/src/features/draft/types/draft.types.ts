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

export interface RookieDraftDto {
    id: number;
    fullName: string;
    position: string;
    nbaTeam: string;
    externalId: number;
    realRank?: number;
}

export interface DraftPlayerDto {
    name: string;
    salary: number;
    position: string;
}

export interface TeamDraftSummaryDto {
    userId: string;
    teamName: string;
    remainingBudget: number;
    rosterCount: number;
    players: DraftPlayerDto[];
}

export interface CurrentPickDto {
    id: number;
    round: number;
    pickNumber: number;
    teamId: number;
    teamName: string;
    teamLogoUrl: string;
    deadline?: string; // ISO Date
}

export interface RookieDraftStateDto {
    leagueId: number;
    isActive: boolean;
    isPaused: boolean;
    currentPick?: CurrentPickDto;
    upcomingPicks: CurrentPickDto[];
    recentHistory: CurrentPickDto[];
    teams: TeamDraftSummaryDto[];
    onlineParticipants: string[];
}
