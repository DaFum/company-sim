import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export const useGameStore = create(subscribeWithSelector((set, get) => ({
  // --- STATE ---
  apiKey: sessionStorage.getItem('openai_api_key') || '',
  aiProvider: sessionStorage.getItem('ai_provider') || 'openai',
  aiModel: sessionStorage.getItem('ai_model') || 'openai',

  cash: 50000,
  day: 1,
  tick: 0,
  gamePhase: 'WORK',    // 'WORK' | 'CRUNCH'
  isPlaying: false,
  isAiThinking: false,
  isMuted: false,

  officeLevel: 1,
  terminalLogs: [],
  pendingDecision: null,

  workers: 1,
  productivity: 10,
  burnRate: 5,

  // --- ACTIONS ---
  setApiKey: (key) => {
    sessionStorage.setItem('openai_api_key', key);
    set({ apiKey: key });
  },

  setAiProvider: (provider) => {
    sessionStorage.setItem('ai_provider', provider);
    set({ aiProvider: provider });
  },

  setAiModel: (model) => {
    sessionStorage.setItem('ai_model', model);
    set({ aiModel: model });
  },

  togglePause: () => set((state) => ({ isPlaying: !state.isPlaying })),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  addTerminalLog: (msg) => set((state) => ({
    terminalLogs: [...state.terminalLogs.slice(-4), msg]
  })),

  clearTerminalLogs: () => set({ terminalLogs: [] }),

  setPendingDecision: (decision) => set({ pendingDecision: decision }),

  vetoDecision: () => {
    const state = get();
    if (!state.pendingDecision) return;

    state.addTerminalLog(`>> VETO! DECISION REJECTED.`);
    state.addTerminalLog(`>> EXECUTING SAFE ACTION.`);

    set({
      pendingDecision: null,
      cash: state.cash - 100
    });
  },

  applyPendingDecision: () => {
    const state = get();
    const decision = state.pendingDecision;

    if (decision) {
        state.addTerminalLog(`>> EXECUTING: ${decision.action}`);
        let updates = { pendingDecision: null };
        if (decision.action === 'SPEND_MONEY') {
            updates.cash = state.cash - (decision.amount || 0);
        } else if (decision.action === 'HIRE') {
            updates.workers = state.workers + Math.floor(decision.amount || 1);
            updates.cash = state.cash - ((decision.amount || 1) * 500);
        } else if (decision.action === 'FIRE') {
            updates.workers = Math.max(0, state.workers - Math.floor(decision.amount || 1));
        }
        set(updates);
    }
  },

  advanceTick: () => {
    const state = get();
    if (!state.isPlaying) return;

    let newTick = state.tick + 1;
    let newPhase = state.gamePhase;

    // Transition to Crunch at Tick 49 (so Tick 50 is Crunch)
    if (state.tick === 49) {
        newPhase = 'CRUNCH';
    }

    if (state.gamePhase === 'WORK') {
        const revenue = state.workers * state.productivity;
        const costs = state.workers * state.burnRate;
        const netChange = revenue - costs;

        if (Math.random() < 0.05) {
            const eventCost = Math.floor(Math.random() * 200) + 50;
            state.addTerminalLog(`> EVENT: Printer Jam. -${eventCost}€`);
            set({ cash: state.cash + netChange - eventCost, tick: newTick });
        } else {
            set({ cash: state.cash + netChange, tick: newTick, gamePhase: newPhase });
        }
    } else {
        // CRUNCH PHASE
        if (newTick > 60) {
            if (state.isAiThinking) return;

            if (state.pendingDecision) {
               state.applyPendingDecision();
            }
            state.startNewDay();
            return;
        }
        set({ tick: newTick, gamePhase: newPhase });
    }
  },

  startNewDay: () => {
      set((state) => {
          let newLevel = 1;
          if (state.workers >= 16) newLevel = 3;
          else if (state.workers >= 5) newLevel = 2;

          return {
            day: state.day + 1,
            tick: 0,
            gamePhase: 'WORK',
            isAiThinking: false,
            terminalLogs: [],
            officeLevel: newLevel,
            isPlaying: true
          };
      });
  },

  hireWorker: () => set((state) => ({
    workers: state.workers + 1,
    cash: state.cash - 500
  })),

  fireWorker: () => set((state) => ({
    workers: Math.max(0, state.workers - 1)
  }))

})));
