import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  reportFixtureSupport,
  type ConformanceAdapter,
} from "../scripts/conformance-adapter";

const repoRoot = process.cwd();
const fixturePath = join(
  repoRoot,
  "tests/fixtures/conformance/language-semantics-v1.json",
);

function runSemanticsCheck(args: string[] = []) {
  return execFileSync(
    process.execPath,
    ["scripts/check-conformance.mjs", ...args],
    {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: "pipe",
    },
  );
}

async function writeFixtureCopy(mutator: (fixture: any) => void) {
  const tempDir = await mkdtemp(join(tmpdir(), "ruleloom-semantics-"));
  const invalidFixturePath = join(tempDir, "language-semantics-v1.json");
  const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
  mutator(fixture);
  await writeFile(invalidFixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
  return invalidFixturePath;
}

describe("language semantics validation", () => {
  it("accepts the v1 language semantics fixture", () => {
    expect(runSemanticsCheck()).toContain(
      "Validated 37 conformance fixtures and 26 normative references",
    );
  });

  it("rejects malformed expected outcomes", async () => {
    const invalidFixturePath = await writeFixtureCopy((fixture) => {
      fixture.fixtures[0].expected.outcome = "maybe";
    });

    expect(() => runSemanticsCheck([invalidFixturePath])).toThrow();
  });

  it("rejects duplicate IDs", async () => {
    const invalidFixturePath = await writeFixtureCopy((fixture) => {
      fixture.fixtures.push(fixture.fixtures[0]);
    });

    expect(() => runSemanticsCheck([invalidFixturePath])).toThrow();
  });

  it("rejects unknown fields and incomplete traceability", async () => {
    const invalidFixturePath = await writeFixtureCopy((fixture) => {
      fixture.unexpected = true;
      fixture.normativeRefs[0].fixtureIds = [];
    });

    expect(() => runSemanticsCheck([invalidFixturePath])).toThrow();
  });

  it("reports unsupported stages explicitly", async () => {
    const calls: string[] = [];
    const adapter: ConformanceAdapter = {
      name: "schema-only",
      supportedStages: ["schema"],
      async run(fixture, stage) {
        calls.push(`${fixture.id}:${stage}`);
        return { status: "passed" };
      },
    };
    const manifest = JSON.parse(await readFile(fixturePath, "utf8"));
    const [report] = await reportFixtureSupport(manifest, adapter);
    expect(report.stages).toEqual({
      schema: "supported",
      compile: "unsupported",
      evaluate: "unsupported",
    });
    expect(calls).toHaveLength(manifest.fixtures.length);
    expect(calls[0]).toBe("EX-LITERAL-001:schema");
  });
});
