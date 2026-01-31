import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { callAI } from '../services/aiService';
import { generateSystemPrompt } from '../services/prompts';

/**
 * Formats the raw AI decision into a UI-friendly object.
 * @param {string} action - The action key (e.g. HIRE_WORKER).
 * @param {Object} params - The action parameters.
 * @param {string} reason - The AI's reasoning.
 * @returns {Object} Formatted decision object.
 */
const formatDecision = (action, params, reason) => {
  const safeParams = params && typeof params === 'object' ? params : {};
  const count = safeParams.count ?? 1;
  const role = safeParams.role ?? 'Dev';
  const itemId = safeParams.item_id ?? 'Item';
  let title = action;
  let amount = 0;

  switch (action) {
    case 'HIRE_WORKER':
      title = `Hire ${count} ${role}(s)`;
      amount = count * 500;
      break;
    case 'FIRE_WORKER':
      title = `Fire ${count} ${role}(s)`;
      amount = count * 200;
      break;
    case 'BUY_UPGRADE':
      title = `Buy Upgrade: ${itemId}`;
      amount = 2000;
      break;
    case 'MARKETING_PUSH':
      title = 'Launch Marketing Push';
      amount = 5000;
      break;
    case 'PIVOT':
      title = 'Pivot Strategy';
      amount = 0;
      break;
    case 'REFACTOR':
      title = 'Refactor Technical Debt';
      amount = 0;
      break;
    default:
      title = `Action: ${action}`;
      amount = 0;
  }

  return {
    action,
    parameters: safeParams,
    reasoning: reason,
    decision_title: title,
    amount,
  };
};

/**
 * Hook that manages the AI Director logic.
 * Triggers at a specific tick to analyze game state and propose decisions.
 */
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

      addTerminalLog('> INIT CRUNCH MODE...');
      addTerminalLog('> FREEZING ASSETS...');

      const runAiLoop = async () => {
        // Mock Logs Sequence
        setTimeout(() => addTerminalLog('> ANALYZING CASHFLOW...'), 1000);
        setTimeout(() => addTerminalLog('> CHECKING MORALE...'), 2500);
        setTimeout(() => addTerminalLog('> CALCULATING SCENARIOS...'), 4000);

        try {
          // 1. Collect Context
          const state = useGameStore.getState();
          const systemPrompt = generateSystemPrompt().replace(
            '{{PERSONA}}',
            state.ceoPersona || 'Visionary'
          );

          const financialTrend = state.cash - (state.startOfDayCash || state.cash);

          // Aggregate Traits
          const traitSummary = state.employees.reduce((acc, e) => {
            acc[e.trait] = (acc[e.trait] || 0) + 1;
            return acc;
          }, {});

          const fullState = {
            cash: state.cash,
            financial_trend: financialTrend,
            product_age: state.productAge, // NEW
            workers: state.workers,
            roster: state.roster,
            employee_traits: traitSummary, // NEW
            day: state.day,
            mood: state.mood,
            yesterday_events: state.eventHistory || [],
            active_events: state.activeEvents || [],
            inventory: state.inventory,
          };

          // 2. Call API (or Mock)
          let result;
          if (apiKey) {
            result = await callAI(apiKey, systemPrompt, fullState, true, aiProvider);
          } else {
            await new Promise((r) => setTimeout(r, 2000));
            result = {
              action: 'NONE',
              parameters: {},
              reasoning: 'No API Key found. Playing safe.',
            };
          }

          console.log('[AI] Response:', result);

          // 3. Set Decision
          const decisionData = formatDecision(
            result.action || 'NONE',
            result.parameters || {},
            result.reasoning || 'Analyzing market data.'
          );
          setPendingDecision(decisionData);

          useGameStore.setState({ isAiThinking: false });
        } catch (e) {
          console.error(e);
          addTerminalLog('> ERROR: AI CONNECTION FAILED.');
          useGameStore.setState({ isAiThinking: false });
        } finally {
          processingRef.current = false;
        }
      };

      runAiLoop();
    }
  }, [tick, apiKey, addTerminalLog, aiProvider, setPendingDecision]);
};
