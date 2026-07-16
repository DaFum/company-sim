# Performance Workflow

## Performance Map

- Identify the constrained resource: frame time, network/API latency, token cost, memory, bundle size, startup time, or test runtime.
- Measure or inspect before optimizing.
- Prefer deleting unnecessary work over caching it.
- Keep optimizations local and explain the tradeoff.

## Project-Specific Risk Areas

- React state updates can cascade into unnecessary component renders.
- Phaser scene updates can degrade frame pacing if work runs every tick without need.
- AI service calls should be bounded, validated, and resilient to malformed responses.
- Large visual effects should not compromise input responsiveness.

## Verification

- Run build for bundling-sensitive changes.
- Run targeted tests for services/hooks/scenes touched.
- Use browser profiling or manual inspection when the task is explicitly visual/runtime performance.

## Optimization Guardrails

Before accepting a performance change:

- State what work was reduced, delayed, batched, or measured.
- Avoid caching unless invalidation is obvious.
- Keep readability unless the measured bottleneck justifies complexity.
- Hand off to `quality` for regression checks and `frontend-phaser` when frame pacing or scene behavior changed.

## Frame and Effect Budgets

For Phaser visual effects, start with these conservative budgets unless local evidence suggests otherwise:

- Target smooth 60 FPS behavior, so avoid adding work that risks exceeding roughly 16.7ms per frame during normal play.
- Prefer one-shot tweens/timelines over persistent `update()` work.
- Cap particles, spawned graphics, alpha layers, and overdraw to the smallest visible effect.
- Coalesce, replace, or drop repeated visual triggers instead of allowing unbounded effect stacks.
- Profile or manually inspect repeated triggers before claiming the optimization is safe.
