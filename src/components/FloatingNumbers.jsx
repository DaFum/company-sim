import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';

// Simple Floating Number Component (Internal)
const FloatingNumber = ({ id, value, x, y, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(id), 1500); // Match CSS animation
    return () => clearTimeout(timer);
  }, [id, onComplete]);

  return (
    <div
      className="floating-number"
      style={{
        left: x,
        top: y,
        color: value >= 0 ? '#4caf50' : '#f44336',
      }}
    >
      {value >= 0 ? '+' : ''}
      {value} €
    </div>
  );
};

export const FloatingNumbers = () => {
  const cash = useGameStore((state) => state.cash);
  const [floaters, setFloaters] = useState([]);
  // Track the previous cash value without triggering render loops.
  const prevCashRef = useRef(cash);
  // Monotonic id so stacked floaters never collide (unlike Date.now()).
  const floaterIdRef = useRef(0);

  useEffect(() => {
    const delta = cash - prevCashRef.current;

    if (Math.abs(delta) >= 100) {
      const randomX = 300 + Math.random() * 200;
      const randomY = 100 + Math.random() * 50;
      floaterIdRef.current += 1;
      const id = floaterIdRef.current;
      setFloaters((list) => [...list, { id, value: Math.round(delta), x: randomX, y: randomY }]);
    }

    prevCashRef.current = cash;
  }, [cash]);

  // Stable callback so FloatingNumber's timer effect isn't reset on every tick.
  const handleFloaterComplete = useCallback((id) => {
    setFloaters((list) => list.filter((f) => f.id !== id));
  }, []);

  return (
    <>
      {floaters.map((f) => (
        <FloatingNumber
          key={f.id}
          id={f.id}
          value={f.value}
          x={f.x}
          y={f.y}
          onComplete={handleFloaterComplete}
        />
      ))}
    </>
  );
};
