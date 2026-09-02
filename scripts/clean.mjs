import { rm } from "node:fs/promises";

const generatedPaths = [
  "coverage",
  "reports",
  ".tmp",
  "packages/core/dist",
  "packages/schema/dist",
  "packages/compiler/dist",
  "packages/runtime/dist",
];

await Promise.all(
  generatedPaths.map((generatedPath) =>
    rm(generatedPath, { recursive: true, force: true }),
  ),
);
