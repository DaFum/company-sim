import { create } from 'zustand';

export const useGameStore = create((set, get) => ({
  // --- STATE (Die Daten) ---
  cash: 50000,          // Startkapital
  day: 1,               // Aktueller Tag
  tick: 0,              // Sekunde des aktuellen Tages (0-60)
  isPlaying: false,     // Pause/Play Status

  // Ressourcen
  workers: 1,           // Anzahl Mitarbeiter (Du startest alleine)
  productivity: 10,     // Einnahmen pro Worker pro Tick
  burnRate: 5,          // Kosten pro Worker pro Tick (Strom, Gehalt)

  // --- ACTIONS (Die Methoden um Daten zu ändern) ---

  // 1. Spielsteuerung
  togglePause: () => set((state) => ({ isPlaying: !state.isPlaying })),

  // 2. Der Herzschlag (Wird 1x pro Sekunde aufgerufen)
  advanceTick: () => {
    const state = get();

    // Berechne Finanzen für diese Sekunde
    const revenue = state.workers * state.productivity;
    const costs = state.workers * state.burnRate; // + Fixkosten (Miete) später
    const netChange = revenue - costs;

    // Zeitberechnung
    let newTick = state.tick + 1;
    let newDay = state.day;

    // Tageswechsel (Nach 60 Ticks)
    if (newTick >= 60) {
      newTick = 0;
      newDay += 1;
      // Hier später: Trigger für KI-Entscheidung
      console.log("--- NEUER TAG: KI wird geweckt ---");
    }

    set({
      cash: state.cash + netChange,
      tick: newTick,
      day: newDay
    });
  },

  // 3. Manuelle Debug-Aktionen (Später macht das die KI)
  hireWorker: () => set((state) => ({
    workers: state.workers + 1,
    cash: state.cash - 500 // Einstellunggebühr
  })),

  fireWorker: () => set((state) => ({
    workers: Math.max(0, state.workers - 1)
  })),
}));
