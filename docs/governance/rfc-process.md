# RFC process

RuleLoom uses RFCs for changes that alter public semantics, compatibility expectations, or security posture.

## When an RFC is required

Create an RFC before implementation for changes to:

- rule-language semantics;
- AST or JSON schema contracts;
- portable IR;
- public package APIs;
- compiler or runtime behavior visible to users;
- security boundaries, trust assumptions, or disclosure policy;
- release, versioning, or deprecation policy.

Routine bug fixes, documentation clarifications, dependency maintenance, and internal refactors do not need an RFC unless they affect one of those areas.

## RFC contents

An RFC must include:

- RuleLoom ticket identifier, such as `RL-010`;
- problem statement and goals;
- non-goals;
- proposed behavior;
- compatibility analysis;
- security and privacy analysis;
- migration and deprecation plan when behavior changes;
- alternatives considered;
- rollout, rollback, and test strategy;
- human approvals required by [human-approvals.md](human-approvals.md).

## Review and approval

RFC discussion should happen before implementation. Automated agents may draft analysis, identify impacted files, and run checks, but they may not approve public semantic changes, security exceptions, irreversible migrations, paid services, or privacy changes.

Accepted RFCs should be linked from the implementing ticket and pull request. Rejected or withdrawn RFCs should keep a short rationale so future contributors can avoid re-opening the same decision without new evidence.
