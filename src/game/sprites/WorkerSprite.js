import Phaser from 'phaser';

const STATE = {
    IDLE: 'IDLE',
    MOVING: 'MOVING',
    WORKING: 'WORKING',
    COFFEE: 'COFFEE'
};

export default class WorkerSprite extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, role, id, trait = 'NORMAL') {
        super(scene, x, y, `worker_${role}`);

        this.role = role;
        this.id = id;
        this.trait = trait;

        // Physics Setup
        scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);
        this.body.setSize(24, 24);
        this.body.setOffset(4, 8); // Offset, damit Füße am Boden sind

        // --- VISUAL POLISH: SHADOW FX ---
        if (this.preFX) {
             this.preFX.addShadow(0, 0.1, 0.1, 1, 0x000000, 2, 0.5);
        }

        // --- PUSH THE LIMITS: DYNAMIC LIGHTING ---
        // Jeder Worker strahlt Licht aus. Farbe basiert auf Rolle.
        const lightColor = role === 'dev' ? 0x0088ff : (role === 'sales' ? 0x00ff00 : 0xff0000);

        // PointLight: extrem schnell gerenderte "falsche" Lichter
        this.light = scene.add.pointlight(x, y, lightColor, 60, 0.3).setDepth(this.depth - 1);

        // Wir speichern eine Referenz für das Update
        this.scene.events.on('update', this.updateLight, this);

        // Particle Emitter (One-time creation)
        const particleColor = role === 'dev' ? [0x00ff00, 0x004400] : [0xffff00, 0xffaa00];
        this.particleEmitter = this.scene.add.particles(0, 0, 'particle_pixel', {
            speed: { min: 50, max: 100 },
            angle: { min: 220, max: 320 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 1, end: 0 },
            gravityY: 100,
            lifespan: 600,
            quantity: 2,
            tint: particleColor,
            emitting: false
        });

        // State Machine
        this.currentState = STATE.IDLE;
        this.stateTimer = 0;
        this.energy = 100;
        this.movementIntent = null;

        // Pathfinding Cache
        this.path = [];
        this.movementTarget = new Phaser.Math.Vector2();

        // Performance: Text Object Pooling
        // Wir erstellen das Text-Objekt einmal und verstecken es, statt es ständig neu zu erzeugen.
        this.statusIcon = this.scene.add.text(0, 0, '', {
            fontSize: '14px',
            fontFamily: 'Arial',
            stroke: '#000',
            strokeThickness: 2
        }).setOrigin(0.5).setVisible(false).setDepth(100); // Hohe Depth, damit es über allem liegt

        // Interaction
        this.setInteractive();
        this.on('pointerover', () => {
             this.scene.showTooltip(
                this.x,
                this.y - 40,
                `${this.role.toUpperCase()}\nEnergy: ${Math.max(0, this.energy).toFixed(0)}%\nTrait: ${this.trait}`
            );

            // Glow FX hinzufügen
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
        this.on(Phaser.GameObjects.Events.DESTROY, this.preDestroy, this);

        // Trait Visual Marker
        this.traitIcon = null;
        if (this.trait === '10x_ENGINEER') this.showTraitIcon('🔥', '#ff9900');
        if (this.trait === 'TOXIC') this.showTraitIcon('🤢', '#00ff00');
        if (this.trait === 'JUNIOR') this.showTraitIcon('👶', '#ffffff');
    }

    preDestroy() {
        // [1] Wichtig: Wenn das Sprite zerstört wird, müssen wir auch sein UI-Element zerstören
        if (this.statusIcon) {
            this.statusIcon.destroy();
        }
        if (this.traitIcon) {
            this.traitIcon.destroy();
        }
        if (this.light) {
            this.light.destroy();
        }
        if (this.particleEmitter) {
            this.particleEmitter.destroy();
        }
        if (this.workTween) {
            this.workTween.stop();
        }
        if (this.feedbackTween) {
            this.feedbackTween.stop();
        }
        if (this.scene) {
            this.scene.events.off('update', this.updateLight, this);
        }

        // Listener entfernen nicht zwingend nötig da Sprite zerstört wird, aber guter Stil
        this.off('pointerover');
        this.off('pointerout');
    }

    updateLight(time, delta) {
        if (!this.light || !this.body) return;

        // Position synchronisieren
        this.light.setPosition(this.x, this.y);

        // Pulsierender Effekt (Jitter) für Lebendigkeit
        const jitter = Math.sin(time * 0.005) * 5;
        this.light.radius = 60 + jitter;
    }

    spawnWorkParticles() {
        if (!this.particleEmitter) return;

        // Position emitter to current sprite position and explode
        this.particleEmitter.setPosition(this.x, this.y - 10);
        this.particleEmitter.explode(2);
    }

    update(time, delta) {
        this.stateTimer -= delta;

        // Status-Icon Position syncen (Performance-effizienter als Container für simple Labels)
        if (this.statusIcon.visible) {
            this.statusIcon.setPosition(this.x, this.y - 25);
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
            case STATE.IDLE:
            default:
                this.updateIdle(delta);
                break;
        }
    }

    updateIdle(delta) {
        this.energy -= delta * 0.005;
        if (this.stateTimer <= 0) {
            this.decideNextAction();
        }
    }

    updateMoving(delta) {
        this.energy -= delta * 0.005;

        // Footprints (alle 200ms)
        if (this.scene.time.now % 200 < 20) {
            this.scene.addFootprint(this.x, this.y + 12);
        }

        this.followPath();
    }

    updateWorking(delta) {
        this.energy -= delta * 0.005;

        // Particles
        if (Math.random() < 0.05) {
            this.spawnWorkParticles();
        }

        if (this.role === 'dev') {
            // Code Particles (selten)
            if (Phaser.Math.RND.frac() < 0.01) { // [2] Effizienter Zufall
                this.scene.createCodeBits(this.x, this.y - 10);
            }
        }

        // Animation is handled by TweenChain (startWorkSequence)
    }

    startWorkSequence() {
        // Falls bereits eine Animation läuft, stoppen
        if (this.workTween) {
            this.workTween.stop();
        }

        // Erstelle eine Kette von Bewegungen
        this.workTween = this.scene.tweens.chain({
            targets: this, // Gilt für alle Schritte
            onComplete: () => {
                this.finishTask(); // Callback wenn ALLES fertig ist
            },
            tweens: [
                // Schritt 1: "Eintauchen" in die Arbeit (Squash-Effekt)
                {
                    scaleX: 1.2,
                    scaleY: 0.8,
                    duration: 150,
                    ease: 'Quad.easeOut'
                },
                // Schritt 2: Heftiges Tippen / Arbeiten (Wackeln)
                {
                    angle: { from: -5, to: 5 }, // Rotation
                    x: { from: this.x - 1, to: this.x + 1 }, // Leichtes Vibrieren
                    duration: 80,
                    yoyo: true,
                    repeat: 10, // 10 mal hin und her (ca. 1.6 Sekunden)
                    ease: 'Linear'
                },
                // Schritt 3: "Entspannen" / Normalisierung
                {
                    scaleX: 1,
                    scaleY: 1,
                    angle: 0,
                    x: this.x, // Sicherstellen, dass er exakt zurückkehrt
                    duration: 200,
                    ease: 'Back.easeOut'
                }
            ]
        });
    }

    finishTask() {
        this.currentState = STATE.IDLE;
        this.showFeedback('$');
        this.stateTimer = 500; // Kurze Pause
    }

    updateCoffee(delta) {
        // Energie regenerieren
        if (this.stateTimer <= 0) {
            this.energy = 100;
            this.currentState = STATE.IDLE;
            this.showFeedback('Refilled!');
        }
    }

    startPath(path) {
        if (path && path.length > 0) {
            this.path = path;
            this.currentState = STATE.MOVING;
            // Wir nehmen sofort den ersten Punkt ins Visier
            this.nextPathPoint();
        }
    }

    nextPathPoint() {
        if (this.path.length === 0) {
            this.stopMovement();
            return;
        }

        const nextTile = this.path.shift();
        // Tile-Mitte berechnen (32 = tileSize)
        this.movementTarget.set(
            nextTile.x * 32 + 16,
            nextTile.y * 32 + 16
        );

        const speed = this.role === 'support' ? 150 : 100;
        this.scene.physics.moveTo(this, this.movementTarget.x, this.movementTarget.y, speed);
    }

    followPath() {
        // [3] Effiziente Distanzberechnung
        const distSq = this.movementTarget.distanceSq(new Phaser.Math.Vector2(this.x, this.y));

        // 4px * 4px = 16 (Squared Distance ist schneller als sqrt)
        if (distSq < 16) {
            this.nextPathPoint();
        }
    }

    stopMovement() {
        this.body.reset(this.x, this.y); // Stoppt Velocity sofort

        if (this.movementIntent === 'FETCH_COFFEE') {
            this.currentState = STATE.COFFEE;
            this.stateTimer = 5000;
            this.movementIntent = null;
        } else {
            this.currentState = STATE.IDLE;
            this.stateTimer = 1000;
        }
    }

    showFeedback(text) {
        const colors = {
            '$': '#ffff00',
            '???': '#ff4444',
            '☕': '#ffffff',
            'Refilled!': '#ffffff',
            '101': '#00ff00',
            'default': '#00ff00'
        };

        const color = colors[text] || colors['default'];

        // Reuse statt Recreate [4]
        this.statusIcon.setText(text);
        this.statusIcon.setColor(color);
        this.statusIcon.setVisible(true);
        this.statusIcon.setAlpha(1);
        this.statusIcon.y = this.y - 20;

        // Prevent overlapping animations: stop existing feedback tween
        if (this.feedbackTween && this.feedbackTween.isPlaying()) {
            this.feedbackTween.stop();
        }

        // Animation für das Aufsteigen und Verschwinden
        this.feedbackTween = this.scene.tweens.add({
            targets: this.statusIcon,
            y: this.y - 40,
            alpha: 0,
            duration: 1000,
            onComplete: () => {
                this.statusIcon.setVisible(false);
            }
        });
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
        if (this.energy < 30 && this.currentState !== STATE.COFFEE && this.movementIntent !== 'FETCH_COFFEE') {
            this.movementIntent = 'FETCH_COFFEE';
            this.showFeedback('☕');
            this.scene.requestMove(this, 23, 2);
            return;
        }

        if (this.role === 'dev') {
            if (Phaser.Math.RND.frac() > 0.3) {
                this.currentState = STATE.WORKING;
                this.startWorkSequence();
                this.showFeedback('101');
            } else {
                this.currentState = STATE.IDLE;
                this.moveToRandomPoint();
            }
        } else if (this.role === 'sales') {
            this.currentState = STATE.IDLE;
            this.moveToRandomPoint();
            if (Phaser.Math.RND.frac() > 0.8) this.showFeedback('$');
        } else if (this.role === 'support') {
            this.currentState = STATE.IDLE;
            this.moveToRandomPoint();
        }
    }

    moveToRandomPoint() {
        const gridX = Phaser.Math.Between(1, 23);
        const gridY = Phaser.Math.Between(1, 18);
        this.scene.requestMove(this, gridX, gridY);
    }
}
