# RL-042: Create the RuleLoom testing package

## Objective

Let consumers express deterministic rule scenarios and assert decisions, diagnostics, actions, and trace structure without custom test scaffolding.

## Technical constraints

- Type: `story`.
- Epic: `RL-E05`.
- Depends on: `RL-030`, `RL-040`, `RL-041`.
- The package must work with the project's supported test runners through framework-neutral APIs.
- Test scenarios are serializable where facts are static.
- Snapshot helpers must exclude volatile and sensitive fields by default.

## Functional requirements

1. Define scenario inputs for rule document or plan, registry contract, facts, parameters, options, and expected result.
2. Implement assertions for compile success/failure, rule outcomes, action selection, missing facts, diagnostics, and trace paths.
3. Implement table-driven scenario execution with stable case identifiers.
4. Provide safe canonical snapshots that omit timings, stack traces, and redacted values.
5. Add resolver fakes supporting deferred completion, rejection, cancellation, call counts, and controlled clocks.
6. Add helpers for determinism, concurrent-isolation, and equivalent sync/async fact tests.
7. Document use with the repository's selected test runner and a generic assertion library.
8. Use the package itself to run selected RL-012 conformance fixtures.

## Quality requirements

- Assertion failures must show focused diffs and fixture IDs.
- Helpers may not rely on real sleeps or network access.
- The package must not introduce a production dependency into runtime packages.
- Public types and examples require compile-time tests.

## Out of scope

- Hosted test management.
- Property-based generator implementation owned by RL-052.
- Performance benchmarking owned by RL-050.

## Acceptance criteria

- A consumer can test compile failure, matched action, missing fact, and async cancellation scenarios with documented helpers.
- Equivalent runs produce stable safe snapshots.
- Resolver fakes support deterministic completion ordering and cancellation assertions.
- Selected conformance fixtures execute through the public testing API.
