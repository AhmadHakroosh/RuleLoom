# RL-E01: Establish the RuleLoom engineering foundation

## Objective

Create a governed TypeScript repository in which agents and humans can deliver RuleLoom changes through real, reproducible quality gates.

## Technical constraints

- Type: `epic`.
- Epic: `none`.
- Depends on: `none`.
- This is a coordination ticket; child stories are the executable units.
- Preserve the Apache-2.0 license already committed to the repository.

## Functional requirements

1. Complete RL-001 to create the TypeScript workspace and package boundaries.
2. Complete RL-002 to install local and protected CI quality gates.
3. Complete RL-003 to integrate the Agentic Engineering System delivery contracts.
4. Complete RL-004 to document governance, security reporting, and contribution rules.
5. Complete RL-005 to add repository-local governed delivery agent definitions.

## Quality requirements

- All configured checks must perform real validation and fail on violations.
- Repository setup must be reproducible from a clean clone.
- No credentials, generated dependency trees, or SHA-bound delivery evidence may be committed.

## Out of scope

- Rule language semantics.
- Compiler or evaluator implementation.
- Publishing packages to a public registry.

## Acceptance criteria

- RL-001 through RL-005 are complete with accepted delivery evidence.
- A fresh clone can install, check, test, and build using documented commands.
- Protected CI and the Agentic delivery workflow agree on the required checks.
