import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { callAI } from '../services/aiService';

export const ApiKeyModal = () => {
  const apiKey = useGameStore((state) => state.apiKey);
  const setApiKey = useGameStore((state) => state.setApiKey);
  const setAiProvider = useGameStore((state) => state.setAiProvider);

  const [inputKey, setInputKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  // Auto-Detect Key from URL Hash (Pollinations Redirect)
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const urlKey = hashParams.get('api_key');

    if (urlKey) {
      console.log("Pollinations Key detected!");
      setAiProvider('pollinations');
      setApiKey(urlKey);

      // Cleanup URL
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [setApiKey, setAiProvider]);

  // Wenn Key schon da ist, Modal nicht anzeigen
  if (apiKey) return null;

  const handleSaveOpenAI = async () => {
    if (!inputKey.startsWith('sk-')) {
      setError('Key muss mit "sk-" beginnen.');
      return;
    }

    setIsValidating(true);
    setError('');

    const testPrompt = "Antworte nur mit einem leeren JSON-Objekt: {}";
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
    } catch (e) {
      setError('Verbindung fehlgeschlagen. Key ungültig?');
    } finally {
      setIsValidating(false);
    }
  };

  const handleConnectPollinations = () => {
    // Redirect to Pollinations Auth
    // Wir fordern permissions=profile und models=openai (da wir text-gen wollen)
    const redirectUrl = encodeURIComponent(window.location.href);
    window.location.href = `https://enter.pollinations.ai/authorize?redirect_url=${redirectUrl}&permissions=profile&models=openai`;
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: '#222', padding: '30px', borderRadius: '10px',
        maxWidth: '500px', width: '90%', color: '#fff', textAlign: 'center',
        border: '1px solid #444'
      }}>
        <h2>🔐 API Key benötigt</h2>
        <p style={{ color: '#aaa', marginBottom: '20px' }}>
          Wähle deinen AI Provider, um das "Gehirn" der Simulation zu aktivieren.
        </p>

        {/* OPTION 1: POLLINATIONS (FREE) */}
        <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #444' }}>
          <button
            onClick={handleConnectPollinations}
            style={{
              padding: '12px 24px', background: 'linear-gradient(45deg, #ff00cc, #3333ff)',
              color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer',
              fontSize: '1.1em', fontWeight: 'bold', width: '100%', marginBottom: '10px'
            }}
          >
            🌸 Connect with Pollinations (Free)
          </button>
          <small style={{ color: '#888' }}>Keine Kosten. Keine Registrierung.</small>
        </div>

        {/* OPTION 2: OPENAI */}
        <p style={{ fontSize: '0.9em', color: '#ccc', marginBottom: '10px' }}>Oder nutze deinen eigenen OpenAI Key:</p>

        <input
          type="password"
          placeholder="sk-..."
          value={inputKey}
          onChange={(e) => setInputKey(e.target.value)}
          style={{
            width: '100%', padding: '10px', marginBottom: '10px',
            background: '#333', border: '1px solid #555', color: '#fff'
          }}
        />

        {error && <p style={{ color: '#ff6666', fontSize: '0.9em' }}>{error}</p>}

        <button
          onClick={handleSaveOpenAI}
          disabled={isValidating}
          style={{
            padding: '10px 20px', background: isValidating ? '#555' : '#444',
            color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer',
            fontSize: '1em', width: '100%'
          }}
        >
          {isValidating ? 'Prüfe...' : 'OpenAI Key speichern'}
        </button>

        <p style={{ fontSize: '0.7em', color: '#666', marginTop: '15px' }}>
          Der Key wird nur im Session Storage gespeichert.
        </p>
      </div>
    </div>
  );
};
