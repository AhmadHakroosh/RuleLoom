# RuleLoom

RuleLoom is a TypeScript monorepo for rule-language schema, compiler, runtime, and shared core packages.

## Prerequisites

- Node.js `>=26.0.0 <27`
- pnpm `11.25.0`

This repository pins its package manager and development toolchain in `package.json` and `pnpm-lock.yaml`. Initial dependency selections use the latest stable versions available at implementation time. Intentional holdbacks must be documented with their rationale before merging. Lint and format tool versions are pinned for the workspace; enforceable lint and format gates are introduced by RL-002.

If Corepack is unavailable, invoke the pinned package manager through npm:

```sh
npx pnpm@11.25.0 install --frozen-lockfile
```

## Workspace Commands

Install from the lockfile without modifying it:

```sh
npx pnpm@11.25.0 install --frozen-lockfile
```

Run all local quality gates:

```sh
npx pnpm@11.25.0 run check
```

Check deterministic formatting for TypeScript, JavaScript, JSON, Markdown, and YAML files:

```sh
npx pnpm@11.25.0 run format:check
```

Run lint checks for TypeScript, scripts, Markdown, JSON, and YAML:

```sh
npx pnpm@11.25.0 run lint
```

Markdown linting also validates local documentation links:

```sh
npx pnpm@11.25.0 run lint:docs
```

Validate repository-local agent definitions:

```sh
npx pnpm@11.25.0 run lint:agents
```

Validate the language semantics specification and conformance fixture references:

```sh
npx pnpm@11.25.0 run check:language-semantics
```

Type-check all package source and public declaration output:

```sh
npx pnpm@11.25.0 run typecheck
```

Run automated tests:

```sh
npx pnpm@11.25.0 run test
```

Run unit tests with coverage and machine-readable reports:

```sh
npx pnpm@11.25.0 run test:unit
```

Run integration/package-boundary checks:

```sh
npx pnpm@11.25.0 run test:integration
```

Build package-local JavaScript and declaration artifacts:

```sh
npx pnpm@11.25.0 run build
```

Verify generated artifacts are present and not tracked:

```sh
npx pnpm@11.25.0 run check:artifacts
```

Validate package metadata:

```sh
npx pnpm@11.25.0 run metadata:check
```

Run dependency and secret checks:

```sh
npx pnpm@11.25.0 run security:deps
npx pnpm@11.25.0 run security:secrets
```

Prove representative quality gates fail on invalid input:

```sh
npx pnpm@11.25.0 run check:gate-failures
```

Remove generated package output:

```sh
npx pnpm@11.25.0 run clean
```

## Packages

- `@ruleloom/core`: shared dependency-free runtime primitives.
- `@ruleloom/schema`: schema package boundary.
- `@ruleloom/compiler`: compiler package boundary.
- `@ruleloom/runtime`: runtime package boundary.

Each package exposes only its root entry point through package `exports`. Imports through unpublished internal paths are rejected by the configured boundary test.

## Pull Request Checks

GitHub Actions runs the same local commands on pull requests and on the default branch. Required branch protection should require these checks before merge:

- `install`
- `contracts`
- `project-checks`
- `format`
- `lint`
- `typecheck`
- `unit-test`
- `integration-test`
- `build`
- `metadata`
- `dependency-security`
- `secret-scan`
- `gate-failure-fixtures`

The workflow grants read-only repository contents permissions by default. The dependency review job grants pull request read permissions only for pull request events. Third-party actions are pinned to immutable commit SHAs.

CI caches the pnpm store keyed by `pnpm-lock.yaml`. It does not cache `dist/`, `coverage/`, `reports/`, or delivery evidence.

Test reports are uploaded from `reports/test-results/` and coverage reports from `coverage/` with `if: always()` so they remain available when tests fail.

Dependency suppressions are not configured by default. Any future suppression must document a reason, owner, and review date next to the suppression rule.

Secret scan suppressions are not configured by default. Any future suppression in `.secretlintignore` or scanner configuration must include a reason, owner, and review date in the same change.

## Governance

- [CONTRIBUTING.md](CONTRIBUTING.md): contribution workflow, ticket selection, checks, and review expectations.
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md): conduct expectations and escalation path.
- [SECURITY.md](SECURITY.md): private vulnerability reporting and disclosure process.
- [docs/agents.md](docs/agents.md): repository-local delivery agent usage and rationale.
- [docs/rfcs/RL-010-language-semantics.md](docs/rfcs/RL-010-language-semantics.md): approved RFC for v1 language semantics.
- [docs/specification/language-semantics-v1.md](docs/specification/language-semantics-v1.md): implementation-independent v1 language semantics.
- [docs/governance/rfc-process.md](docs/governance/rfc-process.md): RFC requirements for semantic and public API changes.
- [docs/governance/versioning-and-deprecation.md](docs/governance/versioning-and-deprecation.md): compatibility, semantic-versioning, and deprecation policy.
- [docs/governance/human-approvals.md](docs/governance/human-approvals.md): human-only decision categories.
- [docs/governance/ownership.md](docs/governance/ownership.md): review ownership guidance by path.
