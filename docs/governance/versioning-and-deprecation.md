# Versioning and deprecation policy

RuleLoom uses semantic versioning for published packages and explicit compatibility analysis for language schemas and portable IR.

## Packages

- Patch versions contain compatible bug fixes, documentation corrections, and internal maintenance.
- Minor versions may add compatible APIs, diagnostics, schemas, or runtime capabilities.
- Major versions are required for public API removals, incompatible behavior changes, or breaking package boundary changes after a stable release exists.

Pre-1.0 releases may change faster, but breaking changes still require a ticket, compatibility analysis, migration notes, and human approval when they affect public users.

## Language schemas and portable IR

Schema and IR changes must identify whether they are additive, tightening, loosening, or breaking. Breaking schema or IR changes require an RFC under [rfc-process.md](rfc-process.md), compatibility tests, and migration guidance.

Portable IR versions must be explicit in artifacts once IR artifacts exist. Consumers must not infer compatibility from package versions alone.

## Deprecation

Deprecations should include:

- what is deprecated;
- why it is being deprecated;
- the replacement path;
- the earliest removal point;
- tests or conformance fixtures that describe both old and new behavior when practical.

Removal before the documented point requires human approval under [human-approvals.md](human-approvals.md).
