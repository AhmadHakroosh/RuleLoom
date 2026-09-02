# Ownership guidance

Ownership identifies the review expertise required for changes. It does not assign named maintainers or grant automatic approval authority.

## Path guidance

| Area                            | Paths                                                                             | Required review focus                                               |
| ------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Core primitives                 | `packages/core/`                                                                  | Public types, dependency boundaries, shared behavior                |
| Schema                          | `packages/schema/`, `contracts/schemas/`                                          | Compatibility, JSON schema behavior, versioning                     |
| Compiler                        | `packages/compiler/`                                                              | Diagnostics, binding, static validation, emitted plans              |
| Runtime                         | `packages/runtime/`                                                               | Evaluation semantics, determinism, cancellation, budgets            |
| Release and quality gates       | `.github/workflows/`, `scripts/`, `package.json`, `pnpm-lock.yaml`                | Reproducibility, permissions, pinned dependencies, failure behavior |
| Security-sensitive policy       | `SECURITY.md`, `docs/governance/`, `.secretlintrc.json`                           | Trust boundaries, disclosure, secret handling, human approvals      |
| Backlog and delivery governance | `docs/backlog/`, `docs/delivery-workflow.md`, `delivery.config.json`, `AGENTS.md` | Ticket scope, evidence handling, agent authority                    |

## Review routing

Changes touching more than one area need review from each affected expertise area. Security-sensitive changes should be reviewed for both correctness and abuse potential. Release and deployment changes require human approval under [human-approvals.md](human-approvals.md).
