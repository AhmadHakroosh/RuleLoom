# Human approval requirements

Automated delivery agents may analyze, propose, implement approved designs, and run repository checks. They may not make the following decisions without explicit human approval.

## Human-only decisions

- Public API breaks.
- Rule-language semantic changes.
- Breaking schema or portable IR changes.
- Irreversible migrations or data-loss risk.
- New paid services, paid support commitments, or billing behavior.
- Privacy changes or new handling of personal data.
- Security exceptions, vulnerability disclosure timing, or release of a fix for a private report.
- Production deployment, release promotion, or branch-protection changes.

## Approval evidence

Approval should identify the ticket, decision, approver role, date, and exact commit or artifact when applicable. SHA-bound approval, delivery, and review evidence must remain outside the reviewed Git tree as described in [../delivery-workflow.md](../delivery-workflow.md).

If a material ticket or design change occurs after approval, return to requirements and design analysis before implementation continues.
