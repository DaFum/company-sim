import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export const useGameLoop = () => {
  // Wir holen uns die Actions aus dem Store
  const advanceTick = useGameStore((state) => state.advanceTick);
  const isPlaying = useGameStore((state) => state.isPlaying);

  useEffect(() => {
    let intervalId;

    if (isPlaying) {
      // Der Loop: Feuert alle 1000ms (1 Sekunde)
      intervalId = setInterval(() => {
        advanceTick();
      }, 1000);
      // Tipp: Für schnelleres Debuggen später auf 100ms setzen
    }

    // Cleanup: Stoppt den Interval, wenn Komponente unmountet oder Pause gedrückt wird
    return () => clearInterval(intervalId);
  }, [isPlaying, advanceTick]);
};
