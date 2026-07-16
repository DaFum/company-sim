import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { callAI } from '../services/aiService';
import { generateSystemPrompt } from '../services/prompts';
import { ACTION_DEFINITIONS } from '../store/actionRegistry';

/**
 * @typedef {Object} DecisionParams
 * @property {number} [count] - Number of workers to hire/fire.
 * @property {string} [role] - Role of worker (Dev, Sales, Support).
 * @property {string} [item_id] - ID of item to buy.
 */

/**
 * @typedef {Object} Decision
 * @property {string} action - The action key (e.g. HIRE_WORKER).
 * @property {DecisionParams} parameters - The action parameters.
 * @property {string} reasoning - The AI's reasoning.
 * @property {string} decision_title - Human readable title.
 * @property {number} amount - Cost associated with decision.
 */

/**
 * Formats the raw AI decision into a UI-friendly object.
 * @param {string} action - The action key (e.g. HIRE_WORKER).
 * @param {DecisionParams} params - The action parameters.
 * @param {string} reason - The AI's reasoning.
 * @returns {Decision} Formatted decision object.
 */
const formatDecision = (action, params, reason, riskAssessment) => {
  const safeParams = params && typeof params === 'object' ? params : {};
  const def = Object.hasOwn(ACTION_DEFINITIONS, action) ? ACTION_DEFINITIONS[action] : null;

  let title = `Action: ${action}`;
  let amount = 0;
  let expectedEffects = '';
  let actionRisk = riskAssessment || 'LOW';

  if (def) {
    title = def.title(safeParams);
    amount = def.calculateCost(safeParams);
    expectedEffects = def.effects;
    actionRisk = riskAssessment || def.risk || 'LOW';
  }

  return {
    action,
    parameters: safeParams,
    reasoning: reason,
    decision_title: title,
    amount,
    expected_effects: expectedEffects,
    risk_assessment: actionRisk,
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
  const aiModel = useGameStore((state) => state.aiModel);
  const addTerminalLog = useGameStore((state) => state.addTerminalLog);
  const setPendingDecision = useGameStore((state) => state.setPendingDecision);

  // Use ref to prevent double-firing
  const processingRef = useRef(false);

  useEffect(() => {
    const timers = [];
    // TRIGGER AT TICK 60
    if (tick === 60 && !processingRef.current) {
      processingRef.current = true;
      useGameStore.setState({ isAiThinking: true });

      addTerminalLog('> INIT CRUNCH MODE...');
      addTerminalLog('> FREEZING ASSETS...');

      const runAiLoop = async () => {
        // Mock Logs Sequence
        timers.push(setTimeout(() => addTerminalLog('> ANALYZING CASHFLOW...'), 1000));
        timers.push(setTimeout(() => addTerminalLog('> CHECKING MORALE...'), 2500));
        timers.push(setTimeout(() => addTerminalLog('> CALCULATING SCENARIOS...'), 4000));

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

          const stats = state.getStats();

          const fullState = {
            cash: state.cash,
            burn_rate: stats.totalBurn,
            tick: state.tick,
            game_phase: state.gamePhase,
            financial_trend: financialTrend,
            product_age: state.productAge,
            workers: stats.count,
            office_level: state.officeLevel,
            roster: stats.roster,
            employee_traits: traitSummary,
            day: state.day,
            mood: state.mood,
            technical_debt: state.technicalDebt,
            burn_per_tick: stats.totalBurn / 60,
            productivity: state.productivity,
            product_level: state.productLevel,
            revenue_per_tick: state.lastRevenue || 0,
            marketing_multiplier: state.marketingMultiplier,
            marketing_ticks_remaining: state.marketingLeft,
            is_refactoring: state.isRefactoring,
            server_health: state.serverHealth,
            server_stability: state.serverStability,
            yesterday_events: state.eventHistory || [],
            active_events: state.activeEvents || [],
            inventory: state.inventory,
            available_actions: Object.keys(ACTION_DEFINITIONS),
          };

          // 2. Call API (or Mock)
          let result;
          if (apiKey) {
            result = await callAI(apiKey, systemPrompt, fullState, true, aiProvider, aiModel);
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
            result.reasoning || 'Analyzing market data.',
            result.risk_assessment
          );
          setPendingDecision(decisionData);

          useGameStore.setState({ isAiThinking: false });
        } catch (e) {
          console.error(e);
          addTerminalLog('> ERROR: AI CONNECTION FAILED.');
          setPendingDecision(
            formatDecision('NONE', {}, 'AI connection failed. Defaulting to no action.', 'LOW')
          );
          useGameStore.setState({ isAiThinking: false });
        } finally {
          processingRef.current = false;
        }
      };

      runAiLoop();
    }
    return () => timers.forEach((t) => clearTimeout(t));
  }, [tick, apiKey, addTerminalLog, aiProvider, aiModel, setPendingDecision]);
};
