# RL-012: Create the v1 conformance corpus

## Objective

Create a portable, machine-readable fixture corpus that defines expected RuleLoom parsing, compilation, and evaluation behavior.

## Technical constraints

- Type: `story`.
- Epic: `RL-E02`.
- Depends on: `RL-010`, `RL-011`.
- Fixtures must be consumable without a TypeScript runtime.
- Expected results must use canonical JSON and stable diagnostic codes.

## Functional requirements

1. Define a fixture manifest format covering source document, registry contract, input facts, parameters, expected diagnostics, expected outcome, actions, and optional trace assertions.
2. Add positive cases for every v1 expression and value-reference form.
3. Add negative cases for invalid shapes, unknown references, bad arity, incompatible types, cycles, and unsafe paths.
4. Add semantic boundary cases for missing, null, indeterminate, error, empty collections, numeric boundaries, and short-circuit behavior.
5. Add determinism cases that vary object insertion order and asynchronous completion order while expecting identical canonical results.
6. Version the corpus independently and define how implementations report supported fixture sets.
7. Add a harness adapter that can run the corpus against the TypeScript implementation when it becomes available.

## Quality requirements

- Fixture identifiers and expected outputs must be stable and reviewable.
- No fixture may depend on wall-clock time, randomness, network access, locale, or machine-specific paths.
- Corpus validation must run in CI independently of the compiler implementation.
- Every normative RL-010 example must map to at least one fixture identifier.

## Out of scope

- Performance benchmarks.
- Third-party implementation certification service.
- Fixtures for optional post-v1 extensions.

## Acceptance criteria

- The corpus covers every normative v1 language rule and documented failure class.
- Invalid fixture manifests fail a standalone validation command.
- Another language can consume fixtures using only the documented JSON formats.
- Traceability from specification clauses to fixture IDs is complete.
