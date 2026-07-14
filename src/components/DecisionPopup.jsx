import React from 'react';

const POPUP_TEXT = {
  TITLE: 'The CEO has decided',
  COST: 'Cost:',
  CONFIRM: 'Start Next Day',
};

export const DecisionPopup = ({ decision, onConfirm }) => {
  if (!decision) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <div className="popup-icon">🧠</div>
        <h2 className="popup-title">{POPUP_TEXT.TITLE}</h2>

        <h3 className="popup-subtitle">"{decision.decision_title}"</h3>

        <p className="popup-reason">"{decision.reasoning}"</p>

        <div className={`popup-cost ${decision.amount > 0 ? 'expensive' : 'neutral'}`}>
          {POPUP_TEXT.COST} {decision.amount} €
        </div>

        <button onClick={onConfirm} className="popup-confirm">
          {POPUP_TEXT.CONFIRM}
        </button>
      </div>
    </div>
  );
};
