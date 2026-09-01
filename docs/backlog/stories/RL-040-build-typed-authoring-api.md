# RL-040: Build the typed TypeScript authoring API

## Objective

Allow TypeScript consumers to construct valid RuleLoom documents with inference for fact paths, parameter types, operator arguments, and action payloads.

## Technical constraints

- Type: `story`.
- Epic: `RL-E05`.
- Depends on: `RL-011`.
- Builder output is canonical RuleLoom JSON data and uses the same schema and compiler as hand-authored documents.
- Public generics must not require consumers to import internal compiler types.
- The builder may not embed functions in serialized rules.

## Functional requirements

1. Define generic fact-contract and action-contract inputs for authoring.
2. Implement builders for rule sets, rules, parameters, facts, literals, pointers, operators, boolean expressions, and proposed actions.
3. Infer valid fact identifiers and operator argument types from supplied contracts.
4. Reject invalid parameter defaults, incompatible operators, malformed action payloads, and duplicate IDs at compile time where TypeScript can express the constraint.
5. Preserve stable explicit IDs and source metadata in serialized output.
6. Support reusable expression factories in TypeScript while serializing only their expanded or declared data form.
7. Provide canonical JSON serialization and schema validation of builder output.
8. Add compile-time type tests and runtime equivalence tests against hand-authored fixtures.

## Quality requirements

- Type errors must remain understandable and avoid excessive recursive instantiation on representative schemas.
- Builder calls must not mutate previously created nodes.
- Tree-shaking must remove unused builder helpers.
- Public examples must pass both type checking and runtime compilation.

## Out of scope

- Visual editor components.
- Runtime fact resolver registration.
- A second executable DSL distinct from canonical JSON.

## Acceptance criteria

- The documented commerce example receives fact and operator autocomplete.
- Invalid typed examples fail the compile-time test suite.
- Builder and equivalent JSON inputs compile to the same canonical plan checksum.
- Serialized builder output contains data only and validates against RL-011.
