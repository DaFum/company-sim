import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { callAI } from '../services/aiService';
import { generateSystemPrompt } from '../services/prompts';

export const useAiDirector = () => {
  const isAiThinking = useGameStore((state) => state.isAiThinking);
  const apiKey = useGameStore((state) => state.apiKey);
  const startNewDay = useGameStore((state) => state.startNewDay);
  const applyDecision = useGameStore((state) => state.applyDecision);

  const [lastDecision, setLastDecision] = useState(null);

  useEffect(() => {
    if (isAiThinking && apiKey) {
      console.log("🧠 KI Director aktiviert...");

      const runAiLoop = async () => {
        // 1. Kontext sammeln
        const systemPrompt = generateSystemPrompt();

        // 2. Holen des aktuellen States direkt aus dem Store
        const state = useGameStore.getState();
        const fullState = {
          cash: state.cash,
          workers: state.workers,
          day: state.day,
          tick: state.tick
        };

        // 3. API Call
        const result = await callAI(apiKey, systemPrompt, fullState);

        console.log("🧠 KI Entscheidung:", result);
        setLastDecision(result);

        // 3. Entscheidung anwenden
        if (result && result.action_type) {
            applyDecision(result.action_type, result.amount);
        }

        // 4. Kurz warten, damit der User das sieht (UX)
        // In Phase 3 lassen wir das Popup offen, bis der User klickt?
        // Oder wir machen es automatisch nach 3 Sekunden:
        setTimeout(() => {
            // Erst hier geht der Tag weiter
            // startNewDay(); // <-- Das würde es automatisieren.
            // Aber laut Plan wollen wir ein "Decision Popup" zeigen.
            // Das Popup selbst kann dann "startNewDay" rufen.
        }, 1000);
      };

      runAiLoop();
    }
  }, [isAiThinking, apiKey]);

  // Funktion, um das Popup zu schließen und weiterzumachen
  const confirmDecision = () => {
    setLastDecision(null);
    startNewDay();
  };

  return { lastDecision, confirmDecision };
};
