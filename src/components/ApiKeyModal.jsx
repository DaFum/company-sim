import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { callAI, getAvailableModels } from '../services/aiService';

export const ApiKeyModal = () => {
  const apiKey = useGameStore((state) => state.apiKey);
  const setApiKey = useGameStore((state) => state.setApiKey);
  const setAiProvider = useGameStore((state) => state.setAiProvider);
  const aiModel = useGameStore((state) => state.aiModel);
  const setAiModel = useGameStore((state) => state.setAiModel);

  const [inputKey, setInputKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  const [availableModels, setAvailableModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Detect the key returned by the Pollinations redirect.
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const urlKey = hashParams.get('api_key');

    if (urlKey) {
      console.log('Pollinations Key detected!');
      setAiProvider('pollinations');
      setApiKey(urlKey);

      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [setAiProvider, setApiKey]);

  const loadPollinationsModels = async () => {
    if (availableModels.length || isLoadingModels) return;

    setIsLoadingModels(true);
    const models = await getAvailableModels();
    setAvailableModels(models);
    setIsLoadingModels(false);
  };

  if (apiKey) return null;

  const handleSaveOpenAI = async () => {
    if (!inputKey.startsWith('sk-')) {
      setError('Key must start with "sk-".');
      return;
    }

    setIsValidating(true);
    setError('');

    const testPrompt = 'Reply only with an empty JSON object: {}';
    const testState = {};

    try {
      const result = await callAI(inputKey, testPrompt, testState, false, 'openai');

      if (result) {
        setAiProvider('openai');
        setApiKey(inputKey);
      } else {
        setError('Invalid response from server.');
      }
    } catch {
      setError('Connection failed. Invalid Key?');
    } finally {
      setIsValidating(false);
    }
  };

  const handleConnectPollinations = () => {
    const redirectUrl = encodeURIComponent(window.location.href);
    window.location.href = `https://enter.pollinations.ai/authorize?redirect_url=${redirectUrl}&permissions=profile&models=openai`;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>🔐 API Key Required</h2>
        <p className="modal-description">
          Choose your AI Provider to activate the simulation's "Brain".
        </p>

        {/* Pollinations provider */}
        <div className="pollinations-section">
          <button
            onMouseEnter={loadPollinationsModels}
            onFocus={loadPollinationsModels}
            onClick={handleConnectPollinations}
            className="pollinations-button"
          >
            🌸 Connect with Pollinations (Free)
          </button>

          {/* Pollinations model selector */}
          <div
            className="model-selector"
            onMouseEnter={loadPollinationsModels}
            onFocusCapture={loadPollinationsModels}
          >
            <label className="model-label">Choose a model:</label>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              disabled={isLoadingModels}
              className="model-select"
            >
              {isLoadingModels ? (
                <option>Loading models...</option>
              ) : availableModels.length ? (
                availableModels.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.name} {model.description ? `- ${model.description}` : ''}
                  </option>
                ))
              ) : (
                <option value={aiModel}>Focus to load models</option>
              )}
            </select>
          </div>

          <small className="small-text">No costs. No registration.</small>
        </div>

        {/* OpenAI provider */}
        <p className="openai-label">Or use your own OpenAI Key:</p>

        <input
          type="password"
          placeholder="sk-..."
          value={inputKey}
          onChange={(e) => setInputKey(e.target.value)}
          className="openai-input"
        />

        {error && <p className="error-text">{error}</p>}

        <button
          onClick={handleSaveOpenAI}
          disabled={isValidating}
          className={`save-button ${isValidating ? 'validating' : 'ready'}`}
        >
          {isValidating ? 'Checking...' : 'Save OpenAI Key'}
        </button>

        <p className="storage-note">
          The key is stored in Session Storage and used directly from this browser. Use a restricted
          or temporary key.
        </p>
      </div>
    </div>
  );
};
