# RL-034: Add typed asynchronous fact resolution

## Objective

Resolve asynchronous facts through a bounded scheduler while preserving deterministic RuleLoom decisions and synchronous fast-path behavior.

## Technical constraints

- Type: `story`.
- Epic: `RL-E04`.
- Depends on: `RL-031`, `RL-033`.
- Resolver callbacks are registered by trusted host code and never persisted in rule JSON.
- Scheduler concurrency is bounded per evaluation.
- Resolver completion order may not change decision or action order.

## Functional requirements

1. Define typed resolver callbacks receiving validated parameters, an abort signal, and a read-only fact-access context.
2. Validate resolver outputs against declared runtime value contracts at the trust boundary.
3. Schedule fact dependencies lazily and avoid launching short-circuited work.
4. Bound concurrent resolver invocations and queue remaining work fairly and deterministically.
5. Deduplicate simultaneous requests for the same fact and canonical parameters within an evaluation.
6. Detect runtime fact-dependency cycles and return a stable error rather than deadlocking.
7. Normalize synchronous returns, promises, rejections, aborts, and invalid outputs into RuleLoom result types.
8. Preserve the promise-free synchronous API for plans that require no async facts.
9. Add controlled-order tests in which resolvers complete in different sequences.

## Quality requirements

- Resolver errors must retain safe cause metadata without leaking arbitrary thrown values.
- No unhandled promise rejection may escape evaluation.
- Queued work must not start after cancellation or decisive short-circuiting.
- Scheduler behavior requires unit, integration, concurrency, and cancellation tests.

## Out of scope

- Cross-evaluation caching.
- Network retry or circuit-breaker policies.
- Loading executable resolver code from a bundle.

## Acceptance criteria

- Async and equivalent sync facts produce identical normative decisions.
- Concurrency never exceeds the configured evaluation limit.
- Duplicate in-flight fact requests invoke the resolver once.
- Completion order, cancellation, rejection, and runtime cycles behave as documented.
