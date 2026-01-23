import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';

export const RetroTerminal = () => {
  const logs = useGameStore((state) => state.terminalLogs);
  const pendingDecision = useGameStore((state) => state.pendingDecision);
  const vetoDecision = useGameStore((state) => state.vetoDecision);
  const tick = useGameStore((state) => state.tick);

  // Local state for countdown
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (pendingDecision && tick >= 50) {
        setTimeLeft(60 - tick);
    }
  }, [tick, pendingDecision]);

  return (
    <div style={{
      width: '800px',
      backgroundColor: '#000',
      border: '4px solid #333',
      borderRadius: '5px',
      padding: '15px',
      fontFamily: '"Courier New", Courier, monospace',
      color: '#0f0',
      marginTop: '20px',
      position: 'relative',
      minHeight: '200px',
      boxShadow: '0 0 20px rgba(0, 255, 0, 0.2)'
    }}>
      {/* HEADER */}
      <div style={{ borderBottom: '1px solid #333', paddingBottom: '5px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
        <span>root@startup-ai:~#</span>
        <span>STATUS: {pendingDecision ? 'CRITICAL_INPUT_REQ' : 'MONITORING'}</span>
      </div>

      {/* LOGS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', opacity: pendingDecision ? 0.5 : 1 }}>
        {logs.map((log, i) => (
          <div key={i} style={{ animation: 'fadeIn 0.2s' }}>{log}</div>
        ))}
      </div>

      {/* DECISION OVERLAY */}
      {pendingDecision && (
        <div style={{
          marginTop: '20px',
          border: '2px dashed #ffaa00',
          padding: '15px',
          color: '#ffaa00',
          animation: 'pulseBorder 2s infinite'
        }}>
          <h3 style={{ margin: 0, textTransform: 'uppercase' }}>
            &gt;&gt; PROPOSAL: {pendingDecision.action}
          </h3>
          <p style={{ margin: '5px 0 15px 0' }}>"{pendingDecision.reason}"</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button
                onClick={vetoDecision}
                style={{
                    background: '#ff0000',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 20px',
                    fontSize: '1.2em',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 0 10px #ff0000',
                    animation: 'shake 0.5s infinite'
                }}
            >
                VETO ({timeLeft}s)
            </button>

            <small style={{ color: '#666' }}>
                System will auto-execute at Tick 60.
            </small>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseBorder { 0% { border-color: #ffaa00; } 50% { border-color: #ff5500; } 100% { border-color: #ffaa00; } }
        @keyframes shake { 0% { transform: translate(1px, 1px) rotate(0deg); } 10% { transform: translate(-1px, -2px) rotate(-1deg); } 20% { transform: translate(-3px, 0px) rotate(1deg); } 30% { transform: translate(3px, 2px) rotate(0deg); } 40% { transform: translate(1px, -1px) rotate(1deg); } 50% { transform: translate(-1px, 2px) rotate(-1deg); } 60% { transform: translate(-3px, 1px) rotate(0deg); } 70% { transform: translate(3px, 1px) rotate(-1deg); } 80% { transform: translate(-1px, -1px) rotate(1deg); } 90% { transform: translate(1px, 2px) rotate(0deg); } 100% { transform: translate(1px, -2px) rotate(-1deg); } }
      `}</style>
    </div>
  );
};
