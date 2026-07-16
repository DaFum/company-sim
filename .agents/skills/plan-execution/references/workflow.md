# Plan Execution Workflow

## Execution Loop

For each plan step:

1. Re-read the step and its verification check.
2. Inspect only the files needed for that step.
3. Make the smallest edit that satisfies the step.
4. Run the step's check or a targeted substitute.
5. Continue only after recording the result.

## Drift Control

- Do not improve adjacent code unless the plan requires it.
- If a step reveals a blocker, stop and update the plan before continuing.
- If a simpler path appears, state the change and why it still satisfies the goal.
- Remove only dead code introduced by the current work.

## Completion Gate

Finish only when:

- All planned steps are complete or explicitly superseded.
- Verification results are known.
- The diff contains no unrelated changes.
- Documentation updates were considered with the `documentation` skill when durable knowledge appeared.

## Progress Report Shape

When reporting execution progress, use:

- **Done**: completed steps.
- **Changed**: any plan adjustment and why it still meets the goal.
- **Verified**: exact checks run.
- **Blocked**: only if the same blocker prevents meaningful next action.

## Forward-Test Execution

For simulated or read-only forward tests, `plan-execution` may be used to describe the intended execution-progress shape without editing files. Clearly label the result as simulated and do not claim implementation completion.
