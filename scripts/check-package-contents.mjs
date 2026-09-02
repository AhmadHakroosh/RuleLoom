import { execFileSync } from "node:child_process";

const packageDirs = [
  "./packages/core",
  "./packages/schema",
  "./packages/compiler",
  "./packages/runtime",
];
const allowedPackageFiles = new Set([
  "dist/index.d.ts",
  "dist/index.d.ts.map",
  "dist/index.js",
  "dist/index.js.map",
  "package.json",
]);
const failures = [];

for (const packageDir of packageDirs) {
  const output = execFileSync(
    "npm",
    ["pack", "--dry-run", "--json", packageDir],
    { encoding: "utf8" },
  );
  const packResult = JSON.parse(output);
  const packageInfo = Array.isArray(packResult)
    ? packResult[0]
    : Object.values(packResult)[0];

  for (const file of packageInfo.files) {
    if (!allowedPackageFiles.has(file.path)) {
      failures.push(
        `${packageInfo.name}: unexpected package file ${file.path}`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("Package content validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}
