import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export const useGameLoop = () => {
  // Get actions and speed from store
  const advanceTick = useGameStore((state) => state.advanceTick);
  const isPlaying = useGameStore((state) => state.isPlaying);
  const gameSpeed = useGameStore((state) => state.gameSpeed);

  useEffect(() => {
    let intervalId;

    if (isPlaying) {
      // The Loop: Fires every `gameSpeed` ms
      intervalId = setInterval(() => {
        advanceTick();
      }, gameSpeed);
    }

    // Cleanup: Stops interval on unmount or pause
    return () => clearInterval(intervalId);
  }, [isPlaying, advanceTick, gameSpeed]);
};
