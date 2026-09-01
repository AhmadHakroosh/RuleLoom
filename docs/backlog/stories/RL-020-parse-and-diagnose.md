# RL-020: Parse RuleLoom documents with structured diagnostics

## Objective

Convert untrusted JSON-compatible input into a validated source model or a deterministic collection of actionable structural diagnostics.

## Technical constraints

- Type: `story`.
- Epic: `RL-E03`.
- Depends on: `RL-011`, `RL-012`.
- Input APIs accept `unknown` values and JSON text separately.
- Parsing must not bind registries, resolve facts, or execute extensions.
- Diagnostic codes and source-path formats are public compatibility surfaces.

## Functional requirements

1. Implement APIs for parsing JSON text and validating already parsed values.
2. Distinguish JSON syntax errors, unsupported schema versions, and structural schema errors.
3. Normalize validation-library output into stable RuleLoom diagnostics containing code, severity, message, source pointer, and optional related locations.
4. Return all safely discoverable structural errors in deterministic order rather than only the first error.
5. Apply configured document-size, nesting-depth, and diagnostic-count limits.
6. Preserve source values only when required for later compilation and do not mutate caller-owned input.
7. Run the structural portion of the RL-012 conformance corpus through the API.

## Quality requirements

- Equivalent invalid documents must produce stable, ordered diagnostics.
- Diagnostic messages must not embed complete sensitive input documents.
- Parser limits and malformed Unicode cases require tests.
- Public error types must be documented and serializable.

## Out of scope

- Fact and operator registry binding.
- Static type checking.
- YAML or non-JSON input.

## Acceptance criteria

- Valid v1 inputs produce immutable source models.
- Invalid JSON, unsupported versions, and schema violations produce distinct stable codes.
- Limit violations fail predictably without unbounded memory growth.
- All applicable structural conformance fixtures pass.
