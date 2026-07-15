import React from 'react';

const POPUP_TEXT = {
  TITLE: 'The CEO has decided',
  COST: 'Cost:',
  EXPECTED: 'Expected:',
  CONFIRM: 'Execute Decision',
  VETO: 'Veto Decision',
};

export const DecisionPopup = ({ decision, onConfirm, onVeto }) => {
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

        {decision.expected_effects && (
          <div className="popup-expected">
             <strong>{POPUP_TEXT.EXPECTED}</strong> {decision.expected_effects}
          </div>
        )}

        <div className="popup-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={onConfirm} className="popup-confirm" style={{ flex: 1 }}>
            {POPUP_TEXT.CONFIRM}
          </button>

          <button onClick={onVeto} className="popup-veto" style={{ flex: 1, backgroundColor: 'red', color: 'white' }}>
            {POPUP_TEXT.VETO}
          </button>
        </div>
      </div>
    </div>
  );
};
