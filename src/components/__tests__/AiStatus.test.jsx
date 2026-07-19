import React from 'react';
import { render } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AiStatus } from '../AiStatus';
import { useGameStore } from '../../store/gameStore';

// Mock the store
vi.mock('../../store/gameStore', () => {
  let mockState = {};

  const useGameStoreMock = vi.fn((selector) => {
    return selector(mockState);
  });

  useGameStoreMock.__setMockState = (newState) => {
    mockState = newState;
  };

  return { useGameStore: useGameStoreMock };
});

describe('AiStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.__setMockState({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly when AI is thinking', () => {
    useGameStore.__setMockState({ isAiThinking: true, mood: 100 });
    const { container, getByText } = render(<AiStatus />);

    expect(getByText('AI_CORE: ANALYZING...')).toBeDefined();
    const eye = container.querySelector('.ai-status-eye');
    expect(eye.style.animation).toContain('pulse');

    // In vitest/jsdom environment, hex codes might not be converted to rgb in inline styles
    // Also jsdom might strip or format the string slightly differently
    const backgroundColor = eye.style.backgroundColor;
    expect(['rgb(0, 204, 255)', '#00ccff', 'rgb(0,204,255)']).toContain(backgroundColor);
  });

  it('renders correctly when AI is not thinking and mood is good', () => {
    useGameStore.__setMockState({ isAiThinking: false, mood: 80 });
    const { container, getByText } = render(<AiStatus />);

    expect(getByText('AI_CORE: WATCHING')).toBeDefined();
    const eye = container.querySelector('.ai-status-eye');

    // Check animation none
    expect(eye.style.animation).toContain('none');

    const backgroundColor = eye.style.backgroundColor;
    expect(['rgb(0, 255, 0)', '#00ff00', 'rgb(0,255,0)']).toContain(backgroundColor);
  });

  it('renders correctly when AI is not thinking and mood is low', () => {
    useGameStore.__setMockState({ isAiThinking: false, mood: 10 });
    const { container, getByText } = render(<AiStatus />);

    expect(getByText('AI_CORE: WATCHING')).toBeDefined();
    const eye = container.querySelector('.ai-status-eye');

    const backgroundColor = eye.style.backgroundColor;
    expect(['rgb(255, 0, 0)', '#ff0000', 'rgb(255,0,0)']).toContain(backgroundColor);
  });
});
