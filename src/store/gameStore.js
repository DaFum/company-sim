import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export const useGameStore = create(subscribeWithSelector((set, get) => ({
  // --- STATE ---
  apiKey: sessionStorage.getItem('openai_api_key') || '',
  aiProvider: sessionStorage.getItem('ai_provider') || 'openai',
  aiModel: sessionStorage.getItem('ai_model') || 'openai',

  // Game Loop State
  cash: 50000,
  day: 1,
  tick: 0,
  gamePhase: 'WORK',    // 'WORK' | 'CRUNCH'
  isPlaying: false,
  isAiThinking: false,
  isMuted: false,

  // Visual & Logic State
  officeLevel: 1,
  terminalLogs: [],
  pendingDecision: null,

  // Resources & Metrics
  workers: 1,
  productivity: 10,
  burnRate: 50,         // Base Daily Cost per Worker

  // New Stats (Phase 2B)
  mood: 100,            // 0-100
  productLevel: 1,      // Affects max revenue
  serverStability: 1.0, // Multiplier (0.1 - 1.0)
  marketingMultiplier: 1.0, // Temporary Revenue Boost
  marketingLeft: 0,     // Ticks remaining for marketing
  inventory: [],        // ['coffee_machine', 'server_rack_v2']

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
    state.addTerminalLog(`>> EXECUTING SAFE ACTION (Pizza Party).`);

    // Fallback: Safe Action
    set({
      pendingDecision: null,
      cash: state.cash - 200,
      mood: Math.min(100, state.mood + 10)
    });
  },

  applyPendingDecision: () => {
    const state = get();
    const decision = state.pendingDecision;

    if (decision) {
        state.addTerminalLog(`>> EXECUTING: ${decision.action}`);
        let updates = { pendingDecision: null };
        const action = decision.action;
        const params = decision.parameters || {};

        if (action === 'HIRE_WORKER') {
            const count = params.count || 1;
            updates.workers = state.workers + count;
            updates.cash = state.cash - (count * 500); // Recruiting Fee
            // Note: Burn rate is calculated dynamically based on workers
        }
        else if (action === 'FIRE_WORKER') {
            const count = params.count || 1;
            updates.workers = Math.max(0, state.workers - count);
            updates.cash = state.cash - (count * 200); // Severance
            updates.mood = Math.max(0, state.mood - 20); // Morale Hit
        }
        else if (action === 'BUY_UPGRADE') {
            const item = params.item_id;
            const cost = 2000; // Simplified flat cost for now
            if (state.cash >= cost) {
                updates.cash = state.cash - cost;
                updates.inventory = [...state.inventory, item];

                // Apply Buffs
                if (item === 'coffee_machine') updates.productivity = state.productivity + 2;
                if (item === 'plants') updates.mood = Math.min(100, state.mood + 15);
                if (item === 'server_rack_v2') updates.serverStability = 1.0; // Reset stability
            } else {
                state.addTerminalLog(`> ERROR: INSUFFICIENT FUNDS FOR ${item}`);
            }
        }
        else if (action === 'MARKETING_PUSH') {
            const cost = 5000;
            if (state.cash >= cost) {
                updates.cash = state.cash - cost;
                updates.marketingMultiplier = 2.0; // 2x Revenue
                updates.marketingLeft = 60; // Lasts 1 Day (60 ticks)
            } else {
                 state.addTerminalLog(`> ERROR: TOO POOR FOR MARKETING`);
            }
        }
        else if (action === 'PIVOT') {
            updates.productLevel = state.productLevel + 1;
            updates.cash = state.cash; // Keep cash
            updates.workers = state.workers;
            updates.mood = Math.max(0, state.mood - 30); // Stressful
            updates.marketingMultiplier = 0.5; // Revenue dip
            updates.marketingLeft = 120; // Lasts 2 Days
            state.addTerminalLog(`> PIVOTING TO NEW SECTOR...`);
        }

        set(updates);
    }
  },

  advanceTick: () => {
    const state = get();
    if (!state.isPlaying) return;

    let newTick = state.tick + 1;
    let newPhase = state.gamePhase;

    if (state.tick === 49) {
        newPhase = 'CRUNCH';
    }

    if (state.gamePhase === 'WORK') {
        // --- ECONOMIC LOGIC (Per Tick) ---
        // Revenue = Workers * Productivity * Marketing * Server * MoodFactor
        const moodFactor = state.mood / 100; // 0.5 to 1.0
        const currentRevenue = state.workers * state.productivity * state.marketingMultiplier * state.serverStability * (0.5 + moodFactor * 0.5);

        // Costs = Workers * (BurnRate / 60) (Daily burn spread over ticks? Or just subtract daily at end?)
        // Spec says: "Burn-Rate: Erhöht die fixen Kosten pro Tag".
        // Let's deduct 1/60th of daily burn per tick for smooth graph.
        const currentCost = (state.workers * state.burnRate) / 60;

        const netChange = currentRevenue - currentCost;

        // Decay Marketing
        let newMarketingMult = state.marketingMultiplier;
        let newMarketingLeft = state.marketingLeft;
        if (state.marketingLeft > 0) {
            newMarketingLeft--;
            if (newMarketingLeft <= 0) newMarketingMult = 1.0;
        }

        // Random Events
        if (Math.random() < 0.02) { // 2% Chance
            const eventType = Math.random();
            if (eventType < 0.5) {
                state.addTerminalLog(`> ALERT: Server Glitch.`);
                set({ serverStability: Math.max(0.5, state.serverStability - 0.1) });
            } else {
                 state.addTerminalLog(`> ALERT: Minor Expense.`);
                 set({ cash: state.cash - 100 });
            }
        }

        set({
            cash: state.cash + netChange,
            tick: newTick,
            gamePhase: newPhase,
            marketingMultiplier: newMarketingMult,
            marketingLeft: newMarketingLeft
        });

    } else {
        // --- CRUNCH PHASE (50-60) ---
        if (newTick > 60) {
            if (state.isAiThinking) return;
            if (state.pendingDecision) state.applyPendingDecision();
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
            isPlaying: true,
            // Daily Mood Regen
            mood: Math.min(100, state.mood + 5)
          };
      });
  },

  // Manual Debug Actions
  hireWorker: () => set((state) => ({
    workers: state.workers + 1,
    cash: state.cash - 500
  })),

  fireWorker: () => set((state) => ({
    workers: Math.max(0, state.workers - 1),
    mood: Math.max(0, state.mood - 10)
  }))

})));
