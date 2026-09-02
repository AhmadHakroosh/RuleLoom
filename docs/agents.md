# RuleLoom repository agents

RuleLoom keeps VS Code agent definitions in this repository so the governed delivery workflow is discoverable, reviewable, and versioned with RuleLoom's own policies and commands. The external Agentic Engineering System remains a reference, but RuleLoom delivery should not depend on copying prompts from another checkout or reconstructing role boundaries by hand.

## Why they belong here

- They bind delivery roles to RuleLoom paths such as `AGENTS.md`, `docs/delivery-workflow.md`, `delivery.config.json`, `contracts/schemas/`, `docs/governance/`, and `docs/backlog/`.
- They make human approval gates visible to contributors and automated delivery agents before implementation starts.
- They keep builder and reviewer authority separate, with independent reviewers staying read-only.
- They let future policy changes evolve through normal RuleLoom review instead of drifting from an external reference.

## Using the workflow

In VS Code, select the `Delivery Orchestrator` agent and provide one RuleLoom story ticket, for example:

```text
Deliver RL-010 according to AGENTS.md and the governed delivery workflow.
```

The orchestrator should route the ticket through requirements, design, build, delivery evidence, independent review, and PR preparation. It must stop for human approval before implementation and for any human-only decision listed in [governance/human-approvals.md](governance/human-approvals.md).

## Validation

Agent files are validated by:

```sh
npx pnpm@11.25.0 run lint:agents
```

The full repository gate includes the same check through `npx pnpm@11.25.0 run check`.
