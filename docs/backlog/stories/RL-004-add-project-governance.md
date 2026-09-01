# RL-004: Add project governance and contribution policies

## Objective

Document how RuleLoom accepts changes, evolves public semantics, handles vulnerabilities, and makes human-governed releases.

## Technical constraints

- Type: `story`.
- Epic: `RL-E01`.
- Depends on: `RL-001`.
- Preserve Apache-2.0 licensing.
- Policies must be usable by external contributors and automated delivery agents.

## Functional requirements

1. Add contribution instructions covering environment setup, ticket selection, testing, review, and focused changes.
2. Add a code of conduct and maintainer escalation path.
3. Add a private security-reporting policy with supported-version and response expectations.
4. Add an RFC process for language, schema, IR, security, and public API changes.
5. Add semantic-versioning and deprecation policies for packages, language schemas, and portable IR.
6. Define human approval requirements for public API breaks, irreversible migrations, paid services, privacy changes, and security exceptions.
7. Add ownership guidance for core runtime, schema, compiler, release, and security-sensitive paths.

## Quality requirements

- Policies must not promise response times or support levels the project cannot sustain.
- Examples must use RuleLoom ticket identifiers and repository commands.
- Links must be validated in CI or by an equivalent real check.

## Out of scope

- Establishing a legal entity or foundation.
- Creating paid support offerings.
- Assigning named maintainers without their consent.

## Acceptance criteria

- A new contributor can identify how to propose, implement, test, and deliver a change.
- Security reports have a documented private channel and disclosure process.
- Semantic changes require an RFC and explicit compatibility analysis.
- Human-only decisions are clearly distinguishable from agent-authorized work.
