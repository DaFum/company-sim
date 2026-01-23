import { create } from 'zustand';

export const useGameStore = create((set, get) => ({
  // --- STATE (Die Daten) ---
  apiKey: sessionStorage.getItem('openai_api_key') || '', // Initialisiere aus SessionStorage
  cash: 50000,          // Startkapital
  day: 1,               // Aktueller Tag
  tick: 0,              // Sekunde des aktuellen Tages (0-60)
  isPlaying: false,     // Pause/Play Status
  isAiThinking: false,  // Status für KI-Request

  // Ressourcen
  workers: 1,           // Anzahl Mitarbeiter (Du startest alleine)
  productivity: 10,     // Einnahmen pro Worker pro Tick
  burnRate: 5,          // Kosten pro Worker pro Tick (Strom, Gehalt)

  // --- ACTIONS (Die Methoden um Daten zu ändern) ---

  // 0. API Key Management
  setApiKey: (key) => {
    sessionStorage.setItem('openai_api_key', key);
    set({ apiKey: key });
  },

  // 1. Spielsteuerung
  togglePause: () => set((state) => ({ isPlaying: !state.isPlaying })),

  // 2. Der Herzschlag (Wird 1x pro Sekunde aufgerufen)
  advanceTick: () => {
    const state = get();

    // Wenn KI denkt, Zeit anhalten (Sicherheitsnetz)
    if (state.isAiThinking) return;

    // Berechne Finanzen für diese Sekunde
    const revenue = state.workers * state.productivity;
    const costs = state.workers * state.burnRate;
    const netChange = revenue - costs;

    // Zeitberechnung
    let newTick = state.tick + 1;

    // Tageswechsel Trigger (Nach 60 Ticks)
    if (newTick >= 60) {
      // STOP! Hier übernimmt Phase 3:
      // Wir setzen den Tick NICHT zurück, sondern triggern den "Freeze"
      console.log("--- TAG ZU ENDE: Freeze für KI ---");
      set({
        cash: state.cash + netChange,
        tick: 60, // Visuell voll
        isPlaying: false,
        isAiThinking: true // Signal für den AI-Hook
      });
      return;
    }

    set({
      cash: state.cash + netChange,
      tick: newTick
      // day: newDay // Tag wird jetzt durch KI-Callback erhöht
    });
  },

  // 2b. Callback nach KI-Entscheidung (Neuer Tag Start)
  startNewDay: () => set((state) => ({
    day: state.day + 1,
    tick: 0,
    isAiThinking: false,
    isPlaying: true // Optional: Automatisch weiter oder warten? Hier: weiter.
  })),

  // 3. Manuelle/KI Aktionen
  hireWorker: () => set((state) => ({
    workers: state.workers + 1,
    cash: state.cash - 500
  })),

  fireWorker: () => set((state) => ({
    workers: Math.max(0, state.workers - 1)
  })),

  // Generische Aktion für KI-Entscheidungen
  applyDecision: (actionType, amount) => {
      const state = get();
      let updates = {};

      if (actionType === 'SPEND_MONEY') {
          updates.cash = state.cash - amount;
      } else if (actionType === 'HIRE') { // Beispiel für Erweiterung
          updates.workers = state.workers + Math.floor(amount);
          updates.cash = state.cash - (amount * 500); // Kosten pro Hire
      }

      set(updates);
  }
}));
