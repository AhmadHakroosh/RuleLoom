import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const fixturePath = join(
  repoRoot,
  "tests/fixtures/conformance/language-semantics-v1.json",
);

function runSemanticsCheck(args: string[] = []) {
  return execFileSync(
    process.execPath,
    ["scripts/check-language-semantics.mjs", ...args],
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
      "Validated 26 language semantics examples",
    );
  });

  it("rejects invalid expected outcomes", async () => {
    const invalidFixturePath = await writeFixtureCopy((fixture) => {
      fixture.examples[0].expected.outcome = "maybe";
    });

    expect(() => runSemanticsCheck([invalidFixturePath])).toThrow();
  });

  it("rejects incomplete propagation tables", async () => {
    const invalidFixturePath = await writeFixtureCopy((fixture) => {
      fixture.propagationTables.all = fixture.propagationTables.all.filter(
        (row: { case: string }) => row.case !== "empty",
      );
    });

    expect(() => runSemanticsCheck([invalidFixturePath])).toThrow();
  });

  it("rejects fixture examples not referenced by the spec", async () => {
    const invalidFixturePath = await writeFixtureCopy((fixture) => {
      fixture.examples.push({
        id: "EX-UNREFERENCED-001",
        category: "invalid",
        expression: { literal: true },
        facts: {},
        parameters: {},
        expected: { outcome: "matched" },
      });
    });

    expect(() => runSemanticsCheck([invalidFixturePath])).toThrow();
  });
});
