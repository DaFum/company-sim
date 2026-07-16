# Frontend Phaser Workflow

## Inspection Map

Before editing Phaser code:

- Read the affected scene, sprite, config, and component bridge files.
- Trace how React state or hooks communicate with the Phaser scene.
- Check tests for scene setup, preload behavior, and user-visible game paths.
- Identify whether work belongs in Phaser, React UI, store state, or a service.

## Execution Rules

- Keep scene lifecycle work inside the appropriate Phaser lifecycle method.
- Avoid per-frame work unless it is necessary for visible behavior.
- Keep sprite responsibilities narrow: rendering and direct presentation behavior.
- Keep React-to-Phaser boundaries explicit; avoid hidden globals or implicit timing dependencies.
- Preserve deterministic behavior in tests by mocking assets, timers, or Phaser APIs as existing tests do.

## Verification

- Run targeted scene or click-path tests for touched behavior.
- Run `npm run test:run` when scene changes affect shared game state or integration.
- Run `npm run lint` for changed JavaScript/JSX.
- Manually inspect the game when visual timing or animation feel is the requested outcome.

## Phaser Handoff Checklist

Before leaving Phaser frontend work:

- Identify whether the change touched scene lifecycle, sprites, input, timing, or React bridging.
- Confirm any visual change has a user-visible reason.
- Hand off to `performance` when work runs every frame or affects asset/loading cost.
- Hand off to `product-design` when animation feel, readability, or player feedback changed.
