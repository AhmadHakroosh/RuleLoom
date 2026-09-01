# RL-E07: Extend RuleLoom for dynamic lifecycle and portability

## Objective

Add versioned dynamic rule management and specify the contracts required for future tools and language implementations.

## Technical constraints

- Type: `epic`.
- Epic: `none`.
- Depends on: `RL-E06`.
- This is a coordination ticket; child stories are the executable units.
- Extensions must preserve the v1 language and evaluation semantics.

## Functional requirements

1. Complete RL-060 for versioned bundles and atomic activation.
2. Complete RL-061 for parameterized templates and tenant overlays.
3. Complete RL-062 for shadow evaluation, decision diffing, and replay.
4. Complete RL-063 for decision-table compilation.
5. Complete RL-064 for portable IR and cross-language conformance.

## Quality requirements

- Dynamic activation must never expose partially compiled rule sets.
- Replay inputs must support redaction and retention policies.
- Portable contracts must be versioned independently from implementation packages.

## Out of scope

- A production control-plane service.
- A complete DMN implementation.
- Shipping every language port as part of this epic.

## Acceptance criteria

- RL-060 through RL-064 are complete.
- A versioned bundle can be activated, shadowed, compared, and replayed through stable public contracts.
- A non-TypeScript prototype can consume the portable IR and pass the designated conformance subset.
