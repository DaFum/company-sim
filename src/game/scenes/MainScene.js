import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';

export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
    this.workersGroup = null;
    this.unsubscribeStore = null;
  }

  create() {
    console.log("MainScene started");

    // --- 1. Layering Setup ---
    // Background (Floor)
    this.createFloor();

    // Entity Layer (Workers)
    this.workersGroup = this.add.group();

    // --- 2. Camera Setup ---
    this.cameras.main.centerOn(400, 300);
    this.cameras.main.setBackgroundColor('#2d2d2d');

    // --- 3. Initial Sync ---
    // Hole aktuellen Worker-Count direkt
    const currentWorkers = useGameStore.getState().workers;
    this.syncWorkers(currentWorkers);

    // --- 4. Reactive Listener (Subscription) ---
    // Abonniere Änderungen am 'workers' State
    this.unsubscribeStore = useGameStore.subscribe(
      (state) => state.workers,
      (newCount) => {
        console.log(`Phaser received worker update: ${newCount}`);
        this.syncWorkers(newCount);
      }
    );

    // Optional: Textanzeige für Debugging im Canvas
    this.debugText = this.add.text(10, 10, 'Phaser Running', { font: '16px monospace', fill: '#00ff00' });
    this.debugText.setScrollFactor(0); // Fixiert am Bildschirmrand
  }

  update(time, delta) {
    // --- 5. Polling Loop ---
    // Lese Daten, die sich schnell ändern (z.B. Tick, Cash für Animationen)
    const state = useGameStore.getState();

    // Beispiel: Zeige Tick/Cash im Debug Text
    this.debugText.setText(
      `Tick: ${state.tick} | Cash: ${state.cash.toFixed(0)}€ | Workers: ${state.workers}`
    );

    // Beispiel: Bewege Workers leicht basierend auf Tick (Animation)
    // Hier könnten wir prüfen: if (state.tick % 10 === 0) ...
    this.workersGroup.children.iterate((worker) => {
        // Kleines "Atmen" oder Wackeln
        worker.y += Math.sin(time / 200) * 0.5;
    });
  }

  createFloor() {
    // Zeichne einen einfachen Boden-Raster
    for (let x = 0; x < 25; x++) {
      for (let y = 0; y < 20; y++) {
        this.add.image(x * 32, y * 32, 'floor').setOrigin(0);
      }
    }
  }

  syncWorkers(count) {
    // Simple Logik: Entferne alle und erstelle neu (für Phase 2 okay)
    // Besser wäre: Nur Differenz hinzufügen/entfernen
    this.workersGroup.clear(true, true);

    for (let i = 0; i < count; i++) {
        this.spawnWorker(i);
    }
  }

  spawnWorker(index) {
    // Platziere Worker in einem Grid
    const x = 100 + (index % 5) * 50;
    const y = 100 + Math.floor(index / 5) * 50;

    const worker = this.add.sprite(x, y, 'worker');
    this.workersGroup.add(worker);
  }

  destroy() {
    // Cleanup Listener
    if (this.unsubscribeStore) {
        this.unsubscribeStore();
    }
  }
}
