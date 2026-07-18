import Phaser from 'phaser';
import { CSS_PALETTE, ROLE_LIGHTS } from '../palette.js';

const STATE = {
  IDLE: 'IDLE',
  MOVING: 'MOVING',
  WORKING: 'WORKING',
  COFFEE: 'COFFEE',
  MEETING: 'MEETING',
  BREAK: 'BREAK',
  CHAT: 'CHAT',
};

/**
 * @typedef {Object} PathNode
 * @property {number} x - The x coordinate of the node.
 * @property {number} y - The y coordinate of the node.
 */

/**
 * Sprite representing a worker in the office simulation.
 * Handles state machine, movement, energy, and visual feedback.
 */
export default class WorkerSprite extends Phaser.Physics.Arcade.Sprite {
  /**
   * Creates a new WorkerSprite.
   * @param {Phaser.Scene} scene - The parent scene.
   * @param {number} x - Initial X position.
   * @param {number} y - Initial Y position.
   * @param {string} role - Worker role (dev, sales, support).
   * @param {number|string} id - Unique identifier.
   * @param {string} [trait='NORMAL'] - Worker trait (e.g., 10x_ENGINEER, TOXIC).
   */
  constructor(scene, x, y, role, id, trait = 'NORMAL') {
    super(scene, x, y, `worker_${role}`);

    this.role = role;
    this.id = id;
    this.trait = trait;

    // Physics Setup
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.body.setSize(24, 24);
    this.body.setOffset(4, 8); // Offset so feet are on the ground

    // --- VISUAL POLISH: OPTIMIZED SHADOW ---
    // Using a sprite instead of Shader FX for performance
    this.shadow = scene.add
      .image(x, y + 10, 'shadow_blob')
      .setDepth(this.depth - 1)
      .setAlpha(0.45);

    // --- PUSH THE LIMITS: DYNAMIC LIGHTING ---
    // Every worker emits light. Color based on role.
    const lightColor = ROLE_LIGHTS[role] || ROLE_LIGHTS.support;
    this.baseLightRadius = 72;
    this.lightJitterAmplitude = 6;

    // PointLight: extremely fast rendered "fake" lights
    // Only created if WebGL is available to avoid issues
    this._hasLight = false;
    if (scene.game.renderer.type === Phaser.WEBGL && scene.requestLight()) {
      this._hasLight = true;
      this.light = scene.add
        .pointlight(x, y, lightColor, this.baseLightRadius, 0.35)
        .setDepth(this.depth - 1);
      // NOTE: Update logic moved to preUpdate to avoid event listener leaks
    }

    // State Machine
    this.currentState = STATE.IDLE;
    this.stateTimer = 0;
    this.energy = 100;
    this.movementIntent = null;
    this.desk = null;
    this._footprintTimer = 0;

    // Pathfinding Cache
    this.path = [];
    this.movementTarget = new Phaser.Math.Vector2();
    this._tempVec = new Phaser.Math.Vector2(); // Reusable vector
    this._lastDepthY = -1;

    // Performance: Text Object Pooling
    // We create the text object once and hide it, instead of creating it constantly.
    this.statusIcon = this.scene.add
      .text(0, 0, '', {
        fontSize: '14px',
        fontFamily: 'Courier New',
        stroke: CSS_PALETTE.OUTLINE_DARK,
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(100); // High depth to be on top

    // Interaction
    this.setInteractive();
    this.on('pointerover', () => {
      this.scene.showTooltip(
        this.x,
        this.y - 40,
        `${this.role.toUpperCase()}\nEnergy: ${Math.max(0, this.energy).toFixed(0)}%\nTrait: ${this.trait}`
      );

      // Add Glow FX
      if (this.preFX && !this._glowFX) {
        this._glowFX = this.preFX.addGlow(0xffffff, 2, 0, false, 0.1, 10);
      }
    });
    this.on('pointerout', () => {
      this.scene.hideTooltip();

      if (this._glowFX) {
        this.preFX.remove(this._glowFX);
        this._glowFX = null;
      }
    });

    // Cleanup
    // Note: 'destroy' override handles cleanup more reliably than listening to DESTROY event
    // when using groups.

    // Trait Visual Marker
    this.traitIcon = null;
    if (this.trait === '10x_ENGINEER') this.showTraitIcon('🔥', '#ff9900');
    if (this.trait === 'TOXIC') this.showTraitIcon('🤢', '#00ff00');
    if (this.trait === 'JUNIOR') this.showTraitIcon('👶', '#ffffff');
  }

  // --- MEMORY LEAK FIX ---
  /**
   * Destroys the sprite and cleans up associated resources (light, shadow, particles).
   * @param {boolean} fromScene - Whether the destroy call came from the scene.
   */
  destroy(fromScene) {
    if (this._hasLight) {
      this.scene?.releaseLight?.();
      this._hasLight = false;
    }
    if (this.light) {
      this.light.destroy();
      this.light = null;
    }
    if (this.shadow) {
      this.shadow.destroy();
      this.shadow = null;
    }
    if (this.statusIcon) {
      this.statusIcon.destroy();
      this.statusIcon = null;
    }
    if (this.traitIcon) {
      this.traitIcon.destroy();
      this.traitIcon = null;
    }
    if (this.workTween) this.workTween.stop();
    if (this.feedbackTween) this.feedbackTween.stop();
    this.releaseDesk();

    super.destroy(fromScene);
  }

  /**
   * Releases the currently claimed desk, if any.
   */
  releaseDesk() {
    if (this.desk) {
      this.desk.claimedBy = null;
      this.desk = null;
    }
  }

  /**
   * Pre-update method to sync attached objects (lights, shadows) with sprite position.
   * @param {number} time - Current time.
   * @param {number} delta - Time delta.
   */
  preUpdate(time, delta) {
    super.preUpdate(time, delta);

    if (this.y !== this._lastDepthY) {
      this._lastDepthY = this.y;
      this.setDepth(this.y);
      if (this.shadow) this.shadow.setDepth(this.y - 1);
      if (this.light) this.light.setDepth(this.y - 1);
    }

    // Sync Light Position
    if (this.light) {
      this.light.setPosition(this.x, this.y);
      // Pulsing effect
      const jitter = Math.sin(time * 0.005) * this.lightJitterAmplitude;
      this.light.radius = this.baseLightRadius + jitter;
    }

    // Sync Shadow Position
    if (this.shadow) {
      this.shadow.setPosition(this.x, this.y + 13);
    }
  }

  /**
   * Emits particles to simulate work activity.
   */
  spawnWorkParticles() {
    const emitter = this.scene.roleEmitters?.[this.role];
    if (emitter) emitter.explode(2, this.x, this.y - 10);
  }

  /**
   * Main update loop for the worker. Handles state transitions and icon positioning.
   * @param {number} time - Current time.
   * @param {number} delta - Time delta.
   */
  update(time, delta) {
    this.stateTimer -= delta;

    // Sync Status-Icon position (More performance efficient than Container for simple labels)
    // Only update position if feedback tween is NOT active, to prevent fighting the animation
    if (this.statusIcon.visible) {
      const isFeedbackPlaying = this.feedbackTween && this.feedbackTween.isPlaying();
      if (!isFeedbackPlaying) {
        this.statusIcon.setPosition(this.x, this.y - 25);
      }
    }

    // Trait Icon Follow
    if (this.traitIcon) {
      this.traitIcon.setPosition(this.x + 10, this.y - 15);
    }

    // State Machine Pattern
    switch (this.currentState) {
      case STATE.MOVING:
        this.updateMoving(delta);
        break;
      case STATE.WORKING:
        this.updateWorking(delta);
        break;
      case STATE.COFFEE:
        this.updateCoffee(delta);
        break;
      case STATE.MEETING:
        this.updateMeeting(delta);
        break;
      case STATE.CHAT:
        this.updateChat(delta);
        break;
      case STATE.BREAK:
        this.updateBreak(delta);
        break;
      case STATE.IDLE:
      default:
        this.updateIdle(delta);
        break;
    }
  }

  /**
   * Updates the worker in IDLE state.
   * @param {number} delta - Time delta.
   */
  updateIdle(delta) {
    this.energy = Math.max(0, this.energy - delta * 0.005);
    if (this.stateTimer <= 0) {
      this.decideNextAction();
    }
  }

  /**
   * Updates the worker in MOVING state.
   * @param {number} delta - Time delta.
   */
  updateMoving(delta) {
    this.energy = Math.max(0, this.energy - delta * 0.005);

    this._footprintTimer += delta;
    if (this._footprintTimer > 250) {
      this._footprintTimer = 0;
      this.scene?.addFootprint?.(this.x, this.y + 12);
    }

    this.followPath();
  }

  /**
   * Updates the worker in WORKING state.
   * @param {number} delta - Time delta.
   */
  updateWorking(delta) {
    this.energy = Math.max(0, this.energy - delta * 0.005);

    // Particles
    if (Math.random() < 0.05) {
      this.spawnWorkParticles();
    }

    if (this.role === 'dev') {
      // Code Particles (rare)
      if (Phaser.Math.RND.frac() < 0.01) {
        // [2] Efficient Random
        this.scene.createCodeBits(this.x, this.y - 10);
      }
    }

    // Animation is handled by TweenChain (startWorkSequence)
  }

  /**
   * Updates the worker in MEETING state.
   * @param {number} delta - Time delta.
   */
  updateMeeting(delta) {
    this.energy = Math.max(0, this.energy - delta * 0.002);
    if (Math.random() < 0.008) this.showFeedback('💬');
    if (this.stateTimer <= 0) this.endMeeting();
  }

  /**
   * Updates the worker in CHAT state.
   * @param {number} delta - Time delta.
   */
  updateChat(delta) {
    this.energy = Math.max(0, this.energy - delta * 0.002);
    if (Math.random() < 0.015) this.showFeedback('💬');
    if (this.stateTimer <= 0) {
      this.energy = Math.min(100, this.energy + 10);
      this.currentState = STATE.IDLE;
      this.stateTimer = 800;
    }
  }

  /**
   * Updates the worker in BREAK state.
   * @param {number} delta - Time delta.
   */
  updateBreak() {
    if (Math.random() < 0.01) this.showFeedback('😴');
    if (this.stateTimer <= 0) {
      this.energy = Math.min(100, this.energy + 40);
      this.currentState = STATE.IDLE;
      this.stateTimer = 500;
    }
  }

  /**
   * Starts the animation sequence for working (squash, jiggle, relax).
   */
  startWorkSequence() {
    // If animation is already running, stop it
    if (this.workTween) {
      this.workTween.stop();
    }

    const startX = this.x;

    // Create a chain of movements
    this.workTween = this.scene.tweens.chain({
      targets: this, // Applies to all steps
      onComplete: () => {
        this.finishTask(); // Callback when ALL is finished
      },
      tweens: [
        // Step 1: "Dive" into work (Squash effect)
        {
          scaleX: 1.2,
          scaleY: 0.8,
          duration: 150,
          ease: 'Quad.easeOut',
        },
        // Step 2: Heavy typing / Working (Jiggle)
        {
          angle: { from: -5, to: 5 }, // Rotation
          x: { from: startX - 1, to: startX + 1 }, // Slight vibration around START position
          duration: 80,
          yoyo: true,
          repeat: 10, // 10 times back and forth (approx 1.6 seconds)
          ease: 'Linear',
        },
        // Step 3: "Relax" / Normalize
        {
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          x: startX, // Ensure it returns exactly to start
          duration: 200,
          ease: 'Back.easeOut',
        },
      ],
    });
  }

  /**
   * Completes the current work task and shows feedback.
   */
  finishTask() {
    this.currentState = STATE.IDLE;
    this.showFeedback('$');
    this.releaseDesk();
    this.stateTimer = 1500; // Longer pause for feedback animation
  }

  /**
   * Updates the worker in COFFEE state (refilling energy).
   */
  updateCoffee() {
    // Regenerate energy
    if (this.stateTimer <= 0) {
      this.energy = 100;
      this.currentState = STATE.IDLE;
      this.showFeedback('Refilled!');
      this.stateTimer = 800;
    }
  }

  /**
   * Starts moving along a path.
   * @param {PathNode[]} path - Array of path nodes {x, y}.
   */
  startPath(path) {
    if (path && path.length > 0) {
      this.path = path;
      this.currentState = STATE.MOVING;
      // Target the first point immediately
      this.nextPathPoint();
    } else {
      this.movementIntent = null;
      this.releaseDesk();
      this.currentState = STATE.IDLE;
      this.stateTimer = 1000;
    }
  }

  /**
   * Advances to the next point in the path.
   */
  nextPathPoint() {
    if (this.path.length === 0) {
      this.stopMovement();
      return;
    }

    const nextTile = this.path.shift();
    // Calculate Tile center (32 = tileSize)
    this.movementTarget.set(nextTile.x * 32 + 16, nextTile.y * 32 + 16);

    const speed = this.role === 'support' ? 150 : 100;
    this.scene.physics.moveTo(this, this.movementTarget.x, this.movementTarget.y, speed);
  }

  /**
   * Logic to follow the current path using physics velocity.
   */
  followPath() {
    // [3] Efficient distance calculation
    // Reuse tempVec to avoid garbage collection
    this._tempVec.set(this.x, this.y);
    const distSq = this.movementTarget.distanceSq(this._tempVec);

    // 4px * 4px = 16 (Squared Distance is faster than sqrt)
    if (distSq < 16) {
      this.nextPathPoint();
    }
  }

  /**
   * Stops movement and transitions to IDLE or COFFEE state.
   */
  stopMovement() {
    this.body.reset(this.x, this.y); // Stops velocity immediately

    const intent = this.movementIntent;
    this.movementIntent = null;

    if (intent === 'FETCH_COFFEE') {
      this.currentState = STATE.COFFEE;
      this.stateTimer = 5000;
    } else if (intent === 'WORK') {
      this.currentState = STATE.WORKING;
      this.startWorkSequence();
      this.showFeedback(this.role === 'dev' ? '101' : '$');
    } else if (intent === 'MEETING') {
      this.currentState = STATE.MEETING;
      this.stateTimer = 30000;
    } else if (intent === 'CHAT') {
      this.currentState = STATE.CHAT;
      this.stateTimer = 6000;
    } else if (intent === 'BREAK') {
      this.currentState = STATE.BREAK;
      this.stateTimer = 7000;
    } else {
      this.currentState = STATE.IDLE;
      this.stateTimer = 1000;
    }
  }

  /**
   * Shows a feedback icon/text floating above the worker.
   * @param {string} text - Feedback text/icon.
   */
  showFeedback(text) {
    const colors = {
      $: '#ffff00',
      '???': '#ff4444',
      '☕': '#ffffff',
      'Refilled!': '#ffffff',
      101: '#00ff00',
      '💬': '#9be7ff',
      '😴': '#aaaaff',
      default: '#00ff00',
    };

    const color = colors[text] || colors['default'];

    // Reuse instead of Recreate [4]
    this.statusIcon.setText(text);
    this.statusIcon.setColor(color);
    this.statusIcon.setVisible(true);
    this.statusIcon.setAlpha(1);
    this.statusIcon.y = this.y - 20;

    // Prevent overlapping animations: stop existing feedback tween
    if (this.feedbackTween && this.feedbackTween.isPlaying()) {
      this.feedbackTween.stop();
    }

    // Animation for rising and fading out
    this.feedbackTween = this.scene.tweens.add({
      targets: this.statusIcon,
      y: this.y - 40,
      alpha: 0,
      duration: 1000,
      onComplete: () => {
        this.statusIcon.setVisible(false);
      },
    });
  }

  /**
   * Displays a trait icon permanently above the worker.
   * @param {string} text - Icon text/emoji.
   * @param {string} color - Icon color.
   */
  showTraitIcon(text, color) {
    this.traitIcon = this.scene.add
      .text(this.x, this.y, text, {
        fontSize: '12px',
        color,
        stroke: CSS_PALETTE.OUTLINE_DARK,
        strokeThickness: 2,
      })
      .setOrigin(0.5);
  }

  /**
   * Sends the worker to a grid tile with an intent to resolve on arrival.
   * @param {number} gx - Grid X.
   * @param {number} gy - Grid Y.
   * @param {string} intent - Movement intent.
   */
  goTo(gx, gy, intent) {
    this.movementIntent = intent;
    this.scene?.requestMove?.(this, gx, gy);
  }

  /**
   * Ends an active or pending meeting.
   */
  endMeeting() {
    if (this.currentState === STATE.MEETING || this.movementIntent === 'MEETING') {
      this.movementIntent = null;
      this.currentState = STATE.IDLE;
      this.stateTimer = 500;
    }
  }

  /**
   * AI Logic to decide what to do next based on role and energy.
   */
  decideNextAction() {
    if (
      this.energy < 30 &&
      this.currentState !== STATE.COFFEE &&
      this.movementIntent !== 'FETCH_COFFEE'
    ) {
      this.showFeedback('☕');
      const coffeeTile = this.scene?.coffeeTile || { x: 23, y: 16 };
      this.goTo(coffeeTile.x, coffeeTile.y, 'FETCH_COFFEE');
      return;
    }

    if (this.energy < 55 && Phaser.Math.RND.frac() < 0.25) {
      const spot = this.scene?.getBreakSpot?.();
      if (spot) {
        this.goTo(spot.x, spot.y, 'BREAK');
        return;
      }
    }

    if (Phaser.Math.RND.frac() > 0.35) {
      this.releaseDesk();
      const desk = this.scene?.claimDesk?.(this);
      if (desk) {
        this.desk = desk;
        this.goTo(desk.chairGx, desk.chairGy, 'WORK');
        return;
      }
    }

    this.currentState = STATE.IDLE;
    this.moveToRandomPoint();
    if (this.role === 'sales' && Phaser.Math.RND.frac() > 0.8) this.showFeedback('$');
  }

  /**
   * Requests movement to a random point on the grid.
   */
  moveToRandomPoint() {
    const gridX = Phaser.Math.Between(1, 23);
    const gridY = Phaser.Math.Between(1, 18);
    this.scene.requestMove(this, gridX, gridY);
  }
}
