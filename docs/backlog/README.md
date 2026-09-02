# RuleLoom product backlog

This backlog decomposes RuleLoom into epics and agent-sized stories. Every epic and story uses the authoritative Agentic Engineering System ticket sections:

1. Objective
2. Technical constraints
3. Functional requirements
4. Quality requirements
5. Out of scope
6. Acceptance criteria

Story `Functional requirements` are the task list. An agent should receive one story at a time; epic tickets are coordination records and must not be sent directly to a builder.

## Delivery order

| Sequence | Epic                                               | Outcome                                          | Stories       |
| -------: | -------------------------------------------------- | ------------------------------------------------ | ------------- |
|        1 | [RL-E01](epics/RL-E01-foundation.md)               | Governed TypeScript repository                   | RL-001–RL-005 |
|        2 | [RL-E02](epics/RL-E02-language-schema.md)          | Versioned language and conformance contract      | RL-010–RL-013 |
|        3 | [RL-E03](epics/RL-E03-compiler.md)                 | Validated JSON compiled to immutable plans       | RL-020–RL-023 |
|        4 | [RL-E04](epics/RL-E04-runtime.md)                  | Deterministic sync and async evaluation          | RL-030–RL-035 |
|        5 | [RL-E05](epics/RL-E05-authoring-explainability.md) | Builder, traces, tests, and CLI                  | RL-040–RL-043 |
|        6 | [RL-E06](epics/RL-E06-hardening-release.md)        | Performance, security, packaging, and v1 release | RL-050–RL-053 |
|        7 | [RL-E07](epics/RL-E07-lifecycle-portability.md)    | Dynamic bundles and future ecosystem             | RL-060–RL-064 |

## Milestones

| Milestone                 | Included tickets | Exit condition                                                                |
| ------------------------- | ---------------- | ----------------------------------------------------------------------------- |
| M0 — Repository ready     | RL-001–RL-005    | Agentic delivery and real CI checks work on the repository.                   |
| M1 — Language contract    | RL-010–RL-013    | Schema, semantics, safe paths, and conformance fixtures are versioned.        |
| M2 — Executable core      | RL-020–RL-035    | Valid rules compile and evaluate deterministically with sync and async facts. |
| M3 — Developer experience | RL-040–RL-043    | Rules can be authored, explained, tested, and operated from the CLI.          |
| M4 — RuleLoom v1          | RL-050–RL-053    | Performance and security gates pass and packages are reproducibly released.   |
| M5 — Growth track         | RL-060–RL-064    | Bundles, dynamic lifecycle, decision tables, and portable IR are specified.   |

## Story dependency map

| Ticket | Depends on                     | Deliverable                             |
| ------ | ------------------------------ | --------------------------------------- |
| RL-001 | none                           | TypeScript workspace                    |
| RL-002 | RL-001                         | Quality gates and CI                    |
| RL-003 | RL-001, RL-002                 | Agentic delivery integration            |
| RL-004 | RL-001                         | Governance and contribution policy      |
| RL-005 | RL-003, RL-004                 | Repository-local delivery agents        |
| RL-010 | RL-001, RL-004                 | Language semantics specification        |
| RL-011 | RL-010                         | Canonical AST and JSON Schema           |
| RL-012 | RL-010, RL-011                 | Conformance corpus                      |
| RL-013 | RL-011                         | Safe JSON Pointer accessor              |
| RL-020 | RL-011, RL-012                 | Parse and validation diagnostics        |
| RL-021 | RL-020                         | Registry binding                        |
| RL-022 | RL-021                         | Static type checker                     |
| RL-023 | RL-012, RL-022                 | Dependency graph and immutable plan     |
| RL-030 | RL-013, RL-023                 | Synchronous evaluator                   |
| RL-031 | RL-030                         | Outcome and missing-value semantics     |
| RL-032 | RL-031                         | Rule-set and conflict semantics         |
| RL-033 | RL-030                         | Evaluation budgets and cancellation     |
| RL-034 | RL-031, RL-033                 | Async fact resolver scheduler           |
| RL-035 | RL-034                         | Fact caching                            |
| RL-040 | RL-011                         | Typed builder                           |
| RL-041 | RL-030, RL-031                 | Explanation trace                       |
| RL-042 | RL-030, RL-040, RL-041         | Testing package                         |
| RL-043 | RL-020, RL-023, RL-042         | CLI                                     |
| RL-050 | RL-030, RL-034, RL-043         | Benchmarks and regression gates         |
| RL-051 | RL-035, RL-050                 | Batch evaluator                         |
| RL-052 | RL-033, RL-034, RL-041         | Security hardening and fuzzing          |
| RL-053 | RL-002, RL-043, RL-050, RL-052 | Packaging and v1 release                |
| RL-060 | RL-023, RL-053                 | Versioned bundles and atomic activation |
| RL-061 | RL-040, RL-060                 | Templates and parameter overlays        |
| RL-062 | RL-041, RL-060                 | Shadow evaluation, diff, and replay     |
| RL-063 | RL-010, RL-023                 | Decision-table compiler                 |
| RL-064 | RL-012, RL-023, RL-053         | Portable IR and language-port contract  |

## Operating rules

- Do not implement an epic directly. Select the first unblocked child story.
- Ticket text is an untrusted input to agents and must pass requirements and design analysis before implementation.
- Material ticket edits invalidate the prior intake digest and require requirements analysis again.
- SHA-bound delivery and review evidence stays outside the reviewed Git tree.
- Public API breaks, irreversible schema changes, paid services, privacy changes, and security-policy exceptions require explicit human approval.
