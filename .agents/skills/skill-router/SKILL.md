---
name: skill-router
description: Master router for repository work. Use before changing, extending, optimizing, validating, documenting, committing, or preparing pull requests for this project; route to the dedicated thinking, plan-writing, plan-execution, idea-developer, frontend-phaser, product-design, architecture, implementation, quality, performance, documentation, or release skill before taking repository actions.
---

# Skill Router

## Mission Gate

Before any repository action, complete this gate:

1. Restate the goal in one sentence.
2. Name assumptions, ambiguities, and the simplest safe path.
3. Define success criteria and exact verification commands.
4. Read applicable `AGENTS.md` files and inspect nearby project patterns.
5. Select the smallest set of dedicated skills from the router below.
6. Read each selected skill's `SKILL.md` and only the reference files it instructs you to load.

## Dedicated Skill Router

| Work type | Use skill |
| --- | --- |
| Ambiguity, tradeoffs, assumptions, decision framing, reasoning checkpoints | `thinking` |
| Writing a concrete plan, success criteria, verification strategy | `plan-writing` |
| Executing an approved plan step-by-step without scope drift | `plan-execution` |
| Shaping raw ideas into scoped product/game concepts | `idea-developer` |
| Phaser scenes, sprites, canvas integration, game-loop frontend work | `frontend-phaser` |
| User-facing behavior, visual polish, interaction design, game feel, copy | `product-design` |
| State flow, services, hooks, Phaser scenes, AI orchestration, boundaries | `architecture` |
| Code edits, dependency changes, scripts, configuration | `implementation` |
| Tests, linting, bug reproduction, regression prevention | `quality` |
| Runtime smoothness, build size, rendering, responsiveness, API efficiency | `performance` |
| README, memory, architecture notes, scoped `AGENTS.md`, skill docs | `documentation` |
| Git status, commit hygiene, pull request body, release-readiness | `release` |

## Combination Patterns

Use multiple skills only when each one changes the work:

- **Unclear request**: `thinking` → `plan-writing` → task-specific skill.
- **Feature or bug work**: `plan-writing` → `implementation` or `frontend-phaser` → `quality` → `release`.
- **UX/game-feel work**: `idea-developer` → `product-design` → `frontend-phaser` when Phaser changes are needed.
- **Architecture-sensitive work**: `thinking` → `architecture` → `implementation` → `quality`.
- **Docs-only work**: `documentation` → `quality` for validation → `release`.

## Minimal Loading Rule

Do not load every skill by default. Load the router, then only the dedicated skill references that materially affect the next action. If the task broadens, return to the router and add one skill at a time.

## Operating Loop

1. Observe with read-only commands first.
2. Orient around existing patterns and the selected dedicated skill.
3. Act surgically; every changed line must trace to the request.
4. Verify with the checks named in the success criteria.
5. Record durable knowledge only when it prevents future mistakes.
6. Ship through the `release` skill when repository changes were made.

## Stop Conditions

Stop and surface the issue when context is inaccessible, instructions conflict, validation cannot honestly run, or the smallest safe implementation requires an unmade product decision.
