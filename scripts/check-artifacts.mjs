import { access } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const packages = ["core", "schema", "compiler", "runtime"];
const requiredArtifacts = packages.flatMap((packageName) => [
  `packages/${packageName}/dist/index.js`,
  `packages/${packageName}/dist/index.d.ts`
]);

const missingArtifacts = [];

for (const artifact of requiredArtifacts) {
  try {
    await access(artifact);
  } catch {
    missingArtifacts.push(artifact);
  }
}

if (missingArtifacts.length > 0) {
  console.error("Missing generated package artifacts:");
  for (const artifact of missingArtifacts) {
    console.error(`- ${artifact}`);
  }
  process.exit(1);
}

const trackedFiles = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split(/\r?\n/u)
  .filter(Boolean);
const trackedGeneratedFiles = trackedFiles.filter(
  (trackedFile) =>
    trackedFile === "node_modules" ||
    trackedFile.startsWith("node_modules/") ||
    trackedFile.includes("/node_modules/") ||
    trackedFile.includes("/dist/")
);

if (trackedGeneratedFiles.length > 0) {
  console.error("Generated artifacts or dependency directories are tracked:");
  for (const trackedFile of trackedGeneratedFiles) {
    console.error(`- ${trackedFile}`);
  }
  process.exit(1);
}
