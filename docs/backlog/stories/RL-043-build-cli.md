# RL-043: Build the RuleLoom command-line interface

## Objective

Provide deterministic `lint`, `compile`, `test`, and `simulate` commands for local development and CI.

## Technical constraints

- Type: `story`.
- Epic: `RL-E05`.
- Depends on: `RL-020`, `RL-023`, `RL-042`.
- CLI operations are local and perform no network access by default.
- Commands must offer human-readable and machine-readable output.
- Exit codes are a documented public contract.

## Functional requirements

1. Implement `ruleloom lint` for schema, binding, type, and static-analysis diagnostics.
2. Implement `ruleloom compile` for canonical plan output, checksum reporting, and optional optimization diagnostics.
3. Implement `ruleloom test` for scenario manifests and conformance subsets.
4. Implement `ruleloom simulate` for facts and parameters supplied through files or standard input.
5. Support JSON output with stable schemas and concise terminal output without ANSI codes when not interactive.
6. Validate input paths, refuse unintended overwrite by default, and never interpret rule content as shell commands.
7. Enforce document and output limits consistent with library defaults.
8. Add command help, examples, shell completion generation if supported without a runtime dependency, and documented exit codes.
9. Add end-to-end tests for success, diagnostics, malformed input, cancellation, and broken pipes.

## Quality requirements

- CLI tests must run from packaged artifacts, not source-only module resolution.
- Errors must identify input files safely without dumping sensitive content.
- Machine-readable output must remain clean on standard output; logs go to standard error.
- The CLI package must not be imported by core runtime packages.

## Out of scope

- Remote bundle download or publication.
- Interactive visual editing.
- Executing proposed actions.

## Acceptance criteria

- Each command performs its documented operation and returns its documented exit code.
- JSON output validates against the published command-output schemas.
- Malformed or unsafe inputs fail without overwriting unrelated files.
- The CLI works from a clean installed package on every supported Node runtime.
