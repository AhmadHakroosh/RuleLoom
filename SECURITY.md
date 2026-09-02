# Security Policy

RuleLoom handles vulnerability reports privately first so maintainers can assess impact and prepare a coordinated fix before public disclosure.

## Supported versions

RuleLoom is pre-1.0. Until a first public release exists, security fixes target the default branch and any explicitly maintained release branch. Older snapshots, forks, and unmaintained branches are not covered unless maintainers state otherwise in a release note.

## Private reporting

Use the repository host's private vulnerability reporting feature for this repository when available. If that feature is unavailable, ask the maintainers for a private security contact channel without including exploit details in the public request.

Do not open public issues, pull requests, discussions, or chat messages that include exploit steps, secrets, private data, or unpublished vulnerability details.

## What to include

- Affected package, command, schema, runtime behavior, or policy.
- Reproduction steps or a minimal proof of concept that does not expose real secrets or private data.
- Impact, exploit preconditions, and any known mitigations.
- Whether the report affects public APIs, language semantics, portable IR, release artifacts, or private data.

## Response and disclosure

Maintainers will triage reports as project capacity allows. This policy does not promise fixed response times, paid support, or support for unsupported versions.

Public disclosure should wait until maintainers have assessed the report and, when appropriate, prepared a fix or mitigation. Security exceptions, disclosure timing, and release decisions require human approval under [docs/governance/human-approvals.md](docs/governance/human-approvals.md).
