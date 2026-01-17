export interface PositionLimits {
    guards: number;
    forwards: number;
    centers: number;
}

export interface PlayerInput {
    id: string | number;
    position: string; // "G", "F", "C", "G-F", "F-C"
}

export const RosterValidator = {
    canAddPlayer: (roster: PlayerInput[], newPlayer: PlayerInput, limits: PositionLimits): { valid: boolean; reason?: string } => {
        // Create full list
        const allPlayers = [...roster, newPlayer];

        // Solve: Can we assign every player to a valid bucket (G, F, C, or Bench) satisfying limits?
        // Method: Backtracking

        // 1. Sort/Group pure positions for quick checks (optional, but good for reporting)
        const pureG = allPlayers.filter(p => p.position === 'G');
        const pureF = allPlayers.filter(p => p.position === 'F');
        const pureC = allPlayers.filter(p => p.position === 'C');
        // Flexible positions are handled in backtracking

        // Quick Fail: Pure counts > Limits
        if (pureG.length > limits.guards) return { valid: false, reason: `Too many Guards (${pureG.length} > ${limits.guards})` };
        if (pureF.length > limits.forwards) return { valid: false, reason: `Too many Forwards (${pureF.length} > ${limits.forwards})` };
        if (pureC.length > limits.centers) return { valid: false, reason: `Too many Centers (${pureC.length} > ${limits.centers})` };

        // Total Capacity Check
        const totalSlots = limits.guards + limits.forwards + limits.centers;
        if (allPlayers.length > totalSlots) return { valid: false, reason: `Roster Full (${allPlayers.length} > ${totalSlots})` };

        // Remaining capacities
        // Note: We don't subtract pure counts here because we want the backtracking 
        // to decide if a pure G goes to G-slot or Bench-slot (optimization).
        // Passing ALL players to backtracking is safer.
        // To optimize, we CAN pre-fill pure slots, but let's keep it simple and correct first.

        if (checkAssignment(allPlayers, limits.guards, limits.forwards, limits.centers)) {
            return { valid: true };
        }

        return { valid: false, reason: "Cannot fit players into Role Limits + Bench." };
    }
};

function checkAssignment(players: PlayerInput[], capsG: number, capsF: number, capsC: number): boolean {
    if (players.length === 0) return true;

    const [current, ...rest] = players;
    const pos = current.position;

    // Try Assign G
    if ((pos.includes('G') || pos === 'G') && capsG > 0) {
        if (checkAssignment(rest, capsG - 1, capsF, capsC)) return true;
    }

    // Try Assign F
    if ((pos.includes('F') || pos === 'F') && capsF > 0) {
        if (checkAssignment(rest, capsG, capsF - 1, capsC)) return true;
    }

    // Try Assign C
    if ((pos.includes('C') || pos === 'C') && capsC > 0) {
        if (checkAssignment(rest, capsG, capsF, capsC - 1)) return true;
    }

    return false;
}
