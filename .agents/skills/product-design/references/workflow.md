# Product & Design Workflow

## Direction Gate

Before editing UI, state:

1. **Purpose**: who benefits and what friction disappears.
2. **Tone**: choose one decisive aesthetic direction.
3. **Constraints**: framework, accessibility, performance, existing style, and tests.
4. **Signature moment**: the one thing users should remember.

## Inspection Checklist

- Read the component, CSS, scene, or copy files directly involved.
- Check existing naming, layout rhythm, color variables, animation conventions, and responsive behavior.
- Look for tests that cover user-visible flows.
- Avoid generic visual defaults; align with the repo's established design language unless the task asks for a new direction.

## Execution Rules

- Prefer cohesive design systems over one-off decoration.
- Keep motion purposeful: one orchestrated reveal or feedback moment beats scattered animation.
- Preserve accessibility: semantic controls, visible focus, readable contrast, keyboard paths, reduced-motion considerations when relevant.
- Do not introduce external fonts, assets, or libraries unless explicitly needed and justified.
- If the change is perceptible in a runnable web app, capture a screenshot when the environment allows it.

## Verification

- Run relevant component/user-flow tests.
- Run lint/build when CSS/React integration risk exists.
- Manually inspect rendered output when visual fidelity is the point of the change.

## Design Handoff Checklist

Before leaving product/design work:

- State the chosen aesthetic direction and why it fits the feature.
- Confirm text, spacing, motion, and accessibility still support the user goal.
- Hand off to `frontend-phaser` for Phaser-rendered presentation.
- Hand off to `quality` for user-flow or component validation.
