import { describe, it, expect } from 'vitest';
import { generateSystemPrompt } from './prompts';

describe('prompts', () => {
  describe('generateSystemPrompt', () => {
    it('returns a string containing key expected elements', () => {
      const prompt = generateSystemPrompt();

      // Basic assertions
      expect(typeof prompt).toBe('string');
      expect(prompt).toContain('Du bist die KI-CEO');
      expect(prompt).toContain('PERSÖNLICHKEIT:');
      expect(prompt).toContain('FINANZ-TREND:');
      expect(prompt).toContain('CONTEXT:');
      expect(prompt).toContain('AKTIONEN');

      // Expected action list
      expect(prompt).toContain('"action": "HIRE_WORKER"');
      expect(prompt).toContain('"action": "FIRE_WORKER"');
      expect(prompt).toContain('"action": "BUY_UPGRADE"');

      // Output format check
      expect(prompt).toContain('OUTPUT FORMAT (JSON ONLY):');
      expect(prompt).toContain('"action": "ACTION_NAME"');
    });
  });
});
