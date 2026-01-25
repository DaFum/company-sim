import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Helpers
const PERSONAS = ['Visionary', 'Accountant', 'Benevolent'];
const getRandomPersona = () => PERSONAS[Math.floor(Math.random() * PERSONAS.length)];

export const useGameStore = create(
  subscribeWithSelector((set, get) => ({
    // --- STATE ---
    apiKey: sessionStorage.getItem('openai_api_key') || '',
    aiProvider: sessionStorage.getItem('ai_provider') || 'openai',
    aiModel: sessionStorage.getItem('ai_model') || 'openai',

    // Game Loop
    cash: 50000,
    startOfDayCash: 50000,
    day: 1,
    tick: 0,
    gamePhase: 'WORK',
    isPlaying: false,
    isAiThinking: false,
    isMuted: false,
    gameSpeed: 1000,

    // Visual & Logic
    officeLevel: 1,
    terminalLogs: [],
    pendingDecision: null,
    activeVisitors: [],
    ceoPersona: getRandomPersona(),

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

    // NEW: Technical Debt
    technicalDebt: 0,

    // CHAOS ENGINE
    activeEvents: [],
    eventHistory: [],
    lastEventDay: 0,

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
    toggleSpeed: () => set((state) => ({ gameSpeed: state.gameSpeed === 1000 ? 500 : 1000 })),

    addTerminalLog: (msg) =>
      set((state) => ({
        terminalLogs: [...state.terminalLogs.slice(-50), msg],
      })),

    clearTerminalLogs: () => set({ terminalLogs: [] }),

    setPendingDecision: (decision) => set({ pendingDecision: decision }),

    spawnVisitor: (type) =>
      set((state) => ({
        activeVisitors: [...state.activeVisitors, type],
      })),

    despawnVisitor: (type) =>
      set((state) => ({
        activeVisitors: state.activeVisitors.filter((v) => v !== type),
      })),

    triggerEvent: (type) => {
      const state = get();
      let duration = 30;
      let msg = `> CRITICAL ALERT: ${type}`;

      if (type === 'TECH_OUTAGE') {
        duration = 20;
        msg = '> ALERT: CLOUD SERVICES OFFLINE.';
      } else if (type === 'RANSOMWARE') {
        duration = 60;
        msg = '> ALERT: RANSOMWARE DETECTED. ASSETS FROZEN.';
        const penalty = state.cash * 0.2;
        const eventObj = { type, timeLeft: duration, severity: 'HIGH', description: msg };
        set({
          cash: state.cash - penalty,
          activeEvents: [...state.activeEvents, eventObj],
          lastEventDay: state.day,
        });
        state.addTerminalLog(msg);
        return;
      } else if (type === 'HUMAN_QUIT') {
        duration = 5;
        msg = '> ALERT: KEY DEVELOPER RESIGNED.';
        const newRoster = { ...state.roster, dev: Math.max(0, state.roster.dev - 1) };
        set({
          roster: newRoster,
          workers: newRoster.dev + newRoster.sales + newRoster.support,
          mood: Math.max(0, state.mood - 10),
        });
      } else if (type === 'HUMAN_SICK') {
        duration = 120;
        msg = '> ALERT: FLU WAVE DETECTED.';
      } else if (type === 'MARKET_SHITSTORM') {
        duration = 60;
        msg = '> ALERT: SOCIAL MEDIA SHITSTORM.';
      } else if (type === 'COMPETITOR_CLONE') {
        duration = 999;
        msg = '> NEWS: COMPETITOR CLONED OUR TECH.';
      }

      state.addTerminalLog(msg);

      const eventObj = { type, timeLeft: duration, severity: 'HIGH', description: msg };

      set({
        activeEvents: [...state.activeEvents, eventObj],
        lastEventDay: state.day,
      });
    },

    resolveEvent: (type) =>
      set((state) => ({
        activeEvents: state.activeEvents.filter((e) => e.type !== type),
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
        mood: 100,
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
          const cost = count * 500;

          if (state.cash >= cost) {
            const role = (params.role || 'dev').toLowerCase();
            const newRoster = { ...state.roster };

            if (role.includes('sale')) newRoster.sales += count;
            else if (role.includes('support')) newRoster.support += count;
            else newRoster.dev += count;

            updates.roster = newRoster;
            updates.workers = newRoster.dev + newRoster.sales + newRoster.support;
            updates.cash = state.cash - cost;
          } else {
            state.addTerminalLog(`> ERROR: INSUFFICIENT FUNDS TO HIRE.`);
          }
        } else if (action === 'FIRE_WORKER') {
          const count = params.count || 1;
          const cost = count * 200;

          if (state.cash >= cost) {
            const role = (params.role || 'dev').toLowerCase();
            const newRoster = { ...state.roster };

            let fired = 0;
            if (role.includes('sale') && newRoster.sales > 0) {
              const actual = Math.min(newRoster.sales, count);
              newRoster.sales -= actual;
              fired = actual;
            } else if (role.includes('support') && newRoster.support > 0) {
              const actual = Math.min(newRoster.support, count);
              newRoster.support -= actual;
              fired = actual;
            } else {
              const actual = Math.min(newRoster.dev, count);
              newRoster.dev -= actual;
              fired = actual;
            }

            updates.roster = newRoster;
            updates.workers = newRoster.dev + newRoster.sales + newRoster.support;
            updates.cash = state.cash - fired * 200;
            updates.mood = Math.max(0, state.mood - 20);
          } else {
            state.addTerminalLog(`> ERROR: CANNOT AFFORD SEVERANCE.`);
          }
        } else if (action === 'BUY_UPGRADE') {
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
            if (item === 'firewall') {
              get().resolveEvent('RANSOMWARE');
            }
          } else {
            state.addTerminalLog(`> ERROR: NO FUNDS FOR ${item}`);
          }
        } else if (action === 'MARKETING_PUSH') {
          const cost = 5000;
          if (state.cash >= cost) {
            updates.cash = state.cash - cost;
            updates.marketingMultiplier = 2.0;
            updates.marketingLeft = 60;
            get().resolveEvent('MARKET_SHITSTORM');
          } else {
            state.addTerminalLog(`> ERROR: NO FUNDS.`);
          }
        } else if (action === 'PIVOT') {
          updates.productLevel = state.productLevel + 1;
          updates.cash = state.cash;
          updates.mood = Math.max(0, state.mood - 30);
          updates.marketingMultiplier = 0.5;
          updates.marketingLeft = 120;
          state.addTerminalLog(`> PIVOTING...`);
        } else if (action === 'REFACTOR') {
          // New Action: Refactor
          // Reduce debt by 30, set productivity to 0
          updates.technicalDebt = Math.max(0, state.technicalDebt - 30);
          updates.productivity = 0;
          state.addTerminalLog(`> REFACTORING: Debt reduced. Productivity halted.`);
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
        const activeEvents = state.activeEvents
          .map((e) => ({ ...e, timeLeft: e.timeLeft - 1 }))
          .filter((e) => e.timeLeft > 0);

        const isTechOutage = activeEvents.some((e) => e.type === 'TECH_OUTAGE');
        const isSick = activeEvents.some((e) => e.type === 'HUMAN_SICK');
        const isShitstorm = activeEvents.some((e) => e.type === 'MARKET_SHITSTORM');

        // --- 2. Logic Director ---
        // Dynamic outage chance based on debt
        const outageChance = 0.001 + state.technicalDebt / 1000;

        if (
          state.day > 5 &&
          state.cash > 2000 &&
          state.lastEventDay !== state.day &&
          Math.random() < 0.01 // Global event trigger chance
        ) {
          const roll = Math.random();
          // Use dynamic chance for Tech Outage if rolled
          if (roll < 0.2 && Math.random() < outageChance * 10) get().triggerEvent('TECH_OUTAGE');
          else if (roll < 0.2) {
            /* Tech Outage dodged */
          } else if (roll < 0.4 && state.mood < 40) get().triggerEvent('HUMAN_QUIT');
          else if (roll < 0.6) get().triggerEvent('HUMAN_SICK');
          else if (roll < 0.8) get().triggerEvent('MARKET_SHITSTORM');
          else get().triggerEvent('RANSOMWARE');
        }

        // --- 3. Economic Calc (Deep Sim Update) ---
        const moodFactor = state.mood / 100;
        const totalWorkers = state.roster.dev + state.roster.sales + state.roster.support;

        let finalProd = state.productivity;
        if (isTechOutage) finalProd = 0;
        if (isSick) finalProd *= 0.7;

        let finalMarket = state.marketingMultiplier;
        if (isShitstorm) finalMarket *= 0.5;

        const devOutput =
          state.roster.dev * finalProd * moodFactor * state.serverStability * state.productLevel;
        const salesBoost = state.roster.sales * 0.5 * finalMarket;
        const currentRevenue = devOutput * (0.2 + salesBoost);

        const currentCost = (totalWorkers * state.burnRate) / 60;
        const netChange = currentRevenue - currentCost;

        // Debt Accumulation: 0.05 per dev per tick. Double if Crunch (but tick 0-49 is Work).
        // Since AdvanceTick handles phase logic:
        // Actually Crunch Phase is tick 50-60.
        // We are in 'WORK' block here (tick 0-49).
        // So just standard accumulation.
        const debtIncrease = state.roster.dev * 0.05;
        const newDebt = state.technicalDebt + debtIncrease;

        // Marketing Decay
        let newMarketingMult = state.marketingMultiplier;
        let newMarketingLeft = state.marketingLeft;
        if (state.marketingLeft > 0) {
          newMarketingLeft--;
          if (newMarketingLeft <= 0) newMarketingMult = 1.0;
        }

        if (Math.random() < 0.01) {
          state.addTerminalLog(`> LOG: System Routine Check.`);
        }

        set({
          cash: state.cash + netChange,
          tick: newTick,
          gamePhase: newPhase,
          marketingMultiplier: newMarketingMult,
          marketingLeft: newMarketingLeft,
          activeEvents: activeEvents,
          technicalDebt: newDebt,
        });
      } else {
        // Crunch Phase (50-60)
        // Debt increases double here?
        // But economic calc is skipped in Crunch phase currently.
        // We should add debt accumulation here if requested "Immer wenn produziert wird"
        // But Crunch phase implies NO production (state freeze).
        // Spec: "Wenn gamePhase === 'CRUNCH', verdoppele den Anstieg"
        // BUT also: "Immer wenn produziert wird...".
        // If no production in Crunch, no debt increase?
        // Or does Crunch imply frantic coding without revenue?
        // Let's assume Crunch adds debt even without revenue (stressful).
        const debtIncrease = state.roster.dev * 0.05 * 2;
        const newDebt = state.technicalDebt + debtIncrease;

        if (newTick > 60) {
          if (state.isAiThinking) return;
          if (state.pendingDecision) state.applyPendingDecision();
          state.startNewDay();
          return;
        }

        set({
          tick: newTick,
          gamePhase: newPhase,
          technicalDebt: newDebt,
        });
      }
    },

    startNewDay: () => {
      set((state) => {
        const totalWorkers = state.roster.dev + state.roster.sales + state.roster.support;
        let newLevel = 1;
        if (totalWorkers >= 16) newLevel = 3;
        else if (totalWorkers >= 5) newLevel = 2;

        const history = state.activeEvents.map((e) => ({
          type: e.type,
          description: e.description,
        }));

        const persistentEvents = state.activeEvents.filter((e) => e.type === 'COMPETITOR_CLONE');

        return {
          day: state.day + 1,
          tick: 0,
          gamePhase: 'WORK',
          isAiThinking: false,
          terminalLogs: [],
          officeLevel: newLevel,
          isPlaying: true,
          mood: Math.max(0, state.mood - 1),
          eventHistory: history,
          activeEvents: persistentEvents,
          startOfDayCash: state.cash,
          // Reset productivity if it was zeroed by Refactor?
          // Spec says "kostet 1 Tag keinen Umsatz".
          // So we should reset it to default (10 + buffs).
          // Simplified: Reset to 10 + (coffee ? 2 : 0).
          productivity: state.inventory.includes('coffee_machine') ? 12 : 10,
        };
      });
    },

    hireWorker: () =>
      set((state) => {
        const cost = 500;
        if (state.cash < cost) {
          state.addTerminalLog('> ERROR: INSUFFICIENT FUNDS TO HIRE');
          return {};
        }

        const newRoster = { ...state.roster, dev: state.roster.dev + 1 };
        return {
          roster: newRoster,
          workers: newRoster.dev + newRoster.sales + newRoster.support,
          cash: state.cash - cost,
        };
      }),

    fireWorker: () =>
      set((state) => {
        const cost = 200;
        if (state.cash < cost) {
          state.addTerminalLog('> ERROR: INSUFFICIENT FUNDS FOR SEVERANCE');
          return {};
        }

        const newRoster = { ...state.roster, dev: Math.max(0, state.roster.dev - 1) };
        return {
          roster: newRoster,
          workers: newRoster.dev + newRoster.sales + newRoster.support,
          mood: Math.max(0, state.mood - 10),
        };
      }),
  }))
);
