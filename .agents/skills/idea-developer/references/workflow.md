# Idea Developer Workflow

## Concept Frame

Shape every idea into:

1. **User/player value**: what improves and for whom.
2. **Core loop impact**: how it affects decisions, feedback, progression, or clarity.
3. **Constraints**: technical, design, testing, accessibility, and performance limits.
4. **Smallest slice**: the first shippable version.
5. **Risks**: what could make the idea confusing, costly, or brittle.

## Refinement Rules

- Preserve the user's intent, but narrow execution to a testable slice.
- Prefer mechanics and UX changes that create clearer player feedback.
- Avoid speculative systems unless the request explicitly asks for ideation breadth.
- Connect ideas to existing project surfaces before proposing new surfaces.

## Handoff

When the concept is ready:

- Use `plan-writing` to create the implementation plan.
- Use `product-design` for user-facing polish.
- Use `architecture` or `frontend-phaser` when the idea changes state flow or Phaser behavior.

## Acceptance Filter

An idea is ready for planning only when it has:

- A named user/player problem.
- A smallest slice that can be verified.
- A clear non-goal to prevent scope creep.
- A target skill for execution (`product-design`, `architecture`, `frontend-phaser`, or `implementation`).
