# RFC: RL-010 language semantics

## Ticket

RL-010: Specify RuleLoom language semantics

## Problem statement and goals

RuleLoom needs an implementation-independent v1 language specification so compilers, runtimes, schemas, conformance fixtures, and future ports can agree on how canonical rule constructs behave. The goal is to define deterministic semantics for expression evaluation, missing data, errors, outcomes, ordering, and extension handling before schema and runtime implementation tickets begin.

## Non-goals

- Implementing JSON Schema for rule documents.
- Implementing compiler algorithms or runtime evaluators.
- Adding temporal, geospatial, regex, arithmetic, or decision-table extension packages.
- Defining host-language callback APIs.

## Proposed behavior

Adopt [../specification/language-semantics-v1.md](../specification/language-semantics-v1.md) as the v1 normative language semantics. The specification uses RFC-style terms, defines canonical expression forms, and binds all normative examples to [../../tests/fixtures/conformance/language-semantics-v1.json](../../tests/fixtures/conformance/language-semantics-v1.json).

## Compatibility analysis

This is the first RuleLoom language-semantics specification, so it does not break an existing stable language contract. Future changes that alter any normative behavior defined here require a new RFC, compatibility analysis, migration notes, and conformance fixture updates.

## Security and privacy analysis

Rules remain JSON data and MUST NOT contain executable functions or host-language source. Semantics avoid host-language coercion, object identity, and promise scheduling so untrusted rule data cannot smuggle implementation-specific behavior into evaluation.

## Migration and deprecation plan

No migration is required for this initial v1 specification. Future incompatible language, schema, or portable IR changes must follow [../governance/versioning-and-deprecation.md](../governance/versioning-and-deprecation.md).

## Alternatives considered

- Adopt JavaScript truthiness and equality: rejected because it would make semantics host-language-specific and coercive.
- Adopt an existing rule engine syntax wholesale: rejected because RL-E02 explicitly excludes compatibility with JsonLogic or json-rules-engine syntax.
- Defer examples until RL-012: rejected because RL-010 requires normative examples to become or reference executable conformance fixtures.

## Rollout, rollback, and test strategy

Rollout is a documentation and conformance-fixture change merged through the normal RuleLoom PR gate. Rollback is reverting the RL-010 commit before dependent schema or runtime tickets rely on it.

Validation commands:

```sh
npx pnpm@11.25.0 run check:language-semantics
npx pnpm@11.25.0 exec vitest run tests/language-semantics.test.ts --reporter=default
npx pnpm@11.25.0 run check
```

## Human approvals required

Rule-language semantics are a human-only decision under [../governance/human-approvals.md](../governance/human-approvals.md). Human approval was required before implementation and is required for any later semantic change.
