import React from 'react';
import { render } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DecisionHistory } from '../DecisionHistory';
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

describe('DecisionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly when history is empty', () => {
    useGameStore.__setMockState({ decisionHistory: [] });
    const { getByText } = render(<DecisionHistory />);
    expect(getByText('NO DECISIONS YET')).toBeDefined();
  });

  it('renders history in reverse order', () => {
    const history = [
      {
        day: 1,
        action: 'HIRE_WORKER',
        vetoed: false,
        decision_title: 'Hire 1 dev',
        reasoning: 'Need help',
        expected_effects: 'More cost',
        risk_assessment: 'LOW',
        amount: 500,
      },
      {
        day: 2,
        action: 'FIRE_WORKER',
        vetoed: true,
        decision_title: 'Fire 1 dev',
        reasoning: 'Too expensive',
        expected_effects: 'Less cost',
        risk_assessment: 'HIGH',
        amount: 0,
      },
    ];

    useGameStore.__setMockState({ decisionHistory: history });
    const { container, getByText } = render(<DecisionHistory />);

    // Check if the first item rendered is the last item in the array (day 2)
    const items = container.querySelectorAll('.history-item');
    expect(items.length).toBe(2);

    expect(items[0].querySelector('.history-day').textContent).toBe('DAY 2');
    expect(items[0].querySelector('.history-status').textContent).toBe('VETOED');
    expect(items[0].classList.contains('vetoed')).toBe(true);

    expect(items[1].querySelector('.history-day').textContent).toBe('DAY 1');
    expect(items[1].querySelector('.history-status').textContent).toBe('EXECUTED');
    expect(items[1].classList.contains('executed')).toBe(true);

    // Check if specific fields are rendered
    expect(getByText('"Hire 1 dev"')).toBeDefined();
    expect(getByText('"Need help"')).toBeDefined();
    expect(getByText('Expected: More cost')).toBeDefined();
    expect(getByText('Risk: LOW')).toBeDefined();
    expect(getByText('Cost: 500 €')).toBeDefined();
  });
});
