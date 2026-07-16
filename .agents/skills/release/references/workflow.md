# Release Workflow

## Pre-Commit Gate

- Run `git status --short`.
- Review the diff for unrelated changes.
- Confirm generated files, lockfiles, and docs are intentional.
- Run relevant validation commands and record exact results.
- Do not commit if checks reveal unresolved agent-caused failures.

## Commit Rules

- Commit only the intended repository changes.
- Use a concise imperative message that names the outcome.
- Do not amend or rewrite history unless explicitly requested.

## PR Body Structure

Use a short, practical body:

- Summary bullets describing what changed.
- Tests/checks with exact commands.
- Notes for reviewers only when there is a limitation, follow-up, or risk.

## Final Report

- Mention the commit hash if available.
- Include the PR creation result when tooling provides it.
- Prefix every test/check command with pass, warning, or fail markers as required by the active instructions.

## PR Readiness Checklist

Before creating PR metadata:

- Confirm `git status --short` contains only intentional changes.
- Confirm commit history has the new work committed.
- Include checks actually run; do not say tests were skipped if they passed.
- Keep reviewer notes focused on risks, limitations, or follow-ups.
