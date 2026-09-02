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

Type-check all package source and public declaration output:

```sh
npx pnpm@11.25.0 run typecheck
```

Run automated tests:

```sh
npx pnpm@11.25.0 run test
```

Build package-local JavaScript and declaration artifacts:

```sh
npx pnpm@11.25.0 run build
```

Verify generated artifacts are present and not tracked:

```sh
npx pnpm@11.25.0 run check:artifacts
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
