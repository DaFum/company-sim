# Documentation Workflow

## Documentation Targets

- `README.md`: user-facing setup, commands, and project overview.
- `ARCHITECTURE.md`: executive summary of system vision and important boundaries.
- `memory.md`: durable observations future agents should remember.
- `AGENTS.md`: non-obvious repo- or directory-specific operating rules.
- Skill files: repeatable workflows for future Codex instances.

## Update Rules

- Update docs only when the change makes existing docs wrong or leaves future agents likely to repeat a mistake.
- Keep instructions scoped to the narrowest directory that needs them.
- Do not duplicate the same rule across multiple docs unless each audience needs it.
- Prefer concise, actionable guidance over narrative history.
- Preserve existing voice and formatting.

## AGENTS.md Decision Test

Add or update an `AGENTS.md` only when all are true:

1. The rule is repo-specific or directory-specific.
2. The rule is durable, not a one-off task note.
3. Future agents would plausibly miss it without the file.
4. The rule prevents real mistakes in code, tests, docs, or operations.

## Review Checklist

Before finishing documentation work:

- Verify the doc has a clear future reader.
- Remove one-off task history unless it belongs in `memory.md`.
- Keep commands, paths, and file names exact.
- Hand off to `quality` for format/validation checks and `release` for final reporting.
