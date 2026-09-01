# RL-E03: Build the RuleLoom compiler

## Objective

Compile validated RuleLoom documents into immutable, type-checked execution plans with actionable diagnostics.

## Technical constraints

- Type: `epic`.
- Epic: `none`.
- Depends on: `RL-E02`.
- This is a coordination ticket; child stories are the executable units.
- Compilation must not resolve external facts or execute actions.

## Functional requirements

1. Complete RL-020 for parsing and structural diagnostics.
2. Complete RL-021 for fact, parameter, reference, and operator binding.
3. Complete RL-022 for static type and operator-signature checking.
4. Complete RL-023 for dependency analysis, normalization, optimization, and immutable plan emission.

## Quality requirements

- Diagnostics must include stable codes and source locations.
- Compilation must be deterministic for the same source and registry contract.
- Compiler behavior must be covered by the conformance corpus and negative fixtures.

## Out of scope

- Evaluating compiled plans.
- Fetching or caching fact values.
- Persisting compiled plans across incompatible IR versions.

## Acceptance criteria

- RL-020 through RL-023 are complete.
- Invalid documents fail before evaluation with actionable diagnostics.
- Equivalent source documents produce byte-stable canonical plans.
