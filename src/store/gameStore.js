import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { ACTION_DEFINITIONS } from './actionRegistry';

// Helpers
const PERSONAS = ['Visionary', 'Accountant', 'Benevolent'];

/**
 * Returns a random CEO persona.
 * @returns {string} Persona name.
 */
const getRandomPersona = () => PERSONAS[Math.floor(Math.random() * PERSONAS.length)];

// Trait Generators
const TRAITS = ['10x_ENGINEER', 'JUNIOR', 'TOXIC', 'NORMAL'];

/**
 * Returns a random worker trait based on probabilities.
 * @returns {string} Trait name.
 */
const getRandomTrait = () => {
  const roll = Math.random();
  if (roll < 0.1) return '10x_ENGINEER';
  if (roll < 0.3) return 'TOXIC';
  if (roll < 0.5) return 'JUNIOR';
  return 'NORMAL';
};

/**
 * @typedef {Object} Employee
 * @property {number|string} id - Unique identifier.
 * @property {string} role - Employee role (dev, sales, support).
 * @property {string} trait - Employee trait.
 */

// Monotonic counter for employee IDs. Date.now() collided when several
// employees were created within the same millisecond (e.g. a bulk hire), which
// broke sprite-to-employee matching in the Phaser scene.
let employeeIdCounter = 0;

/**
 * Generates a unique, stable employee ID.
 * @returns {string} Unique ID (e.g. "emp-1").
 */
export const nextEmployeeId = () => {
  employeeIdCounter += 1;
  return `emp-${employeeIdCounter}`;
};

/**
 * Creates a new employee object.
 * @param {string} role - Employee role.
 * @param {number|string} id - Unique ID.
 * @returns {Employee} Employee object.
 */
export const createEmployee = (role, id) => ({
  id,
  role,
  trait: getRandomTrait(),
});

/**
 * @typedef {Object} EmployeeMetrics
 * @property {number} totalDevOutput
 * @property {number} totalSalesOutput
 * @property {number} debtAcc
 * @property {number} moodDecay
 */

/**
 * Calculates output, debt accumulation, and mood decay based on the current employees.
 * Note: Support staff are intentionally excluded from revenue/output calculations here.
 * Their primary impact is on payroll (burn rate), which is calculated in `getStats`
 * and applied during the `advanceTick` action. This design decision simulates support
 * as a cost center that maintains stability rather than generating direct revenue.
 * @param {Employee[]} employees - List of employees.
 * @returns {EmployeeMetrics} Aggregated metrics.
 */
