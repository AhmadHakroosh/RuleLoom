import { mkdir, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const fixtureRoot = ".tmp/quality-gate-failures";

const runExpectingFailure = (label, command, args) => {
  try {
    execFileSync(command, args, { encoding: "utf8", stdio: "pipe" });
  } catch {
    return;
  }

  console.error(`${label} did not fail for representative invalid input`);
  process.exit(1);
};

await rm(fixtureRoot, { recursive: true, force: true });
await mkdir(fixtureRoot, { recursive: true });

try {
  const emptyIgnorePath = join(fixtureRoot, "empty-prettier-ignore");
  await writeFile(emptyIgnorePath, "");
  const emptySecretlintIgnorePath = join(
    fixtureRoot,
    "empty-secretlint-ignore",
  );
  await writeFile(emptySecretlintIgnorePath, "");

  const badFormatPath = join(fixtureRoot, "bad-format.ts");
  await writeFile(badFormatPath, "export const value={alpha:1,beta:2};\n");
  runExpectingFailure("format", "pnpm", [
    "exec",
    "prettier",
    "--check",
    "--ignore-path",
    emptyIgnorePath,
    badFormatPath,
  ]);

  const badLintPath = join(fixtureRoot, "bad-lint.ts");
  await writeFile(badLintPath, "debugger;\n");
  runExpectingFailure("lint", "pnpm", [
    "exec",
    "oxlint",
    badLintPath,
    "--deny-warnings",
  ]);

  const badMarkdownPath = join(fixtureRoot, "bad-markdown.md");
  await writeFile(
    badMarkdownPath,
    "# Bad markdown\n### Skipped heading level\n",
  );
  runExpectingFailure("markdown lint", "pnpm", [
    "exec",
    "markdownlint-cli2",
    badMarkdownPath,
  ]);

  const badYamlPath = join(fixtureRoot, "bad-yaml.yaml");
  await writeFile(badYamlPath, "value: [unterminated\n");
  runExpectingFailure("structured data lint", process.execPath, [
    "scripts/check-structured-files.mjs",
    badYamlPath,
  ]);

  const badTypeDir = join(fixtureRoot, "bad-type");
  await mkdir(badTypeDir, { recursive: true });
  await writeFile(
    join(badTypeDir, "index.ts"),
    "const value: string = 1;\nexport { value };\n",
  );
  await writeFile(
    join(badTypeDir, "tsconfig.json"),
    JSON.stringify(
      {
        extends: "../../../tsconfig.base.json",
        compilerOptions: { noEmit: true },
        include: ["index.ts"],
      },
      null,
      2,
    ),
  );
  runExpectingFailure("typecheck", "pnpm", [
    "exec",
    "tsc",
    "--pretty",
    "false",
    "-p",
    join(badTypeDir, "tsconfig.json"),
  ]);
  runExpectingFailure("build", "pnpm", [
    "exec",
    "tsc",
    "--pretty",
    "false",
    "-p",
    join(badTypeDir, "tsconfig.json"),
  ]);

  const badTestPath = join(fixtureRoot, "bad-test.test.ts");
  await writeFile(
    badTestPath,
    'import { expect, it } from "vitest";\n\nit("fails intentionally", () => {\n  expect(1).toBe(2);\n});\n',
  );
  runExpectingFailure("test", "pnpm", ["exec", "vitest", "run", badTestPath]);

  const badMetadataDir = join(fixtureRoot, "bad-package");
  await mkdir(badMetadataDir, { recursive: true });
  await writeFile(
    join(badMetadataDir, "package.json"),
    JSON.stringify({ name: "bad-package", version: "0.0.0" }, null, 2),
  );
  runExpectingFailure("metadata", process.execPath, [
    "scripts/check-package-metadata.mjs",
    badMetadataDir,
  ]);

  const badDependencyPath = join(fixtureRoot, "bad-dependency.package.json");
  await writeFile(
    badDependencyPath,
    JSON.stringify(
      {
        name: "bad-dependency",
        version: "0.0.0",
        devDependencies: { prettier: "^3.9.6" },
      },
      null,
      2,
    ),
  );
  runExpectingFailure("dependency", process.execPath, [
    "scripts/check-pinned-dependencies.mjs",
    badDependencyPath,
  ]);

  const badSecretPath = join(fixtureRoot, "bad-secret.md");
  await writeFile(
    badSecretPath,
    ["password", "=", "example-secret-value"].join(" ") + "\n",
  );
  runExpectingFailure("secret", "pnpm", [
    "exec",
    "secretlint",
    "--secretlintignore",
    emptySecretlintIgnorePath,
    "--no-gitignore",
    badSecretPath,
  ]);
} finally {
  await rm(fixtureRoot, { recursive: true, force: true });
}
