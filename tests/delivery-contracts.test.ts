import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function runScript(scriptName: string, args: string[] = []) {
  return execFileSync(
    process.execPath,
    [join(repoRoot, "scripts", scriptName), ...args],
    {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: "pipe",
    },
  );
}

describe("delivery governance contracts", () => {
  it("accepts the repository delivery config and valid contract instances", () => {
    runScript("check-delivery-config.mjs");
    runScript("check-delivery-contracts.mjs");
  });

  it("rejects invalid requirements contract instances", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "ruleloom-delivery-"));
    const invalidRequirementsPath = join(tempDir, "invalid-requirements.json");

    await writeFile(
      invalidRequirementsPath,
      JSON.stringify(
        {
          schemaVersion: "1.0",
          ticket: {
            provider: "ruleloom",
            id: "RL-003",
            url: "https://example.invalid/tickets/RL-003",
          },
          objective: "Example",
          scope: { in: ["docs"], out: [] },
          requirements: [],
          acceptanceCriteria: [],
          ambiguities: [],
        },
        null,
        2,
      ),
    );

    expect(() =>
      runScript("check-delivery-contracts.mjs", [invalidRequirementsPath]),
    ).toThrow();
  });

  it("accepts the valid contract fixtures shipped with the repository", () => {
    runScript("check-delivery-contracts.mjs");
  });

  it("rejects placeholder or unconditional-success commands in delivery config", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "ruleloom-delivery-"));
    const invalidConfigPath = join(tempDir, "invalid-delivery.config.json");

    await writeFile(
      invalidConfigPath,
      JSON.stringify(
        {
          schemaVersion: "1.0",
          commands: {
            formatCheck: "echo ok",
            lint: "true",
            typecheck: "pnpm run typecheck",
            unitTest: "pnpm run test:unit",
            integrationTest: "pnpm run test:integration",
            build: "pnpm run build",
          },
          release: {
            artifactPath: "dist",
            stagingEnvironment: "staging",
            productionEnvironment: "production",
            requireImmutableDigest: true,
            rebuildOnPromotion: false,
          },
        },
        null,
        2,
      ),
    );

    expect(() =>
      runScript("check-delivery-config.mjs", [invalidConfigPath]),
    ).toThrow();
  });

  it("rejects invalid design contract instances", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "ruleloom-delivery-"));
    const invalidDesignPath = join(tempDir, "invalid-design.json");

    await writeFile(
      invalidDesignPath,
      JSON.stringify(
        {
          schemaVersion: "1.0",
          requirementsRef: "REQ-01",
          summary: "Example",
          decisions: [],
          affectedComponents: ["docs"],
          risks: [],
          testStrategy: [],
          rollout: "manual",
          rollback: "manual",
          humanApprovals: [],
        },
        null,
        2,
      ),
    );

    expect(() =>
      runScript("check-delivery-contracts.mjs", [invalidDesignPath]),
    ).toThrow();
  });
});
