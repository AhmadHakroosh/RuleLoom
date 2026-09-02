import { readFile } from "node:fs/promises";

const defaultPackageDirs = [
  "packages/core",
  "packages/schema",
  "packages/compiler",
  "packages/runtime",
];
const packageDirs = process.argv.slice(2);
const directoriesToCheck =
  packageDirs.length > 0 ? packageDirs : defaultPackageDirs;
const failures = [];

for (const packageDir of directoriesToCheck) {
  const packageJsonPath = `${packageDir}/package.json`;
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const packageName = packageJson.name ?? packageJsonPath;

  if (packageJson.license !== "Apache-2.0") {
    failures.push(`${packageName}: license must be Apache-2.0`);
  }

  if (
    packageJson.repository?.type !== "git" ||
    typeof packageJson.repository?.url !== "string"
  ) {
    failures.push(
      `${packageName}: repository.type and repository.url are required`,
    );
  }

  if (typeof packageJson.repository?.directory !== "string") {
    failures.push(`${packageName}: repository.directory is required`);
  }

  if (
    !packageJson.exports?.["."]?.types ||
    !packageJson.exports?.["."]?.import
  ) {
    failures.push(
      `${packageName}: root exports must define import and types entries`,
    );
  }

  if (!Array.isArray(packageJson.files) || packageJson.files.length === 0) {
    failures.push(
      `${packageName}: files must list publishable artifacts explicitly`,
    );
  }

  if (packageJson.private === true) {
    failures.push(
      `${packageName}: packages must not be private; publishing is controlled by later release workflow`,
    );
  }

  if (packageJson.publishConfig?.access !== "public") {
    failures.push(
      `${packageName}: publishConfig.access must declare publish visibility`,
    );
  }
}

if (failures.length > 0) {
  console.error("Package metadata validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}
