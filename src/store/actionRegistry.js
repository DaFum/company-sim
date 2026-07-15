const VALID_ROLES = ['dev', 'sales', 'support'];
const VALID_UPGRADES = ['coffee_machine', 'plants', 'server_rack_v2', 'firewall'];

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
    title: () => 'No Action',
    calculateCost: () => 0,
    apply: () => ({ status: 'SKIPPED' }),
  },
  HIRE_WORKER: {
    title: (params) => {
      const { count, role } = parseWorkerParams(params, 3);
      return `Hire ${count} ${role}(s)`;
    },
    calculateCost: (params) => {
      const { count } = parseWorkerParams(params, 3);
      return count * 500;
    },
    apply: (state, updates, params, helpers) => {
      const { count, role } = parseWorkerParams(params, 3);
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

      for (let i = 0; i < fireCount; i++) {
        const victim = candidates[i];
        newEmployees = newEmployees.filter((e) => e.id !== victim.id);
      }

      updates.employees = newEmployees;
      updates.cash = state.cash - cost;
      updates.mood = Math.max(0, state.mood - fireCount * 20);
      return {};
    },
  },
  BUY_UPGRADE: {
    title: (params) => `Buy Upgrade: ${params?.item_id ?? 'Item'}`,
    calculateCost: () => 2000,
    apply: (state, updates, params) => {
      const item = params?.item_id;
      if (!VALID_UPGRADES.includes(item)) {
        return { error: `> ERROR: INVALID UPGRADE ${item}` };
      }
      if (
        ['coffee_machine', 'firewall', 'server_rack_v2'].includes(item) &&
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
  REFACTOR: {
    title: () => 'Refactor Technical Debt',
    calculateCost: () => 0,
    apply: (state, updates) => {
      updates.technicalDebt = Math.max(0, state.technicalDebt - 30);
      updates.isRefactoring = true;
      return { log: '> REFACTORING: Debt reduced. Productivity halted for the day.' };
    },
  },
};
