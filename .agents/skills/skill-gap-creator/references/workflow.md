# Skill Gap Creator Workflow

## Gap Gate

Create a new skill only when all are true:

1. `skill-router` and existing dedicated skills do not cover the task.
2. The task is likely to recur or needs reusable procedural guidance.
3. Extending an existing skill would make that skill too broad or confusing.
4. The new skill can be named with a focused, lowercase hyphen-case action or domain.

If any condition fails, use the closest existing skill and document the limitation instead of creating a new skill.

## Existing-Skill Search

Before creating anything:

- List existing `.agents/skills/*/SKILL.md` names and descriptions.
- Check `skill-router` routing for a close match.
- Read only the closest candidate skill references.
- State why each close candidate is insufficient.

## New Skill Contract

A new repo skill must include:

- `SKILL.md` with only `name` and `description` frontmatter.
- `agents/openai.yaml` with `display_name`, `short_description`, and `default_prompt`.
- `references/workflow.md` for the procedural details.
- A narrow trigger description that says when to use the skill.
- A router entry if future agents should discover it through `skill-router`.

## Creation Workflow

1. Choose a hyphen-case skill name under `.agents/skills/`.
2. Write a lean `SKILL.md` that points to `references/workflow.md`.
3. Put detailed procedure, decision gates, validation, and handoffs in `references/workflow.md`.
4. Add concise agent metadata in `agents/openai.yaml`.
5. Update `skill-router` only when the skill should be a first-class route.
6. Validate every skill with `quick_validate.py`.
7. Run project checks if the change touches docs, tooling, or repo conventions.

## Validation Checklist

Before finishing:

- The new skill solves a real gap, not a one-off task.
- Its scope does not overlap confusingly with existing skills.
- It has all required artifacts.
- It validates with the skill validator.
- The final report names whether a new skill was created or an existing skill was extended.
