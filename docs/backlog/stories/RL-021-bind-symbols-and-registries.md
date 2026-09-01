# RL-021: Bind facts, parameters, references, and operators

## Objective

Resolve every named symbol in a validated RuleLoom document against explicit immutable registry contracts before evaluation.

## Technical constraints

- Type: `story`.
- Epic: `RL-E03`.
- Depends on: `RL-020`.
- Registries are provided explicitly to compilation and are not process-global singletons.
- Registry descriptors are immutable data; runtime callbacks must not execute during binding.
- Duplicate canonical identifiers are compilation errors.

## Functional requirements

1. Define registry descriptors for facts and operators, including stable identifier, version, input/output types, arity, purity, cost class, and sync/async capability.
2. Bind fact, parameter, local, reusable-expression, and operator references to stable internal symbol IDs.
3. Validate duplicate declarations, shadowing rules, unknown names, and unsupported versions.
4. Validate reusable-expression argument count and reject recursive reference cycles discoverable during binding.
5. Produce deterministic diagnostics with primary and related declaration locations.
6. Emit a bound intermediate model that does not retain executable resolver callbacks.
7. Add conformance fixtures for valid and invalid binding scenarios.

## Quality requirements

- Symbol resolution must be independent of JavaScript object insertion order.
- Registry mutation after compilation begins must not affect the compilation.
- Diagnostics must suggest known symbols only when suggestions do not leak unavailable tenant capabilities.
- Public registry types require documentation and compile-time usage tests.

## Out of scope

- Evaluating fact resolvers.
- Full expression type inference.
- Dynamic loading of registry plugins from rule JSON.

## Acceptance criteria

- Every symbol in a successful bound model refers to a unique declared or registered symbol.
- Unknown, duplicate, recursively referenced, or version-incompatible symbols fail with stable diagnostics.
- Concurrent compilations using separate registries cannot interfere.
- All binding conformance fixtures pass.
