# RL-050: Add representative benchmarks and regression gates

## Objective

Measure compiler and runtime performance on reproducible workloads and prevent material unexplained regressions.

## Technical constraints

- Type: `story`.
- Epic: `RL-E06`.
- Depends on: `RL-030`, `RL-034`, `RL-043`.
- Compilation, synchronous evaluation, async evaluation, tracing, and setup costs must be measured separately.
- Published results must record environment and workload details.
- CI gating must tolerate expected hosted-runner variance.

## Functional requirements

1. Define workloads for scalar comparison, nested boolean logic, repeated facts, large collections, many rules, async fan-out, tracing, and compile-once/evaluate-many use.
2. Add representative small, medium, and large canonical fixture sets.
3. Measure throughput, latency distribution, allocations or memory growth where observable, and resolver call counts.
4. Add direct-JavaScript baseline implementations for simple synchronous workloads without using another rules engine as a dependency.
5. Store benchmark metadata and results in machine-readable artifacts.
6. Establish regression budgets from a documented stable baseline rather than arbitrary marketing targets.
7. Run a stable smoke benchmark in pull-request CI and the full suite on controlled scheduled or release infrastructure.
8. Document how contributors reproduce and interpret results.

## Quality requirements

- Benchmarks must warm up appropriately and avoid measuring file I/O unless it is the subject.
- Async benchmarks use controlled resolvers and do not access a network.
- Results must not claim universal performance from one machine.
- A failed performance gate must include the changed workload and measured delta.

## Out of scope

- Batch API implementation owned by RL-051.
- Comparing against proprietary engines.
- Guaranteeing a fixed latency on arbitrary consumer hardware.

## Acceptance criteria

- All required workloads run from a documented command and produce machine-readable results.
- Compilation and evaluation costs can be analyzed independently.
- CI detects an intentionally introduced material hot-path regression.
- Public performance documentation states environment, workload, sample method, and limitations.
