# RL-E05: Deliver authoring, explainability, and testing tools

## Objective

Make RuleLoom rules type-safe to author, easy to test, and possible to explain without exposing sensitive fact data.

## Technical constraints

- Type: `epic`.
- Epic: `none`.
- Depends on: `RL-E02`, `RL-E04`.
- This is a coordination ticket; child stories are the executable units.
- All authoring paths must serialize to the same canonical language.

## Functional requirements

1. Complete RL-040 for the generic TypeScript builder.
2. Complete RL-041 for structured explanation traces.
3. Complete RL-042 for scenario and assertion testing helpers.
4. Complete RL-043 for lint, compile, test, and simulate CLI commands.

## Quality requirements

- Builder output must pass the same schema and compiler as hand-authored JSON.
- Trace generation must be opt-in by detail level and support redaction.
- CLI commands must have stable exit codes suitable for CI.

## Out of scope

- Hosted rule-management UI.
- IDE extensions.
- Executing proposed actions.

## Acceptance criteria

- RL-040 through RL-043 are complete.
- The documented example can be authored in JSON and TypeScript with equivalent canonical output.
- Users can test and explain decisions locally without application-specific scaffolding.
