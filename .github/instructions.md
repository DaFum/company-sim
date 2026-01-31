# Copilot Custom Instructions for Startup AI Sim

## Project Overview
This project is a startup simulation game built using **Phaser 3** for the game engine and **React** for the UI, managed by **Vite**. State management is handled by **Zustand**.

## Coding Standards

### Documentation
- **JSDoc is Mandatory:** All functions, classes, and complex logic blocks must have JSDoc comments.
- **Typedefs:** Use `@typedef` to define complex object structures (e.g., `Roster`, `Employee`) to ensure type safety and better IntelliSense.

### Phaser & Game Logic
- **Scene Management:** Keep scene logic (in `src/game/scenes/`) separate from React UI components.
- **Asset Management:** Use `PreloadScene.js` for loading and generating assets. Procedural generation is preferred for keeping assets lightweight.
- **Tweens:** Manage tweens carefully. For chaos events, store references to tweens (e.g., in `_chaosTweens`) to allow selective stopping without affecting core gameplay animations.

### React & State
- **Functional Components:** Use functional React components with hooks.
- **Zustand:** Use `useGameStore` for global state. Avoid prop drilling for game state.
- **Direct Store Access:** Phaser scenes should access the store via `useGameStore.getState()` for reading and `useGameStore.setState()` (or actions) for writing, to avoid React-Phaser bridge issues.

### Testing
- **Vitest:** Use Vitest for unit testing.
- **Mocking:** When testing Phaser scenes, mock internal Phaser properties (like `textures.exists`, `tweens`) if the full Phaser environment isn't available.

## Key Files
- `src/game/scenes/MainScene.js`: Core game loop and entity management.
- `src/store/gameStore.js`: Central logic for economics, employees, and events.
- `src/hooks/useAiDirector.js`: Logic for the AI Director actions.
