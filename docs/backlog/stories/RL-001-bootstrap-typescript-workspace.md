# RL-001: Bootstrap the TypeScript workspace

## Objective

Create the minimal RuleLoom monorepo structure required to build, test, and publish independent TypeScript packages.

## Technical constraints

- Type: `story`.
- Epic: `RL-E01`.
- Depends on: `none`.
- Use strict TypeScript and ESM-first source modules.
- Start from the latest stable versions of the package manager, TypeScript, test runner, build tooling, and lint/format tooling available when the story is implemented, then pin the selected versions for local development and CI.
- Keep the production runtime core free of native dependencies.

## Functional requirements

1. Create a workspace with initial `schema`, `compiler`, `runtime`, and `core` package directories.
2. Configure root and package TypeScript projects with strict checking and project references or an equivalently deterministic build graph.
3. Define explicit package entry points and prevent imports through unpublished internal paths.
4. Add root commands for clean installation, type checking, testing, building, and cleaning generated output.
5. Write generated package artifacts to package-local `dist/` directories and exclude them from source control.
6. Document prerequisites, workspace commands, and the pinned toolchain/dependency version policy in the root README.

## Quality requirements

- A clean clone must install using the lockfile without modifying it.
- The initial dependency set must use the latest stable versions available at implementation time, with any intentional version holdbacks documented in the story delivery notes or README.
- Type checking must include source and public declaration output.
- Builds must not rely on globally installed tools.
- The workspace must contain no placeholder checks that always succeed.

## Out of scope

- Language AST implementation.
- CI workflows beyond the commands required for later CI integration.
- Public package publication.

## Acceptance criteria

- The documented install, type-check, test, and build commands succeed from a clean clone.
- The lockfile and package metadata pin the selected latest stable package manager and development dependency versions.
- Each initial package produces deterministic JavaScript and declaration artifacts under `dist/`.
- An invalid cross-package internal import is rejected by configured checks.
- The repository remains free of committed generated artifacts and dependency directories.
