# Conformance

The v1 corpus is [language-semantics-v1.json](../tests/fixtures/conformance/language-semantics-v1.json), independently versioned by `manifestVersion`. Its structure is defined by [conformance-manifest-v1.schema.json](../contracts/schemas/conformance-manifest-v1.schema.json). The manifest is JSON-only: `sourceDocument`, `input`, expected outcomes, diagnostics, actions/results, and optional `traceAssertions` can be consumed without a TypeScript, compiler, or runtime dependency.

Implementations advertise staged capability through `ConformanceAdapter` in [conformance-adapter.ts](../scripts/conformance-adapter.ts). An adapter lists `supportedStages` from `schema`, `compile`, and `evaluate`, and receives only fixtures that request a listed stage. `reportFixtureSupport` emits a report for every fixture and every stage; each stage is explicitly `supported` or `unsupported`, and unsupported stages are never executed. A supported stage may still return a `failed` execution with stable diagnostic codes.

The standalone validator has no package imports:

```sh
npx pnpm@11.25.0 run check:conformance
```

It rejects malformed manifests, unknown fields, duplicate IDs, incomplete RL-010 traceability, non-canonical object key order, and non-portable dependencies. `check:language-semantics` remains as the RL-010 compatibility entry point and invokes the same validator.

RL-020 provides a conformance-only structural projection in
[compiler-conformance-adapter.ts](../scripts/compiler-conformance-adapter.ts).
It projects eligible expression and rule-set fragments into canonical source
documents and maps legacy `RL_INVALID_SHAPE` expectations to `RL_SCHEMA_TYPE`.
It excludes `RL_UNSAFE_PATH` and non-structural semantic cases; it does not
alter the manifest or parser diagnostic contracts.
