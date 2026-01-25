import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { callAI, getAvailableModels } from '../services/aiService';

export const ApiKeyModal = () => {
  const apiKey = useGameStore((state) => state.apiKey);
  const setApiKey = useGameStore((state) => state.setApiKey);
  // const aiProvider = useGameStore((state) => state.aiProvider); // Unused
  const setAiProvider = useGameStore((state) => state.setAiProvider);
  const aiModel = useGameStore((state) => state.aiModel);
  const setAiModel = useGameStore((state) => state.setAiModel);

  const [inputKey, setInputKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  const [availableModels, setAvailableModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Auto-Detect Key from URL Hash (Pollinations Redirect)
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const urlKey = hashParams.get('api_key');

    if (urlKey) {
      console.log('Pollinations Key detected!');
      setAiProvider('pollinations');
      setApiKey(urlKey);

      // Cleanup URL
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Load Models on Mount
  useEffect(() => {
    const loadModels = async () => {
      setIsLoadingModels(true);
      const models = await getAvailableModels();
      setAvailableModels(models);
      setIsLoadingModels(false);
    };
    loadModels();
  }, []);

  // Wenn Key schon da ist, Modal nicht anzeigen
  if (apiKey) return null;

  const handleSaveOpenAI = async () => {
    if (!inputKey.startsWith('sk-')) {
      setError('Key muss mit "sk-" beginnen.');
      return;
    }

    setIsValidating(true);
    setError('');

    const testPrompt = 'Antworte nur mit einem leeren JSON-Objekt: {}';
    const testState = {};

    try {
      // Test OpenAI
      const result = await callAI(inputKey, testPrompt, testState, false, 'openai');

      if (result) {
        setAiProvider('openai');
        setApiKey(inputKey);
      } else {
        setError('Ungültige Antwort vom Server.');
      }
    } catch {
      setError('Verbindung fehlgeschlagen. Key ungültig?');
    } finally {
      setIsValidating(false);
    }
  };

  const handleConnectPollinations = () => {
    // Redirect to Pollinations Auth
    const redirectUrl = encodeURIComponent(window.location.href);
    window.location.href = `https://enter.pollinations.ai/authorize?redirect_url=${redirectUrl}&permissions=profile&models=openai`;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>🔐 API Key benötigt</h2>
        <p className="modal-description">
          Wähle deinen AI Provider, um das "Gehirn" der Simulation zu aktivieren.
        </p>

        {/* OPTION 1: POLLINATIONS (FREE) */}
        <div className="pollinations-section">
          <button onClick={handleConnectPollinations} className="pollinations-button">
            🌸 Connect with Pollinations (Free)
          </button>

          {/* MODEL SELECTOR FOR POLLINATIONS */}
          <div className="model-selector">
            <label className="model-label">Wähle ein Modell:</label>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              disabled={isLoadingModels}
              className="model-select"
            >
              {isLoadingModels ? (
                <option>Lade Modelle...</option>
              ) : (
                availableModels.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.name} {model.description ? `- ${model.description}` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <small className="small-text">Keine Kosten. Keine Registrierung.</small>
        </div>

        {/* OPTION 2: OPENAI */}
        <p className="openai-label">Oder nutze deinen eigenen OpenAI Key:</p>

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
          {isValidating ? 'Prüfe...' : 'OpenAI Key speichern'}
        </button>

        <p className="storage-note">Der Key wird nur im Session Storage gespeichert.</p>
      </div>
    </div>
  );
};
