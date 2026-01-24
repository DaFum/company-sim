import React from 'react';

export const DecisionPopup = ({ decision, onConfirm }) => {
  if (!decision) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <div className="popup-icon">🧠</div>
        <h2 className="popup-title">Der CEO hat entschieden</h2>

        <h3 className="popup-subtitle">"{decision.decision_title}"</h3>

        <p className="popup-reason">"{decision.reasoning}"</p>

        <div className={`popup-cost ${decision.amount > 0 ? 'expensive' : 'neutral'}`}>
          Kosten: {decision.amount} €
        </div>

        <button onClick={onConfirm} className="popup-confirm">
          Nächster Tag starten
        </button>
      </div>
    </div>
  );
};
