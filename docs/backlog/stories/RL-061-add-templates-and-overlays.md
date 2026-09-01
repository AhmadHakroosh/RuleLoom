# RL-061: Add parameterized templates and tenant overlays

## Objective

Create reusable rule templates that can be instantiated with validated parameters and bounded tenant-specific overlays without changing core semantics.

## Technical constraints

- Type: `story`.
- Epic: `RL-E07`.
- Depends on: `RL-040`, `RL-060`.
- Template expansion produces canonical RuleLoom source before compilation.
- Overlays may change only fields explicitly declared overridable by the template.
- Tenant data must not leak into bundle identities or other tenant compilations.

## Functional requirements

1. Define template declarations with typed parameters, defaults, validation constraints, and overridable paths.
2. Implement deterministic instantiation into canonical rule documents with stable derived IDs.
3. Define overlay operations for enablement, parameter values, priorities, activation windows, and approved metadata.
4. Reject unknown parameters, incompatible values, forbidden paths, duplicate operations, and conflicting overlays.
5. Include template and overlay checksums in the derived bundle identity and decision metadata.
6. Isolate compilation caches and diagnostics by tenant or security domain.
7. Provide diff output showing the effective rule changes without exposing redacted parameter values.
8. Add tests for inheritance depth, tenant isolation, invalid overlays, and deterministic expansion.

## Quality requirements

- Template and overlay formats require versioned JSON Schemas.
- Expansion must enforce depth, output-size, and operation-count limits.
- Secret parameters are redacted in diagnostics and diffs by default.
- The same template and overlays in canonical order must produce identical derived source and checksum.

## Out of scope

- Arbitrary patch languages over the entire bundle.
- Runtime mutation of an active compiled snapshot.
- Tenant authentication or billing.

## Acceptance criteria

- Valid template instances compile as ordinary canonical rules.
- Overlays cannot change undeclared fields or cross tenant boundaries.
- Effective-rule diffs and decision metadata identify template and overlay versions.
- Repeated equivalent expansion produces identical canonical bytes and checksum.
