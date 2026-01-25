import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export const useGameLoop = () => {
  // Wir holen uns die Actions und den Speed aus dem Store
  const advanceTick = useGameStore((state) => state.advanceTick);
  const isPlaying = useGameStore((state) => state.isPlaying);
  const gameSpeed = useGameStore((state) => state.gameSpeed);

  useEffect(() => {
    let intervalId;

    if (isPlaying) {
      // Der Loop: Feuert alle `gameSpeed` Millisekunden
      intervalId = setInterval(() => {
        advanceTick();
      }, gameSpeed);
    }

    // Cleanup: Stoppt den Interval, wenn Komponente unmountet oder Pause gedrückt wird
    return () => clearInterval(intervalId);
  }, [isPlaying, advanceTick, gameSpeed]);
};
