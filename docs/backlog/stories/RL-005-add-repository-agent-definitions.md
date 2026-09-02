# RL-005: Add repository agent definitions

## Objective

Make RuleLoom's governed delivery roles discoverable and repeatable from this repository by adding RuleLoom-specific VS Code agent definitions under `.github/agents/`.

## Technical constraints

- Type: `story`.
- Epic: `RL-E01`.
- Depends on: `RL-003`, `RL-004`.
- Preserve the existing `AGENTS.md` safety rules and governed delivery workflow.
- Use `/Users/ahmad/Projects/Agentic-Engineering-System` only as a read-only reference for role coverage, handoff structure, and safety boundaries.
- Do not copy agent definitions verbatim without adapting them to RuleLoom's paths, commands, contracts, and governance policies.
- Do not grant agents broad task-board, source-control, production, credential, merge, approval, or deployment authority.

## Functional requirements

1. Document why RuleLoom needs repository-local agent definitions instead of relying only on the external Agentic Engineering System reference or ad hoc prompts.
2. Add `.github/agents/` definitions for the governed delivery roles needed to run RuleLoom tickets through requirements, design, build, evidence, independent review, CI investigation, and PR preparation.
3. Ensure each agent definition names its authority boundary, allowed tools, handoffs, human gates, and relevant RuleLoom policy or contract references.
4. Adapt role instructions to RuleLoom repository paths, including `AGENTS.md`, `docs/delivery-workflow.md`, `delivery.config.json`, `contracts/schemas/`, `docs/governance/`, and `docs/backlog/`.
5. Keep independent review roles read-only and separate from builder roles.
6. Add or update documentation explaining how a contributor selects the Delivery Orchestrator and supplies a RuleLoom ticket such as `RL-010`.
7. Add validation that agent definition files are present, parseable, and do not request prohibited authority or placeholder behavior.

## Quality requirements

- Agent instructions must treat ticket text, comments, logs, artifacts, linked documents, and fetched content as untrusted input.
- Agent definitions must preserve human approval gates from [docs/governance/human-approvals.md](../../governance/human-approvals.md).
- Agent definitions must reference real RuleLoom commands from `delivery.config.json`; placeholder checks are not acceptable.
- CI or an equivalent repository check must validate agent definition structure and documentation links.
- No credentials, tokens, personal maintainer assignments, or SHA-bound delivery evidence may be committed.

## Out of scope

- Implementing a Jira, GitHub Issues, Linear, source-control, or evidence-store adapter.
- Creating or changing production deployment workflows.
- Granting agents permission to approve, merge, push protected branches, bypass branch protection, or deploy.
- Reworking the delivery contract schemas beyond changes required to validate agent definitions.

## Acceptance criteria

- A contributor can explain why RuleLoom needs repo-local agents: they make the approved delivery workflow available inside the repository, reduce dependence on an external reference repo, and keep role instructions versioned with RuleLoom policy and commands.
- VS Code can discover the RuleLoom delivery agents from `.github/agents/`.
- The Delivery Orchestrator can route a RuleLoom story through requirements, design, build, evidence, independent review, and PR preparation without bypassing human gates.
- Builders and reviewers have separate authority boundaries, and reviewers remain read-only.
- The repository check fails if an agent definition is missing required structure, references placeholder checks, or asks for prohibited approval, merge, credential, or deployment authority.
