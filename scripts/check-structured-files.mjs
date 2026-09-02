import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";

const files = process.argv.slice(2);

for (const file of files) {
  const content = await readFile(file, "utf8");

  if (file.endsWith(".json")) {
    JSON.parse(content);
    continue;
  }

  if (file.endsWith(".yaml") || file.endsWith(".yml")) {
    parseYaml(content, { prettyErrors: true });
  }
}
