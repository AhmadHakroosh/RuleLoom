# RL-030: Implement the synchronous evaluator

## Objective

Evaluate a compiled RuleLoom plan against synchronous fact values using isolated per-invocation state and deterministic short-circuiting.

## Technical constraints

- Type: `story`.
- Epic: `RL-E04`.
- Depends on: `RL-013`, `RL-023`.
- Evaluation plans and registries are immutable and reusable concurrently.
- The synchronous path may not allocate promises or schedule microtasks.
- Evaluation returns data and never executes proposed actions.

## Functional requirements

1. Define an `EvaluationContext` containing plan identity, input facts, parameters, limits, and optional trace settings.
2. Implement literal, parameter, fact, path, local, operator, `all`, `any`, and `not` node evaluation.
3. Apply normative left-to-right short-circuit behavior while preserving deterministic result order.
4. Memoize pure expression results within one evaluation using plan node IDs.
5. Return an immutable decision result with plan checksum, rule results, and proposed actions.
6. Prevent mutation of compiled plans and caller-owned input values.
7. Add concurrency tests evaluating one plan simultaneously with distinct inputs.
8. Run the synchronous evaluation subset of the conformance corpus.

## Quality requirements

- The hot synchronous path must be benchmarkable independently from compilation and tracing.
- Evaluation errors must use structured codes and retain safe source mappings.
- Tests must cover nested logic, repeated expressions, short-circuited failures, and input isolation.
- No module-level mutable evaluation state is permitted.

## Out of scope

- Async fact resolvers.
- Missing-value outcome propagation beyond the minimal interfaces required for RL-031.
- Cross-run caching.

## Acceptance criteria

- Valid synchronous conformance fixtures produce the specified decisions.
- A short-circuited branch is not evaluated.
- Concurrent evaluations of one plan cannot observe or alter each other's state.
- The synchronous evaluator creates no promises during a fully synchronous evaluation.
