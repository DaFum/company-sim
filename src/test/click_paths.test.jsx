import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../App';
import { useGameStore } from '../store/gameStore';

// Mock Complex Components
vi.mock('../components/GameCanvas', () => ({
  GameCanvas: () => <div data-testid="game-canvas">Canvas</div>,
}));

vi.mock('../components/RetroTerminal', () => ({
  RetroTerminal: () => <div data-testid="retro-terminal">Terminal</div>,
}));

vi.mock('../hooks/useAiDirector', () => ({
  useAiDirector: vi.fn(),
}));

vi.mock('../hooks/useGameLoop', () => ({
  useGameLoop: vi.fn(),
}));

describe('App Click Paths', () => {
  beforeEach(() => {
    // Reset store
    act(() => {
      useGameStore.setState({
        cash: 50000,
        employees: [],
        workers: 0,
        isPlaying: false,
        gamePhase: 'WORK',
        pendingDecision: null,
        day: 1,
        tick: 0,
        ceoPersona: 'TestCEO',
        officeLevel: 1,
        mood: 100,
        productivity: 10,
        technicalDebt: 0,
        productLevel: 1,
        serverHealth: 100,
        marketingMultiplier: 1,
        marketingLeft: 0,
        inventory: [],
        activeEvents: [],
      });
    });
  });

  it('should toggle start/pause when button is clicked', () => {
    render(<App />);

    // Debugging: check what's rendered if this fails
    // screen.debug();

    const startButton = screen.getByRole('button', { name: /START/i });
    expect(startButton).toBeInTheDocument();

    fireEvent.click(startButton);

    expect(useGameStore.getState().isPlaying).toBe(true);

    // Re-query for the button text change
    expect(screen.getByRole('button', { name: /PAUSE/i })).toBeInTheDocument();
  });

  it('should hire a worker when Hire button is clicked', () => {
    render(<App />);

    const hireButton = screen.getByRole('button', { name: /Hire/i });
    fireEvent.click(hireButton);

    // Check Store
    expect(useGameStore.getState().workers).toBe(1);

    // Check UI update
    expect(screen.getByText(/Workers: 1/i)).toBeInTheDocument();
  });

  it('should show and confirm decision popup', () => {
    // Setup pending decision
    act(() => {
      useGameStore.setState({
        cash: 1000,
        pendingDecision: {
          decision_title: 'Hire Someone',
          reasoning: 'We need help',
          amount: 500,
          action: 'HIRE_WORKER',
          parameters: { count: 1, role: 'dev' },
          expected_effects:
            'Adds employees and increases payroll; support helps resolve operational events.',
          risk_assessment: 'MEDIUM',
        },
      });
    });

    render(<App />);

    // Use regex to match text even if it has quotes
    expect(screen.getByText(/Hire Someone/)).toBeInTheDocument();
    expect(screen.getByText(/Adds employees and increases payroll/)).toBeInTheDocument();
    expect(screen.getByText(/MEDIUM/)).toBeInTheDocument();

    // Click Confirm
    const confirmButton = screen.getByRole('button', { name: /Execute Decision/i });
    fireEvent.click(confirmButton);

    // Decision should be applied and its effects reflected in the store
    const state = useGameStore.getState();
    expect(state.pendingDecision).toBeNull();
    expect(state.employees.length).toBe(1);
    expect(state.workers).toBe(1); // UI helper stays in sync with employees
    expect(state.cash).toBe(500); // 1000 - 500
  });

  it('should render portfolio fallbacks when roster or employees are unavailable', () => {
    act(() => {
      useGameStore.setState({
        employees: undefined,
        roster: undefined,
      });
    });

    render(<App />);

    expect(screen.getByText('Simulation Portfolio')).toBeInTheDocument();
    expect(screen.getByText('NO CREW')).toBeInTheDocument();
    expect(screen.getByText('DEV')).toBeInTheDocument();
    expect(screen.getByText('SALES')).toBeInTheDocument();
    expect(screen.getByText('SUPPORT')).toBeInTheDocument();
  });

  it('should show game-flow KPIs with correct burn units and operations context', () => {
    act(() => {
      useGameStore.setState({
        employees: [{ id: 'dev-1', role: 'dev', trait: 'NORMAL' }],
        workers: 1,
        officeLevel: 1,
        serverHealth: 88,
        marketingMultiplier: 2,
        marketingLeft: 12,
        inventory: ['firewall'],
        activeEvents: [
          { type: 'RANSOMWARE', timeLeft: 20, severity: 'HIGH', description: 'alert' },
        ],
      });
    });

    render(<App />);

    expect(screen.getByText('Burn / Day')).toBeInTheDocument();
    expect(screen.getByText('150 €')).toBeInTheDocument();
    expect(screen.getByText('Burn / Tick')).toBeInTheDocument();
    expect(screen.getByText('2.5 €')).toBeInTheDocument();
    expect(screen.getByText('RANSOMWARE')).toBeInTheDocument();
    expect(screen.getByText('firewall')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('2x · 12t')).toBeInTheDocument();
  });
});
