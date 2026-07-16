import React from 'react';
import { useGameStore } from '../store/gameStore';

export const DecisionHistory = () => {
  const history = useGameStore((state) => state.decisionHistory);

  if (history.length === 0) {
    return (
      <div className="decision-history-empty">
        <span className="ink-dim">NO DECISIONS YET</span>
      </div>
    );
  }

  // Reverse to show latest first
  const displayHistory = [...history].reverse();

  return (
    <div className="decision-history-list">
      {displayHistory.map((decision, i) => (
        <div
          key={decision.day + '-' + decision.action + '-' + (decision.decision_title || i)}
          className={`history-item ${decision.vetoed ? 'vetoed' : 'executed'}`}
        >
          <div className="history-header">
            <span className="history-day">DAY {decision.day}</span>
            <span className="history-action">{decision.action}</span>
            <span
              className={`history-status ${decision.vetoed ? 'status-vetoed' : 'status-executed'}`}
            >
              {decision.vetoed ? 'VETOED' : 'EXECUTED'}
            </span>
          </div>
          <div className="history-title">"{decision.decision_title}"</div>
          <div className="history-reason">"{decision.reasoning}"</div>
          {decision.expected_effects && (
            <div className="history-effects">Expected: {decision.expected_effects}</div>
          )}
          {decision.risk_assessment && (
            <div className="history-risk">Risk: {decision.risk_assessment}</div>
          )}
          {!decision.vetoed && decision.amount && (
            <div className="history-cost">Cost: {decision.amount} €</div>
          )}
        </div>
      ))}
    </div>
  );
};
