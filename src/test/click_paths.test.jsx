import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../App';
import { useGameStore } from '../store/gameStore';

// Mock Complex Components
vi.mock('../components/GameCanvas', () => ({
  GameCanvas: () => <div data-testid="game-canvas">Canvas</div>
}));

vi.mock('../components/RetroTerminal', () => ({
  RetroTerminal: () => <div data-testid="retro-terminal">Terminal</div>
}));

vi.mock('../hooks/useAiDirector', () => ({
  useAiDirector: vi.fn()
}));

vi.mock('../hooks/useGameLoop', () => ({
  useGameLoop: vi.fn()
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
        ceoPersona: 'TestCEO'
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
        pendingDecision: {
          decision_title: 'Hire Someone',
          reasoning: 'We need help',
          amount: 500,
          action: 'HIRE_WORKER',
          parameters: { count: 1 }
        }
      });
    });

    render(<App />);

    // Use regex to match text even if it has quotes
    expect(screen.getByText(/Hire Someone/)).toBeInTheDocument();

    // Click Confirm
    const confirmButton = screen.getByRole('button', { name: /Start Next Day/i });
    fireEvent.click(confirmButton);

    // Decision should be applied (cleared)
    expect(useGameStore.getState().pendingDecision).toBeNull();
  });
});
