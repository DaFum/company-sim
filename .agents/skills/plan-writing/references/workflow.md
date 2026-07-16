# Plan Writing Workflow

## Plan Contract

A useful plan must include:

1. **Goal**: one sentence naming the requested outcome.
2. **Assumptions**: what is being inferred and what would change the approach.
3. **Scope boundary**: what will not be touched.
4. **Steps**: short actions in execution order.
5. **Verification**: one concrete check per meaningful step.

## Rules

- Prefer the smallest plan that proves the change works.
- Do not invent optional features or future-proofing.
- Surface tradeoffs before selecting a path when multiple valid paths exist.
- Ask only when the ambiguity blocks safe progress.
- Keep plans editable: each step should be independently understandable.

## Output Shape

Use this form for multi-step work:

```text
1. [Step] → verify: [command/check]
2. [Step] → verify: [command/check]
3. [Step] → verify: [command/check]
```

## Quality Bar

A plan is not ready if:

- A step cannot be verified.
- The scope boundary is missing.
- It bundles unrelated outcomes into one step.
- It skips a necessary specialist skill from `skill-router`.
