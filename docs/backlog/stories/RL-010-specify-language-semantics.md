# RL-010: Specify RuleLoom language semantics

## Objective

Publish an implementation-independent v1 language specification that defines how every canonical rule construct is interpreted.

## Technical constraints

- Type: `story`.
- Epic: `RL-E02`.
- Depends on: `RL-001`, `RL-004`.
- Rules are JSON data and may not contain executable functions or host-language source.
- The core language is deterministic and non-Turing-complete.
- Specification changes follow the RFC policy established by RL-004.

## Functional requirements

1. Define normative terminology for rule set, rule, expression, fact, parameter, literal, operator, proposed action, outcome, diagnostic, trace, and execution plan.
2. Define canonical expression forms for `all`, `any`, `not`, comparisons, fact access, parameters, and literals.
3. Define strict equality, numeric comparison, collection membership, boolean short-circuiting, and empty-collection behavior.
4. Define the distinction between JSON `null`, a missing path, a missing fact, an operator error, and a resolver error.
5. Define `matched`, `notMatched`, `indeterminate`, and `error` outcomes and their propagation tables.
6. Define deterministic ordering for rule evaluation results and proposed actions.
7. Define extension points and the behavior required when an implementation encounters an unknown extension.
8. Include normative valid, invalid, and edge-case examples.

## Quality requirements

- Normative requirements must use consistent RFC-style language.
- Truth and error propagation tables must be complete and internally consistent.
- Every normative example must become or reference an executable conformance fixture.
- Ambiguous host-language behavior such as JavaScript coercion must not determine semantics.

## Out of scope

- Schema implementation.
- Compiler algorithms.
- Temporal, geospatial, regex, arithmetic, or decision-table extension packages.

## Acceptance criteria

- The specification defines one expected outcome for every included example.
- Empty `all` and `any`, missing values, nulls, incompatible types, and short-circuit cases are explicit.
- No normative semantic depends on JavaScript object identity, coercion, or promise scheduling.
- The language specification is approved through the project RFC process.
