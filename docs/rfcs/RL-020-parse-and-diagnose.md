# RFC: RL-020 Parse RuleLoom documents with structured diagnostics

## Ticket / Status

- Ticket: RL-020
- Epic: RL-E03
- Status: Approved
- Target package: `@ruleloom/compiler`
- API status: New additive public API
- Approved by: Ahmad Hakroosh
- Approver role: human owner
- Approval date: September 03, 2026
- Approval evidence: canonical external record

## Problem statement and goals

RuleLoom needs public compiler APIs that safely convert untrusted JSON text or unknown values into a canonical v1 source model, or report actionable structural failures without exposing parser internals or source contents. The API must bound resource consumption, produce stable diagnostics, and isolate returned source models from caller-owned mutable values.

The proposal adds `parseRuleSetDocument(text, options?)` and `validateRuleSetDocumentInput(value, options?)`. Both return `ParseRuleSetDocumentResult`: `{ ok: true, document: RuleSetDocument }` or `{ ok: false, diagnostics: readonly RuleLoomDiagnostic[] }`.

## Non-goals

- Registry binding, fact resolution, extension execution, static typing, or rule evaluation.
- YAML or non-JSON input.
- Changes to the canonical schema, portable IR, or rule-language semantics.
- Changing RL-012 fixtures or its manifest schema.

## Proposed behavior

`ParseRuleSetDocumentOptions` accepts `maxDocumentBytes`, `maxNestingDepth`, and `maxDiagnostics`. Defaults are 1 MiB, 64, and 100. Hard maxima are 16 MiB, 256, and 1000. Options must be finite positive integers within their hard maximum; invalid options are caller misuse and may throw synchronously.

The text API measures UTF-8 bytes before `JSON.parse`. JSON syntax returns `RL_PARSE_JSON_SYNTAX` at `""` and never exposes native parser messages or complete input text. A lone UTF-16 surrogate in a source string or member name returns `RL_PARSE_INVALID_UNICODE`.

A well-formed string `schemaVersion` other than `"1.0"` returns `RL_PARSE_UNSUPPORTED_SCHEMA_VERSION` at `/schemaVersion`. A missing or structurally invalid version remains an RL-011 `RL_SCHEMA_*` result. Canonical validation delegates to `@ruleloom/schema` and retains its codes and RFC 6901 paths.

The value API iteratively clones only JSON-compatible own data properties without invoking accessors, `toJSON`, iterators, or coercion. It rejects cycles, accessors, unsupported host values, nested `undefined`, and lone surrogates. It does not stringify values to estimate bytes. Both APIs use iterative traversal and a visited-node safety budget. Depth excess returns `RL_PARSE_NESTING_TOO_DEEP`; the final diagnostic slot is reserved for `RL_PARSE_DIAGNOSTIC_LIMIT_REACHED`.

Successful source models are deeply frozen. Text input is RuleLoom-owned after parsing; unknown input is cloned before validation and freezing. Caller-owned input is never frozen or mutated.

`RuleLoomDiagnostic` is `{ code, severity: "error", message, sourcePointer, relatedLocations? }`; related locations are `{ sourcePointer, message? }`. Codes and RFC 6901 pointers are compatibility surfaces, but English messages may evolve. Diagnostics have a deterministic total order: source pointer, stable code rank, then stable internal constraint rank.

Parser-specific codes are `RL_PARSE_JSON_SYNTAX`, `RL_PARSE_INVALID_UNICODE`, `RL_PARSE_UNSUPPORTED_SCHEMA_VERSION`, `RL_PARSE_DOCUMENT_TOO_LARGE`, `RL_PARSE_NESTING_TOO_DEEP`, and `RL_PARSE_DIAGNOSTIC_LIMIT_REACHED`.

## RL-012 conformance

The adapter runs only cases determined by JSON syntax, Unicode/source limits, version classification, or RL-011 structural validation. It deterministically projects eligible semantic fragments into a minimal canonical `RuleSetDocument`. Legacy `RL_INVALID_SHAPE` maps only in the adapter to applicable `RL_SCHEMA_*` codes. `RL_UNSAFE_PATH` cases belonging to later safe-resolution policy are excluded.

## Compatibility, security, and privacy

This is an additive public compiler API suitable for a minor release. `@ruleloom/schema` remains the owner of `RuleSetDocument`, the canonical schema, and `RL_SCHEMA_*` semantics. No migration or deprecation is required.

Untrusted input is processed without host hooks or caller-object retention. Text size is bounded before parsing and traversal is iterative and bounded. Diagnostics never include full documents, native parser errors, or source values. No telemetry, personal-data processing, or external service is introduced.

## Alternatives

- Place parsing in `@ruleloom/schema`: rejected because resource policy and source ownership belong at the compiler boundary.
- Return raw parser or validator errors: rejected because ordering and content are unstable.
- Freeze caller input: rejected because it mutates caller-owned values.
- Treat safe-pointer policy as parsing: rejected because later resolution owns that policy.

## Rollout, rollback, and tests

After approval, implement the compiler-root APIs, focused parser tests, public-export coverage, and the conformance adapter subset. Run all configured format, lint, typecheck, unit, integration, build, conformance, schema, and security checks. Rollback before release is reverting the isolated parser and tests; no data migration is involved.

Tests cover both APIs, every parser result and code, ordering, option boundaries, Unicode, host-value rejection, clone/freeze and non-mutation, limits, no registry/runtime effects, and adapter mapping/exclusions.

## Human approvals required

This RFC is required before implementation because it defines public package APIs, public diagnostic contracts, and user-visible compiler parsing behavior. Ahmad Hakroosh, human owner, approved this RFC on September 03, 2026. The canonical approval evidence is retained outside the reviewed Git tree and binds this approval to the final RFC artifact digest.

## Amendment: bounded schema diagnostics

The public `@ruleloom/schema` function `validateRuleSetDocument` gains an optional diagnostic-cap argument. When omitted, it preserves the existing unbounded one-argument behavior and all RL-011 diagnostics. The compiler passes `maxDiagnostics + 1` so schema validation stops collecting further diagnostics before parser normalization reserves the final public slot for `RL_PARSE_DIAGNOSTIC_LIMIT_REACHED`. This additive parameter prevents wide invalid documents from allocating an unbounded diagnostic collection. Ahmad Hakroosh, human owner, approved this amendment on September 03, 2026; canonical evidence is retained outside the reviewed Git tree.
