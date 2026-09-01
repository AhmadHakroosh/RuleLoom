# RL-051: Implement bounded batch evaluation

## Objective

Evaluate one immutable plan across many independent inputs efficiently while preserving per-item isolation, ordering, cancellation, and diagnostics.

## Technical constraints

- Type: `story`.
- Epic: `RL-E06`.
- Depends on: `RL-035`, `RL-050`.
- Batch evaluation reuses compiled plans but not mutable per-evaluation state.
- Input and output ordering is stable regardless of async completion order.
- Batch concurrency and total resource use are bounded.

## Functional requirements

1. Define batch APIs for arrays and async iterables with indexed or caller-supplied item IDs.
2. Reuse immutable plan structures and precompiled pointers across items.
3. Bound item-level and resolver-level concurrency separately.
4. Support fail-fast and collect-errors policies without losing completed item results.
5. Support batch-wide and item-specific cancellation signals.
6. Preserve output ordering or document an explicit streaming completion-order mode.
7. Isolate request-local fact caches by item unless a fact descriptor explicitly declares safe batch sharing.
8. Expose aggregate counts and safe performance metadata without forcing full traces.
9. Add benchmarks and tests for 1, 1,000, and large bounded input sets, including slow and failing resolvers.

## Quality requirements

- Batch APIs must apply backpressure to async iterables.
- Memory usage must remain bounded by configured concurrency plus retained results.
- One item error must not corrupt another item's context or cache.
- Streaming consumers must be able to stop without starting all remaining work.

## Out of scope

- Distributed batch workers.
- Vectorized domain-specific operators.
- Persistence of batch results.

## Acceptance criteria

- Batch decisions match individual evaluation results for the same inputs.
- Configured item and resolver concurrency limits are never exceeded.
- Async iterable inputs are consumed with documented backpressure.
- Failure, cancellation, ordering, cache isolation, and memory-bound tests pass.
