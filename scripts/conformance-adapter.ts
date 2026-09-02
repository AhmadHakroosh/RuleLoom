export type ConformanceStage = "schema" | "compile" | "evaluate";
export type ConformanceSupport = "supported" | "unsupported";

export interface ConformanceFixture {
  readonly id: string;
  readonly support: readonly ConformanceStage[];
  readonly [key: string]: unknown;
}

export interface AdapterExecution {
  readonly status: "passed" | "failed";
  readonly diagnostics?: readonly {
    readonly code: string;
    readonly message?: string;
  }[];
}

export interface ConformanceAdapter {
  readonly name: string;
  readonly supportedStages: readonly ConformanceStage[];
  run(
    fixture: ConformanceFixture,
    stage: ConformanceStage,
  ): Promise<AdapterExecution>;
}

export interface FixtureStageReport {
  readonly fixtureId: string;
  readonly stages: Readonly<Record<ConformanceStage, ConformanceSupport>>;
  readonly executions: Readonly<
    Partial<Record<ConformanceStage, AdapterExecution>>
  >;
}

export interface ConformanceManifest {
  readonly fixtures: readonly ConformanceFixture[];
}

export async function reportFixtureSupport(
  manifest: ConformanceManifest,
  adapter: ConformanceAdapter,
): Promise<readonly FixtureStageReport[]> {
  const supported = new Set(adapter.supportedStages);
  return Promise.all(
    manifest.fixtures.map(async (fixture) => {
      const stages = {} as Record<ConformanceStage, ConformanceSupport>;
      const executions: Partial<Record<ConformanceStage, AdapterExecution>> =
        {};
      for (const stage of ["schema", "compile", "evaluate"] as const) {
        if (!fixture.support.includes(stage) || !supported.has(stage)) {
          stages[stage] = "unsupported";
          continue;
        }
        stages[stage] = "supported";
        executions[stage] = await adapter.run(fixture, stage);
      }
      return { fixtureId: fixture.id, stages, executions };
    }),
  );
}
