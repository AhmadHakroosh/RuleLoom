import { rm } from "node:fs/promises";

const generatedPaths = [
  "coverage",
  "packages/core/dist",
  "packages/schema/dist",
  "packages/compiler/dist",
  "packages/runtime/dist"
];

await Promise.all(
  generatedPaths.map((generatedPath) =>
    rm(generatedPath, { recursive: true, force: true })
  )
);
