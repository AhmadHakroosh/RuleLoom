# Compiler parsing

`@ruleloom/compiler` exports two additive parsing APIs:

- `parseRuleSetDocument(text, options?)` parses JSON text.
- `validateRuleSetDocumentInput(value, options?)` validates an already-parsed unknown value.

Both return `{ ok: true, document }` for a valid, deeply frozen v1
`RuleSetDocument`, or `{ ok: false, diagnostics }` for expected input errors.
The unknown-value API clones JSON-compatible own data properties before
validation; it does not mutate or freeze caller-owned values.

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
