import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export const useGameStore = create(subscribeWithSelector((set, get) => ({
  // --- STATE ---
  apiKey: sessionStorage.getItem('openai_api_key') || '',
  aiProvider: sessionStorage.getItem('ai_provider') || 'openai',
  aiModel: sessionStorage.getItem('ai_model') || 'openai',

  // Game Loop
  cash: 50000,
  day: 1,
  tick: 0,
  gamePhase: 'WORK',
  isPlaying: false,
  isAiThinking: false,
  isMuted: false,

  // Visual & Logic
  officeLevel: 1,
  terminalLogs: [],
  pendingDecision: null,
  activeVisitors: [],

  // Resources
  roster: { dev: 1, sales: 0, support: 0 },
  workers: 1,
  productivity: 10,
  burnRate: 50,

  // Metrics
  mood: 100,
  productLevel: 1,
  serverHealth: 100,
  serverStability: 1.0,
  marketingMultiplier: 1.0,
  marketingLeft: 0,
  inventory: [],

  // CHAOS ENGINE
  activeEvents: [], // [{ type: 'TECH_OUTAGE', timeLeft: 30, severity: 'HIGH' }]
  eventHistory: [], // Log of yesterday's chaos for AI
  lastEventDay: 0,  // Cooldown tracker

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

  spawnVisitor: (type) => set((state) => ({
      activeVisitors: [...state.activeVisitors, type]
  })),

  despawnVisitor: (type) => set((state) => ({
      activeVisitors: state.activeVisitors.filter(v => v !== type)
  })),

  // CHAOS ACTIONS
  triggerEvent: (type) => {
      const state = get();
      let duration = 30; // Default 30 ticks
      let msg = `> CRITICAL ALERT: ${type}`;

      // Define Event Specs
      if (type === 'TECH_OUTAGE') {
          duration = 20;
          msg = "> ALERT: CLOUD SERVICES OFFLINE.";
      } else if (type === 'RANSOMWARE') {
          duration = 60; // Full day annoyance
          msg = "> ALERT: RANSOMWARE DETECTED. ASSETS FROZEN.";
          // Instant Penalty
          set({ cash: state.cash * 0.8 }); // Lose 20%
      } else if (type === 'HUMAN_QUIT') {
          duration = 5;
          msg = "> ALERT: KEY DEVELOPER RESIGNED.";
          // Instant Penalty
          const newRoster = { ...state.roster, dev: Math.max(0, state.roster.dev - 1) };
          set({
              roster: newRoster,
              workers: newRoster.dev + newRoster.sales + newRoster.support,
              mood: Math.max(0, state.mood - 10)
          });
      } else if (type === 'HUMAN_SICK') {
          duration = 120; // 2 Days
          msg = "> ALERT: FLU WAVE DETECTED.";
      } else if (type === 'MARKET_SHITSTORM') {
          duration = 60;
          msg = "> ALERT: SOCIAL MEDIA SHITSTORM.";
      } else if (type === 'COMPETITOR_CLONE') {
          duration = 999; // Permanent until counter-action? Or just difficulty spike
          msg = "> NEWS: COMPETITOR CLONED OUR TECH.";
      }

      state.addTerminalLog(msg);

      const eventObj = { type, timeLeft: duration, severity: 'HIGH', description: msg };

      set({
          activeEvents: [...state.activeEvents, eventObj],
          lastEventDay: state.day
      });
  },

  resolveEvent: (type) => set((state) => ({
      activeEvents: state.activeEvents.filter(e => e.type !== type)
  })),

  vetoDecision: () => {
    const state = get();
    if (!state.pendingDecision) return;

    state.addTerminalLog(`>> VETO! REJECTED.`);
    state.addTerminalLog(`>> SAFETY PROTOCOL: PIZZA PARTY.`);

    set({
      pendingDecision: null,
      cash: state.cash - 200,
      activeVisitors: [...state.activeVisitors, 'pizza_guy'],
      mood: 100
    });

    setTimeout(() => get().despawnVisitor('pizza_guy'), 10000);
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
                // Counter Ransomware (Firewall logic could be added here)
                if (item === 'firewall') {
                    get().resolveEvent('RANSOMWARE');
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
                // Counter Shitstorm
                get().resolveEvent('MARKET_SHITSTORM');
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
        // 1. Process Active Events
        const activeEvents = state.activeEvents.map(e => ({ ...e, timeLeft: e.timeLeft - 1 })).filter(e => e.timeLeft > 0);

        // Check for Effects
        const isTechOutage = activeEvents.some(e => e.type === 'TECH_OUTAGE');
        const isSick = activeEvents.some(e => e.type === 'HUMAN_SICK');
        const isShitstorm = activeEvents.some(e => e.type === 'MARKET_SHITSTORM');

        // 2. Logic Director (Chaos Engine)
        if (state.day > 5 && state.cash > 2000 && state.lastEventDay !== state.day && Math.random() < 0.01) {
             // 1% Chance per tick if conditions met
             const roll = Math.random();
             if (roll < 0.2) get().triggerEvent('TECH_OUTAGE');
             else if (roll < 0.4 && state.mood < 40) get().triggerEvent('HUMAN_QUIT');
             else if (roll < 0.6) get().triggerEvent('HUMAN_SICK');
             else if (roll < 0.8) get().triggerEvent('MARKET_SHITSTORM');
             else get().triggerEvent('RANSOMWARE');
        }

        // 3. Economic Calc
        const moodFactor = state.mood / 100;
        const totalWorkers = state.roster.dev + state.roster.sales + state.roster.support;

        // Multipliers
        let finalProd = state.productivity;
        if (isTechOutage) finalProd = 0;
        if (isSick) finalProd *= 0.7; // 30% sick

        let finalMarket = state.marketingMultiplier;
        if (isShitstorm) finalMarket *= 0.5;

        const currentRevenue = totalWorkers * finalProd * finalMarket * state.serverStability * (0.5 + moodFactor * 0.5);
        const currentCost = (totalWorkers * state.burnRate) / 60;
        const netChange = currentRevenue - currentCost;

        // Marketing Decay
        let newMarketingMult = state.marketingMultiplier;
        let newMarketingLeft = state.marketingLeft;
        if (state.marketingLeft > 0) {
            newMarketingLeft--;
            if (newMarketingLeft <= 0) newMarketingMult = 1.0;
        }

        // Micro Events (Legacy)
        if (Math.random() < 0.01) {
            state.addTerminalLog(`> LOG: System Routine Check.`);
        }

        set({
            cash: state.cash + netChange,
            tick: newTick,
            gamePhase: newPhase,
            marketingMultiplier: newMarketingMult,
            marketingLeft: newMarketingLeft,
            activeEvents: activeEvents
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

          // Archive Events for History
          const history = state.activeEvents.map(e => ({ type: e.type, description: e.description }));

          return {
            day: state.day + 1,
            tick: 0,
            gamePhase: 'WORK',
            isAiThinking: false,
            terminalLogs: [],
            officeLevel: newLevel,
            isPlaying: true,
            mood: Math.min(100, state.mood + 5),
            eventHistory: history // Pass to AI context
          };
      });
  },

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
