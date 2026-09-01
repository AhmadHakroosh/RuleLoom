# RL-013: Implement safe JSON Pointer access

## Objective

Resolve fact paths using a small RFC 6901-compatible accessor that is safe, deterministic, and independent of JSONPath implementations.

## Technical constraints

- Type: `story`.
- Epic: `RL-E02`.
- Depends on: `RL-011`.
- Support RFC 6901 JSON Pointer syntax for JSON-compatible values.
- Do not evaluate filters, scripts, wildcards, methods, getters, or prototype properties.
- The accessor belongs in a low-level package usable by compiler and runtime without circular dependencies.

## Functional requirements

1. Parse and resolve the empty pointer, object-member tokens, array indices, and RFC escape sequences.
2. Distinguish an existing `null` or `undefined` host value from a missing segment using an explicit result type.
3. Reject malformed escapes, invalid array indices, unsafe keys, and traversal through scalar values with stable diagnostics.
4. Restrict object lookup to own data properties and avoid invoking property getters.
5. Enforce configurable pointer depth and token-length limits.
6. Provide optional precompiled pointer tokens so repeated evaluation avoids reparsing.
7. Add examples and tests based on RFC 6901 vectors plus security regression cases.

## Quality requirements

- The core accessor must have no production dependency on a general expression language.
- Tests must cover `__proto__`, `prototype`, `constructor`, sparse arrays, large indices, escaped slashes, and escaped tildes.
- Resolution must not mutate the input value.
- Performance benchmarks for repeated precompiled access must be added for later regression tracking without setting a v1 gate in this ticket.

## Out of scope

- JSONPath, JSONata, XPath, or dot-path compatibility.
- Mutating values through pointers.
- Wildcard or collection projection.

## Acceptance criteria

- RFC 6901-compatible vectors resolve as documented.
- Missing, invalid, unsafe, and scalar-traversal cases return distinct structured failures.
- Prototype-chain values and getters are never read.
- A precompiled pointer can be reused concurrently without mutable shared state.
