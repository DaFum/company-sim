# Quality Workflow

## Test Strategy

- For bugs: write or identify a failing reproduction before fixing when practical.
- For features: test the observable behavior, not implementation trivia.
- For refactors: run relevant tests before and after if feasible.
- Prefer targeted tests first, then broader suites when risk is cross-cutting.

## Validation Ladder

1. Static inspection of the diff.
2. Targeted unit/component test.
3. Related integration or user-flow test.
4. Lint/type/build check.
5. Full suite when the touched area is broad or fragile.

## Failure Handling

- Treat failing checks as work remaining unless the failure is clearly unrelated or environment-limited.
- Capture the exact command and salient failure.
- Do not claim success for unrun checks.
- If a flaky or environment-limited test blocks validation, run the closest deterministic substitute and report the limitation.

## Evidence Checklist

A validation report should include:

- Exact command or manual check.
- Pass/fail/warning status.
- What behavior the check proves.
- Any known gap that remains unverified.
