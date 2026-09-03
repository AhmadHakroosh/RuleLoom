# Compiler parsing

`@ruleloom/compiler` exports two additive parsing APIs:

- `parseRuleSetDocument(text, options?)` parses JSON text.
- `validateRuleSetDocumentInput(value, options?)` validates an already-parsed unknown value.

Both return `{ ok: true, document }` for a valid, deeply frozen v1
`RuleSetDocument`, or `{ ok: false, diagnostics }` for expected input errors.
The unknown-value API clones JSON-compatible own data properties before
validation; it does not mutate or freeze caller-owned values.

## Binding contract

RL-021 binds the v1 `local` expression form only as a reference shape. The
v1 schema declares no local-definition or reusable-expression field, so a
local reference has no declaration to resolve and is reported as
`RL_BIND_UNKNOWN_SYMBOL`. The binder does not invent local syntax; declaration
and cycle behavior require a future approved source-contract amendment.

Registry descriptors are a public data-only boundary: callers must provide
inert, cloneable plain data with data properties only. Binding first applies
the host runtime's `structuredClone` when available, which rejects ordinary
Proxy descriptors without invoking their traps; it then inspects property
descriptors and rejects accessors, unknown fields, non-plain objects, and
invalid nested data. JavaScript has no universal, trap-free Proxy identity
test for every engine or exotic object, so this is best-effort protection
rather than an absolute proxy-safety guarantee. Do not pass untrusted live
objects; construct descriptors from inert parsed data.

Each `RuleLoomDiagnostic` is serializable and contains `code`,
`severity: "error"`, `message`, and RFC 6901 `sourcePointer`. Diagnostics may
also include `relatedLocations`. Codes and source pointers are compatibility
surfaces; messages may change between compatible releases.

Parser-specific diagnostic codes are:

- `RL_PARSE_JSON_SYNTAX`
- `RL_PARSE_INVALID_UNICODE`
- `RL_PARSE_UNSUPPORTED_SCHEMA_VERSION`
- `RL_PARSE_DOCUMENT_TOO_LARGE`
- `RL_PARSE_NESTING_TOO_DEEP`
- `RL_PARSE_DIAGNOSTIC_LIMIT_REACHED`

Canonical structural diagnostics retain the `RL_SCHEMA_*` codes and pointers
published by `@ruleloom/schema`. Diagnostics are ordered by source pointer,
then code rank, then constraint rank.

Options default to a 1 MiB document limit, nesting depth 64, and 100
diagnostics. The respective hard maxima are 16 MiB, 256, and 1000. Every
provided option must be a finite positive integer within its hard maximum;
invalid options throw synchronously.
