import { execFileSync } from "node:child_process";
import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function runAgentCheck(args: string[] = []) {
  return execFileSync(
    process.execPath,
    ["scripts/check-agent-definitions.mjs", ...args],
    {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: "pipe",
    },
  );
}

async function copyAgentFixture() {
  const tempDir = await mkdtemp(join(tmpdir(), "ruleloom-agents-"));
  const agentsDir = join(tempDir, "agents");
  await cp(join(repoRoot, ".github", "agents"), agentsDir, { recursive: true });
  return agentsDir;
}

describe("agent definition validation", () => {
  it("accepts the repository agent definitions", () => {
    expect(runAgentCheck()).toContain("Validated 14 agent definitions");
  });

  it("rejects malformed agent frontmatter", async () => {
    const agentsDir = await copyAgentFixture();
    await writeFile(
      join(agentsDir, "delivery-orchestrator.agent.md"),
      "# Missing frontmatter\n\nThis file is not discoverable as a custom agent.\n",
    );

    expect(() => runAgentCheck([agentsDir])).toThrow();
  });

  it("rejects prohibited authority grants", async () => {
    const agentsDir = await copyAgentFixture();
    const agentPath = join(agentsDir, "delivery-orchestrator.agent.md");
    const content = await readFile(agentPath, "utf8");

    await writeFile(
      agentPath,
      `${content}\nThe agent may merge pull requests after checks pass.\n`,
    );

    expect(() => runAgentCheck([agentsDir])).toThrow();
  });

  it("rejects read-only agents with edit access", async () => {
    const agentsDir = await copyAgentFixture();
    const agentPath = join(agentsDir, "independent-reviewer.agent.md");
    const content = await readFile(agentPath, "utf8");

    await writeFile(
      agentPath,
      content.replace(
        "tools: [agent, read, search, execute]",
        "tools: [agent, read, search, edit, execute]",
      ),
    );

    expect(() => runAgentCheck([agentsDir])).toThrow();
  });

  it("rejects placeholder check instructions", async () => {
    const agentsDir = await copyAgentFixture();
    const agentPath = join(agentsDir, "builder-coordinator.agent.md");
    const content = await readFile(agentPath, "utf8");

    await writeFile(
      agentPath,
      `${content}\nUse echo ok when checks are unavailable.\n`,
    );

    expect(() => runAgentCheck([agentsDir])).toThrow();
  });

  it("rejects unsupported tool names", async () => {
    const agentsDir = await copyAgentFixture();
    const agentPath = join(agentsDir, "pr-coordinator.agent.md");
    const content = await readFile(agentPath, "utf8");

    await writeFile(
      agentPath,
      content.replace("browser]", "browser, unknown-tool]"),
    );

    expect(() => runAgentCheck([agentsDir])).toThrow();
  });

  it("rejects unknown subagent references", async () => {
    const agentsDir = await copyAgentFixture();
    const agentPath = join(agentsDir, "delivery-orchestrator.agent.md");
    const content = await readFile(agentPath, "utf8");

    await writeFile(
      agentPath,
      content.replace("CI Investigator", "Unknown Investigator"),
    );

    expect(() => runAgentCheck([agentsDir])).toThrow();
  });

  it("rejects invocable specialist agents", async () => {
    const agentsDir = await copyAgentFixture();
    const agentPath = join(agentsDir, "clean-code-specialist.agent.md");
    const content = await readFile(agentPath, "utf8");

    await writeFile(
      agentPath,
      content.replace("user-invocable: false", "user-invocable: true"),
    );

    expect(() => runAgentCheck([agentsDir])).toThrow();
  });
});
