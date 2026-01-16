import os
import re

# Complete mapping from Italian messages to error codes
mappings = {
    r'"Team non trovato"': 'ErrorCodes.TEAM_NOT_FOUND',
    r'"Team non trovato\."': 'ErrorCodes.TEAM_NOT_FOUND',
    r'"Scambio non trovato\."': 'ErrorCodes.TRADE_NOT_FOUND',
    r'"Lo scambio non è più in sospeso\."': 'ErrorCodes.TRADE_NOT_PENDING',
    r'"Non autorizzato\."': 'ErrorCodes.NOT_AUTHORIZED',
    r'"Scambio non valido\."': 'ErrorCodes.TRADE_INVALID',
    r'"Hai già accettato\."': 'ErrorCodes.ALREADY_ACCEPTED',
    r'"Il proponente non può accettare la propria offerta \(è implicitamente accettata\)\."': 'ErrorCodes.PROPOSER_CANNOT_ACCEPT',
    r'"Non sei in questa lega\."': 'ErrorCodes.NOT_IN_LEAGUE',
    r'"Giocatore non trovato nel tuo roster\."': 'ErrorCodes.PLAYER_NOT_IN_ROSTER',
    r'"Codice lega non valido\."': 'ErrorCodes.INVALID_LEAGUE_CODE',
    r'"Sei già iscritto a questa lega\."': 'ErrorCodes.ALREADY_IN_LEAGUE',
    r'"Partita non trovata\."': 'ErrorCodes.MATCH_NOT_FOUND',
    r'"Nessun match imminente trovato\."': 'ErrorCodes.NO_UPCOMING_MATCH',
    r'"Squadre non trovate\."': 'ErrorCodes.TEAMS_NOT_FOUND',
    r'"Lega non trovata\."': 'ErrorCodes.LEAGUE_NOT_FOUND',
    r'"Giocatore già preso in questa lega\."': 'ErrorCodes.PLAYER_ALREADY_TAKEN',
    r'"Offerta non valida\. Devi superare il valore annuo o allungare la durata\."': 'ErrorCodes.INVALID_BID',
    r'"Accesso negato\."': 'ErrorCodes.ACCESS_DENIED',
    r'"Giocatore non trovato"': 'ErrorCodes.PLAYER_NOT_FOUND',
    r'"Non hai una squadra in questa lega\."': 'ErrorCodes.NO_TEAM_IN_LEAGUE',
    r'"Team di destinazione non trovato\."': 'ErrorCodes.TARGET_TEAM_NOT_FOUND',
    r'"Accesso negato\. Solo il commissioner può cambiare lo stato\."': 'ErrorCodes.ACCESS_ADMIN_ONLY',
    # Special patterns
    r'\$"Offerta troppo bassa\. Il giocatore ha una base d\'asta di \{basePrice\}M\."': 'ErrorCodes.BID_TOO_LOW',
    r'\$"Cap insufficiente\. Hai \{availableSpace:F1\}M, servono \{firstYearCost:F1\}M\."': 'ErrorCodes.INSUFFICIENT_CAP',
    r'\$"Scambio fallito: \{ex\.Message\}"': 'ErrorCodes.TRADE_FAILED',
    r'\$"Giocatore assegnato con successo a \{targetTeam\.Name\}!"': '"Player successfully assigned"',
}

def replace_errors_in_file(filepath):
    """Replace Italian error messages with error codes in a single file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Apply all mappings
        for pattern, replacement in mappings.items():
            content = re.sub(pattern, replacement, content)
        
        # Only write if changes were made
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    """Process all Handler.cs files recursively."""
    base_path = r"."
    updated_count = 0
    updated_files = []
    
    for root, dirs, files in os.walk(base_path):
        for file in files:
            if file.endswith('Handler.cs'):
                filepath = os.path.join(root, file)
                if replace_errors_in_file(filepath):
                    rel_path = os.path.relpath(filepath, base_path)
                    print(f"✓ Updated: {rel_path}")
                    updated_files.append(rel_path)
                    updated_count += 1
    
    print(f"\n✅ Total files updated: {updated_count}")
    if updated_files:
        print("\nUpdated files:")
        for f in updated_files:
            print(f"  - {f}")

if __name__ == "__main__":
    main()
