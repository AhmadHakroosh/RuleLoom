# RL-035: Add request-local and pluggable fact caching

## Objective

Cache pure fact results through explicit policies without weakening determinism, isolation, cancellation, or tenant boundaries.

## Technical constraints

- Type: `story`.
- Epic: `RL-E04`.
- Depends on: `RL-034`.
- Request-local promise deduplication is the default cache.
- Cross-run caching is opt-in through a host-provided adapter.
- Cache keys may not depend on object identity or nondeterministic serialization.

## Functional requirements

1. Define canonical cache-key material from fact ID, resolver version, validated parameters, and declared varying context fields.
2. Implement request-local caching of successful pure fact results and in-flight promises.
3. Define a pluggable external cache interface with get, set, invalidate, TTL, and namespace support.
4. Require explicit tenant or security-domain namespaces for shared adapters.
5. Define policies for caching missing results and prohibit caching errors or cancellations by default.
6. Validate externally cached values against the fact output contract before use.
7. Expose cache hit, miss, deduplicated, invalid, and bypass metadata to trace hooks without exposing values.
8. Add reference in-memory adapter tests for TTL, eviction, namespace isolation, and invalidation.

## Quality requirements

- Cache serialization and hashing must be deterministic across supported runtimes.
- Secret fact values must not appear in keys, logs, or metrics.
- Adapter failures must follow an explicit fail-open or fail-closed policy selected by the host.
- Tests must cover rejected promises, invalid cached data, cancellation, and tenant isolation.

## Out of scope

- Shipping Redis or cloud-cache clients in core packages.
- Automatic invalidation based on external database changes.
- Caching impure facts unless the host explicitly overrides the safety default.

## Acceptance criteria

- Repeated identical pure fact requests within one evaluation resolve once.
- Namespaced external cache entries cannot be read across configured tenant boundaries.
- Invalid or expired entries are rejected and resolved according to policy.
- Cache adapter failure behavior is deterministic, documented, and tested.
