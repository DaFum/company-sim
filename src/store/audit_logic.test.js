import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';

// Economic constants mirroring the values in gameStore.js.
const HIRING_COST = 500;
const SEVERANCE_COST = 200;

describe('GameStore Logic Audit', () => {
  beforeEach(() => {
    useGameStore.setState({
      cash: 50000,
      employees: [],
      workers: 0,
      roster: { dev: 0, sales: 0, support: 0 },
      tick: 0,
      day: 1,
      gamePhase: 'WORK',
      isPlaying: true,
      pendingDecision: null,
      activeEvents: [],
      mood: 100,
    });
  });

  describe('Hiring Logic', () => {
    it('should hire a worker if funds are sufficient', () => {
      useGameStore.setState({ cash: 1000 });
      useGameStore.getState().hireWorker('dev');

      const state = useGameStore.getState();
      expect(state.employees.length).toBe(1);
      expect(state.employees[0].role).toBe('dev');
      expect(state.workers).toBe(1);
      expect(state.cash).toBe(1000 - HIRING_COST);
    });

    it('should not hire if funds are insufficient', () => {
      useGameStore.setState({ cash: 400 });
      useGameStore.getState().hireWorker('dev');

      const state = useGameStore.getState();
      expect(state.employees.length).toBe(0);
      expect(state.cash).toBe(400);
    });

    it('should handle invalid roles by defaulting to dev', () => {
      useGameStore.setState({ cash: 1000 });
      useGameStore.getState().hireWorker('invalid_role');

      const state = useGameStore.getState();
      expect(state.employees[0].role).toBe('dev');
    });
  });

  describe('Firing Logic', () => {
    it('should fire a worker if funds cover severance', () => {
      useGameStore.setState({
        cash: 1000,
        employees: [{ id: 1, role: 'dev', trait: 'NORMAL' }],
        workers: 1,
        roster: { dev: 1, sales: 0, support: 0 },
      });

      useGameStore.getState().fireWorker();

      const state = useGameStore.getState();
      expect(state.employees.length).toBe(0);
      expect(state.workers).toBe(0);
      expect(state.cash).toBe(1000 - SEVERANCE_COST);
    });

    it('should not fire if funds are insufficient for severance', () => {
      useGameStore.setState({
        cash: 100,
        employees: [{ id: 1, role: 'dev', trait: 'NORMAL' }],
      });

      useGameStore.getState().fireWorker();

      const state = useGameStore.getState();
      expect(state.employees.length).toBe(1);
      expect(state.cash).toBe(100);
    });

    it('should not crash if trying to fire with no employees', () => {
      useGameStore.setState({ cash: 1000, employees: [] });
      useGameStore.getState().fireWorker();
      const state = useGameStore.getState();
      expect(state.employees.length).toBe(0);
      expect(state.cash).toBe(1000);
    });
  });

  describe('Game Loop & Economy', () => {
    it('should advance tick and change phase', () => {
      useGameStore.setState({
        tick: 48,
        gamePhase: 'WORK',
        isPlaying: true,
        employees: [{ id: 1, role: 'dev', trait: 'NORMAL' }],
      });

      const store = useGameStore.getState();
      store.advanceTick(); // 49
      expect(useGameStore.getState().tick).toBe(49);
      expect(useGameStore.getState().gamePhase).toBe('WORK');

      store.advanceTick(); // 50 -> Crunch
      expect(useGameStore.getState().tick).toBe(50);
      expect(useGameStore.getState().gamePhase).toBe('CRUNCH');
    });

    it('should calculate revenue and burn rate', () => {
      // Setup: 1 Dev, High Mood, High Productivity
      useGameStore.setState({
        cash: 1000,
        employees: [{ id: 1, role: 'dev', trait: 'NORMAL' }], // Salary 50
        officeLevel: 1, // Rent 100
        productivity: 10,
        mood: 100,
        isPlaying: true,
        roster: { dev: 1, sales: 0, support: 0 },
        // Explicitly pin the values the revenue formula depends on so the
        // test does not rely on store initialization defaults.
        productAge: 0, // < 20 -> demand factor 1.5
        serverStability: 1.0,
        productLevel: 1,
        marketingMultiplier: 1.0,
        // officeLevel 1 rent is 100. Dev salary 50. Total burn 150.
        // Burn per tick = 150 / 60 = 2.5.

        // devValue = devOutput(1) * prod(10) * mood(1) * stable(1) * level(1) = 10.
        // salesValue = 0. demandFactor = 1.5 (productAge 0 < 20).
        // Rev = 10 * (0.2 + 0) * 1.5 = 3.0.

        // Net = 3.0 - 2.5 = +0.5 per tick.
      });

      useGameStore.getState().advanceTick();

      const state = useGameStore.getState();
      // Revenue (3.0) > Cost (2.5) -> +0.5 profit
      expect(state.cash).toBeCloseTo(1000.5, 5);
    });
  });

  describe('Decision Application', () => {
    it('should apply HIRE_WORKER decision', () => {
      const decision = {
        action: 'HIRE_WORKER',
        parameters: { count: 2, role: 'sales' },
        amount: 1000,
      };
      useGameStore.setState({ pendingDecision: decision, cash: 2000 });

      useGameStore.getState().applyPendingDecision();

      const state = useGameStore.getState();
      expect(state.employees.length).toBe(2);
      expect(state.employees[0].role).toBe('sales');
      expect(state.pendingDecision).toBeNull();
      expect(state.cash).toBe(1000); // 2000 - 1000
    });

    it('should apply FIRE_WORKER decision', () => {
      useGameStore.setState({
        employees: [
          { id: 1, role: 'dev', trait: 'NORMAL' },
          { id: 2, role: 'dev', trait: 'NORMAL' },
        ],
        cash: 5000,
        workers: 2,
        roster: { dev: 2, sales: 0, support: 0 },
      });
      const decision = {
        action: 'FIRE_WORKER',
        parameters: { count: 1, role: 'dev' },
      };
      useGameStore.setState({ pendingDecision: decision });

      useGameStore.getState().applyPendingDecision();

      const state = useGameStore.getState();
      expect(state.employees.length).toBe(1);
      expect(state.workers).toBe(1); // synced with employees after decision
      expect(state.roster.dev).toBe(1);
      expect(state.cash).toBe(5000 - SEVERANCE_COST);
    });
  });

  describe('Chaos Events', () => {
    // Baseline: 1 dev, no sales, fresh product. day=1 keeps the random event
    // roll (day > 5) disabled so the tick is deterministic.
    const baseSetup = {
      cash: 1000,
      employees: [{ id: 1, role: 'dev', trait: 'NORMAL' }],
      roster: { dev: 1, sales: 0, support: 0 },
      officeLevel: 1,
      productivity: 10,
      mood: 100,
      isPlaying: true,
      productAge: 0,
      serverStability: 1.0,
      productLevel: 1,
      marketingMultiplier: 1.0,
      day: 1,
      tick: 0,
      gamePhase: 'WORK',
    };

    it('should reduce revenue while COMPETITOR_CLONE is active', () => {
      useGameStore.setState({ ...baseSetup, activeEvents: [] });
      useGameStore.getState().advanceTick();
      const gainNormal = useGameStore.getState().cash - baseSetup.cash;

      useGameStore.setState({
        ...baseSetup,
        activeEvents: [
          { type: 'COMPETITOR_CLONE', timeLeft: 999, severity: 'HIGH', description: 'clone' },
        ],
      });
      useGameStore.getState().advanceTick();
      const gainCompetitor = useGameStore.getState().cash - baseSetup.cash;

      expect(gainCompetitor).toBeLessThan(gainNormal);
    });

    it('should clear an active COMPETITOR_CLONE when PIVOT is applied', () => {
      useGameStore.setState({
        activeEvents: [
          { type: 'COMPETITOR_CLONE', timeLeft: 999, severity: 'HIGH', description: 'clone' },
        ],
        pendingDecision: { action: 'PIVOT', parameters: {} },
        cash: 5000,
      });

      useGameStore.getState().applyPendingDecision();

      const state = useGameStore.getState();
      expect(state.activeEvents.some((e) => e.type === 'COMPETITOR_CLONE')).toBe(false);
      expect(state.pendingDecision).toBeNull();
    });
  });

  describe('Trait economics', () => {
    const traitSetup = (employee) => ({
      employees: [employee],
      technicalDebt: 0,
      day: 1, // day <= 5 disables the random event roll -> deterministic
      tick: 0,
      gamePhase: 'WORK',
      isPlaying: true,
      mood: 100,
      productivity: 10,
      productAge: 0,
      serverStability: 1.0,
      productLevel: 1,
      marketingMultiplier: 1.0,
      cash: 5000,
      activeEvents: [],
    });

    it('should NOT accrue technical debt for a 10x engineer in a non-dev role', () => {
      useGameStore.setState(traitSetup({ id: 'e1', role: 'support', trait: '10x_ENGINEER' }));
      useGameStore.getState().advanceTick();
      expect(useGameStore.getState().technicalDebt).toBe(0);
    });

    it('should accrue technical debt for a 10x engineer dev', () => {
      useGameStore.setState(traitSetup({ id: 'e1', role: 'dev', trait: '10x_ENGINEER' }));
      useGameStore.getState().advanceTick();
      // base dev debt (0.05) + 10x dev debt (0.2) = 0.25
      expect(useGameStore.getState().technicalDebt).toBeCloseTo(0.25, 5);
    });
  });

  describe('Event lifetime across days', () => {
    it('should carry a still-active event into the next day', () => {
      useGameStore.setState({
        activeEvents: [{ type: 'HUMAN_SICK', timeLeft: 90, severity: 'HIGH', description: 'flu' }],
        employees: [{ id: 'e1', role: 'dev', trait: 'NORMAL' }],
        day: 3,
        mood: 100,
        cash: 5000,
        inventory: [],
      });

      useGameStore.getState().startNewDay();

      const state = useGameStore.getState();
      expect(state.day).toBe(4);
      expect(state.activeEvents.some((e) => e.type === 'HUMAN_SICK')).toBe(true);
    });

    it('should drop expired (timeLeft 0) events at the day boundary', () => {
      useGameStore.setState({
        activeEvents: [{ type: 'HUMAN_QUIT', timeLeft: 0, severity: 'HIGH', description: 'quit' }],
        employees: [{ id: 'e1', role: 'dev', trait: 'NORMAL' }],
        day: 3,
        mood: 100,
        cash: 5000,
        inventory: [],
      });

      useGameStore.getState().startNewDay();

      expect(useGameStore.getState().activeEvents.some((e) => e.type === 'HUMAN_QUIT')).toBe(false);
    });

    it('should preserve unresolved long-running event history when bounding old entries', () => {
      useGameStore.setState({
        activeEvents: [
          { type: 'COMPETITOR_CLONE', timeLeft: 800, severity: 'HIGH', description: 'clone' },
        ],
        eventHistory: [
          {
            type: 'COMPETITOR_CLONE',
            startedAtDay: 1,
            startedAtTick: 12,
            resolvedAtDay: null,
            resolvedAtTick: null,
            resolution: null,
          },
          {
            type: 'HUMAN_QUIT',
            startedAtDay: 1,
            startedAtTick: 20,
            resolvedAtDay: 1,
            resolvedAtTick: 25,
            resolution: 'resolved',
          },
        ],
        employees: [{ id: 'e1', role: 'dev', trait: 'NORMAL' }],
        day: 5,
        mood: 100,
        cash: 5000,
        inventory: [],
      });

      useGameStore.getState().startNewDay();

      const { eventHistory } = useGameStore.getState();
      expect(eventHistory.some((event) => event.type === 'COMPETITOR_CLONE')).toBe(true);
      expect(eventHistory.some((event) => event.type === 'HUMAN_QUIT')).toBe(false);
    });
  });

  describe('Employee ID uniqueness', () => {
    it('should assign unique ids when bulk-hiring in a single tick', () => {
      useGameStore.setState({
        employees: [],
        cash: 10000,
        pendingDecision: { action: 'HIRE_WORKER', parameters: { count: 3, role: 'dev' } },
      });

      useGameStore.getState().applyPendingDecision();

      const ids = useGameStore.getState().employees.map((e) => e.id);
      expect(ids).toHaveLength(3);
      expect(new Set(ids).size).toBe(3);
    });

    it('should assign unique ids across separate hires', () => {
      useGameStore.setState({ employees: [], cash: 10000 });

      useGameStore.getState().hireWorker('dev');
      useGameStore.getState().hireWorker('dev');

      const ids = useGameStore.getState().employees.map((e) => e.id);
      expect(new Set(ids).size).toBe(2);
    });
  });
});
