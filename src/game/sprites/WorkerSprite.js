import Phaser from 'phaser';

export default class WorkerSprite extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, role, id) {
        // Texture based on role
        const texture = `worker_${role}`;
        super(scene, x, y, texture);

        this.scene = scene;
        this.role = role;
        this.id = id;

        // Physics
        this.scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);
        this.body.setSize(24, 24);

        // State Machine
        this.state = 'IDLE'; // IDLE, WORKING, MOVING, EVENT
        this.stateTimer = 0;

        // Pathfinding
        this.path = [];
        this.targetX = x;
        this.targetY = y;

        // Visuals
        this.statusIcon = null;
    }

    update(time, delta) {
        this.stateTimer -= delta;

        // --- STATE LOGIC ---
        if (this.state === 'MOVING') {
            this.followPath();
        }
        else if (this.state === 'IDLE' || this.state === 'WORKING') {
            if (this.stateTimer <= 0) {
                this.decideNextAction();
            }
        }

        // --- ROLE ANIMATIONS ---
        if (this.state === 'WORKING' && this.role === 'dev') {
            // Jiggle effect for typing
            this.x += (Math.random() - 0.5) * 1;
        }

        // --- ICON UPDATE ---
        if (this.statusIcon) {
            this.statusIcon.x = this.x;
            this.statusIcon.y = this.y - 20;
            this.statusIcon.alpha -= 0.01;
            if (this.statusIcon.alpha <= 0) {
                this.statusIcon.destroy();
                this.statusIcon = null;
            }
        }
    }

    decideNextAction() {
        // 1. Check for Events (Pizza, Fire) -> Handled by Scene pushing state

        // 2. Role Behavior
        if (this.role === 'dev') {
            // Devs mostly work
            if (Math.random() > 0.3) {
                this.state = 'WORKING';
                this.stateTimer = 3000 + Math.random() * 2000;
                this.showFeedback('101');
            } else {
                this.state = 'IDLE'; // Coffee break?
                this.moveToRandomPoint();
            }
        }
        else if (this.role === 'sales') {
            // Sales always roam
            this.state = 'IDLE'; // Actually Moving
            this.moveToRandomPoint();
            if (Math.random() > 0.8) this.showFeedback('$');
        }
        else if (this.role === 'support') {
            // Support patrols
            this.moveToRandomPoint();
        }
    }

    moveToRandomPoint() {
        const gridX = Phaser.Math.Between(1, 23); // Keep within bounds
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
        if (this.path.length === 0) {
            this.state = 'IDLE';
            this.body.reset(this.x, this.y);
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
            this.scene.physics.moveTo(this, targetX, targetY, (this.role === 'support' ? 150 : 100));
        }
    }

    showFeedback(text) {
        if (this.statusIcon) this.statusIcon.destroy();

        let color = '#00ff00';
        if (text === '101') color = '#00ff00';
        if (text === '$') color = '#ffff00';

        this.statusIcon = this.scene.add.text(this.x, this.y - 20, text, {
            fontSize: '14px', color: color, stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5);
    }
}
