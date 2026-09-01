# RL-E04: Implement the deterministic evaluation runtime

## Objective

Evaluate immutable RuleLoom plans safely and deterministically with synchronous and asynchronous facts.

## Technical constraints

- Type: `epic`.
- Epic: `none`.
- Depends on: `RL-E03`.
- This is a coordination ticket; child stories are the executable units.
- Evaluation state must be isolated per invocation.

## Functional requirements

1. Complete RL-030 for the synchronous evaluator.
2. Complete RL-031 for four-state outcomes and missing-value policies.
3. Complete RL-032 for rule-set ordering, proposed actions, and conflict handling.
4. Complete RL-033 for cancellation and resource budgets.
5. Complete RL-034 for asynchronous fact resolution.
6. Complete RL-035 for request-local and pluggable fact caching.

## Quality requirements

- Concurrent evaluations on one compiled plan must not interfere.
- Ordering and outcomes must not depend on promise completion order.
- Failure and cancellation paths require automated tests.

## Out of scope

- Executing business actions or side effects.
- Distributed workflow orchestration.
- Complex event processing over unbounded streams.

## Acceptance criteria

- RL-030 through RL-035 are complete.
- Sync and async conformance suites return identical decisions where facts are equivalent.
- Cancellation, limits, resolver failures, and concurrent runs behave deterministically.
