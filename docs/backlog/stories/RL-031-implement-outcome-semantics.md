# RL-031: Implement four-state outcomes and missing-value policies

## Objective

Implement the normative distinction between matched, not matched, indeterminate, and error outcomes throughout expression and rule evaluation.

## Technical constraints

- Type: `story`.
- Epic: `RL-E04`.
- Depends on: `RL-030`.
- Follow the propagation tables approved in RL-010.
- Missing values may not silently collapse to false.
- Error objects must remain serializable and safe for logs.

## Functional requirements

1. Implement internal result types for value, missing, indeterminate, and error states.
2. Implement `all`, `any`, and `not` propagation and short-circuit behavior for every state combination.
3. Implement configurable missing-fact and missing-path policies: error, indeterminate, or declared default.
4. Validate and apply parameter defaults without confusing explicit null with absence.
5. Propagate operator validation and execution failures according to their registered failure policy.
6. Include missing fact IDs, safe paths, and diagnostic codes in decision results.
7. Add table-driven tests for every normative propagation row.
8. Run all missing, null, indeterminate, and error conformance fixtures.

## Quality requirements

- Outcome handling must be exhaustive at compile time.
- Errors must preserve causality without serializing arbitrary thrown objects or secrets.
- Tests must demonstrate that false, null, missing, indeterminate, and error remain distinct.
- Default policies must be explicit in the compiled plan or evaluation options.

## Out of scope

- Retry policies for async resolvers.
- Domain-specific fallback facts.
- User-defined outcome states.

## Acceptance criteria

- Every RL-010 outcome propagation example passes.
- Missing facts and missing paths follow their configured policies.
- Explicit null never behaves as an absent value unless a documented operator defines it.
- Decision results identify indeterminate and error causes with stable codes.
