# Implementation Workflow

## Surgical Workflow

1. Read applicable instructions and nearby code.
2. Form a minimal plan with a verification command per step.
3. Edit only files required by the request.
4. Remove imports, variables, mocks, and fixtures made obsolete by your own changes.
5. Match local style even when you would normally choose differently.
6. Prefer clear direct code over speculative configurability.

## Dependency Rules

- Check whether the project already has a suitable dependency before adding one.
- Add packages only when native/project-local code would be riskier or much larger.
- Update lockfiles together with manifests.
- Verify install/build/test behavior after dependency changes.

## Code Review Checklist

- Every changed line maps to the request.
- No unrelated formatting churn.
- No try/catch around imports.
- No new dead code.
- No hidden behavior change outside the requested scope.
- Tests or checks cover the changed path, or the final report explains why not.

## Handoff Checklist

Before leaving implementation work:

- Re-run the relevant check named in the plan.
- Confirm changed files are limited to the requested outcome.
- Hand off to `quality` when tests or validation need to be selected.
- Hand off to `documentation` when the implementation introduces durable repo knowledge.
