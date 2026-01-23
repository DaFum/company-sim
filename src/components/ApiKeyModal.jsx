import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { callAI } from '../services/aiService';

export const ApiKeyModal = () => {
  const apiKey = useGameStore((state) => state.apiKey);
  const setApiKey = useGameStore((state) => state.setApiKey);

  const [inputKey, setInputKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  // Wenn Key schon da ist, Modal nicht anzeigen
  if (apiKey) return null;

  const handleSave = async () => {
    if (!inputKey.startsWith('sk-')) {
      setError('Key muss mit "sk-" beginnen.');
      return;
    }

    setIsValidating(true);
    setError('');

    // Test-Call: Wir bitten um ein leeres JSON, nur um Auth zu testen
    const testPrompt = "Antworte nur mit einem leeren JSON-Objekt: {}";
    const testState = {};

    try {
      // Wir nutzen callAI, um den Key zu testen. suppressErrors = false
      const result = await callAI(inputKey, testPrompt, testState, false);

      if (result) {
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
          Diese Simulation läuft lokal in deinem Browser. Um das "Gehirn" (die KI) zu aktivieren,
          benötigst du einen OpenAI API Key.
        </p>
        <p style={{ fontSize: '0.8em', color: '#666', marginBottom: '20px' }}>
          Der Key wird nur im Session Storage gespeichert und niemals an uns gesendet.
        </p>

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
          onClick={handleSave}
          disabled={isValidating}
          style={{
            padding: '10px 20px', background: isValidating ? '#555' : '#00cc66',
            color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer',
            fontSize: '1em'
          }}
        >
          {isValidating ? 'Prüfe...' : 'Starten'}
        </button>
      </div>
    </div>
  );
};
