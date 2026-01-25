import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Helpers
const PERSONAS = ['Visionary', 'Accountant', 'Benevolent'];
const getRandomPersona = () => PERSONAS[Math.floor(Math.random() * PERSONAS.length)];

// Trait Generators
const TRAITS = ['10x_ENGINEER', 'JUNIOR', 'TOXIC', 'NORMAL'];
const getRandomTrait = () => {
  const roll = Math.random();
  if (roll < 0.1) return '10x_ENGINEER';
  if (roll < 0.3) return 'TOXIC';
  if (roll < 0.5) return 'JUNIOR';
  return 'NORMAL';
};

const createEmployee = (role, id) => ({
  id,
  role,
  trait: getRandomTrait(),
  salary: 50, // Base
  outputMod: 1.0,
});

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

    // Resources (Refactored for Traits)
    // roster: { dev: 1, sales: 0, support: 0 }, // Deprecated, derived from employees array
    // workers: 1, // Derived
    employees: [createEmployee('dev', Date.now())], // Initial: 1 Dev

    productivity: 10,
    burnRate: 50,

    // Metrics
    mood: 100,
    productLevel: 1,
    productAge: 0, // NEW: Lifecycle
    serverHealth: 100,
    serverStability: 1.0,
    marketingMultiplier: 1.0,
    marketingLeft: 0,
    inventory: [],
    technicalDebt: 0,

    // CHAOS ENGINE
    activeEvents: [],
    eventHistory: [],
    lastEventDay: 0,

    // --- COMPUTED PROPERTIES HELPERS ---
    getStats: () => {
      const state = get();
      const roster = { dev: 0, sales: 0, support: 0 };
      let totalBurn = 0;

      state.employees.forEach((e) => {
        if (roster[e.role] !== undefined) roster[e.role]++;

        // Trait Logic: Salary
        let salary = 50;
        if (e.trait === '10x_ENGINEER') salary = 100;
        if (e.trait === 'JUNIOR') salary = 25;
        totalBurn += salary;
      });

      // Add base burn (rent etc)
      totalBurn += state.officeLevel * 100;

      return { roster, totalBurn, count: state.employees.length };
    },

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
        // Remove one dev
        const devs = state.employees.filter((e) => e.role === 'dev');
        let newEmployees = [...state.employees];
        if (devs.length > 0) {
          const victim = devs[0];
          newEmployees = newEmployees.filter((e) => e.id !== victim.id);
        }
        set({
          employees: newEmployees,
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
            const newEmployees = [...state.employees];

            // Map role
            let actualRole = 'dev';
            if (role.includes('sale')) actualRole = 'sales';
            else if (role.includes('support')) actualRole = 'support';

            for (let i = 0; i < count; i++) {
              newEmployees.push(createEmployee(actualRole, Date.now() + i));
            }

            updates.employees = newEmployees;
            updates.cash = state.cash - cost;
          } else {
            state.addTerminalLog(`> ERROR: INSUFFICIENT FUNDS TO HIRE.`);
          }
        } else if (action === 'FIRE_WORKER') {
          const count = params.count || 1;
          const cost = count * 200;

          if (state.cash >= cost) {
            const role = (params.role || 'dev').toLowerCase();
            let actualRole = 'dev';
            if (role.includes('sale')) actualRole = 'sales';
            else if (role.includes('support')) actualRole = 'support';

            let newEmployees = [...state.employees];
            const candidates = newEmployees.filter((e) => e.role === actualRole);

            // Trait targeting? Assuming simple FIFO for now, or random
            // If params.trait exists, filter by that?
            // Simplified: Fire first match
            for (let i = 0; i < count; i++) {
              if (candidates.length > i) {
                const victim = candidates[i];
                newEmployees = newEmployees.filter((e) => e.id !== victim.id);
              }
            }

            updates.employees = newEmployees;
            updates.cash = state.cash - count * 200; // Approximation
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
          updates.productAge = 0; // Reset Lifecycle
          updates.cash = state.cash;
          updates.mood = Math.max(0, state.mood - 30);
          updates.marketingMultiplier = 0.5;
          updates.marketingLeft = 120;
          state.addTerminalLog(`> PIVOTING...`);
        } else if (action === 'REFACTOR') {
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

        const outageChance = 0.001 + state.technicalDebt / 1000;

        if (
          state.day > 5 &&
          state.cash > 2000 &&
          state.lastEventDay !== state.day &&
          Math.random() < 0.01
        ) {
          const roll = Math.random();
          if (roll < 0.2 && Math.random() < outageChance * 10) get().triggerEvent('TECH_OUTAGE');
          else if (roll < 0.2) {
            /* Dodged */
          } else if (roll < 0.4 && state.mood < 40) get().triggerEvent('HUMAN_QUIT');
          else if (roll < 0.6) get().triggerEvent('HUMAN_SICK');
          else if (roll < 0.8) get().triggerEvent('MARKET_SHITSTORM');
          else get().triggerEvent('RANSOMWARE');
        }

        // --- 3. Economic Calc (Traits + Lifecycle) ---
        const stats = state.getStats();
        const moodFactor = state.mood / 100;

        // Product Lifecycle Demand
        // 0-20: 1.5, 21-100: 1.0, >100: drops to 0.2
        let demandFactor = 1.0;
        if (state.productAge < 20) demandFactor = 1.5;
        else if (state.productAge > 100)
          demandFactor = Math.max(0.2, 1.0 - (state.productAge - 100) * 0.01);

        let finalProd = state.productivity;
        if (isTechOutage) finalProd = 0;
        if (isSick) finalProd *= 0.7;

        let finalMarket = state.marketingMultiplier;
        if (isShitstorm) finalMarket *= 0.5;

        // Calc Output via Employees
        let totalDevOutput = 0;
        let totalSalesOutput = 0;
        let debtAcc = 0;
        let moodDecay = 0;

        state.employees.forEach((e) => {
          let output = 1.0; // Base mod
          // Trait Modifiers
          if (e.trait === '10x_ENGINEER') {
            output = 4.0;
            debtAcc += 0.2;
          }
          if (e.trait === 'JUNIOR') {
            output = 0.5;
          }
          if (e.trait === 'TOXIC') {
            moodDecay += 0.01;
          } // Small tick decay

          if (e.role === 'dev') totalDevOutput += output;
          if (e.role === 'sales') totalSalesOutput += output;
        });

        // Add base debt (normal work)
        debtAcc += stats.roster.dev * 0.05;

        // Formula
        const devValue =
          totalDevOutput * finalProd * moodFactor * state.serverStability * state.productLevel;
        const salesValue = totalSalesOutput * 0.5 * finalMarket;
        const currentRevenue = devValue * (0.2 + salesValue) * demandFactor;

        // Burn Rate
        const currentCost = stats.totalBurn / 60; // Using calculated burn from roster
        const netChange = currentRevenue - currentCost;

        // Marketing Decay
        let newMarketingMult = state.marketingMultiplier;
        let newMarketingLeft = state.marketingLeft;
        if (state.marketingLeft > 0) {
          newMarketingLeft--;
          if (newMarketingLeft <= 0) newMarketingMult = 1.0;
        }

        // Logic Check: Update Roster count for UI compatibility if needed,
        // but stats.roster gives us current counts.
        // We'll update 'workers' count for UI.

        set({
          cash: state.cash + netChange,
          tick: newTick,
          gamePhase: newPhase,
          marketingMultiplier: newMarketingMult,
          marketingLeft: newMarketingLeft,
          activeEvents: activeEvents,
          technicalDebt: state.technicalDebt + debtAcc,
          productAge: state.productAge + 1,
          mood: Math.max(0, state.mood - moodDecay),
          // Sync UI helpers
          workers: stats.count,
          roster: stats.roster,
        });
      } else {
        // Crunch Phase
        const debtIncrease = state.employees.filter((e) => e.role === 'dev').length * 0.05 * 2;
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
        const stats = state.getStats();
        let newLevel = 1;
        if (stats.count >= 16) newLevel = 3;
        else if (stats.count >= 5) newLevel = 2;

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

        const newEmployees = [...state.employees, createEmployee('dev', Date.now())];
        return {
          employees: newEmployees,
          // Recalculate stats? The UI reads workers/roster which are updated next tick or we update them here?
          // Ideally update them here for instant feedback.
          // Simplified for manual action:
          workers: newEmployees.length,
          roster: { ...state.roster, dev: state.roster.dev + 1 }, // Approximation
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

        // Fire random dev
        const devs = state.employees.filter((e) => e.role === 'dev');
        if (devs.length === 0) return {};
        const victim = devs[0];
        const newEmployees = state.employees.filter((e) => e.id !== victim.id);

        return {
          employees: newEmployees,
          workers: newEmployees.length,
          roster: { ...state.roster, dev: Math.max(0, state.roster.dev - 1) },
          mood: Math.max(0, state.mood - 10),
        };
      }),
  }))
);
