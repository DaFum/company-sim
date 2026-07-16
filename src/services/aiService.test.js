import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callAI, getAvailableModels } from './aiService';

// Mock fetch globally
global.fetch = vi.fn();

describe('aiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAvailableModels', () => {
    it('should return default models if fetch fails', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      const models = await getAvailableModels();
      expect(models).toHaveLength(4);
      expect(models[0].name).toBe('openai');
    });

    it('should return fetched models if fetch succeeds', async () => {
      const mockModels = [{ name: 'test-model', description: 'Test Model' }];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockModels,
      });
      const models = await getAvailableModels();
      expect(models).toEqual(mockModels);
    });
  });

  describe('callAI', () => {
    it('should handle JSON parse errors and return a fallback decision when suppressErrors is true', async () => {
      // Mock fetch for pollinations to return invalid JSON
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'this is not valid json',
              },
            },
          ],
        }),
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await callAI('dummy-key', 'system-prompt', {}, true, 'pollinations');

      expect(result).toEqual({
        action: 'NONE',
        parameters: {},
        reasoning: 'AI Connection Failed. Playing it safe.',
        risk_assessment: 'LOW',
      });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should throw an error for JSON parse failure when suppressErrors is false', async () => {
      // Mock fetch for pollinations to return invalid JSON
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'this is not valid json',
              },
            },
          ],
        }),
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        callAI('dummy-key', 'system-prompt', {}, false, 'pollinations')
      ).rejects.toThrow(SyntaxError);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
