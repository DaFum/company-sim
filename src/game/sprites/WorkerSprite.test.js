import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Physics: {
      Arcade: {
        Sprite: class {},
      },
    },
  },
}));

import WorkerSprite from './WorkerSprite.js';

const createWorker = () =>
  Object.assign(Object.create(WorkerSprite.prototype), {
    _navigationToken: 2,
    _isNavigationPending: true,
    body: { reset: vi.fn() },
    currentState: 'IDLE',
    decideNextAction: vi.fn(),
    energy: 50,
    movementIntent: null,
    nextPathPoint: vi.fn(),
    path: [{ x: 1, y: 1 }],
    releaseDesk: vi.fn(),
    scene: { requestMove: vi.fn() },
    stateTimer: 0,
    x: 10,
    y: 20,
  });

describe('WorkerSprite navigation guards', () => {
  it('should ignore stale path resolutions', () => {
    const worker = createWorker();

    worker.startPath([{ x: 2, y: 2 }], 1);

    expect(worker.nextPathPoint).not.toHaveBeenCalled();
    expect(worker._isNavigationPending).toBe(true);
  });

  it('should pass a fresh navigation token when requesting movement', () => {
    const worker = createWorker();

    worker.goTo(3, 4, 'CHAT');

    expect(worker._isNavigationPending).toBe(true);
    expect(worker.scene.requestMove).toHaveBeenCalledWith(worker, 3, 4, 3);
  });

  it('should not choose another idle action while navigation is pending', () => {
    const worker = createWorker();

    worker.updateIdle(16);

    expect(worker.decideNextAction).not.toHaveBeenCalled();
  });

  it('should invalidate pending meeting navigation and stop movement when meeting ends', () => {
    const worker = createWorker();
    worker.movementIntent = 'MEETING';

    worker.endMeeting();

    expect(worker._navigationToken).toBe(3);
    expect(worker._isNavigationPending).toBe(false);
    expect(worker.path).toEqual([]);
    expect(worker.body.reset).toHaveBeenCalledWith(10, 20);
    expect(worker.currentState).toBe('IDLE');
  });
});
