export const ACTION_DEFINITIONS = {
  HIRE_WORKER: {
    title: (params) => `Hire ${params?.count ?? 1} ${params?.role ?? 'Dev'}(s)`,
    calculateCost: (params) => (params?.count ?? 1) * 500,
    apply: (state, updates, params, helpers) => {
      const rawCount = Number(params?.count ?? 1);
      const count = Number.isFinite(rawCount) ? Math.floor(rawCount) : 0;
      if (count < 1) {
        return { error: '> ERROR: INVALID WORKER COUNT.' };
      }
      const cost = count * 500;
      if (state.cash < cost) {
        return { error: '> ERROR: INSUFFICIENT FUNDS TO HIRE.' };
      }

      const roleInput = typeof params?.role === 'string' ? params.role : 'dev';
      const role = roleInput.toLowerCase();
      let actualRole = 'dev';
      if (role.includes('sale')) actualRole = 'sales';
      else if (role.includes('support')) actualRole = 'support';

      const newEmployees = [...state.employees];
      for (let i = 0; i < count; i++) {
        newEmployees.push(helpers.createEmployee(actualRole, helpers.nextEmployeeId()));
      }
      updates.employees = newEmployees;
      updates.cash = state.cash - cost;
      return {};
    }
  },
  FIRE_WORKER: {
    title: (params) => `Fire ${params?.count ?? 1} ${params?.role ?? 'Dev'}(s)`,
    calculateCost: (params) => (params?.count ?? 1) * 200,
    apply: (state, updates, params) => {
      const rawCount = Number(params?.count ?? 1);
      const count = Number.isFinite(rawCount) ? Math.floor(rawCount) : 0;
      if (count < 1) {
        return { error: '> ERROR: INVALID WORKER COUNT.' };
      }
      const roleInput = typeof params?.role === 'string' ? params.role : 'dev';
      const role = roleInput.toLowerCase();
      let actualRole = 'dev';
      if (role.includes('sale')) actualRole = 'sales';
      else if (role.includes('support')) actualRole = 'support';

      let newEmployees = [...state.employees];
      const candidates = newEmployees.filter((e) => e.role === actualRole);
      const fireCount = Math.min(count, candidates.length);
      const cost = fireCount * 200;

      if (fireCount === 0) {
        return { error: '> ERROR: NO MATCHING WORKERS TO FIRE.' };
      }

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
    }
  },
  BUY_UPGRADE: {
    title: (params) => `Buy Upgrade: ${params?.item_id ?? 'Item'}`,
    calculateCost: () => 2000,
    apply: (state, updates, params) => {
      const item = params?.item_id;
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
    }
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
    }
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
    }
  },
  REFACTOR: {
    title: () => 'Refactor Technical Debt',
    calculateCost: () => 0,
    apply: (state, updates) => {
      updates.technicalDebt = Math.max(0, state.technicalDebt - 30);
      updates.isRefactoring = true;
      return { log: '> REFACTORING: Debt reduced. Productivity halted for the day.' };
    }
  }
};
