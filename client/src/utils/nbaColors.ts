export interface TeamColors {
    primary: string;
    secondary: string;
    accent: string;
}

export const nbaTeamColors: Record<string, TeamColors> = {
    'ATL': { primary: '#E03A3E', secondary: '#C1D32F', accent: '#26282A' },
    'BOS': { primary: '#007A33', secondary: '#BA9653', accent: '#000000' },
    'BKN': { primary: '#000000', secondary: '#FFFFFF', accent: '#707271' },
    'CHA': { primary: '#1D1160', secondary: '#00788C', accent: '#A1A1A4' },
    'CHI': { primary: '#CE1141', secondary: '#000000', accent: '#CE1141' },
    'CLE': { primary: '#860038', secondary: '#FDBB30', accent: '#041E42' },
    'DAL': { primary: '#00538C', secondary: '#002B5E', accent: '#B8C4CA' },
    'DEN': { primary: '#0E2240', secondary: '#FEC524', accent: '#8B2131' },
    'DET': { primary: '#C8102E', secondary: '#1D42BA', accent: '#BEC0C2' },
    'GSW': { primary: '#1D428A', secondary: '#FFC72C', accent: '#1D428A' },
    'HOU': { primary: '#CE1141', secondary: '#000000', accent: '#C4CED4' },
    'IND': { primary: '#002D62', secondary: '#FDBB30', accent: '#BEC0C2' },
    'LAC': { primary: '#C8102E', secondary: '#1D42BA', accent: '#000000' },
    'LAL': { primary: '#552583', secondary: '#FDB927', accent: '#000000' },
    'MEM': { primary: '#5D76A9', secondary: '#12173F', accent: '#F5B112' },
    'MIA': { primary: '#98002E', secondary: '#F9A01B', accent: '#000000' },
    'MIL': { primary: '#00471B', secondary: '#EEE1C6', accent: '#00471B' },
    'MIN': { primary: '#0C2340', secondary: '#236192', accent: '#9EA2A2' },
    'NOP': { primary: '#0C2340', secondary: '#C8102E', accent: '#85714D' },
    'NYK': { primary: '#006BB6', secondary: '#F58426', accent: '#BEC0C2' },
    'OKC': { primary: '#007AC1', secondary: '#EF3B24', accent: '#002D62' },
    'ORL': { primary: '#0077C0', secondary: '#C4CED4', accent: '#000000' },
    'PHI': { primary: '#006BB6', secondary: '#ED174C', accent: '#002B5C' },
    'PHX': { primary: '#1D1160', secondary: '#E56020', accent: '#000000' },
    'POR': { primary: '#E03A3E', secondary: '#000000', accent: '#E03A3E' },
    'SAC': { primary: '#5A2D81', secondary: '#63727A', accent: '#000000' },
    'SAS': { primary: '#C4CED4', secondary: '#000000', accent: '#C4CED4' },
    'TOR': { primary: '#CE1141', secondary: '#000000', accent: '#A1A1A4' },
    'UTA': { primary: '#002B5C', secondary: '#00471B', accent: '#F9A01B' },
    'WAS': { primary: '#002B5C', secondary: '#E31837', accent: '#C4CED4' },
};

export const getTeamColors = (teamNameOrAbbr: string): TeamColors => {
    const defaultColors: TeamColors = { primary: '#0f172a', secondary: '#334155', accent: '#1e293b' };

    if (!teamNameOrAbbr) return defaultColors;

    // Check by abbreviation (case insensitive)
    const abbr = teamNameOrAbbr.toUpperCase();
    if (nbaTeamColors[abbr]) return nbaTeamColors[abbr];

    // Check by name (substring match)
    const team = Object.entries(nbaTeamColors).find(([key]) =>
        abbr.includes(key) || abbr.includes(thisTeamName(key))
    );

    return team ? team[1] : defaultColors;
};

// Helper to map abbreviation to full name if needed, but for now we rely on the object keys
const thisTeamName = (abbr: string): string => {
    const names: Record<string, string> = {
        'ATL': 'Hawks', 'BOS': 'Celtics', 'BKN': 'Nets', 'CHA': 'Hornets', 'CHI': 'Bulls',
        'CLE': 'Cavaliers', 'DAL': 'Mavericks', 'DEN': 'Nuggets', 'DET': 'Pistons', 'GSW': 'Warriors',
        'HOU': 'Rockets', 'IND': 'Pacers', 'LAC': 'Clippers', 'LAL': 'Lakers', 'MEM': 'Grizzlies',
        'MIA': 'Heat', 'MIL': 'Bucks', 'MIN': 'Timberwolves', 'NOP': 'Pelicans', 'NYK': 'Knicks',
        'OKC': 'Thunder', 'ORL': 'Magic', 'PHI': '76ers', 'PHX': 'Suns', 'POR': 'Blazers',
        'SAC': 'Kings', 'SAS': 'Spurs', 'TOR': 'Raptors', 'UTA': 'Jazz', 'WAS': 'Wizards'
    };
    return names[abbr] || abbr;
};
