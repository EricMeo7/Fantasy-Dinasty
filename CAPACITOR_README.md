# Guida Installazione e Utilizzo App Mobile (Capacitor)

Ho configurato il tuo progetto React + Vite per diventare un'app Android (e iOS) nativa usando Capacitor. Ecco i dettagli delle modifiche e come procedere per lo sviluppo.

## 1. Modifiche Effettuate

### Backend (.NET API) - `Program.cs`
Ho aggiornato la policy CORS per accettare chiamate dall'app mobile.
- Aggiunti origini: `capacitor://localhost` (iOS), `http://localhost` (Android).
- **IMPORTANTE**: Quando testi su dispositivo fisico, l'app girerà sul telefono ma il backend è sul tuo PC. Il telefono non può vedere `localhost` del PC.
    - **Soluzione**: Devi esporre l'API sul tuo IP locale (es. `192.168.1.X`).
    - Nelle impostazioni di `axios` o `fetch` nel client, l'URL del backend non deve essere `localhost`, ma l'IP del tuo PC (o un tunnel come Ngrok).

### Frontend (React Client)
1. **Pacchetti Installati**: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`, `@capacitor/app`, `@capacitor/status-bar`.
2. **Inizializzazione**: Eseguito `npx cap init`. `webDir` impostato su `dist`.
3. **`index.html`**: Aggiornato meta viewport per impedire lo zoom e gestire il "notch".
4. **`index.css`**: Aggiunte regole CSS per disabilitare la selezione del testo, rimuovere il tap highlight e gestire le Safe Area (`safe-area-inset-*`).
5. **`App.tsx`**: Aggiunta logica per:
    - **Tasto Indietro (Android)**: Naviga indietro nella history di React Router invece di chiudere l'app (chiude solo se sei nella Dashboard/Login).
    - **Status Bar**: Impostata scura e colorata per matchare il tema.

## 2. Flusso di Lavoro (Build e Sync)

Ogni volta che fai modifiche al codice React e vuoi vederle su emulatore/dispositivo:

1.  **Build React**: Compila il progetto web.
    ```bash
    npm run build
    ```
    *(Questo crea la cartella `dist` aggiornata)*

2.  **Sync Capacitor**: Copia i file da `dist` al progetto nativo Android/iOS.
    ```bash
    npx cap sync
    ```

3.  **Apri IDE Nativo**:
    ```bash
    npx cap open android
    ```
    *(Apre Android Studio. Da lì premi "Run" ▶️ per lanciare su Emulatore o Telefono collegato USB).*

## 3. Gestione CORS e IP (Dettagli)
Se usi Android Emulator, puoi connetterti a `http://10.0.2.2:5000` per raggiungere il localhost del PC.
Se usi un dispositivo fisico, devi usare l'IP del PC (es. `http://192.168.1.50:5000`).
Assicurati che il firewall di Windows permetta connessioni in entrata sulla porta del backend.

## 4. Note su iOS
Il progetto iOS è configurato ma per compilarlo (build) serve un Mac con Xcode. Se hai un Mac:
1. Copia il progetto.
2. `npm install`
3. `npx cap add ios`
4. `npx cap sync`
5. `npx cap open ios`
