# RL-033: Add evaluation budgets and cancellation

## Objective

Bound evaluation work and allow callers to cancel an invocation without mutating shared engine or plan state.

## Technical constraints

- Type: `story`.
- Epic: `RL-E04`.
- Depends on: `RL-030`.
- Use standard `AbortSignal` integration for cancellation.
- Limits are per evaluation and must be checked at deterministic boundaries.
- Cancellation does not imply rollback of application-owned resolver side effects.

## Functional requirements

1. Define limits for evaluated nodes, fact resolutions, collection iterations, nested depth, trace entries, elapsed deadline, and async concurrency.
2. Enforce compile-derived static limits before evaluation where possible.
3. Enforce runtime counters and deadline checks without requiring tracing.
4. Observe pre-aborted and mid-evaluation `AbortSignal` state.
5. Return distinct structured outcomes for caller cancellation, deadline expiry, and resource-limit exhaustion.
6. Propagate cancellation signals to async-capable interfaces without assuming they honor them.
7. Ensure one evaluation's cancellation cannot change the state of another invocation.
8. Add deterministic tests using controlled clocks and resolvers rather than wall-clock sleeps.

## Quality requirements

- Limits must have documented safe defaults and explicit override behavior.
- Error messages must not expose input facts.
- Counter overflow and extremely large configured values require boundary tests.
- Cancellation tests must not be timing-flaky.

## Out of scope

- Killing threads or processes.
- Distributed cancellation.
- Retrying canceled work.

## Acceptance criteria

- Each configured limit stops evaluation at its documented boundary with a distinct code.
- Pre-aborted evaluation performs no fact resolution.
- Controlled mid-run cancellation reaches registered async interfaces.
- Concurrent evaluations can be canceled independently.
