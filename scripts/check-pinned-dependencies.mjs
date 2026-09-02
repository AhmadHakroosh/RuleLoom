import { readFile } from "node:fs/promises";

const packageJsonPaths = [
  "package.json",
  "packages/core/package.json",
  "packages/schema/package.json",
  "packages/compiler/package.json",
  "packages/runtime/package.json",
];
const pathsToCheck = process.argv.slice(2);
const packagePaths = pathsToCheck.length > 0 ? pathsToCheck : packageJsonPaths;
const failures = [];

for (const packageJsonPath of packagePaths) {
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

  for (const dependencyGroup of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    const dependencies = packageJson[dependencyGroup] ?? {};

    for (const [dependencyName, versionRange] of Object.entries(dependencies)) {
      if (typeof versionRange !== "string") {
        failures.push(
          `${packageJsonPath}: ${dependencyName} has a non-string version`,
        );
        continue;
      }

      if (versionRange === "workspace:*") {
        continue;
      }

      if (
        /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/u.test(versionRange)
      ) {
        continue;
      }

      failures.push(
        `${packageJsonPath}: ${dependencyName} must be pinned exactly, found ${versionRange}`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("Dependency pin validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}
