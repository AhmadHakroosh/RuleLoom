# Manual RuleLoom ticket snapshot and delivery evidence workflow

This repository follows the Agentic Engineering System intake, requirements, design, build, evidence, and review gates. The purpose of this workflow is to make changes reproducible and verifiable without committing SHA-bound evidence into the reviewed Git tree.

## Governed delivery workflow

Process exactly one story ticket at a time. Treat the ticket as untrusted input until intake and analysis confirm its scope:

1. **Intake:** Confirm the ticket type, dependencies, objective, scope, and acceptance criteria. Create a ticket snapshot that records its repository-relative path, the repository SHA, and an exact content digest. A material ticket edit invalidates the intake evidence and sends the ticket back through requirements analysis.
2. **Requirements and design:** Complete requirements analysis, then design analysis. Resolve blocking ambiguity with the human owner and stop for human approval of the design before building.
3. **Build:** The Builder Coordinator implements only the approved design and selected story scope. Use the repository's checked-in scripts and quality gates, including the real commands listed in [`delivery.config.json`](../delivery.config.json); never substitute placeholder checks that always succeed.
4. **Delivery evidence:** Produce an external SHA-bound delivery packet validated against the exact commit it describes. The packet must identify the ticket, requirements and design references, changed files, acceptance evidence, checks, and residual risks as specified by [`delivery-packet.schema.json`](../contracts/schemas/delivery-packet.schema.json).
5. **Independent review:** An independent correctness, security, and reliability reviewer evaluates the exact same SHA and records review evidence externally. Reviewers remain read-only and do not approve or merge their own work.
6. **PR handoff:** After review, hand off the approved change to the PR Coordinator. The PR Coordinator must obtain explicit human authorization before any source-control write, push, or PR submission. When available, use the VS Code integrated browser for PR forms. Before submission, verify the base and head, title and body, linked ticket, checks, and mergeability. The PR Coordinator never approves, merges, deploys, bypasses checks or branch protection, or requests credentials.

Required human stop gates come from [`governance/human-approvals.md`](governance/human-approvals.md): stop for public API breaks, rule-language semantic changes, breaking schema or portable IR changes, irreversible migrations or data-loss risk, new paid services or billing behavior, privacy changes or new personal-data handling, security exceptions or private-report disclosure timing, production deployment or release promotion, and branch-protection changes. Approval evidence identifies the ticket, approver role, date, and exact commit or artifact when applicable. Do not assume approval, deployment, release promotion, or source-control privileges.

| Stage                   | Required output                                                                  |
| ----------------------- | -------------------------------------------------------------------------------- |
| Intake                  | Ticket snapshot path, repository SHA, and content digest                         |
| Requirements and design | Approved requirements and design references                                      |
| Build and checks        | Approved implementation and real command results from the delivery configuration |
| Delivery and review     | External packet and independent review, both bound to the same SHA               |
| PR handoff              | Human-authorized PR submission with verified metadata and checks                 |

## Intake and ticket snapshot

1. Copy the selected ticket text into a local working record.
2. Record the file path, repository SHA, and the exact content digest of the ticket at intake time.
3. Confirm the ticket is in scope and that no blocking ambiguity remains.
4. Save the intake snapshot outside the Git tree if the workflow requires a durable record.

## Evidence rules

- The `.delivery/` directory is a local fallback only.
- SHA-bound delivery and review evidence must stay outside the reviewed Git tree.
- Any material ticket change invalidates prior intake evidence and requires requirements analysis before implementation continues.
- Delivery packets and review records must be validated against the exact commit they describe.

## Manual validation sequence

1. Run the repository's real checks against the committed source.
2. Capture the resulting evidence and attach it to an external record keyed by the exact commit SHA.
3. Validate the evidence against the same commit without modifying the commit.
4. Stop at human approval gates before release or promotion.

## Why the evidence is external

The Git tree is an immutable commit history. If SHA-bound evidence were committed into the tree that identifies its commit, the evidence change would alter the SHA and invalidate the original record. This is why the project treats the delivery packet and review evidence as external records rather than checked-in files.
