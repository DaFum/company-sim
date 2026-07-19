import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DecisionPopup } from '../DecisionPopup';

describe('DecisionPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when decision is null', () => {
    const { container } = render(<DecisionPopup decision={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders decision correctly', () => {
    const decision = {
      decision_title: 'Test Decision',
      reasoning: 'Because it is a test',
      amount: 1000,
      risk_assessment: 'HIGH',
      expected_effects: 'Things will happen',
    };

    const { getByText, container } = render(<DecisionPopup decision={decision} />);

    expect(getByText('The CEO has decided')).toBeDefined();
    expect(getByText('"Test Decision"')).toBeDefined();
    expect(getByText('"Because it is a test"')).toBeDefined();
    expect(getByText('Cost: 1000 €')).toBeDefined();

    // Check if the risk and expected effects are rendered correctly
    const riskElement = container.querySelector('.popup-risk');
    expect(riskElement.textContent).toContain('Risk:');
    expect(riskElement.textContent).toContain('HIGH');

    const expectedElement = container.querySelector('.popup-expected');
    expect(expectedElement.textContent).toContain('Expected:');
    expect(expectedElement.textContent).toContain('Things will happen');
  });

  it('calls onConfirm when execute button is clicked', () => {
    const onConfirmMock = vi.fn();
    const decision = {
      decision_title: 'Test Decision',
      reasoning: 'Because it is a test',
      amount: 1000,
    };

    const { getByText } = render(<DecisionPopup decision={decision} onConfirm={onConfirmMock} />);

    const executeBtn = getByText('Execute Decision');
    fireEvent.click(executeBtn);

    expect(onConfirmMock).toHaveBeenCalledTimes(1);
  });

  it('calls onVeto when veto button is clicked', () => {
    const onVetoMock = vi.fn();
    const decision = {
      decision_title: 'Test Decision',
      reasoning: 'Because it is a test',
      amount: 1000,
    };

    const { getByText } = render(<DecisionPopup decision={decision} onVeto={onVetoMock} />);

    const vetoBtn = getByText('Veto Decision');
    fireEvent.click(vetoBtn);

    expect(onVetoMock).toHaveBeenCalledTimes(1);
  });
});
