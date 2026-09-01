# RL-E06: Harden and release RuleLoom v1

## Objective

Release a secure, performant, portable, and reproducibly packaged RuleLoom v1.

## Technical constraints

- Type: `epic`.
- Epic: `none`.
- Depends on: `RL-E04`, `RL-E05`.
- This is a coordination ticket; child stories are the executable units.
- A human must approve the first public package publication.

## Functional requirements

1. Complete RL-050 for representative benchmarks and regression gates.
2. Complete RL-051 for batch evaluation.
3. Complete RL-052 for security hardening, property testing, and fuzzing.
4. Complete RL-053 for package exports, documentation, provenance, and v1 release automation.

## Quality requirements

- Published performance claims must identify workload and environment.
- Release artifacts must be built once from the merged commit and carry checksums and provenance.
- Blocking correctness, security, or reliability findings prevent release.

## Out of scope

- Rust, Go, JVM, or .NET runtimes.
- Hosted services.
- Backward compatibility with pre-1.0 experimental APIs unless explicitly adopted.

## Acceptance criteria

- RL-050 through RL-053 are complete.
- Supported runtime matrices pass from clean environments.
- The v1 packages and documentation are ready for a human-approved public release.
