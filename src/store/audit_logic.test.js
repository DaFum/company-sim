import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from './gameStore';

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
      expect(state.cash).toBe(500); // 1000 - 500
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
        roster: { dev: 1, sales: 0, support: 0 }
      });

      useGameStore.getState().fireWorker();

      const state = useGameStore.getState();
      expect(state.employees.length).toBe(0);
      expect(state.workers).toBe(0);
      expect(state.cash).toBe(800); // 1000 - 200
    });

    it('should not fire if funds are insufficient for severance', () => {
      useGameStore.setState({
        cash: 100,
        employees: [{ id: 1, role: 'dev', trait: 'NORMAL' }]
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
      useGameStore.setState({ tick: 48, gamePhase: 'WORK', isPlaying: true });

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
        // officeLevel 1 rent is 100. Dev salary 50. Total burn 150.
        // Burn per tick = 150 / 60 = 2.5.

        // Revenue: devOutput(1) * prod(10) * mood(1) * stable(1) * level(1) = 10.
        // salesValue = 0.
        // Rev = 10 * (0.2 + 0) * 1.0 = 2.0.

        // Net = 2.0 - 2.5 = -0.5 per tick.
      });

      useGameStore.getState().advanceTick();

      const state = useGameStore.getState();
      // Revenue (3.0) > Cost (2.5) -> +0.5 profit
      expect(state.cash).toBe(1000.5);
    });
  });

  describe('Decision Application', () => {
      it('should apply HIRE_WORKER decision', () => {
          const decision = {
              action: 'HIRE_WORKER',
              parameters: { count: 2, role: 'sales' },
              amount: 1000
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
                  { id: 2, role: 'dev', trait: 'NORMAL' }
              ],
              cash: 5000
          });
          const decision = {
              action: 'FIRE_WORKER',
              parameters: { count: 1, role: 'dev' },
          };
          useGameStore.setState({ pendingDecision: decision });

          useGameStore.getState().applyPendingDecision();

          const state = useGameStore.getState();
          expect(state.employees.length).toBe(1);
          expect(state.cash).toBe(4800); // 5000 - 200
      });
  });
});
