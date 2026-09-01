# RL-002: Configure local and protected quality gates

## Objective

Make formatting, linting, typing, testing, building, dependency review, and metadata validation enforceable locally and in pull requests.

## Technical constraints

- Type: `story`.
- Epic: `RL-E01`.
- Depends on: `RL-001`.
- CI must run on pull requests and the default branch.
- Quality commands must return non-zero status when violations are detected.
- CI permissions must use least privilege and third-party actions must be pinned to immutable revisions.

## Functional requirements

1. Configure deterministic formatting and linting for TypeScript, JSON, Markdown, and YAML in scope.
2. Configure unit-test execution with coverage collection and machine-readable reports.
3. Add CI jobs for lockfile installation, formatting, linting, type checking, testing, and package building.
4. Add dependency and secret scanning using repository-approved tools with documented suppression rules.
5. Add package metadata validation for license, repository, exports, files, and publish visibility.
6. Document required branch-protection checks and the local command equivalent for every CI job.

## Quality requirements

- CI must use dependency caching without caching generated correctness evidence.
- Test reports must remain available when a test job fails.
- Suppressions require a reason, owner, and review date.
- A test fixture must prove that each important gate fails on representative invalid input.

## Out of scope

- Publishing packages.
- Deployment environments.
- Performance regression thresholds.

## Acceptance criteria

- A clean pull request runs every documented required check.
- Formatting, type, test, build, secret, dependency, and metadata violations each fail the appropriate command.
- Local and CI commands exercise the same underlying checks.
- Required branch-protection settings are documented without embedding credentials.
