# RL-011: Define the canonical AST and JSON Schema

## Objective

Provide one versioned TypeScript model and JSON Schema that validate all RuleLoom v1 documents before compilation.

## Technical constraints

- Type: `story`.
- Epic: `RL-E02`.
- Depends on: `RL-010`.
- Use JSON Schema Draft 2020-12.
- Use closed discriminated object variants for canonical language nodes unless an explicitly documented extension point is being modeled.
- Accept external input as `unknown`; public APIs may not assert unvalidated values as AST nodes.

## Functional requirements

1. Define branded identifiers and immutable TypeScript types for rule sets, rules, expressions, value references, actions, parameters, and metadata.
2. Define a required language `schemaVersion` and stable rule and rule-set identifiers.
3. Model fact, parameter, literal, and local references as distinct discriminated variants.
4. Model operator calls with explicit argument arrays and no string-composed decorators.
5. Publish a Draft 2020-12 schema with stable `$id` values and local/offline resolution.
6. Generate TypeScript types from the canonical schema or implement an automated bidirectional drift check.
7. Export validation entry points that return structured diagnostics instead of throwing generic validation-library errors.
8. Add valid and invalid fixtures for every schema variant and boundary.

## Quality requirements

- Public AST properties must be readonly.
- Schema validation must reject unknown fields in canonical nodes and prototype-pollution keys where applicable.
- The package must not expose the chosen schema-validation library in its public types.
- Schema and declaration artifacts must build deterministically.

## Out of scope

- Semantic binding of facts and operators.
- Runtime evaluation.
- Automatic migration between future major schema versions.

## Acceptance criteria

- Every normative RL-010 example validates or fails as specified.
- Schema/type drift causes a required check to fail.
- Consumers can validate a JSON value without importing compiler or runtime packages.
- Diagnostics identify the invalid location, expected construct, and stable diagnostic code.
