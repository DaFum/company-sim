import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callAI, getAvailableModels } from './aiService';

const { mockCreate, mockConstructor } = vi.hoisted(() => {
  return {
    mockCreate: vi.fn(),
    mockConstructor: vi.fn(),
  };
});

vi.mock('openai', () => {
  return {
    default: class OpenAI {
      constructor(...args) {
        mockConstructor(...args);
        this.chat = {
          completions: {
            create: mockCreate,
          },
        };
      }
    },
  };
});

describe('aiService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.clearAllMocks();
    mockCreate.mockReset();
    mockConstructor.mockReset();
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

    it('should return default models if response is not ok', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
      });
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const models = await getAvailableModels();
      expect(models).toHaveLength(4);
      expect(models[0].name).toBe('openai');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Could not fetch Pollinations models:',
        expect.objectContaining({ message: 'Failed to fetch models' })
      );
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

    it('should fallback to default models if fetch returns !ok', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
      });
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const models = await getAvailableModels();
      expect(models).toHaveLength(4);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Could not fetch Pollinations models:',
        expect.objectContaining({ message: 'Failed to fetch models' })
      );
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

      await expect(callAI(null, 'system-prompt', {}, false, 'pollinations')).rejects.toThrow(
        'No API key provided.'
      );

      await expect(callAI(undefined, 'system-prompt', {}, false, 'pollinations')).rejects.toThrow(
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

    it('should return a fallback decision when pollinations fetch returns !ok and suppressErrors is true', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await callAI('dummy-key', 'system-prompt', {}, true, 'pollinations');

      expect(result).toEqual({
        action: 'NONE',
        parameters: {},
        reasoning: 'AI Connection Failed. Playing it safe.',
        risk_assessment: 'LOW',
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        'AI Service Error:',
        expect.objectContaining({ message: 'Pollinations API Error: Internal Server Error' })
      );
    });

    it('should throw an error when pollinations fetch returns !ok and suppressErrors is false', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(callAI('dummy-key', 'system-prompt', {}, false, 'pollinations')).rejects.toThrow(
        'Pollinations API Error: Internal Server Error'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'AI Service Error:',
        expect.objectContaining({ message: 'Pollinations API Error: Internal Server Error' })
      );
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

    describe('openai provider', () => {
      it('should successfully call OpenAI and return parsed JSON', async () => {
        mockCreate.mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: '{"action":"HIRE","parameters":{},"reasoning":"need help"}',
              },
            },
          ],
        });

        const result = await callAI('dummy-key', 'system-prompt', { day: 1 }, true, 'openai');

        expect(mockConstructor).toHaveBeenCalledWith({
          apiKey: 'dummy-key',
          dangerouslyAllowBrowser: true,
        });
        expect(mockCreate).toHaveBeenCalledTimes(1);
        const args = mockCreate.mock.calls[0][0];
        expect(args.model).toBe('gpt-4o-mini');
        expect(args.messages).toEqual([
          { role: 'system', content: 'system-prompt' },
          { role: 'user', content: JSON.stringify({ day: 1 }) },
        ]);
        expect(args.response_format).toEqual({ type: 'json_object' });

        expect(result).toEqual({
          action: 'HIRE',
          parameters: {},
          reasoning: 'need help',
        });
      });

      it('should pass gpt-4o-mini to OpenAI if model is openai', async () => {
        mockCreate.mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: '{"action":"NONE"}',
              },
            },
          ],
        });

        await callAI('dummy-key', 'system-prompt', {}, true, 'openai', 'openai');

        expect(mockCreate.mock.calls[0][0].model).toBe('gpt-4o-mini');
      });

      it('should pass the selected model to OpenAI if model is not openai', async () => {
        mockCreate.mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: '{"action":"NONE"}',
              },
            },
          ],
        });

        await callAI('dummy-key', 'system-prompt', {}, true, 'openai', 'gpt-4o');

        expect(mockCreate.mock.calls[0][0].model).toBe('gpt-4o');
      });

      it('should handle empty AI response from OpenAI when suppressErrors is true', async () => {
        mockCreate.mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: '',
              },
            },
          ],
        });

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = await callAI('dummy-key', 'system-prompt', {}, true, 'openai');

        expect(result).toEqual({
          action: 'NONE',
          parameters: {},
          reasoning: 'AI Connection Failed. Playing it safe.',
          risk_assessment: 'LOW',
        });
        expect(consoleSpy).toHaveBeenCalled();
      });

      it('should throw Error for missing action field in response when suppressErrors is false', async () => {
        mockCreate.mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: '{"reasoning":"I forgot the action"}',
              },
            },
          ],
        });

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        await expect(callAI('dummy-key', 'system-prompt', {}, false, 'openai')).rejects.toThrow(
          "Missing 'action' field"
        );
        expect(consoleSpy).toHaveBeenCalled();
      });

      it('should handle AbortError and return timeout fallback decision', async () => {
        const abortError = new Error('The operation was aborted');
        abortError.name = 'AbortError';
        mockCreate.mockRejectedValueOnce(abortError);

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = await callAI('dummy-key', 'system-prompt', {}, true, 'openai');

        expect(result).toEqual({
          action: 'NONE',
          parameters: {},
          reasoning: 'AI Connection Timeout. Playing it safe.',
          risk_assessment: 'LOW',
        });
        expect(consoleSpy).toHaveBeenCalled();
      });
    });
  });
});
