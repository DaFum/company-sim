# Thinking Workflow

## Reasoning Gate

Before acting, identify:

- **Known facts** from repository files, tests, or user instructions.
- **Assumptions** that are safe enough to proceed.
- **Unknowns** that would change the outcome.
- **Tradeoffs** between the simplest path and more robust alternatives.
- **Decision**: the smallest safe path and why it is acceptable.

## Escalation Rules

Ask the user only when:

- Multiple interpretations would produce materially different work.
- A product decision is required.
- A requested change conflicts with higher-priority instructions.
- Verification cannot be made honest without more information.

## Biases

- Prefer reversible, local choices.
- Prefer evidence from the repo over memory.
- Prefer explicit constraints over clever inference.
- Prefer naming uncertainty over hiding it.

## Decision Record Shape

When reasoning affects the implementation path, record:

- **Decision**: chosen path.
- **Why**: evidence or constraint that made it best.
- **Rejected**: one alternative and why it was not chosen.
- **Revisit if**: condition that would make the decision stale.
