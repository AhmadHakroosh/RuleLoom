import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseDocument } from "yaml";

const agentsDirectory = process.argv[2] ?? ".github/agents";
const expectedAgents = new Set([
  "builder-coordinator.agent.md",
  "ci-investigator.agent.md",
  "clean-code-specialist.agent.md",
  "correctness-reviewer.agent.md",
  "delivery-orchestrator.agent.md",
  "independent-reviewer.agent.md",
  "infrastructure-specialist.agent.md",
  "microservices-specialist.agent.md",
  "pr-coordinator.agent.md",
  "reliability-reviewer.agent.md",
  "requirements-analyst.agent.md",
  "scale-specialist.agent.md",
  "security-reviewer.agent.md",
  "solution-architect.agent.md",
]);
const expectedAgentNames = new Map([
  ["builder-coordinator.agent.md", "Builder Coordinator"],
  ["ci-investigator.agent.md", "CI Investigator"],
  ["clean-code-specialist.agent.md", "Clean Code Specialist"],
  ["correctness-reviewer.agent.md", "Correctness Reviewer"],
  ["delivery-orchestrator.agent.md", "Delivery Orchestrator"],
  ["independent-reviewer.agent.md", "Independent Reviewer"],
  ["infrastructure-specialist.agent.md", "Infrastructure Specialist"],
  ["microservices-specialist.agent.md", "Microservices Specialist"],
  ["pr-coordinator.agent.md", "PR Coordinator"],
  ["reliability-reviewer.agent.md", "Reliability Reviewer"],
  ["requirements-analyst.agent.md", "Requirements Analyst"],
  ["scale-specialist.agent.md", "Scale Specialist"],
  ["security-reviewer.agent.md", "Security Reviewer"],
  ["solution-architect.agent.md", "Solution Architect"],
]);
const expectedSubagentNames = new Set(expectedAgentNames.values());
const readOnlyAgentPattern =
  /(?:analyst|architect|reviewer|investigator|specialist)\.agent\.md$/u;
const prohibitedGrantPatterns = [
  /\b(?:may|can|allowed to|authorized to)\s+(?:approve|merge|deploy|bypass|request credentials|use credentials)\b/iu,
  /\b(?:may|can|allowed to|authorized to)\s+push\s+(?:to\s+)?protected\b/iu,
];
const placeholderPatterns = [/\becho\s+ok\b/iu, /\btrue\b/iu, /\bexit\s+0\b/iu];
const supportedTools = new Set([
  "agent",
  "browser",
  "edit",
  "execute",
  "read",
  "search",
  "todo",
  "web",
]);
const failures = [];

function extractFrontmatter(content, filePath) {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/u.exec(content);
  if (!match) {
    failures.push(`${filePath}: missing YAML frontmatter`);
    return undefined;
  }

  const document = parseDocument(match[1]);
  if (document.errors.length > 0) {
    failures.push(`${filePath}: invalid YAML frontmatter`);
    return undefined;
  }

  return { metadata: document.toJSON(), body: match[2] };
}

function validateTools(filePath, metadata) {
  if (!Array.isArray(metadata.tools) || metadata.tools.length === 0) {
    failures.push(`${filePath}: tools must be a non-empty array`);
    return;
  }

  for (const tool of metadata.tools) {
    if (typeof tool !== "string" || !supportedTools.has(tool)) {
      failures.push(`${filePath}: unsupported tool: ${String(tool)}`);
    }
  }

  if (readOnlyAgentPattern.test(filePath) && metadata.tools.includes("edit")) {
    failures.push(
      `${filePath}: read-only agents must not include the edit tool`,
    );
  }
}

function validateSubagents(filePath, metadata) {
  if (metadata.agents === undefined) {
    return;
  }

  if (!Array.isArray(metadata.agents)) {
    failures.push(`${filePath}: agents must be an array when present`);
    return;
  }

  for (const agentName of metadata.agents) {
    if (
      typeof agentName !== "string" ||
      !expectedSubagentNames.has(agentName)
    ) {
      failures.push(`${filePath}: unknown subagent reference: ${agentName}`);
    }
  }
}

function validateRequiredText(filePath, body) {
  for (const requiredText of [
    "AGENTS.md",
    "untrusted input",
    "Human gates",
    "Authority boundary",
  ]) {
    if (!body.includes(requiredText)) {
      failures.push(
        `${filePath}: missing required instruction text: ${requiredText}`,
      );
    }
  }

  if (prohibitedGrantPatterns.some((pattern) => pattern.test(body))) {
    failures.push(
      `${filePath}: grants prohibited approval, merge, deployment, bypass, or credential authority`,
    );
  }

  if (placeholderPatterns.some((pattern) => pattern.test(body))) {
    failures.push(`${filePath}: references placeholder check behavior`);
  }
}

function validateMetadata(filePath, metadata) {
  if (!metadata || typeof metadata !== "object") {
    failures.push(`${filePath}: frontmatter must be an object`);
    return;
  }

  if (typeof metadata.name !== "string" || metadata.name.trim().length === 0) {
    failures.push(`${filePath}: name is required`);
  } else if (metadata.name !== expectedAgentNames.get(filePath)) {
    failures.push(`${filePath}: name must match the expected agent name`);
  }

  if (
    typeof metadata.description !== "string" ||
    metadata.description.trim().length === 0
  ) {
    failures.push(`${filePath}: description is required`);
  }

  validateTools(filePath, metadata);
  validateSubagents(filePath, metadata);

  if (
    filePath !== "delivery-orchestrator.agent.md" &&
    metadata["user-invocable"] !== false
  ) {
    failures.push(
      `${filePath}: non-orchestrator agents must set user-invocable: false`,
    );
  }
}

async function validateAgent(filePath) {
  const content = await readFile(join(agentsDirectory, filePath), "utf8");
  const parsed = extractFrontmatter(content, filePath);
  if (!parsed) {
    return;
  }

  validateMetadata(filePath, parsed.metadata);
  validateRequiredText(filePath, parsed.body);
}

const entries = await readdir(agentsDirectory);
const agentFiles = entries
  .filter((entry) => entry.endsWith(".agent.md"))
  .toSorted();

for (const expectedAgent of expectedAgents) {
  if (!agentFiles.includes(expectedAgent)) {
    failures.push(`${expectedAgent}: required agent definition is missing`);
  }
}

for (const agentFile of agentFiles) {
  if (!expectedAgents.has(agentFile)) {
    failures.push(`${agentFile}: unexpected agent definition`);
    continue;
  }
  await validateAgent(agentFile);
}

if (failures.length > 0) {
  console.error("Agent definition validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Validated ${agentFiles.length} agent definitions`);
