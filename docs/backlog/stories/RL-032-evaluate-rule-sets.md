# RL-032: Evaluate rule sets and resolve proposed-action conflicts

## Objective

Evaluate multiple compiled rules with stable ordering and convert matched rules into deterministic proposed actions under explicit conflict policies.

## Technical constraints

- Type: `story`.
- Epic: `RL-E04`.
- Depends on: `RL-031`.
- Proposed actions are immutable data; the runtime does not dispatch them.
- Promise timing and collection insertion order may not alter result or action order.
- Conflict policy is declared in the compiled rule set.

## Functional requirements

1. Implement canonical rule ordering using explicit priority followed by stable rule identity.
2. Return a result for every evaluated, skipped, indeterminate, and failed rule.
3. Render action payload expressions only for rules whose outcome permits action proposal.
4. Implement v1 conflict policies: collect all, first match, highest priority, and exclusive group.
5. Diagnose conflicting actions or multiple matches when a policy requires uniqueness.
6. Record which policy selected, discarded, or rejected each proposed action.
7. Add deterministic-order tests with randomized source insertion and completion ordering.
8. Add conformance fixtures for each conflict policy.

## Quality requirements

- Action payload rendering must obey the same missing and error semantics as conditions.
- Duplicate rule IDs and malformed exclusive groups must have been rejected at compilation.
- Results must distinguish skipped rules from evaluated non-matches.
- Conflict resolution must be pure and independently testable.

## Out of scope

- Action side effects, retries, or compensation.
- Workflow chaining based on completed actions.
- Domain-specific conflict strategies.

## Acceptance criteria

- Rule and action ordering is identical across repeated and concurrent evaluations.
- Each built-in conflict policy produces the documented selected and discarded actions.
- No action callback or external side effect runs during evaluation.
- Conflict decisions are represented in the immutable result.
