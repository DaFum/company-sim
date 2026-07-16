# Architecture Workflow

## Map First

- Identify the owning layer: UI component, hook, store, service, game scene, asset pipeline, or test utility.
- Trace inputs, outputs, side effects, and lifecycle boundaries before editing.
- Prefer existing extension points over new abstractions.
- Read tests that describe current behavior before changing contracts.

## Design Rules

- Keep single-use logic close to the caller.
- Add abstraction only when at least two real call sites need it now.
- Preserve deterministic state transitions where possible.
- Keep AI/API boundaries explicit and testable.
- Avoid hidden coupling between React lifecycle and Phaser scene state.
- Do not refactor unrelated files while pursuing an architectural fix.

## Decision Record

Document only durable decisions:

- Why this boundary exists.
- Which alternatives were rejected.
- What future agents must not accidentally break.

Use `ARCHITECTURE.md`, `memory.md`, or scoped `AGENTS.md` only when the decision is repo-specific and likely to matter later.

## Handoff Checklist

Before leaving architectural work:

- Name the chosen boundary and the files that enforce it.
- Confirm callers and tests still agree on the contract.
- Hand off to `implementation` for code edits and `quality` for contract verification.
- Hand off to `documentation` only when the boundary is durable and non-obvious.
