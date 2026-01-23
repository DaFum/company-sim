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
  activeVisitors: [],   // ['pizza_guy', 'investors']

  // Resources & Metrics
  roster: { dev: 1, sales: 0, support: 0 },
  workers: 1,           // Derived Sum
  productivity: 10,
  burnRate: 50,

  // New Stats (Phase 2B/C)
  mood: 100,
  productLevel: 1,
  serverHealth: 100,    // 0-100 (Health)
  serverStability: 1.0, // 0.1-1.0 (Multiplier)
  marketingMultiplier: 1.0,
  marketingLeft: 0,
  inventory: [],

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

  // EVENTS
  spawnVisitor: (type) => set((state) => ({
      activeVisitors: [...state.activeVisitors, type]
  })),

  despawnVisitor: (type) => set((state) => ({
      activeVisitors: state.activeVisitors.filter(v => v !== type)
  })),

  vetoDecision: () => {
    const state = get();
    if (!state.pendingDecision) return;

    state.addTerminalLog(`>> VETO! REJECTED.`);
    state.addTerminalLog(`>> SAFETY PROTOCOL: PIZZA PARTY.`);

    // Fallback: Pizza Party
    set({
      pendingDecision: null,
      cash: state.cash - 200,
      activeVisitors: [...state.activeVisitors, 'pizza_guy'], // Trigger Pizza Guy
      mood: 100 // Instant boost
    });

    // Auto Despawn Pizza Guy after 10 seconds (handled by scene usually, but store can fallback)
    setTimeout(() => {
        get().despawnVisitor('pizza_guy');
    }, 10000);
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
            const role = (params.role || 'dev').toLowerCase();
            const newRoster = { ...state.roster };

            // Map roles roughly if AI hallucinates
            if (role.includes('sale')) newRoster.sales += count;
            else if (role.includes('support')) newRoster.support += count;
            else newRoster.dev += count;

            updates.roster = newRoster;
            updates.workers = newRoster.dev + newRoster.sales + newRoster.support;
            updates.cash = state.cash - (count * 500);
        }
        else if (action === 'FIRE_WORKER') {
            const count = params.count || 1;
            const role = (params.role || 'dev').toLowerCase();
            const newRoster = { ...state.roster };

            let fired = 0;
            // Try to fire from specific role, fallback to others
            if (role.includes('sale') && newRoster.sales > 0) {
                 const actual = Math.min(newRoster.sales, count);
                 newRoster.sales -= actual; fired = actual;
            } else if (role.includes('support') && newRoster.support > 0) {
                 const actual = Math.min(newRoster.support, count);
                 newRoster.support -= actual; fired = actual;
            } else {
                 const actual = Math.min(newRoster.dev, count);
                 newRoster.dev -= actual; fired = actual;
            }

            updates.roster = newRoster;
            updates.workers = newRoster.dev + newRoster.sales + newRoster.support;
            updates.cash = state.cash - (fired * 200);
            updates.mood = Math.max(0, state.mood - 20);
        }
        else if (action === 'BUY_UPGRADE') {
            const item = params.item_id;
            const cost = 2000;
            if (state.cash >= cost) {
                updates.cash = state.cash - cost;
                updates.inventory = [...state.inventory, item];
                if (item === 'coffee_machine') updates.productivity = state.productivity + 2;
                if (item === 'plants') updates.mood = Math.min(100, state.mood + 15);
                if (item === 'server_rack_v2') {
                    updates.serverStability = 1.0;
                    updates.serverHealth = 100;
                }
            } else {
                state.addTerminalLog(`> ERROR: NO FUNDS FOR ${item}`);
            }
        }
        else if (action === 'MARKETING_PUSH') {
            const cost = 5000;
            if (state.cash >= cost) {
                updates.cash = state.cash - cost;
                updates.marketingMultiplier = 2.0;
                updates.marketingLeft = 60;
            } else {
                 state.addTerminalLog(`> ERROR: NO FUNDS.`);
            }
        }
        else if (action === 'PIVOT') {
            updates.productLevel = state.productLevel + 1;
            updates.cash = state.cash;
            updates.mood = Math.max(0, state.mood - 30);
            updates.marketingMultiplier = 0.5;
            updates.marketingLeft = 120;
            state.addTerminalLog(`> PIVOTING...`);
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
        const moodFactor = state.mood / 100;
        // Derived Worker Count
        const totalWorkers = state.roster.dev + state.roster.sales + state.roster.support;

        const currentRevenue = totalWorkers * state.productivity * state.marketingMultiplier * state.serverStability * (0.5 + moodFactor * 0.5);
        const currentCost = (totalWorkers * state.burnRate) / 60;
        const netChange = currentRevenue - currentCost;

        let newMarketingMult = state.marketingMultiplier;
        let newMarketingLeft = state.marketingLeft;
        if (state.marketingLeft > 0) {
            newMarketingLeft--;
            if (newMarketingLeft <= 0) newMarketingMult = 1.0;
        }

        // Random Events
        if (Math.random() < 0.02) {
            const eventType = Math.random();
            if (eventType < 0.4) {
                state.addTerminalLog(`> ALERT: Server Glitch.`);
                set({ serverStability: Math.max(0.5, state.serverStability - 0.1), serverHealth: Math.max(0, state.serverHealth - 10) });
            } else if (eventType < 0.8) {
                 state.addTerminalLog(`> ALERT: Minor Expense.`);
                 set({ cash: state.cash - 100 });
            } else {
                 // 20% of events: Investors
                 if (!state.activeVisitors.includes('investors')) {
                     state.addTerminalLog(`> ALERT: Investors Incoming.`);
                     set({ activeVisitors: [...state.activeVisitors, 'investors'] });
                     setTimeout(() => get().despawnVisitor('investors'), 15000);
                 }
            }
        }

        set({
            cash: state.cash + netChange,
            tick: newTick,
            gamePhase: newPhase,
            marketingMultiplier: newMarketingMult,
            marketingLeft: newMarketingLeft,
            workers: totalWorkers
        });

    } else {
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
          const totalWorkers = state.roster.dev + state.roster.sales + state.roster.support;
          let newLevel = 1;
          if (totalWorkers >= 16) newLevel = 3;
          else if (totalWorkers >= 5) newLevel = 2;

          return {
            day: state.day + 1,
            tick: 0,
            gamePhase: 'WORK',
            isAiThinking: false,
            terminalLogs: [],
            officeLevel: newLevel,
            isPlaying: true,
            mood: Math.min(100, state.mood + 5)
          };
      });
  },

  // Manual Debug Actions
  hireWorker: () => set((state) => {
      const newRoster = { ...state.roster, dev: state.roster.dev + 1 };
      return {
        roster: newRoster,
        workers: newRoster.dev + newRoster.sales + newRoster.support,
        cash: state.cash - 500
      };
  }),

  fireWorker: () => set((state) => {
      const newRoster = { ...state.roster, dev: Math.max(0, state.roster.dev - 1) };
      return {
        roster: newRoster,
        workers: newRoster.dev + newRoster.sales + newRoster.support,
        mood: Math.max(0, state.mood - 10)
      };
  })

})));
