import { create } from 'zustand';

export const useGameStore = create((set, get) => ({
  // --- STATE (Die Daten) ---
  apiKey: sessionStorage.getItem('openai_api_key') || '',
  aiProvider: sessionStorage.getItem('ai_provider') || 'openai', // 'openai' | 'pollinations'
  cash: 50000,          // Startkapital
  day: 1,               // Aktueller Tag
  tick: 0,              // Sekunde des aktuellen Tages (0-60)
  isPlaying: false,     // Pause/Play Status
  isAiThinking: false,  // Status für KI-Request

  // Ressourcen
  workers: 1,           // Anzahl Mitarbeiter
  productivity: 10,
  burnRate: 5,

  // --- ACTIONS (Die Methoden um Daten zu ändern) ---

  // 0. API Key & Provider Management
  setApiKey: (key) => {
    sessionStorage.setItem('openai_api_key', key);
    set({ apiKey: key });
  },

  setAiProvider: (provider) => {
    sessionStorage.setItem('ai_provider', provider);
    set({ aiProvider: provider });
  },

  // 1. Spielsteuerung
  togglePause: () => set((state) => ({ isPlaying: !state.isPlaying })),

  // 2. Der Herzschlag
  advanceTick: () => {
    const state = get();

    if (state.isAiThinking) return;

    const revenue = state.workers * state.productivity;
    const costs = state.workers * state.burnRate;
    const netChange = revenue - costs;

    let newTick = state.tick + 1;

    // Tageswechsel Trigger
    if (newTick >= 60) {
      console.log("--- TAG ZU ENDE: Freeze für KI ---");
      set({
        cash: state.cash + netChange,
        tick: 60,
        isPlaying: false,
        isAiThinking: true
      });
      return;
    }

    set({
      cash: state.cash + netChange,
      tick: newTick
    });
  },

  // 2b. Callback nach KI-Entscheidung
  startNewDay: () => set((state) => ({
    day: state.day + 1,
    tick: 0,
    isAiThinking: false,
    isPlaying: true
  })),

  // 3. Manuelle Aktionen
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
      } else if (actionType === 'HIRE') {
          updates.workers = state.workers + Math.floor(amount);
          updates.cash = state.cash - (amount * 500);
      }

      set(updates);
  }
}));
