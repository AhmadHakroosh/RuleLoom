import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function runDocLinkCheck(args: string[] = []) {
  return execFileSync(
    process.execPath,
    [join(repoRoot, "scripts", "check-doc-links.mjs"), ...args],
    {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: "pipe",
    },
  );
}

describe("documentation link validation", () => {
  it("accepts repository Markdown links", () => {
    expect(runDocLinkCheck()).toContain("Validated links");
  });

  it("rejects broken local links", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "ruleloom-doc-links-"));
    const invalidMarkdownPath = join(tempDir, "invalid.md");

    await writeFile(
      invalidMarkdownPath,
      "# Invalid\n\n[missing](./does-not-exist.md)\n",
    );

    expect(() => runDocLinkCheck([invalidMarkdownPath])).toThrow();
  });
});
