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
    this.state = 'IDLE';
    this.stateTimer = 0;

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

    if (this.state === 'MOVING') {
      this.followPath();
    } else if (this.state === 'IDLE' || this.state === 'WORKING') {
      if (this.stateTimer <= 0) this.decideNextAction();
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
      this.state = 'IDLE';
      this.body.reset(this.x, this.y);
      this.setVelocity(0, 0);
      this.stateTimer = 1000;
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

    this.statusIcon = this.scene.add.text(
      this.x,
      this.y - 20,
      text,
      { fontSize: '14px', color, stroke: '#000', strokeThickness: 2 }
    ).setOrigin(0.5);

    this.statusIcon.alpha = 1;
  }
}
