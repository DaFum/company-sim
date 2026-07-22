import React from 'react';
import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameCanvas } from '../GameCanvas';
import * as gameStoreModule from '../../store/gameStore';
import Phaser from 'phaser';

const { mockDestroy } = vi.hoisted(() => ({
  mockDestroy: vi.fn(),
}));

// Mock Phaser
vi.mock('phaser', () => {
  const GameMock = vi.fn().mockImplementation(function() {
    this.destroy = mockDestroy;
    this.sound = { mute: false };
  });
  return {
    default: {
      Game: GameMock,
    }
  };
});

// Mock gameConfig to prevent dependency issues
vi.mock('../../game/config', () => {
  return {
    gameConfig: { test: 'config' }
  };
});

// A proper hook mock that allows triggering re-renders via useState
vi.mock('../../store/gameStore', () => {
  let mockState = { isMuted: false };
  let listeners = new Set();

  const useGameStoreMock = vi.fn((selector) => {
    const React = require('react');
    const [state, setState] = React.useState(mockState);

    React.useEffect(() => {
      const listener = (newState) => setState(newState);
      listeners.add(listener);
      return () => listeners.delete(listener);
    }, []);

    return selector(state);
  });

  useGameStoreMock.__setMockState = (newState) => {
    mockState = { ...mockState, ...newState };
    listeners.forEach((listener) => listener(mockState));
  };

  return { useGameStore: useGameStoreMock };
});

describe('GameCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gameStoreModule.useGameStore.__setMockState({ isMuted: false });
  });

  afterEach(() => {
    // We only clear, do not restore implementations
  });

  it('initializes Phaser game on mount', () => {
    render(<GameCanvas />);
    expect(Phaser.Game).toHaveBeenCalledTimes(1);
    expect(Phaser.Game).toHaveBeenCalledWith({ test: 'config' });
  });

  it('syncs mute state from store to Phaser game', () => {
    const { rerender } = render(<GameCanvas />);
    const gameInstance = Phaser.Game.mock.instances[0];
    expect(gameInstance.sound.mute).toBe(false);

    act(() => {
      gameStoreModule.useGameStore.__setMockState({ isMuted: true });
    });

    expect(gameInstance.sound.mute).toBe(true);
  });

  it('destroys Phaser game on unmount', () => {
    const { unmount } = render(<GameCanvas />);
    unmount();
    expect(mockDestroy).toHaveBeenCalledTimes(1);
    expect(mockDestroy).toHaveBeenCalledWith(true);
  });
});
