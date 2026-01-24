import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { callAI } from '../services/aiService';
import { generateSystemPrompt } from '../services/prompts';

export const useAiDirector = () => {
  const tick = useGameStore((state) => state.tick);
  const apiKey = useGameStore((state) => state.apiKey);
  const aiProvider = useGameStore((state) => state.aiProvider);
  const addTerminalLog = useGameStore((state) => state.addTerminalLog);
  const setPendingDecision = useGameStore((state) => state.setPendingDecision);

  // Use ref to prevent double-firing
  const processingRef = useRef(false);

  useEffect(() => {
    // TRIGGER AT TICK 50
    if (tick === 50 && !processingRef.current) {
      processingRef.current = true;
      useGameStore.setState({ isAiThinking: true });

      addTerminalLog("> INIT CRUNCH MODE...");
      addTerminalLog("> FREEZING ASSETS...");

      const runAiLoop = async () => {
        // Mock Logs Sequence
        setTimeout(() => addTerminalLog("> ANALYZING CASHFLOW..."), 1000);
        setTimeout(() => addTerminalLog("> CHECKING MORALE..."), 2500);
        setTimeout(() => addTerminalLog("> CALCULATING SCENARIOS..."), 4000);

        try {
            // 1. Collect Context
            const state = useGameStore.getState();
            // INJECT PERSONA
            const systemPrompt = generateSystemPrompt().replace('{{PERSONA}}', state.ceoPersona || 'Visionary');

            const fullState = {
                cash: state.cash,
                workers: state.workers,
                roster: state.roster,
                day: state.day,
                mood: state.mood,
                yesterday_events: state.eventHistory || [],
                active_events: state.activeEvents || [],
                inventory: state.inventory
            };

            // 2. Call API (or Mock)
            let result;
            if (apiKey) {
                 result = await callAI(apiKey, systemPrompt, fullState, true, aiProvider);
            } else {
                 await new Promise(r => setTimeout(r, 2000));
                 result = {
                     action: 'NONE',
                     parameters: {},
                     reasoning: "No API Key found. Playing safe."
                 };
            }

            console.log("🧠 KI Response:", result);

            // 3. Set Decision
            setPendingDecision({
                action: result.action || 'NONE',
                parameters: result.parameters || {},
                reason: result.reasoning || 'Analyzing market data.'
            });

            useGameStore.setState({ isAiThinking: false });

        } catch (e) {
            console.error(e);
            addTerminalLog("> ERROR: AI CONNECTION FAILED.");
            useGameStore.setState({ isAiThinking: false });
        } finally {
            processingRef.current = false;
        }
      };

      runAiLoop();
    }
  }, [tick, apiKey]);
};
