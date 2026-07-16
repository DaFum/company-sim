import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useGameLoop } from './useGameLoop';
import { useGameStore } from '../store/gameStore';

// Provide a mock for useGameStore that allows overriding state for tests
vi.mock('../store/gameStore', () => {
  let mockState = {};

  const useGameStoreMock = vi.fn((selector) => {
    return selector(mockState);
  });

  // Custom helper to set the mock state for a test
  useGameStoreMock.__setMockState = (newState) => {
    mockState = newState;
  };

  return { useGameStore: useGameStoreMock };
});

describe('useGameLoop', () => {
  let currentState;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    currentState = {
      advanceTick: vi.fn(),
      isPlaying: false,
      gameSpeed: 1000,
    };

    useGameStore.__setMockState(currentState);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should not call advanceTick when isPlaying is false', () => {
    renderHook(() => useGameLoop());

    vi.advanceTimersByTime(5000);

    expect(currentState.advanceTick).not.toHaveBeenCalled();
  });

  it('should call advanceTick every gameSpeed ms when isPlaying is true', () => {
    currentState.isPlaying = true;
    currentState.gameSpeed = 1000;
    useGameStore.__setMockState(currentState);

    renderHook(() => useGameLoop());

    expect(currentState.advanceTick).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(currentState.advanceTick).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2000);
    expect(currentState.advanceTick).toHaveBeenCalledTimes(3);
  });

  it('should stop calling advanceTick when isPlaying changes to false', () => {
    currentState.isPlaying = true;
    currentState.gameSpeed = 1000;
    useGameStore.__setMockState(currentState);

    const { rerender } = renderHook(() => useGameLoop());

    vi.advanceTimersByTime(1000);
    expect(currentState.advanceTick).toHaveBeenCalledTimes(1);

    // Update state and rerender
    currentState.isPlaying = false;
    useGameStore.__setMockState(currentState);
    rerender();

    vi.advanceTimersByTime(3000);
    // Should still be 1 because interval was cleared
    expect(currentState.advanceTick).toHaveBeenCalledTimes(1);
  });

  it('should adjust loop speed when gameSpeed changes', () => {
    currentState.isPlaying = true;
    currentState.gameSpeed = 1000;
    useGameStore.__setMockState(currentState);

    const { rerender } = renderHook(() => useGameLoop());

    vi.advanceTimersByTime(1000);
    expect(currentState.advanceTick).toHaveBeenCalledTimes(1);

    // Change speed
    currentState.gameSpeed = 500;
    useGameStore.__setMockState(currentState);
    rerender();

    vi.advanceTimersByTime(1000);
    // 1000ms at 500ms speed means 2 more ticks
    expect(currentState.advanceTick).toHaveBeenCalledTimes(3);
  });

  it('should clear interval on unmount', () => {
    currentState.isPlaying = true;
    currentState.gameSpeed = 1000;
    useGameStore.__setMockState(currentState);

    const { unmount } = renderHook(() => useGameLoop());

    vi.advanceTimersByTime(1000);
    expect(currentState.advanceTick).toHaveBeenCalledTimes(1);

    unmount();

    vi.advanceTimersByTime(3000);
    // Should still be 1 because interval was cleared on unmount
    expect(currentState.advanceTick).toHaveBeenCalledTimes(1);
  });
});
