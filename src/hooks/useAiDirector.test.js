import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAiDirector } from './useAiDirector';
import { useGameStore } from '../store/gameStore';
import { callAI } from '../services/aiService';

// Mock the services and store
vi.mock('../services/aiService', () => ({
  callAI: vi.fn(),
}));

// Provide a mock for useGameStore that allows overriding state for tests
vi.mock('../store/gameStore', () => {
  let mockState = {};

  const useGameStoreMock = vi.fn((selector) => {
    return selector(mockState);
  });

  useGameStoreMock.getState = vi.fn(() => mockState);
  useGameStoreMock.setState = vi.fn((updates) => {
    mockState = { ...mockState, ...updates };
  });

  // Custom helper to set the mock state for a test
  useGameStoreMock.__setMockState = (newState) => {
    mockState = newState;
  };

  return { useGameStore: useGameStoreMock };
});

describe('useAiDirector', () => {
  let currentState;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Default state for testing
    currentState = {
      tick: 0,
      apiKey: 'test-key',
      aiProvider: 'openai',
      addTerminalLog: vi.fn(),
      setPendingDecision: vi.fn(),
      cash: 10000,
      employees: [],
      productAge: 10,
      workers: 5,
      roster: { Dev: 5 },
      day: 1,
      mood: 100,
      isAiThinking: false,
      inventory: [],
      eventHistory: [],
      activeEvents: [],
      getStats: vi.fn().mockReturnValue({ totalBurn: 250 }),
      technicalDebt: 20,
    };

    useGameStore.__setMockState(currentState);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should not trigger if tick is not 50', () => {
    renderHook(() => useAiDirector());

    expect(currentState.addTerminalLog).not.toHaveBeenCalled();
    expect(callAI).not.toHaveBeenCalled();
  });

  it('should trigger at tick 50, log progress, call API and set decision when API key is present', async () => {
    currentState.tick = 50;
    useGameStore.__setMockState(currentState);

    callAI.mockResolvedValueOnce({
      action: 'HIRE_WORKER',
      parameters: { count: 2, role: 'Dev' },
      reasoning: 'Need more developers to increase productivity.',
    });

    renderHook(() => useAiDirector());

    // Initially should set thinking state to true and log init messages
    expect(useGameStore.setState).toHaveBeenCalledWith({ isAiThinking: true });
    expect(currentState.addTerminalLog).toHaveBeenCalledWith('> INIT CRUNCH MODE...');
    expect(currentState.addTerminalLog).toHaveBeenCalledWith('> FREEZING ASSETS...');

    // Fast-forward timers for the setTimeout logs
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(currentState.addTerminalLog).toHaveBeenCalledWith('> ANALYZING CASHFLOW...');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500); // Total 2500
    });
    expect(currentState.addTerminalLog).toHaveBeenCalledWith('> CHECKING MORALE...');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500); // Total 4000
    });
    expect(currentState.addTerminalLog).toHaveBeenCalledWith('> CALCULATING SCENARIOS...');

    // Wait for async callAI to resolve
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(callAI).toHaveBeenCalledTimes(1);
    expect(callAI).toHaveBeenCalledWith(
      'test-key',
      expect.any(String), // systemPrompt
      expect.any(Object), // fullState
      true, // is JSON
      'openai' // provider
    );

    expect(currentState.setPendingDecision).toHaveBeenCalledWith({
      action: 'HIRE_WORKER',
      parameters: { count: 2, role: 'Dev' },
      reasoning: 'Need more developers to increase productivity.',
      decision_title: 'Hire 2 Dev(s)',
      amount: 1000, // 2 * 500
    });

    expect(useGameStore.setState).toHaveBeenCalledWith({ isAiThinking: false });
  });

  it('should use fallback delay and decision when no API key is present', async () => {
    currentState.tick = 50;
    currentState.apiKey = ''; // No API key
    useGameStore.__setMockState(currentState);

    renderHook(() => useAiDirector());

    // Should set thinking and initial logs
    expect(useGameStore.setState).toHaveBeenCalledWith({ isAiThinking: true });
    expect(currentState.addTerminalLog).toHaveBeenCalledWith('> INIT CRUNCH MODE...');

    // Fast-forward timers
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // callAI should not be called
    expect(callAI).not.toHaveBeenCalled();

    // Should set default fallback decision
    expect(currentState.setPendingDecision).toHaveBeenCalledWith({
      action: 'NONE',
      parameters: {},
      reasoning: 'No API Key found. Playing safe.',
      decision_title: 'Action: NONE',
      amount: 0,
    });

    expect(useGameStore.setState).toHaveBeenCalledWith({ isAiThinking: false });
  });

  it('should prevent double-firing due to processingRef', async () => {
    currentState.tick = 50;
    useGameStore.__setMockState(currentState);

    callAI.mockResolvedValueOnce({
      action: 'PIVOT',
      parameters: {},
      reasoning: 'Change direction.',
    });

    const { rerender } = renderHook(() => useAiDirector());

    // Change a dependency to force the useEffect to trigger again
    currentState.aiProvider = 'anthropic';
    useGameStore.__setMockState(currentState);
    rerender();

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // AI should only be called once
    expect(callAI).toHaveBeenCalledTimes(1);
  });

  it('should handle errors from callAI gracefully', async () => {
    currentState.tick = 50;
    useGameStore.__setMockState(currentState);

    // Simulate error
    callAI.mockRejectedValueOnce(new Error('API failed'));

    // Keep console.error from cluttering test output
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderHook(() => useAiDirector());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(currentState.addTerminalLog).toHaveBeenCalledWith('> ERROR: AI CONNECTION FAILED.');
    expect(useGameStore.setState).toHaveBeenCalledWith({ isAiThinking: false });

    consoleErrorSpy.mockRestore();
  });
});
