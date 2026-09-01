# RL-062: Add shadow evaluation, decision diffing, and replay

## Objective

Compare candidate and active rule bundles safely on the same inputs and replay recorded decision envelopes for regression analysis.

## Technical constraints

- Type: `story`.
- Epic: `RL-E07`.
- Depends on: `RL-041`, `RL-060`.
- Shadow evaluation never dispatches proposed actions.
- Replay envelopes are versioned and support fact redaction or references to an application-owned evidence store.
- Candidate failures may not affect active decisions.

## Functional requirements

1. Define a decision envelope containing bundle and plan identities, input schema identity, parameters, safe fact material or references, options, outcome, actions, and trace summary.
2. Evaluate active and candidate snapshots independently using controlled equivalent fact inputs.
3. Produce a structured diff for rule outcomes, proposed actions, diagnostics, missing facts, and trace paths.
4. Support configured tolerances for intentionally ignored metadata such as timing.
5. Implement replay validation that rejects incompatible, incomplete, tampered, or over-retained envelopes.
6. Provide CLI commands or library APIs for shadow comparison and local replay.
7. Expose aggregate divergence counts without persisting sensitive per-decision values.
8. Add tests proving candidate errors, cancellation, and resolver differences do not change the active decision.

## Quality requirements

- Replay and diff schemas require compatibility and retention documentation.
- Default envelopes omit secret values and volatile stack traces.
- Fact resolvers used for comparison must declare whether one fetched value can be safely shared between active and candidate plans.
- Diff output ordering must be stable and machine-readable.

## Out of scope

- Persistent decision-log service.
- Automatic promotion based solely on shadow results.
- Statistical experimentation platform.

## Acceptance criteria

- Active decisions remain unchanged when candidate evaluation fails.
- Structured diffs identify all normative outcome and action divergences.
- Compatible envelopes replay to the expected canonical decision.
- Tampered, incompatible, or insufficient replay material fails with actionable diagnostics.
