# RL-022: Implement static expression type checking

## Objective

Reject incompatible RuleLoom expressions before evaluation by checking value types, operator overloads, arity, and result contexts.

## Technical constraints

- Type: `story`.
- Epic: `RL-E03`.
- Depends on: `RL-021`.
- The v1 type system covers JSON scalar and collection types plus explicit missing and unknown states defined by RL-010.
- Host-language `any` and implicit coercion may not determine language compatibility.
- Operator overload resolution must be deterministic.

## Functional requirements

1. Define the internal type representation for null, boolean, number, string, array, object, unions, missing, unknown, and error-capable expressions.
2. Infer literal, parameter, fact, path, local, and operator-result types.
3. Resolve operator signatures using exact documented compatibility rules and reject ambiguous overloads.
4. Validate boolean contexts, action payload expressions, parameter defaults, and reusable-expression returns.
5. Propagate nullable, missing, and unknown possibilities without silently converting them to false.
6. Produce diagnostics for wrong arity, incompatible arguments, ambiguous overloads, unsafe narrowing, and invalid result contexts.
7. Attach resolved types and operator IDs to the typed intermediate model.
8. Add positive and negative conformance cases for every built-in signature.

## Quality requirements

- Type-checker output must be deterministic and immutable.
- Diagnostic tests must assert codes and source locations, not fragile prose alone.
- Compile-time tests must prove generic public descriptors reject invalid callback signatures.
- The implementation must avoid recursive stack exhaustion on documents within configured depth limits.

## Out of scope

- User-defined nominal classes.
- Arbitrary structural reflection over host-language objects.
- Runtime data validation inside fact resolvers.

## Acceptance criteria

- Ill-typed expressions fail before an execution plan is emitted.
- Valid nullable and missing-aware expressions retain their outcome possibilities.
- Operator overload selection is stable across runs and registry ordering.
- All type-system conformance fixtures pass.
