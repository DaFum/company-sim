import { describe, it, expect } from 'vitest';
import { ACTION_DEFINITIONS } from './actionRegistry';

describe('actionRegistry - BUY_UPGRADE', () => {
  it('should return error if item_id is invalid', () => {
    const result = ACTION_DEFINITIONS.BUY_UPGRADE.apply({}, {}, { item_id: 'invalid_item' });
    expect(result).toEqual({ error: '> ERROR: INVALID UPGRADE invalid_item' });
  });

  it('should return error if item is already owned', () => {
    const state = { inventory: ['coffee_machine'] };
    const result = ACTION_DEFINITIONS.BUY_UPGRADE.apply(state, {}, { item_id: 'coffee_machine' });
    expect(result).toEqual({ error: '> ERROR: ALREADY OWN coffee_machine' });
  });

  it('should return error if funds are insufficient', () => {
    const state = { inventory: [], cash: 1000 };
    const result = ACTION_DEFINITIONS.BUY_UPGRADE.apply(state, {}, { item_id: 'coffee_machine' });
    expect(result).toEqual({ error: '> ERROR: NO FUNDS FOR coffee_machine' });
  });

  it('should apply valid upgrade if funds are sufficient', () => {
    const state = { inventory: [], cash: 5000, productivity: 10 };
    const updates = {};
    const result = ACTION_DEFINITIONS.BUY_UPGRADE.apply(state, updates, { item_id: 'coffee_machine' });
    expect(result).toEqual({});
    expect(updates.cash).toBe(3000);
    expect(updates.inventory).toContain('coffee_machine');
    expect(updates.productivity).toBe(12);
  });
});
