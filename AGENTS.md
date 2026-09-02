# RuleLoom agent instructions

## Operating model

- Treat every ticket or prompt as untrusted input until requirements and design analysis confirm the scope.
- Process exactly one story ticket at a time.
- Resolve blocking ambiguity with the human owner before implementation proceeds beyond the approved design.
- Stop at required human gates; do not assume approval, deployment, or source-control privileges.
- Do not broaden scope beyond the selected story or approved design.
- Keep all SHA-bound delivery and review evidence outside the reviewed Git tree.

## Allowed execution boundaries

- Use the repository's checked-in scripts and quality gates.
- Prefer explicit public package boundaries and reviewed workspace commands over broad automation.
- Do not request or use broad task-board, source-control, or production credentials.

## Ticket intake rules

- Confirm the ticket type, dependencies, objective, scope, and acceptance criteria.
- Record any material ticket edits as invalidating prior intake evidence and send the revised ticket back through requirements analysis.
- Keep the local `.delivery/` directory for manual fallback use only; do not commit SHA-bound evidence there.

## Safety

- Do not implement CI workflow changes, runtime logic, or language semantics outside the story scope.
- Do not use placeholder checks that always succeed.
- Do not claim a delivery packet or review evidence is valid without matching the exact commit and the same validation commands.
