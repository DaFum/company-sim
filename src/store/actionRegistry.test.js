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

  it('should allow buying non-unique upgrades (like plants) multiple times', () => {
    const state = { inventory: ['plants'], cash: 5000, mood: 50 };
    const updates = {};
    const result = ACTION_DEFINITIONS.BUY_UPGRADE.apply(state, updates, { item_id: 'plants' });
    expect(result).toEqual({});
    expect(updates.inventory).toContain('plants');
  });

  it('should apply plants upgrade and cap mood at 100', () => {
    const state = { inventory: [], cash: 5000, mood: 90 };
    const updates = {};
    ACTION_DEFINITIONS.BUY_UPGRADE.apply(state, updates, { item_id: 'plants' });
    expect(updates.mood).toBe(100);
  });

  it('should apply server_rack_v2 and clear TECH_OUTAGE active events', () => {
    const state = {
      inventory: [],
      cash: 5000,
      activeEvents: [{ type: 'TECH_OUTAGE' }, { type: 'OTHER_EVENT' }]
    };
    const updates = {};
    ACTION_DEFINITIONS.BUY_UPGRADE.apply(state, updates, { item_id: 'server_rack_v2' });
    expect(updates.serverStability).toBe(1.0);
    expect(updates.serverHealth).toBe(100);
    expect(updates.activeEvents).toEqual([{ type: 'OTHER_EVENT' }]);
  });

  it('should apply brand_studio and set marketing multiplier and duration', () => {
    const state = { inventory: [], cash: 5000, marketingMultiplier: 1.0, marketingLeft: 0 };
    const updates = {};
    ACTION_DEFINITIONS.BUY_UPGRADE.apply(state, updates, { item_id: 'brand_studio' });
    expect(updates.marketingMultiplier).toBe(1.4);
    expect(updates.marketingLeft).toBe(90);
  });
});
