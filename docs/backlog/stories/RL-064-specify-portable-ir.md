# RL-064: Specify portable IR and cross-language conformance

## Objective

Define a stable portable execution-plan representation that future Rust, Go, JVM, and .NET runtimes can consume without reinterpreting source-language semantics.

## Technical constraints

- Type: `story`.
- Epic: `RL-E07`.
- Depends on: `RL-012`, `RL-023`, `RL-053`.
- Portable IR versioning is independent of npm package and source schema versions.
- IR contains data only and no embedded host-language bytecode or credentials.
- The TypeScript in-memory plan may retain private optimizations not represented in portable v1 IR.

## Functional requirements

1. Specify portable node, symbol, type, operator, dependency, source-map, limit, and metadata records.
2. Define canonical serialization, numeric representation, string normalization, map ordering, and checksum rules across languages.
3. Define required and optional evaluator capabilities and explicit rejection of unsupported extensions.
4. Define registry ABI contracts for facts and operators without prescribing host-language callback syntax.
5. Map source schema versions to compatible IR versions and document upgrade/recompile behavior.
6. Extend the conformance corpus with portable-IR fixtures and expected checksums.
7. Build a minimal independent non-TypeScript reader or evaluator prototype for a designated semantic subset.
8. Document the recommended port sequence: Rust/Wasm, Go, JVM/.NET, then Python bindings.

## Quality requirements

- Canonical IR examples must have identical bytes and checksums across the TypeScript implementation and prototype.
- Unknown required fields or capabilities must fail closed.
- Source mappings must support diagnostics without embedding original secret rule metadata.
- The specification must distinguish normative wire format from implementation advice.

## Out of scope

- Production-ready Rust, Go, JVM, or .NET runtimes.
- WebAssembly code generation.
- Guaranteeing binary compatibility for experimental pre-v1 IR.

## Acceptance criteria

- The portable IR specification is approved through the RFC process.
- TypeScript and the independent prototype agree on canonical bytes, checksums, and designated fixture results.
- Capability and version mismatches fail with structured diagnostics.
- Future implementers can consume the spec and conformance corpus without reading TypeScript runtime internals.
