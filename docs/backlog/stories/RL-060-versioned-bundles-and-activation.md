# RL-060: Add versioned rule bundles and atomic activation

## Objective

Package rule sets, schemas, registry requirements, and metadata into checksum-addressed bundles that can be compiled and activated atomically.

## Technical constraints

- Type: `story`.
- Epic: `RL-E07`.
- Depends on: `RL-023`, `RL-053`.
- Bundle contents are data only and may not load executable plugins.
- Activation swaps immutable compiled snapshots and never exposes a partially compiled bundle.
- Storage and transport are adapter concerns outside core bundle semantics.

## Functional requirements

1. Define a versioned bundle manifest with bundle ID, revision, language version, registry requirements, rule files, checksums, activation metadata, and optional signature descriptors.
2. Validate every referenced file, checksum, identifier, and compatibility constraint before compilation.
3. Compile a bundle into an immutable snapshot without altering the currently active snapshot.
4. Implement atomic activation, read access to the active snapshot, and rollback to a retained compatible snapshot.
5. Reject duplicate, stale, incompatible, partially available, or checksum-invalid bundles.
6. Define activation hooks that receive metadata but cannot mutate the snapshot.
7. Expose active bundle identity and checksum in every decision result.
8. Add concurrency tests where evaluations continue on the prior snapshot while a new snapshot activates.

## Quality requirements

- Canonical manifests and bundle checksums must be deterministic.
- Activation and rollback operations must be idempotent by bundle checksum.
- Bundle parsing applies explicit file-count, total-size, and nesting limits.
- Tests must cover corrupt, missing, incompatible, and racing activation cases.

## Out of scope

- Remote bundle distribution service.
- Automatic production activation.
- Loading native or JavaScript code from bundles.

## Acceptance criteria

- A valid bundle compiles off to the side and becomes visible in one atomic activation step.
- In-flight evaluations finish against the snapshot with which they started.
- Invalid bundles leave the active snapshot unchanged.
- Decisions identify the exact active bundle and plan checksum.