const calculateEmployeeMetrics = (employees) => {
  let totalDevOutput = 0;
  let totalSalesOutput = 0;
  let debtAcc = 0;
  let moodDecay = 0;

  employees.forEach((e) => {
    let output = 1.0; // Base mod
    // Trait Modifiers
    if (e.trait === '10x_ENGINEER') {
      output = 4.0;
      // Technical debt is a coding artifact: only 10x *devs* accrue it. A 10x
      // hire in sales/support shouldn't add debt to a codebase they don't touch.
      if (e.role === 'dev') debtAcc += 0.2;
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

  return { totalDevOutput, totalSalesOutput, debtAcc, moodDecay };
};

/**
 * @typedef {Object} ChaosEventDef
 * @property {string} type - Event type passed to triggerEvent.
 * @property {number} weight - Relative selection weight.
 * @property {(state: GameStoreState) => boolean} [canFire] - Optional gate; if it
 *   returns false the roll fizzles ("dodged") and no event triggers this tick.
 */

/**
 * Weighted table of chaos events. Replaces the old nested if/else roll: each
 * event has a relative weight and an optional gate condition. Splitting the old
 * single RANSOMWARE branch lets COMPETITOR_CLONE actually appear in the wild.
 * @type {ChaosEventDef[]}
 */
const CHAOS_EVENT_TABLE = [
  {
    type: 'TECH_OUTAGE',
    weight: 2,
    // Higher technical debt sharply increases the odds the outage actually lands.
    canFire: (s) => Math.random() < (0.001 + s.technicalDebt / 1000) * 10,
  },
  { type: 'HUMAN_QUIT', weight: 2, canFire: (s) => s.mood < 40 },
  { type: 'HUMAN_SICK', weight: 2 },
  { type: 'MARKET_SHITSTORM', weight: 2 },
  { type: 'RANSOMWARE', weight: 1 },
  { type: 'COMPETITOR_CLONE', weight: 1 },
];

/**
 * Picks a chaos event from the weighted table.
 * @param {GameStoreState} state - Current game state (for gate conditions).
 * @returns {string|null} Event type to trigger, or null if the roll fizzles.
 */
const rollChaosEvent = (state) => {
  const totalWeight = CHAOS_EVENT_TABLE.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const event of CHAOS_EVENT_TABLE) {
    roll -= event.weight;
    if (roll < 0) {
      if (event.canFire && !event.canFire(state)) return null; // Dodged
      return event.type;
    }
  }
  return null;
};

/**
 * @typedef {Object} GameStats
 * @property {Object} roster - Count of employees by role.
 * @property {number} totalBurn - Total daily expense.
 * @property {number} count - Total employee count.
 */

/**
 * @typedef {Object} GameStoreState
 * @property {string} apiKey - OpenAI API Key.
 * @property {string} aiProvider - AI Provider Name.
 * @property {string} aiModel - AI Model Name.
 * @property {number} cash - Current cash amount.
 * @property {number} startOfDayCash - Cash at start of day.
 * @property {number} day - Current day number.
 * @property {number} tick - Current tick (0-60).
 * @property {string} gamePhase - Current phase (WORK, CRUNCH).
 * @property {boolean} isPlaying - Is game running.
 * @property {boolean} isAiThinking - Is AI processing.
 * @property {boolean} isMuted - Is audio muted.
 * @property {number} gameSpeed - Game speed in ms.
 * @property {number} officeLevel - Office upgrade level.
 * @property {string[]} terminalLogs - Array of terminal messages.
 * @property {Object|null} pendingDecision - Current AI decision waiting approval.
 * @property {string[]} activeVisitors - List of active visitor types.
 * @property {string} ceoPersona - CEO Persona.
 * @property {Object} roster - Employee counts.
 * @property {number} workers - Total worker count.
 * @property {Employee[]} employees - List of employee objects.
 * @property {number} productivity - Global productivity multiplier.
 * @property {boolean} isRefactoring - Whether the upcoming day is a refactoring day (productivity halted).
 * @property {number} burnRate - Daily burn rate.
 * @property {number} mood - Global mood (0-100).
 * @property {number} productLevel - Product quality level.
 * @property {number} productAge - Product age in ticks.
 * @property {number} serverHealth - Server health percentage.
 * @property {number} serverStability - Server stability multiplier.
 * @property {number} marketingMultiplier - Marketing effect multiplier.
 * @property {number} marketingLeft - Remaining marketing ticks.
 * @property {string[]} inventory - List of purchased items.
 * @property {number} technicalDebt - Accumulated technical debt.
 * @property {number[]} timers - List of active timer IDs.
 * @property {Object[]} activeEvents - List of active chaos events.
 * @property {Object[]} eventHistory - History of past events.
 * @property {number} lastEventDay - Day of last event trigger.
 * @property {() => GameStats} getStats - Calculates current stats.
 * @property {(key: string) => void} setApiKey - Sets API Key.
 * @property {(provider: string) => void} setAiProvider - Sets AI Provider.
 * @property {(model: string) => void} setAiModel - Sets AI Model.
 * @property {() => void} togglePause - Toggles pause.
 * @property {() => void} toggleMute - Toggles mute.
 * @property {() => void} toggleSpeed - Toggles speed.
 * @property {(msg: string) => void} addTerminalLog - Adds log.
 * @property {() => void} clearTerminalLogs - Clears logs.
 * @property {() => void} clearTimers - Clears active timers.
 * @property {(decision: Object) => void} setPendingDecision - Sets pending decision.
 * @property {(type: string) => void} spawnVisitor - Spawns visitor.
 * @property {(type: string) => void} despawnVisitor - Despawns visitor.
 * @property {(type: string) => void} triggerEvent - Triggers event.
 * @property {(type: string) => void} resolveEvent - Resolves event.
 * @property {() => void} vetoDecision - Vetoes decision.
 * @property {() => void} applyPendingDecision - Applies decision.
 * @property {() => void} advanceTick - Advances game tick.
 * @property {() => void} startNewDay - Starts new day.
 * @property {(role?: string) => void} hireWorker - Debug: Hire worker.
 * @property {() => void} fireWorker - Debug: Fire worker.
 */

/**
 * Global game state store using Zustand.
 * Manages economics, employees, time, and game phase.
 * @type {import('zustand').UseBoundStore<import('zustand').StoreApi<GameStoreState>>}
 */

/**
 * Calculates current roster counts from an array of employees.
 * @param {Array} employees - Array of employee objects.
 * @returns {Object} Roster counts by role.
 */
function calculateRoster(employees) {
  const roster = { dev: 0, sales: 0, support: 0 };
  if (!Array.isArray(employees)) return roster;
  employees.forEach((e) => {
    if (e && e.role && roster[e.role] !== undefined) {
      roster[e.role]++;
    }
  });
  return roster;
}

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
    decisionHistory: [],
    pendingDecision: null,
    activeVisitors: [],
    ceoPersona: getRandomPersona(),

    // Resources (Refactored for Traits)
    roster: { dev: 1, sales: 0, support: 0 }, // Initial Sync
    workers: 1, // Initial Sync
    employees: [createEmployee('dev', nextEmployeeId())], // Initial: 1 Dev

    productivity: 10,
    isRefactoring: false,
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
    timers: [],

    // CHAOS ENGINE
    activeEvents: [],
    eventHistory: [],
    lastEventDay: 0,

    // --- COMPUTED PROPERTIES HELPERS ---
    /**
     * Calculates current roster counts and burn rate.
     * @returns {GameStats} Stats object.
     */
    getStats: () => {
      const state = get();
      const roster = calculateRoster(state.employees);
      let totalBurn = 0;

      state.employees.forEach((e) => {
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
    /**
     * Sets the OpenAI API key.
     * @param {string} key - API Key.
     */
    setApiKey: (key) => {
      sessionStorage.setItem('openai_api_key', key);
      set({ apiKey: key });
    },

    /**
     * Sets the AI provider.
     * @param {string} provider - Provider name.
     */
    setAiProvider: (provider) => {
      sessionStorage.setItem('ai_provider', provider);
      set({ aiProvider: provider });
    },

    /**
     * Sets the AI model.
     * @param {string} model - Model name.
     */
    setAiModel: (model) => {
      sessionStorage.setItem('ai_model', model);
      set({ aiModel: model });
    },

    /**
     * Toggles the game pause state.
     */
    togglePause: () => set((state) => ({ isPlaying: !state.isPlaying })),

    /**
     * Toggles sound mute.
     */
    toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

    /**
     * Toggles game speed between normal and fast.
     */
    toggleSpeed: () => set((state) => ({ gameSpeed: state.gameSpeed === 1000 ? 500 : 1000 })),

    /**
     * Adds a message to the terminal logs.
     * @param {string} msg - Log message.
     */
    addTerminalLog: (msg) =>
      set((state) => ({
        terminalLogs: [...state.terminalLogs.slice(-50), msg],
      })),

    /**
     * Clears all terminal logs.
     */
    clearTerminalLogs: () => set({ terminalLogs: [] }),

    /**
     * Clears all active timers to prevent memory leaks.
     */
    clearTimers: () => {
      const state = get();
      state.timers.forEach((t) => {
        clearTimeout(t);
      });
      set({ timers: [] });
    },

    /**
     * Sets the pending AI decision.
     * @param {Object} decision - Decision object.
     */
    setPendingDecision: (decision) => set({ pendingDecision: decision }),

    /**
     * Spawns a visitor of a specific type.
     * @param {string} type - Visitor type.
     */
    spawnVisitor: (type) =>
      set((state) => ({
        activeVisitors: [...state.activeVisitors, type],
      })),

    /**
     * Despawns a visitor of a specific type.
     * @param {string} type - Visitor type.
     */
    despawnVisitor: (type) =>
      set((state) => ({
        activeVisitors: state.activeVisitors.filter((v) => v !== type),
      })),

    /**
     * Triggers a chaos event.
     * @param {string} type - Event type.
     */
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
        const roster = calculateRoster(newEmployees);
        set({
          employees: newEmployees,
          workers: newEmployees.length,
          roster,
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

    /**
     * Resolves an active event manually or automatically.
     * @param {string} type - Event type.
     */
    resolveEvent: (type) =>
      set((state) => ({
        activeEvents: state.activeEvents.filter((e) => e.type !== type),
      })),

    /**
     * Vetoes the pending decision and triggers a morale booster.
     */
    vetoDecision: () => {
      const state = get();
      if (!state.pendingDecision) return;

      state.addTerminalLog(`>> VETO! REJECTED.`);
      state.addTerminalLog(`>> SAFETY PROTOCOL: PIZZA PARTY.`);

      const timerId = setTimeout(() => {
        get().despawnVisitor('pizza_guy');
        // Remove self from timers
        set((s) => ({ timers: s.timers.filter((t) => t !== timerId) }));
      }, 10000);

      set({
        pendingDecision: null,
        decisionHistory: [
          ...state.decisionHistory,
          { ...state.pendingDecision, day: state.day, vetoed: true },
        ],
        cash: state.cash - 200,
        activeVisitors: [...state.activeVisitors, 'pizza_guy'],
        mood: 100,
        timers: [...state.timers, timerId],
      });
    },

    /**
     * Applies the pending decision and executes its effects.
     */
    applyPendingDecision: () => {
      const state = get();
      const decision = state.pendingDecision;

      if (decision) {
        state.addTerminalLog(`>> EXECUTING: ${decision.action}`);
        let updates = { pendingDecision: null };
        updates.decisionHistory = [
          ...state.decisionHistory,
          { ...decision, day: state.day, vetoed: false },
        ];
        const action = decision.action;
        const params = decision.parameters || {};

        const def = Object.hasOwn(ACTION_DEFINITIONS, action) ? ACTION_DEFINITIONS[action] : null;
        if (def) {
          const result = def.apply(state, updates, params, { createEmployee, nextEmployeeId });
          if (result.error) {
            state.addTerminalLog(result.error);
            set({ pendingDecision: null });
            return;
          }
          if (result.log) {
            state.addTerminalLog(result.log);
          }
        } else {
          state.addTerminalLog(`> ERROR: UNKNOWN ACTION ${action}`);
        }

        // Keep the workers/roster UI helpers in sync with the employees list
        // whenever a decision changes headcount, matching hireWorker/fireWorker.
        // Without this the "Workers:" display stays stale until the next tick.
        if (updates.employees) {
          updates.workers = updates.employees.length;
          updates.roster = calculateRoster(updates.employees);
        }

        set(updates);
      }
    },

    /**
     * Advances the game simulation by one tick.
     * Handles economics, event timers, and game phases.
     */
    advanceTick: () => {
      const state = get();
      if (!state.isPlaying) return;

      let newTick = state.tick + 1;
      let newPhase = state.gamePhase;

      if (state.tick === 49) {
        newPhase = 'CRUNCH';
      }

      if (state.gamePhase === 'WORK') {
        const activeEvents = [];
        let isTechOutage = false;
        let isSick = false;
        let isShitstorm = false;
        let isCompetitor = false;

        // Support bonus: accelerates resolution of operational events, max 3
        const supportBonus = Math.min(state.roster.support || 0, 3);

        for (const e of state.activeEvents) {
          if (e && e.timeLeft > 0) {
            let reduction = 1;
            // Only operational events are affected by support
            if (['TECH_OUTAGE', 'HUMAN_SICK', 'MARKET_SHITSTORM'].includes(e.type)) {
              reduction += supportBonus;
            }
            const updatedEvent = { ...e, timeLeft: e.timeLeft - reduction };
            if (updatedEvent.timeLeft > 0) {
              activeEvents.push(updatedEvent);
            }
            switch (e.type) {
              case 'TECH_OUTAGE':
                isTechOutage = true;
                break;
              case 'HUMAN_SICK':
                isSick = true;
                break;
              case 'MARKET_SHITSTORM':
                isShitstorm = true;
                break;
              case 'COMPETITOR_CLONE':
                isCompetitor = true;
                break;
            }
          }
        }

        // ~1% chance per WORK tick to roll for a chaos event, gated so it can't
        // pile on early, while broke, or twice in one day.
        let rolledEventType = null;
        if (
          state.day > 5 &&
          state.cash > 2000 &&
          state.lastEventDay !== state.day &&
          Math.random() < 0.01
        ) {
          rolledEventType = rollChaosEvent(state);
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

        // A competitor cloning our tech steals market share until we PIVOT away.
        if (isCompetitor) demandFactor *= 0.7;

        let finalProd = state.productivity;
        if (isTechOutage) finalProd = 0;
        if (isSick) finalProd *= 0.7;

        let finalMarket = state.marketingMultiplier;
        if (isShitstorm) finalMarket *= 0.5;

        // Calc Output via Employees
        const { totalDevOutput, totalSalesOutput, debtAcc, moodDecay } = calculateEmployeeMetrics(
          state.employees
        );

        // Add base debt (normal work)
        const totalDebtAcc = debtAcc + stats.roster.dev * 0.05;

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
          technicalDebt: state.technicalDebt + totalDebtAcc,
          productAge: state.productAge + 1,
          mood: Math.max(0, state.mood - moodDecay),
          // Sync UI helpers
          workers: stats.count,
          roster: stats.roster,
        });

        if (rolledEventType) {
          get().triggerEvent(rolledEventType);
        }
      } else {
        // Crunch Phase
        // Ensure stats are available in this branch since getStats() is called inside WORK branch usually
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

    /**
     * Starts a new game day, resetting daily stats.
     */
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

        // Carry over any event that still has time left instead of wiping them
        // nightly, so durations >1 day (e.g. a 120-tick flu wave, or the
        // long-lived COMPETITOR_CLONE) actually span multiple days as intended.
        const carriedEvents = state.activeEvents.filter((e) => e.timeLeft > 0);

        // A pending REFACTOR halts productivity for the whole new day; otherwise
        // productivity returns to its baseline (boosted by the coffee machine).
        const baseProductivity = state.inventory.includes('coffee_machine') ? 12 : 10;

        return {
          day: state.day + 1,
          tick: 0,
          gamePhase: 'WORK',
          isAiThinking: false,
          terminalLogs: [],
          officeLevel: newLevel,
          // Preserve the player's play/pause choice across the day boundary
          // instead of force-resuming.
          isPlaying: state.isPlaying,
          mood: Math.max(0, state.mood - 1),
          eventHistory: history,
          activeEvents: carriedEvents,
          startOfDayCash: state.cash,
          productivity: state.isRefactoring ? 0 : baseProductivity,
          isRefactoring: false,
        };
      });
    },

    /**
     * Manually hires a worker (for debugging or testing).
     * @param {string} [role='dev'] - Employee role.
     */
    hireWorker: (role = 'dev') => {
      const state = get();
      const cost = 500;
      if (state.cash < cost) {
        state.addTerminalLog('> ERROR: INSUFFICIENT FUNDS TO HIRE');
        return;
      }

      const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : 'dev';
      const actualRole = ['dev', 'sales', 'support'].includes(normalizedRole)
        ? normalizedRole
        : 'dev';

      const newEmployees = [...state.employees, createEmployee(actualRole, nextEmployeeId())];
      const roster = calculateRoster(newEmployees);
      set({
        employees: newEmployees,
        workers: newEmployees.length,
        roster,
        cash: state.cash - cost,
      });
    },

    /**
     * Manually fires a worker (for debugging or testing).
     */
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

        const roster = calculateRoster(newEmployees);
        return {
          employees: newEmployees,
          workers: newEmployees.length,
          roster,
          mood: Math.max(0, state.mood - 10),
          cash: state.cash - cost,
        };
      }),
  }))
);
