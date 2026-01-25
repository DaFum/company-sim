import React from 'react';
import { useGameStore } from '../store/gameStore';

export const RetroTerminal = () => {
  const logs = useGameStore((state) => state.terminalLogs);
  const pendingDecision = useGameStore((state) => state.pendingDecision);
  const vetoDecision = useGameStore((state) => state.vetoDecision);
  const tick = useGameStore((state) => state.tick);

  const timeLeft = pendingDecision && tick >= 50 ? Math.max(0, 60 - tick) : 0;

  return (
    <div className="terminal-container">
      {/* HEADER */}
      <div className="terminal-header">
        <span>root@startup-ai:~#</span>
        <span>STATUS: {pendingDecision ? 'CRITICAL_INPUT_REQ' : 'MONITORING'}</span>
      </div>

      {/* LOGS */}
      <div className={`terminal-logs ${pendingDecision ? 'dimmed' : ''}`}>
        {logs.map((log, i) => (
          <div key={i} className="log-entry">
            {log}
          </div>
        ))}
      </div>

      {/* DECISION OVERLAY */}
      {pendingDecision && (
        <div className="decision-overlay">
          <h3 className="decision-title">&gt;&gt; PROPOSAL: {pendingDecision.action}</h3>
          <p className="decision-reason">"{pendingDecision.reason}"</p>

          <div className="veto-container">
            <button onClick={vetoDecision} className="veto-button">
              VETO ({timeLeft}s)
            </button>

            <small className="veto-note">System will auto-execute at Tick 60.</small>
          </div>
        </div>
      )}
    </div>
  );
};
