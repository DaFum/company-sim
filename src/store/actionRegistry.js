const VALID_ROLES = ['dev', 'sales', 'support'];
const VALID_UPGRADES = [
  'coffee_machine',
  'plants',
  'server_rack_v2',
  'firewall',
  'war_room',
  'brand_studio',
  'wellness_pod',
];

const parseWorkerParams = (params, maxCount = 3) => {
  const rawCount = Number(params?.count ?? 1);
  const count = Math.min(
    Math.max(Number.isFinite(rawCount) ? Math.floor(rawCount) : 1, 1),
    maxCount
  );
  const roleInput = typeof params?.role === 'string' ? params.role.trim().toLowerCase() : 'dev';
  const role = VALID_ROLES.includes(roleInput) ? roleInput : 'dev';
  return { count, role };
};

export const ACTION_DEFINITIONS = {
  NONE: {
    description: 'Take no strategic action this cycle.',
    parameters: {},
    effects: 'Skips execution without changing company metrics.',
    risk: 'LOW',
    title: () => 'No Action',
    calculateCost: () => 0,
    apply: () => ({ status: 'SKIPPED' }),
  },
  HIRE_WORKER: {
    description: 'Hire one to five employees in a specific role to increase capacity.',
    parameters: { role: 'dev | sales | support', count: '1-5' },
    effects: 'Adds employees and increases payroll; support helps resolve operational events.',
    risk: 'MEDIUM',
    title: (params) => {
      const { count, role } = parseWorkerParams(params, 5);
      return `Hire ${count} ${role}(s)`;
    },
    calculateCost: (params) => {
      const { count } = parseWorkerParams(params, 5);
      return count * 500;
    },
    apply: (state, updates, params, helpers) => {
      const { count, role } = parseWorkerParams(params, 5);
      const cost = count * 500;

      if (state.cash < cost) {
        return { error: '> ERROR: INSUFFICIENT FUNDS TO HIRE.' };
      }

      const newEmployees = [...state.employees];
      for (let i = 0; i < count; i++) {
        newEmployees.push(helpers.createEmployee(role, helpers.nextEmployeeId()));
      }
      updates.employees = newEmployees;
      updates.cash = state.cash - cost;
      return {};
    },
  },
  FIRE_WORKER: {
    description: 'Fire one to five employees in a specific role to reduce burn rate.',
    parameters: { role: 'dev | sales | support', count: '1-5' },
    effects: 'Removes employees, charges severance, and significantly lowers mood.',
    risk: 'HIGH',
    title: (params) => {
      const { count, role } = parseWorkerParams(params, 5);
      return `Fire ${count} ${role}(s)`;
    },
    calculateCost: (params) => {
      const { count } = parseWorkerParams(params, 5);
      return count * 200; // Expected max cost
    },
    apply: (state, updates, params) => {
      const { count: requestedCount, role } = parseWorkerParams(params, 5);

      let newEmployees = [...state.employees];
      const candidates = newEmployees.filter((e) => e.role === role);
      const fireCount = Math.min(requestedCount, candidates.length);

      if (fireCount === 0) {
        return { error: '> ERROR: NO MATCHING WORKERS TO FIRE.' };
      }

      // Check if requested count is higher than available to act accordingly or just clamp.
      // Instructions specify rejecting requests whose count exceeds available matching workers
      if (requestedCount > candidates.length) {
        return { error: '> ERROR: NOT ENOUGH MATCHING WORKERS TO FIRE.' };
      }

      const cost = fireCount * 200;

      if (state.cash < cost) {
        return { error: '> ERROR: CANNOT AFFORD SEVERANCE.' };
      }

      const victimIds = new Set();
      for (let i = 0; i < fireCount; i++) {
        victimIds.add(candidates[i].id);
      }
      newEmployees = newEmployees.filter((e) => !victimIds.has(e.id));

      updates.employees = newEmployees;
      updates.cash = state.cash - cost;
      updates.mood = Math.max(0, state.mood - fireCount * 20);
      return {};
    },
  },
  BUY_UPGRADE: {
    description: 'Buy an office or infrastructure upgrade.',
    parameters: {
      item_id:
        'coffee_machine | server_rack_v2 | plants | firewall | war_room | brand_studio | wellness_pod',
    },
    effects:
      'Improves productivity, mood, stability, marketing, or resolves matching crisis events.',
    risk: 'MEDIUM',
    title: (params) => `Buy Upgrade: ${params?.item_id ?? 'Item'}`,
    calculateCost: () => 2000,
    apply: (state, updates, params) => {
      const item = params?.item_id;
      if (!VALID_UPGRADES.includes(item)) {
        return { error: `> ERROR: INVALID UPGRADE ${item}` };
      }
      if (
        [
          'coffee_machine',
          'firewall',
          'server_rack_v2',
          'war_room',
          'brand_studio',
          'wellness_pod',
        ].includes(item) &&
        state.inventory.includes(item)
      ) {
        return { error: `> ERROR: ALREADY OWN ${item}` };
      }
      const cost = 2000;
      if (state.cash < cost) {
        return { error: `> ERROR: NO FUNDS FOR ${item}` };
      }
      updates.cash = state.cash - cost;
      updates.inventory = [...state.inventory, item];
      if (item === 'coffee_machine') updates.productivity = state.productivity + 2;
      if (item === 'plants') updates.mood = Math.min(100, state.mood + 15);
      if (item === 'war_room') updates.productivity = state.productivity + 4;
      if (item === 'brand_studio') {
        updates.marketingMultiplier = Math.max(state.marketingMultiplier, 1.4);
        updates.marketingLeft = Math.max(state.marketingLeft, 90);
      }
      if (item === 'wellness_pod') updates.mood = Math.min(100, state.mood + 25);
      if (item === 'server_rack_v2') {
        updates.serverStability = 1.0;
        updates.serverHealth = 100;
        updates.activeEvents = (updates.activeEvents || state.activeEvents).filter(
          (e) => e.type !== 'TECH_OUTAGE'
        );
      }
      if (item === 'firewall') {
        updates.activeEvents = (updates.activeEvents || state.activeEvents).filter(
          (e) => e.type !== 'RANSOMWARE'
        );
      }
      return {};
    },
  },
  MARKETING_PUSH: {
    description: 'Launch a high-budget marketing campaign.',
    parameters: {},
    effects: 'Temporarily doubles marketing impact and resolves market shitstorms.',
    risk: 'HIGH',
    title: () => 'Launch Marketing Push',
    calculateCost: () => 5000,
    apply: (state, updates) => {
      const cost = 5000;
      if (state.cash < cost) {
        return { error: '> ERROR: NO FUNDS.' };
      }
      updates.cash = state.cash - cost;
      updates.marketingMultiplier = 2.0;
      updates.marketingLeft = 60;
      updates.activeEvents = (updates.activeEvents || state.activeEvents).filter(
        (e) => e.type !== 'MARKET_SHITSTORM'
      );
      return {};
    },
  },
  PIVOT: {
    description: 'Reset the product direction to differentiate from competitors.',
    parameters: {},
    effects:
      'Raises product level, resets product age, ends clone pressure, but damages mood and marketing efficiency.',
    risk: 'HIGH',
    title: () => 'Pivot Strategy',
    calculateCost: () => 0,
    apply: (state, updates) => {
      updates.productLevel = state.productLevel + 1;
      updates.productAge = 0;
      updates.cash = state.cash;
      updates.mood = Math.max(0, state.mood - 30);
      updates.marketingMultiplier = 0.5;
      updates.marketingLeft = 120;
      updates.activeEvents = (updates.activeEvents || state.activeEvents).filter(
        (e) => e.type !== 'COMPETITOR_CLONE'
      );
      return { log: '> PIVOTING...' };
    },
  },

  FUNDRAISE: {
    description: 'Raise capital from impatient investors.',
    parameters: {},
    effects: 'Adds a large cash runway boost while increasing pressure and morale drag.',
    risk: 'HIGH',
    title: () => 'Raise Investor Round',
    calculateCost: () => 0,
    apply: (state, updates) => {
      updates.cash = state.cash + 18000;
      updates.mood = Math.max(0, state.mood - 8);
      updates.technicalDebt = state.technicalDebt + 5;
      return { log: '> TERM SHEET SIGNED: RUNWAY EXTENDED, EXPECTATIONS SPIKED.' };
    },
  },
  CUSTOMER_RESEARCH: {
    description: 'Pause feature theater and listen to customers.',
    parameters: {},
    effects: 'Improves demand, mood, and product freshness at a modest cash cost.',
    risk: 'LOW',
    title: () => 'Run Customer Research',
    calculateCost: () => 1200,
    apply: (state, updates) => {
      const cost = 1200;
      if (state.cash < cost) return { error: '> ERROR: NO FUNDS FOR CUSTOMER RESEARCH.' };
      updates.cash = state.cash - cost;
      updates.productAge = Math.max(0, state.productAge - 35);
      updates.productLevel = state.productLevel + 0.5;
      updates.mood = Math.min(100, state.mood + 10);
      return { log: '> RESEARCH SYNTHESIZED: ROADMAP SIGNAL IMPROVED.' };
    },
  },
  INCIDENT_DRILL: {
    description: 'Run an all-hands incident drill before the next outage hits.',
    parameters: {},
    effects: 'Restores server health, lowers technical debt, and clears outages faster.',
    risk: 'MEDIUM',
    title: () => 'Run Incident Drill',
    calculateCost: () => 2500,
    apply: (state, updates) => {
      const cost = 2500;
      if (state.cash < cost) return { error: '> ERROR: NO FUNDS FOR INCIDENT DRILL.' };
      updates.cash = state.cash - cost;
      updates.serverHealth = 100;
      updates.serverStability = Math.min(1.4, state.serverStability + 0.15);
      updates.technicalDebt = Math.max(0, state.technicalDebt - 15);
      updates.activeEvents = (updates.activeEvents || state.activeEvents).filter(
        (e) => e.type !== 'TECH_OUTAGE'
      );
      return { log: '> INCIDENT DRILL COMPLETE: OPS POSTURE HARDENED.' };
    },
  },
  REFACTOR: {
    description: 'Spend a day reducing technical debt instead of shipping.',
    parameters: {},
    effects: 'Reduces technical debt by 30 and sets productivity to zero for the next day.',
    risk: 'LOW',
    title: () => 'Refactor Technical Debt',
    calculateCost: () => 0,
    apply: (state, updates) => {
      updates.technicalDebt = Math.max(0, state.technicalDebt - 30);
      updates.isRefactoring = true;
      return { log: '> REFACTORING: Debt reduced. Productivity halted for the day.' };
    },
  },
};
