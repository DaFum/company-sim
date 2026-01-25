import Phaser from 'phaser';

export default class WorkerSprite extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, role, id, trait = 'NORMAL') {
    const texture = `worker_${role}`;
    super(scene, x, y, texture);

    this.role = role;
    this.id = id;
    this.trait = trait;

    // Physics
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.body.setSize(24, 24);

    // State Machine
    this.state = 'IDLE';
    this.stateTimer = 0;
    this.energy = 100;
    this.movementIntent = null;

    // Pathfinding
    this.path = [];

    // Visuals
    this.statusIcon = null;
    this._jiggleTimer = 0;
    this.traitIcon = null;

    // Trait Visual Marker
    if (this.trait === '10x_ENGINEER') this.showTraitIcon('🔥', '#ff9900');
    if (this.trait === 'TOXIC') this.showTraitIcon('🤢', '#00ff00');
    if (this.trait === 'JUNIOR') this.showTraitIcon('👶', '#ffffff');

    // Interactivity
    this.setInteractive();
    this.on('pointerover', () => {
      this.scene.showTooltip(
        this.x,
        this.y - 40,
        `${this.role.toUpperCase()}\nEnergy: ${this.energy.toFixed(0)}%\nTrait: ${this.trait}`
      );
    });
    this.on('pointerout', () => {
      this.scene.hideTooltip();
    });

    // Cleanup
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      if (this.statusIcon) this.statusIcon.destroy();
      if (this.traitIcon) this.traitIcon.destroy();
    });
  }

  update(time, delta) {
    this.stateTimer -= delta;

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

    // Role Animations
    if (this.state === 'WORKING' && this.role === 'dev') {
      this._jiggleTimer -= delta;
      if (this._jiggleTimer <= 0) {
        this._jiggleTimer = 80;
        const nx = this.x + (Math.random() - 0.5) * 1;
        const ny = this.y + (Math.random() - 0.5) * 1;
        this.setPosition(nx, ny);
        this.body.reset(nx, ny);

        // Code Particles
        if (Math.random() < 0.1) {
          // Occasional code burst
          this.scene.createCodeBits(this.x, this.y - 10);
        }
      }
    }

    // Icon Update
    if (this.statusIcon) {
      this.statusIcon.setPosition(this.x, this.y - 20);
      const fadePerMs = 1 / 800;
      this.statusIcon.alpha -= delta * fadePerMs;
      if (this.statusIcon.alpha <= 0) {
        this.statusIcon.destroy();
        this.statusIcon = null;
      }
    }

    // Trait Icon Follow
    if (this.traitIcon) {
      this.traitIcon.setPosition(this.x + 10, this.y - 15);
    }
  }

  showTraitIcon(text, color) {
    this.traitIcon = this.scene.add
      .text(this.x, this.y, text, {
        fontSize: '12px',
        color,
        stroke: '#000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
  }

  decideNextAction() {
    if (this.energy < 30 && this.state !== 'COFFEE' && this.movementIntent !== 'FETCH_COFFEE') {
      this.movementIntent = 'FETCH_COFFEE';
      this.showFeedback('☕');
      this.scene.requestMove(this, 23, 2);
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
      if (this.movementIntent === 'FETCH_COFFEE') {
        this.state = 'COFFEE';
        this.stateTimer = 5000;
        this.movementIntent = null;
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
      const speed = this.role === 'support' ? 150 : 100;
      this.scene.physics.moveTo(this, targetX, targetY, speed);
    }
  }

  showFeedback(text) {
    if (this.statusIcon) this.statusIcon.destroy();

    let color = '#00ff00';
    if (text === '$') color = '#ffff00';
    if (text === '???') color = '#ff4444';
    if (text === '☕') color = '#ffffff';

    this.statusIcon = this.scene.add
      .text(this.x, this.y - 20, text, {
        fontSize: '14px',
        color,
        stroke: '#000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    this.statusIcon.alpha = 1;
  }
}
