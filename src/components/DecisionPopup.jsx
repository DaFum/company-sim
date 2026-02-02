import React from 'react';

export const DecisionPopup = ({ decision, onConfirm }) => {
  if (!decision) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <div className="popup-icon">🧠</div>
        <h2 className="popup-title">The CEO has decided</h2>

        <h3 className="popup-subtitle">"{decision.decision_title}"</h3>

        <p className="popup-reason">"{decision.reasoning}"</p>

        <div className={`popup-cost ${decision.amount > 0 ? 'expensive' : 'neutral'}`}>
          Cost: {decision.amount} €
        </div>

        <button onClick={onConfirm} className="popup-confirm">
          Start Next Day
        </button>
      </div>
    </div>
  );
};
