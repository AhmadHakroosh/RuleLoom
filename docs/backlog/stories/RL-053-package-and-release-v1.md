# RL-053: Package and prepare RuleLoom v1 for release

## Objective

Produce documented, reproducible, provenance-bearing RuleLoom v1 packages for supported JavaScript runtimes.

## Technical constraints

- Type: `story`.
- Epic: `RL-E06`.
- Depends on: `RL-002`, `RL-043`, `RL-050`, `RL-052`.
- ESM is the canonical module format; any CommonJS compatibility output must be explicit and tested.
- Release artifacts are built once from the merged commit and are not rebuilt per registry.
- First public publication requires human approval and protected credentials.

## Functional requirements

1. Finalize public package boundaries, names, exports, declaration maps, browser compatibility, side-effect metadata, and supported runtime matrix.
2. Verify packages from packed tarballs in clean Node, browser-bundler, and other declared runtime environments.
3. Generate API reference, getting-started documentation, language specification links, examples, migration policy, and security guidance.
4. Add automated versioning and changelog generation with independent language-schema and IR compatibility notes.
5. Build tarballs once, calculate SHA-256 digests, generate an SBOM, and attach build provenance.
6. Add protected publication workflows using short-lived trusted publishing where supported.
7. Verify package contents exclude sources or fixtures not intended for publication and include required schemas and licenses.
8. Run full conformance, security, performance, packaging, and independent review gates against the release commit.
9. Produce a human-readable release checklist with rollback and deprecation procedures.

## Quality requirements

- Package installation and import tests use actual tarballs.
- Public declarations may not expose private dependencies or unresolved source paths.
- Documentation examples are compiled and executed in CI.
- A failed required check or stale SHA-bound evidence must prevent publication.

## Out of scope

- Automatically approving the first release.
- Hosted documentation infrastructure requiring a paid service.
- Post-v1 bundles, decision tables, or language ports.

## Acceptance criteria

- Every declared runtime imports and exercises packed RuleLoom packages successfully.
- Tarball contents, checksums, SBOM, provenance, changelog, and API documentation are reproducible from the release commit.
- Full conformance and required independent reviews contain no blocking findings.
- The publication workflow waits for explicit human approval and publishes the prebuilt artifacts without rebuilding.
