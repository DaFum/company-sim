import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callAI, getAvailableModels } from './aiService';

describe('aiService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('getAvailableModels', () => {
    it('should return default models if fetch fails', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const models = await getAvailableModels();
      expect(models).toHaveLength(4);
      expect(models[0].name).toBe('openai');
      expect(consoleSpy).toHaveBeenCalled();
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
    it('should return a fallback decision for a missing API key when suppressErrors is true', async () => {
      const result = await callAI('', 'system-prompt', {}, true, 'pollinations');

      expect(result).toEqual({
        action: 'NONE',
        parameters: {},
        reasoning: 'No API key provided.',
        risk_assessment: 'LOW',
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw for a missing API key when suppressErrors is false', async () => {
      await expect(callAI('', 'system-prompt', {}, false, 'pollinations')).rejects.toThrow(
        'No API key provided.'
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

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

      await expect(callAI('dummy-key', 'system-prompt', {}, false, 'pollinations')).rejects.toThrow(
        SyntaxError
      );

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should pass the selected Pollinations model to the chat request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '{"action":"NONE","parameters":{},"reasoning":"ok"}',
              },
            },
          ],
        }),
      });

      await callAI('dummy-key', 'system-prompt', {}, true, 'pollinations', 'mistral');

      const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(requestBody.model).toBe('mistral');
    });
  });
});
