import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("package boundaries", () => {
  it("rejects cross-package imports through unpublished internal paths", () => {
    const tscPath = join(
      process.cwd(),
      "node_modules",
      "typescript",
      "bin",
      "tsc",
    );
    let compilerOutput = "";

    try {
      execFileSync(
        process.execPath,
        [
          tscPath,
          "--pretty",
          "false",
          "-p",
          "tests/fixtures/internal-import/tsconfig.json",
        ],
        {
          encoding: "utf8",
          stdio: "pipe",
        },
      );
    } catch (error) {
      const failedProcess = error as { stdout?: string; stderr?: string };
      compilerOutput = `${failedProcess.stdout ?? ""}${failedProcess.stderr ?? ""}`;
    }

    expect(compilerOutput).toContain("@ruleloom/core/src/internal.js");
  });
});
