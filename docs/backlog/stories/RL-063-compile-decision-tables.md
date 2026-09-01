# RL-063: Compile decision tables into canonical RuleLoom plans

## Objective

Support business-readable decision tables as an optional authoring format that compiles into canonical RuleLoom source and execution plans.

## Technical constraints

- Type: `story`.
- Epic: `RL-E07`.
- Depends on: `RL-010`, `RL-023`.
- Decision tables are an optional package and do not add a second runtime.
- Table compilation must preserve source-cell mappings for diagnostics and traces.
- Full DMN compatibility is not required.

## Functional requirements

1. Define a versioned decision-table schema with inputs, rows, conditions, outputs, priorities, and hit policy.
2. Support unique, first, priority, any, and collect hit policies with explicitly specified semantics.
3. Compile table cells into canonical RuleLoom expressions and proposed actions.
4. Preserve table, row, column, and cell IDs in source mappings.
5. Diagnose invalid cells, unreachable rows, overlaps violating the hit policy, and obvious coverage gaps.
6. Provide JSON and CSV import/export for the supported table subset with deterministic normalization.
7. Add table-specific testing helpers and CLI lint/compile support.
8. Add equivalence tests comparing generated canonical source and direct RuleLoom rules.

## Quality requirements

- CSV parsing must protect against formula injection when exported for spreadsheet use.
- Table-size and cell-expression limits must be enforced.
- Hit-policy semantics require conformance fixtures.
- Import/export round trips must preserve canonical meaning and stable IDs.

## Out of scope

- DMN XML import/export or FEEL implementation.
- Spreadsheet application integration.
- Visual table editor.

## Acceptance criteria

- Every supported hit policy compiles and evaluates as documented.
- Invalid overlaps and cells identify precise table source locations.
- Equivalent direct rules and table-generated rules produce the same decisions.
- CSV exports neutralize formula-like cells and round-trip without semantic drift.
