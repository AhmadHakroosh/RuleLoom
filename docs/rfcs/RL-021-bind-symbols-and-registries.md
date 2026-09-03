# RFC: RL-021 Bind facts, parameters, references, and operators

## Ticket / Status

- Ticket: RL-021
- Epic: RL-E03
- Depends on: RL-020
- Status: Approved
- Target package: `@ruleloom/compiler`
- API status: New additive public API
- Approval: Human owner approval is recorded in the ignored `.delivery/RL-021/approval.json` record.

## Problem statement and goals

Validated RuleLoom documents currently retain names but do not have a static, deterministic symbol-resolution stage. Add explicit immutable fact and operator registry descriptors and bind supported source references to stable internal IDs before evaluation.

## Non-goals

- Changes to the canonical v1 schema, portable IR, or language semantics.
- Fact evaluation, runtime callbacks, dynamic plugin loading, or full expression type inference.
- Reusable-expression syntax. RL-020's v1 source model has no reusable-expression form; no schema syntax is invented. If a later approved source contract adds one, its argument and cycle checks require a separate amendment.

## Proposed behavior

The compiler exposes an additive binding API accepting a validated `RuleSetDocument` and explicit registry descriptors. Fact and operator descriptors are immutable data containing canonical ID, version, input/output type labels, arity, purity, cost class, and sync/async capability. The compiler snapshots and freezes normalized descriptors at the beginning of binding; caller mutation and object insertion order cannot affect the result.

Binding resolves v1 fact, parameter, local, and built-in/operator references. It emits compiler-owned bound expressions whose references contain stable IDs derived from sorted canonical symbol keys. The bound model contains descriptor data and IDs only; it retains no resolver or executable callback. Parameters are document declarations, locals are recognized only where an existing source contract declares them, and unsupported forms fail rather than changing the schema.

Duplicate declarations, shadowing, unknown names, unsupported versions, and operator arity errors use the `RL_BIND_*` diagnostic family. Diagnostics are sorted by source pointer, code rank, and stable constraint rank and include primary/related declaration locations where applicable. Suggestions are sorted, bounded, and passed through an explicit capability filter so unavailable tenant symbols are never exposed.

Canonical IDs are unique within each registry: supplying multiple versions of
one fact or operator is rejected deterministically with
`RL_BIND_DUPLICATE_SYMBOL`. When a required version is supplied, binding uses
the exact versioned symbol and descriptor and never falls back to an
unversioned lookup. Unsupported-version diagnostics include the canonical
registry declaration as a related location.

## Compatibility, security, and privacy

This is an additive compiler API. The canonical schema and parser remain unchanged. Registry snapshots prevent cross-compilation interference. The public registry input is inert, cloneable plain data; accessors and ordinary Proxy descriptors are rejected without invoking their traps when the host provides `structuredClone`. JavaScript cannot guarantee trap-free Proxy detection for every engine or exotic object, so this boundary is best effort and callers must not pass untrusted live objects. Callback-free output ensures binding cannot execute runtime behavior. Suggestions are capability-filtered and bounded. No personal data, telemetry, external service, or security exception is introduced.

## Alternatives

- Process-global registries: rejected because they prevent isolated concurrent compilations.
- Retain or invoke resolver callbacks: rejected because binding must be static and callback-free.
- Add reusable-expression syntax: rejected because RL-020 has no such source contract and the ticket forbids opportunistic schema changes.
- Allocate IDs by insertion order: rejected because it is not deterministic.

## Rollout, rollback, and tests

Roll out as an additive compiler surface with focused unit tests, public export/type-usage tests, and binding conformance fixtures. Run the configured format, lint, typecheck, unit, integration, build, conformance, schema, and security checks. Rollback removes the additive implementation and tests; no migration is needed.

## Human approvals required

Human approval is required for this public compiler API and has been recorded in the ignored local governance record referenced above. No release, deployment, schema break, privacy change, or security exception is authorized by this RFC.
