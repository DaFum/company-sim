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
            const systemPrompt = generateSystemPrompt();
            const state = useGameStore.getState();
            const fullState = {
                cash: state.cash,
                workers: state.workers,
                day: state.day,
                tick: state.tick
            };

            // 2. Call API (or Mock)
            // Ensure we have a key, if not, maybe mock or fail gracefully?
            // If no key, we might need a fallback internal logic or prompt user.
            let result;
            if (apiKey) {
                 result = await callAI(apiKey, systemPrompt, fullState, true, aiProvider);
            } else {
                 // Fallback Mock if no key provided yet (for testing without key)
                 await new Promise(r => setTimeout(r, 2000));
                 result = {
                     action_type: 'SPEND_MONEY',
                     amount: 100,
                     reasoning: "No API Key found. Buying coffee."
                 };
            }

            console.log("🧠 KI Response:", result);

            // Wait until at least Tick 55 to show decision (UX pacing)
            // But since this is async, we just set it when ready.
            // If it's too fast, the logs might overlap.
            // We can force a minimum delay.

            // 3. Set Decision
            setPendingDecision({
                action: result.action_type || 'WAIT',
                amount: result.amount || 0,
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
