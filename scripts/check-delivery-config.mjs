import { readFile } from "node:fs/promises";

const configPath = process.argv[2] ?? "delivery.config.json";
const configText = await readFile(configPath, "utf8");
const config = JSON.parse(configText);
const failures = [];

const validCommandNames = new Set([
  "formatCheck",
  "lint",
  "typecheck",
  "unitTest",
  "integrationTest",
  "build",
  "securityScan",
]);

const placeholderPatterns = [
  /^\s*echo\s+/i,
  /^\s*true\s*$/i,
  /^\s*false\s*$/i,
  /^\s*:\s*$/,
  /^\s*exit\s+0\s*$/i,
];

if (config.schemaVersion !== "1.0") {
  failures.push("delivery.config.json schemaVersion must be 1.0");
}

if (!config.commands || typeof config.commands !== "object") {
  failures.push("delivery.config.json commands object is required");
} else {
  for (const [name, command] of Object.entries(config.commands)) {
    if (!validCommandNames.has(name)) {
      failures.push(`Unexpected command entry: ${name}`);
      continue;
    }

    if (typeof command !== "string" || command.trim().length === 0) {
      failures.push(`Command ${name} must be a non-empty string`);
      continue;
    }

    if (placeholderPatterns.some((pattern) => pattern.test(command))) {
      failures.push(
        `Command ${name} must execute real checks, not a placeholder: ${command}`,
      );
    }

    if (/^\s*(?:echo|printf)\b/i.test(command) || /\btrue\b/i.test(command)) {
      failures.push(
        `Command ${name} must not be echo-only or unconditional-success: ${command}`,
      );
    }
  }

  for (const requiredName of [
    "formatCheck",
    "lint",
    "typecheck",
    "unitTest",
    "integrationTest",
    "build",
    "securityScan",
  ]) {
    if (!(requiredName in config.commands)) {
      failures.push(`Missing required command entry: ${requiredName}`);
    }
  }
}

if (!config.release || typeof config.release !== "object") {
  failures.push("delivery.config.json release object is required");
} else {
  if (
    typeof config.release.artifactPath !== "string" ||
    config.release.artifactPath.trim().length === 0
  ) {
    failures.push("release.artifactPath must be a non-empty string");
  }

  if (
    typeof config.release.stagingEnvironment !== "string" ||
    config.release.stagingEnvironment.trim().length === 0
  ) {
    failures.push("release.stagingEnvironment must be a non-empty string");
  }

  if (
    typeof config.release.productionEnvironment !== "string" ||
    config.release.productionEnvironment.trim().length === 0
  ) {
    failures.push("release.productionEnvironment must be a non-empty string");
  }

  if (config.release.requireImmutableDigest !== true) {
    failures.push("release.requireImmutableDigest must be true");
  }

  if (config.release.rebuildOnPromotion !== false) {
    failures.push("release.rebuildOnPromotion must be false");
  }
}

if (failures.length > 0) {
  console.error("delivery.config.json validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Validated ${configPath}`);
