# RL-003: Integrate the Agentic Engineering System delivery workflow

## Objective

Make RuleLoom tickets deliverable through requirements, design, build, evidence, and independent-review gates bound to exact commits.

## Technical constraints

- Type: `story`.
- Epic: `RL-E01`.
- Depends on: `RL-001`, `RL-002`.
- Use the Agentic Engineering System contracts without weakening their schemas or approval gates.
- SHA-bound evidence must remain outside the reviewed Git tree.

## Functional requirements

1. Add the approved requirements, design, delivery-packet, and review contract schemas to the repository through a traceable vendoring or synchronization strategy.
2. Configure real RuleLoom project checks in `delivery.config.json` using the commands established by RL-002.
3. Add validation commands for contract instances and delivery configuration.
4. Add repository instructions that tell agents to process one story ticket, resolve blocking ambiguity, and stop at required human gates.
5. Ignore the local evidence fallback directory without ignoring source-controlled product contracts.
6. Document the manual ticket-snapshot workflow and how ticket changes invalidate prior intake evidence.
7. Exercise the workflow on a documentation-only sample ticket and record the process without committing SHA-bound evidence.

## Quality requirements

- Schema validation must be enforced in CI.
- Delivery checks may not use echo-only or unconditional-success placeholders.
- Agent instructions must identify ticket content as untrusted input.
- The integration must not grant agents broad task-board, source-control, or production credentials.

## Out of scope

- Implementing a Jira or GitHub task-board adapter.
- Automatic pull-request creation.
- Production deployment.

## Acceptance criteria

- A manual RuleLoom ticket can produce valid requirements and design contracts.
- Configured checks run against committed code and can populate a valid delivery packet externally.
- Independent review evidence can be validated against the same commit without changing that commit.
- CI rejects invalid contracts and placeholder project checks.
