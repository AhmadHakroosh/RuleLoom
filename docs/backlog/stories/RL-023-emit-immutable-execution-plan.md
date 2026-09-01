# RL-023: Emit an optimized immutable execution plan

## Objective

Transform a typed RuleLoom model into a deterministic, immutable execution plan with an explicit dependency graph.

## Technical constraints

- Type: `story`.
- Epic: `RL-E03`.
- Depends on: `RL-012`, `RL-022`.
- Optimizations may not change normative outcomes, diagnostics, proposed-action order, or requested full-trace semantics.
- The execution plan format has an explicit internal version and canonical serializer.
- Plans contain no resolver credentials or executable rule-supplied code.

## Functional requirements

1. Build dependency graphs for expressions, reusable expressions, facts, rules, and action payloads.
2. Detect and diagnose fact or expression dependency cycles that could not be rejected earlier.
3. Normalize equivalent boolean and operator structures into one canonical form.
4. Precompile JSON Pointers and registry symbol lookups.
5. Perform safe constant folding, dead-branch removal, and common-subexpression identification.
6. Annotate plan nodes with stable IDs, dependency sets, cost classes, and trace source mappings.
7. Freeze or otherwise enforce immutability of all externally reachable plan structures.
8. Implement canonical plan serialization and checksum calculation.
9. Add differential tests comparing optimized and non-optimized plan results over the conformance corpus.

## Quality requirements

- Compiling identical source and registry contracts must produce the same canonical bytes and checksum.
- Optimizer passes must be individually testable and disableable for differential verification.
- Plan serialization must not include machine paths, timestamps, object addresses, or nondeterministic map ordering.
- Public APIs must distinguish source schema version, plan version, and package version.

## Out of scope

- Persisting plans as a stable cross-language IR; RL-064 owns that contract.
- Runtime evaluation.
- Just-in-time generation of JavaScript source.

## Acceptance criteria

- Cyclic dependencies fail compilation with related source locations.
- Valid documents emit immutable, checksum-addressable plans.
- Optimized and unoptimized evaluation fixtures have identical normative outputs.
- Plan checksums remain stable across repeated builds on supported platforms.
