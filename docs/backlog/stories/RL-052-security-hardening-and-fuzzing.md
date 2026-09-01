# RL-052: Harden security with property tests and fuzzing

## Objective

Demonstrate that untrusted rule documents and fact values cannot escape language boundaries, exhaust unbounded resources, or produce inconsistent results across evaluator modes.

## Technical constraints

- Type: `story`.
- Epic: `RL-E06`.
- Depends on: `RL-033`, `RL-034`, `RL-041`.
- Fuzzing targets parse, validation, pointer access, compilation, evaluation, trace serialization, and cache-key generation.
- Security checks must run without external services or credentials.
- Discovered regressions become minimized permanent fixtures.

## Functional requirements

1. Document trust boundaries and abuse cases for rule authors, fact providers, registry plugins, cache adapters, traces, CLI inputs, and package consumers.
2. Add property-based generators for valid and invalid ASTs, registries, facts, pointers, and plans.
3. Add differential properties comparing optimized/unoptimized and sync/async-equivalent evaluation.
4. Add fuzz targets for malformed JSON, deep nesting, huge arrays, Unicode, unsafe keys, getters, cycles in host objects, and adversarial hashes.
5. Verify resource budgets stop generated pathological inputs.
6. Verify errors, traces, diagnostics, and cache metadata redact values classified secret.
7. Add dependency, license, secret, and static-analysis checks to release gates.
8. Document vulnerability triage and corpus retention without publishing exploitable details before fixes.

## Quality requirements

- Tests must use deterministic seeds in normal CI and preserve failing seeds.
- Longer fuzz campaigns run on scheduled or release infrastructure with artifacts retained.
- No fuzz target may disable core safety limits merely to increase throughput.
- Security failures block RL-053 release readiness.

## Out of scope

- Formal verification of the full compiler.
- Sandboxing malicious trusted-host operator code.
- Penetration testing a hosted service.

## Acceptance criteria

- Documented trust boundaries map to automated abuse or property tests.
- Generated valid documents preserve specified evaluator equivalences.
- Pathological inputs stop within configured limits without process crashes or unbounded growth.
- Secret-classified values do not appear in default diagnostics, traces, cache keys, or CLI errors.
