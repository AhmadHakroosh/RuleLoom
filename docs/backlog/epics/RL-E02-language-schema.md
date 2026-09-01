# RL-E02: Specify the RuleLoom language and schema

## Objective

Define a safe, versioned, implementation-independent contract for authoring and interpreting RuleLoom JSON.

## Technical constraints

- Type: `epic`.
- Epic: `none`.
- Depends on: `RL-E01`.
- This is a coordination ticket; child stories are the executable units.
- Persisted rules remain data and may not contain executable JavaScript.

## Functional requirements

1. Complete RL-010 to specify language semantics and terminology.
2. Complete RL-011 to define the canonical TypeScript AST and JSON Schema.
3. Complete RL-012 to publish the cross-implementation conformance corpus.
4. Complete RL-013 to implement safe RFC 6901 JSON Pointer access.

## Quality requirements

- Semantics must cover success, failure, missing values, type errors, and edge cases.
- Schema and TypeScript representation must have an automated drift check.
- Examples must be executable as conformance fixtures.

## Out of scope

- A visual rule editor.
- Compatibility with json-rules-engine or JsonLogic syntax.
- Full DMN or CEL implementation.

## Acceptance criteria

- RL-010 through RL-013 are complete.
- A rule document can be validated without executing it.
- Independent implementations can derive the same expected behavior from the specification and fixtures.
