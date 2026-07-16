import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from './gameStore';

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.setState({
      cash: 50000,
      employees: [{ id: 'init', role: 'dev', trait: 'NORMAL' }],
      roster: { dev: 1, sales: 0, support: 0 },
      workers: 1,
      pendingDecision: null,
      terminalLogs: [],
      mood: 100,
    });
    vi.clearAllMocks();
  });

  describe('applyPendingDecision - HIRE_WORKER', () => {
    it('should hire workers when valid count and funds exist', () => {
      useGameStore.getState().setPendingDecision({
        action: 'HIRE_WORKER',
        parameters: { count: 2, role: 'dev' },
      });

      useGameStore.getState().applyPendingDecision();

      const state = useGameStore.getState();
      expect(state.employees.length).toBe(3); // 1 init + 2 hired
      expect(state.cash).toBe(50000 - 2 * 500);
      expect(state.pendingDecision).toBeNull();
      // Roster is recalculated in advanceTick, but here we check data integrity directly
      // Note: In current implementation, HIRE_WORKER updates `employees` but `roster` sync happens in `advanceTick` usually?
      // Wait, let's check the code: applyPendingDecision updates `employees`. `advanceTick` calls `getStats` which updates `roster`.
      // So immediately after applyPendingDecision, `roster` might be stale until next tick or if applyPendingDecision updates it.
      // Looking at the code: applyPendingDecision updates `employees` but DOES NOT explicitly update `roster` or `workers` count in the state update.
      // The `roster` and `workers` are updated in `advanceTick`.

      // Let's verify if `employees` array is correct.
      const devs = state.employees.filter((e) => e.role === 'dev');
      expect(devs.length).toBe(3);
    });

    it('should NOT reject invalid count (0) but clamp it to 1', () => {
      useGameStore.getState().setPendingDecision({
        action: 'HIRE_WORKER',
        parameters: { count: 0, role: 'dev' },
      });

      useGameStore.getState().applyPendingDecision();

      const state = useGameStore.getState();
      expect(state.employees.length).toBe(2); // 1 init + 1 hired (clamped from 0)
      expect(state.cash).toBe(50000 - 500);
    });

    it('should NOT reject invalid count (negative) but clamp it to 1', () => {
      useGameStore.getState().setPendingDecision({
        action: 'HIRE_WORKER',
        parameters: { count: -5, role: 'dev' },
      });

      useGameStore.getState().applyPendingDecision();

      const state = useGameStore.getState();
      expect(state.employees.length).toBe(2); // 1 init + 1 hired (clamped from -5)
    });

    it('should handle insufficient funds', () => {
      useGameStore.setState({ cash: 100 }); // Not enough for 1 worker (500)
      useGameStore.getState().setPendingDecision({
        action: 'HIRE_WORKER',
        parameters: { count: 1, role: 'dev' },
      });

      useGameStore.getState().applyPendingDecision();

      const state = useGameStore.getState();
      expect(state.employees.length).toBe(1);
      const hasError = state.terminalLogs.some((log) => log.includes('INSUFFICIENT FUNDS'));
      expect(hasError).toBe(true);
    });
  });

  describe('applyPendingDecision - FIRE_WORKER', () => {
    beforeEach(() => {
      // Setup 3 devs
      useGameStore.setState({
        employees: [
          { id: '1', role: 'dev', trait: 'NORMAL' },
          { id: '2', role: 'dev', trait: 'NORMAL' },
          { id: '3', role: 'dev', trait: 'NORMAL' },
        ],
        workers: 3,
        cash: 50000,
      });
    });

    it('should fire workers when valid count and funds exist', () => {
      useGameStore.getState().setPendingDecision({
        action: 'FIRE_WORKER',
        parameters: { count: 1, role: 'dev' },
      });

      useGameStore.getState().applyPendingDecision();

      const state = useGameStore.getState();
      expect(state.employees.length).toBe(2);
      expect(state.cash).toBe(50000 - 200); // Severance
    });

    it('should NOT reject invalid count (0) but clamp it to 1', () => {
      useGameStore.getState().setPendingDecision({
        action: 'FIRE_WORKER',
        parameters: { count: 0, role: 'dev' },
      });

      useGameStore.getState().applyPendingDecision();

      const state = useGameStore.getState();
      expect(state.employees.length).toBe(2); // 3 init - 1 fired (clamped from 0)
    });

    it('should NOT reject invalid count (negative) but clamp it to 1', () => {
      useGameStore.getState().setPendingDecision({
        action: 'FIRE_WORKER',
        parameters: { count: -1, role: 'dev' },
      });

      useGameStore.getState().applyPendingDecision();

      const state = useGameStore.getState();
      expect(state.employees.length).toBe(2); // 3 init - 1 fired (clamped from -1)
    });

    it('should reject fireCount when requesting more than available', () => {
      useGameStore.getState().setPendingDecision({
        action: 'FIRE_WORKER',
        parameters: { count: 10, role: 'dev' }, // Will clamp to 5 max, still > 3 available
      });

      useGameStore.getState().applyPendingDecision();

      const state = useGameStore.getState();
      expect(state.employees.length).toBe(3); // None fired
      expect(state.terminalLogs).toContain('> ERROR: NOT ENOUGH MATCHING WORKERS TO FIRE.');
    });

    it('should handle no matching workers', () => {
      useGameStore.getState().setPendingDecision({
        action: 'FIRE_WORKER',
        parameters: { count: 1, role: 'sales' }, // No sales workers
      });

      useGameStore.getState().applyPendingDecision();

      const state = useGameStore.getState();
      expect(state.employees.length).toBe(3);
      expect(state.terminalLogs).toContain('> ERROR: NO MATCHING WORKERS TO FIRE.');
    });

    it('should handle insufficient funds for severance', () => {
      useGameStore.setState({ cash: 100 }); // Not enough for severance (200)
      useGameStore.getState().setPendingDecision({
        action: 'FIRE_WORKER',
        parameters: { count: 1, role: 'dev' },
      });

      useGameStore.getState().applyPendingDecision();

      const state = useGameStore.getState();
      expect(state.employees.length).toBe(3);
      expect(state.terminalLogs).toContain('> ERROR: CANNOT AFFORD SEVERANCE.');
    });
  });

  describe('expanded strategic portfolio', () => {
    beforeEach(() => {
      useGameStore.setState({
        cash: 50000,
        employees: [
          { id: 'd1', role: 'dev', trait: 'DESIGNER' },
          { id: 's1', role: 'sales', trait: 'GROWTH_HACKER' },
          { id: 'o1', role: 'support', trait: 'OPS_VETERAN' },
        ],
        roster: { dev: 1, sales: 1, support: 1 },
        workers: 3,
        pendingDecision: null,
        activeEvents: [],
        eventHistory: [],
        terminalLogs: [],
        mood: 70,
        productAge: 80,
        productLevel: 2,
        technicalDebt: 40,
        serverHealth: 42,
        serverStability: 0.8,
        marketingMultiplier: 1,
        marketingLeft: 0,
        inventory: [],
        day: 1,
        tick: 0,
      });
    });

    it('should apply CUSTOMER_RESEARCH as a product-freshness action', () => {
      useGameStore.getState().setPendingDecision({ action: 'CUSTOMER_RESEARCH', parameters: {} });

      useGameStore.getState().applyPendingDecision();

      const state = useGameStore.getState();
      expect(state.cash).toBe(50000 - 1200);
      expect(state.productAge).toBe(45);
      expect(state.productLevel).toBe(2.5);
      expect(state.mood).toBe(79);
    });

    it('should apply INCIDENT_DRILL and clear an outage', () => {
      useGameStore.setState({
        activeEvents: [
          { type: 'TECH_OUTAGE', timeLeft: 10, severity: 'HIGH', description: 'outage' },
        ],
        eventHistory: [
          {
            type: 'TECH_OUTAGE',
            startedAtDay: 1,
            startedAtTick: 3,
            resolvedAtDay: null,
            resolvedAtTick: null,
            resolution: null,
          },
        ],
      });
      useGameStore.getState().setPendingDecision({ action: 'INCIDENT_DRILL', parameters: {} });

      useGameStore.getState().applyPendingDecision();

      const state = useGameStore.getState();
      expect(state.cash).toBe(50000 - 2500);
      expect(state.serverHealth).toBe(100);
      expect(state.serverStability).toBeCloseTo(0.95, 5);
      expect(state.technicalDebt).toBe(25);
      expect(state.activeEvents.some((event) => event.type === 'TECH_OUTAGE')).toBe(false);
      expect(state.eventHistory[0].resolution).toBe('resolved');
    });

    it('should apply FUNDRAISE as a runway action with tradeoffs', () => {
      useGameStore.getState().setPendingDecision({ action: 'FUNDRAISE', parameters: {} });

      useGameStore.getState().applyPendingDecision();

      const state = useGameStore.getState();
      expect(state.cash).toBe(68000);
      expect(state.mood).toBe(61);
      expect(state.technicalDebt).toBe(45);
    });
  });

  describe('manual hireWorker (Debug)', () => {
    it('should recalculate roster correctly', () => {
      useGameStore.getState().hireWorker('sales');

      const state = useGameStore.getState();
      expect(state.employees.length).toBe(2);
      expect(state.roster.sales).toBe(1);
      expect(state.roster.dev).toBe(1);
      expect(state.workers).toBe(2);
    });

    it('should validate role input', () => {
      useGameStore.getState().hireWorker(' invalid_role '); // Should default to dev

      const state = useGameStore.getState();
      expect(state.employees.length).toBe(2);
      // "invalid_role" -> defaults to 'dev' logic check?
      // Implementation: normalizedRole checked against ['dev','sales','support']. If not included -> 'dev'
      const newWorker = state.employees[1];
      expect(newWorker.role).toBe('dev');
    });
  });
});
