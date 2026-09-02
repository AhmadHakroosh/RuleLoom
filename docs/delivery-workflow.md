# Manual RuleLoom ticket snapshot and delivery evidence workflow

This repository follows the Agentic Engineering System intake, requirements, design, build, evidence, and review gates. The purpose of this workflow is to make changes reproducible and verifiable without committing SHA-bound evidence into the reviewed Git tree.

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
