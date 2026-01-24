import Phaser from 'phaser';

export default class WorkerSprite extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, role, id) {
    const texture = `worker_${role}`;
    super(scene, x, y, texture);

    this.role = role;
    this.id = id;

    // Physics
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.body.setSize(24, 24);

    // State Machine
    this.state = 'IDLE'; // IDLE, WORKING, MOVING, COFFEE
    this.stateTimer = 0;
    this.energy = 100; // 0-100

    // Pathfinding
    this.path = [];

    // Visuals
    this.statusIcon = null;
    this._jiggleTimer = 0;

    // Cleanup
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      if (this.statusIcon) {
        this.statusIcon.destroy();
        this.statusIcon = null;
      }
    });
  }

  update(time, delta) {
    this.stateTimer -= delta;

    // Energy Decay (slower than state timer)
    // Lose 10 energy every 1000ms roughly?
    // Let's say -0.01 per delta (if 60fps, 16ms * 0.01 = 0.16 per frame -> ~10 per sec)
    // Actually -0.005 is better for 20s cycle
    if (this.state !== 'COFFEE') {
        this.energy -= delta * 0.005;
    }

    if (this.state === 'MOVING') {
      this.followPath();
    } else if (this.state === 'IDLE' || this.state === 'WORKING') {
      if (this.stateTimer <= 0) this.decideNextAction();
    } else if (this.state === 'COFFEE') {
        if (this.stateTimer <= 0) {
            this.energy = 100;
            this.state = 'IDLE';
            this.showFeedback('Refilled!');
        }
    }

    // Role Animations (Physics Safe)
    if (this.state === 'WORKING' && this.role === 'dev') {
      this._jiggleTimer -= delta;
      if (this._jiggleTimer <= 0) {
        this._jiggleTimer = 80;
        const nx = this.x + (Math.random() - 0.5) * 1;
        const ny = this.y + (Math.random() - 0.5) * 1;
        this.setPosition(nx, ny);
        this.body.reset(nx, ny);
      }
    }

    // Icon Update (Delta Safe)
    if (this.statusIcon) {
      this.statusIcon.setPosition(this.x, this.y - 20);
      const fadePerMs = 1 / 800;
      this.statusIcon.alpha -= (delta * fadePerMs);

      if (this.statusIcon.alpha <= 0) {
        this.statusIcon.destroy();
        this.statusIcon = null;
      }
    }
  }

  decideNextAction() {
    // 1. Check Energy (Ant Farm Logic)
    if (this.energy < 30 && this.state !== 'COFFEE') {
        this.state = 'COFFEE'; // Will be overridden by moving state, but logic holds
        this.showFeedback('☕');
        // Request path to coffee machine (Grid 23, 2 roughly)
        this.scene.requestMove(this, 23, 2);
        this.stateTimer = 5000; // Time to drink once arrived?
        // Logic Gap: requestMove sets state to MOVING.
        // We need a callback or check when arrived.
        // For now, let's just move there and reset to IDLE, then next cycle we refill?
        // Let's modify: Move sets state MOVING. When arrived, if energy low and near coffee, refill.
        return;
    }

    if (this.role === 'dev') {
      if (Math.random() > 0.3) {
        this.state = 'WORKING';
        this.stateTimer = 3000 + Math.random() * 2000;
        this.showFeedback('101');
      } else {
        this.state = 'IDLE';
        this.moveToRandomPoint();
      }
    } else if (this.role === 'sales') {
      this.state = 'IDLE';
      this.moveToRandomPoint();
      if (Math.random() > 0.8) this.showFeedback('$');
    } else if (this.role === 'support') {
      this.state = 'IDLE';
      this.moveToRandomPoint();
    }
  }

  moveToRandomPoint() {
    const gridX = Phaser.Math.Between(1, 23);
    const gridY = Phaser.Math.Between(1, 18);
    this.scene.requestMove(this, gridX, gridY);
  }

  startPath(path) {
    if (path && path.length > 0) {
      this.path = path;
      this.state = 'MOVING';
    }
  }

  followPath() {
    if (!this.path || this.path.length === 0) {
      // Arrived
      if (this.energy < 30) {
          // Assuming we arrived at coffee (simplified check)
          // We can just assume successful coffee run for visual polish phase
          this.state = 'COFFEE';
          this.stateTimer = 2000; // Drinking time
      } else {
          this.state = 'IDLE';
          this.stateTimer = 1000;
      }

      this.body.reset(this.x, this.y);
      this.setVelocity(0, 0);
      return;
    }

    const nextTile = this.path[0];
    const targetX = nextTile.x * 32 + 16;
    const targetY = nextTile.y * 32 + 16;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);

    if (dist < 4) {
      this.path.shift();
    } else {
      const speed = (this.role === 'support') ? 150 : 100;
      this.scene.physics.moveTo(this, targetX, targetY, speed);
    }
  }

  showFeedback(text) {
    if (this.statusIcon) this.statusIcon.destroy();

    let color = '#00ff00';
    if (text === '$') color = '#ffff00';
    if (text === '???') color = '#ff4444';
    if (text === '☕') color = '#ffffff';

    this.statusIcon = this.scene.add.text(
      this.x,
      this.y - 20,
      text,
      { fontSize: '14px', color, stroke: '#000', strokeThickness: 2 }
    ).setOrigin(0.5);

    this.statusIcon.alpha = 1;
  }
}
