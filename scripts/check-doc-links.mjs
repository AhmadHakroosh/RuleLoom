import { access, readdir, readFile } from "node:fs/promises";
import {
  dirname,
  extname,
  join,
  normalize,
  relative,
  resolve,
  sep,
} from "node:path";

const repoRoot = process.cwd();
const ignoredDirectories = new Set([
  "node_modules",
  "coverage",
  "reports",
  ".git",
  ".delivery",
]);
const markdownLinkPattern =
  /!?(?:\[[^\]\n]*(?:\][^[\]\n]*)*\])\(([^)\s]+)(?:\s+"[^"]*")?\)/gu;

const explicitFiles = process.argv.slice(2);

async function collectMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) {
        continue;
      }
      files.push(...(await collectMarkdownFiles(join(directory, entry.name))));
      continue;
    }

    if (entry.isFile() && extname(entry.name) === ".md") {
      files.push(join(directory, entry.name));
    }
  }

  return files;
}

function withoutFencedCode(content) {
  return content.replace(/^```[\s\S]*?^```/gmu, "");
}

function isExternalTarget(target) {
  return /^[a-z][a-z0-9+.-]*:/iu.test(target);
}

function validateExternalTarget(target, sourceFile, failures) {
  try {
    const parsedUrl = new URL(target);
    if (!["http:", "https:", "mailto:"].includes(parsedUrl.protocol)) {
      failures.push(`${sourceFile}: unsupported link protocol: ${target}`);
    }
  } catch {
    failures.push(`${sourceFile}: invalid external link: ${target}`);
  }
}

async function validateLocalTarget(target, sourceFile, failures) {
  const [pathPart] = target.split("#");
  if (!pathPart) {
    return;
  }

  const decodedPath = decodeURIComponent(pathPart);
  const absoluteTarget = normalize(
    resolve(dirname(join(repoRoot, sourceFile)), decodedPath),
  );
  const relativeTarget = relative(repoRoot, absoluteTarget);

  if (
    relativeTarget.startsWith("..") ||
    relativeTarget.split(sep).includes("..")
  ) {
    failures.push(`${sourceFile}: link leaves repository: ${target}`);
    return;
  }

  try {
    await access(absoluteTarget);
  } catch {
    failures.push(`${sourceFile}: broken local link: ${target}`);
  }
}

async function validateFile(filePath, failures) {
  const sourceFile = relative(repoRoot, resolve(filePath));
  const content = withoutFencedCode(await readFile(filePath, "utf8"));
  const matches = content.matchAll(markdownLinkPattern);

  for (const match of matches) {
    const target = match[1].trim();
    if (target.length === 0) {
      failures.push(`${sourceFile}: empty link target`);
      continue;
    }

    if (isExternalTarget(target)) {
      validateExternalTarget(target, sourceFile, failures);
      continue;
    }

    await validateLocalTarget(target, sourceFile, failures);
  }
}

const files =
  explicitFiles.length > 0
    ? explicitFiles.map((file) => resolve(file))
    : await collectMarkdownFiles(repoRoot);
const failures = [];

for (const file of files) {
  await validateFile(file, failures);
}

if (failures.length > 0) {
  console.error("Documentation link validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Validated links in ${files.length} Markdown files`);
