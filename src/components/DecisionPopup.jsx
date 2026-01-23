import React from 'react';

export const DecisionPopup = ({ decision, onConfirm }) => {
  if (!decision) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900
    }}>
      <div style={{
        background: '#fff', color: '#000', padding: '30px', borderRadius: '15px',
        maxWidth: '400px', width: '90%', textAlign: 'center',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
      }}>
        <div style={{ fontSize: '3em', marginBottom: '10px' }}>🧠</div>
        <h2 style={{ marginTop: 0 }}>Der CEO hat entschieden</h2>

        <h3 style={{ color: '#333' }}>"{decision.decision_title}"</h3>

        <p style={{ fontStyle: 'italic', color: '#555', margin: '20px 0' }}>
          "{decision.reasoning}"
        </p>

        <div style={{
          background: '#f0f0f0', padding: '10px', borderRadius: '5px', marginBottom: '20px',
          fontWeight: 'bold', color: decision.amount > 0 ? '#cc0000' : '#666'
        }}>
          Kosten: {decision.amount} €
        </div>

        <button
          onClick={onConfirm}
          style={{
            padding: '12px 24px', background: '#007bff', color: '#fff',
            border: 'none', borderRadius: '5px', fontSize: '1.1em', cursor: 'pointer'
          }}
        >
          Nächster Tag starten
        </button>
      </div>
    </div>
  );
};
