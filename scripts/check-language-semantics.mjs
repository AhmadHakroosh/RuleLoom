import { readFile } from "node:fs/promises";

const fixturePath =
  process.argv[2] ?? "tests/fixtures/conformance/language-semantics-v1.json";
const specPath = "docs/specification/language-semantics-v1.md";
const validOutcomes = new Set([
  "matched",
  "notMatched",
  "indeterminate",
  "error",
]);
const requiredPropagationCases = {
  all: new Map([
    ["empty", "matched"],
    ["hasNotMatched", "notMatched"],
    ["hasError", "error"],
    ["hasIndeterminate", "indeterminate"],
    ["allMatched", "matched"],
  ]),
  any: new Map([
    ["empty", "notMatched"],
    ["hasMatched", "matched"],
    ["hasError", "error"],
    ["hasIndeterminate", "indeterminate"],
    ["allNotMatched", "notMatched"],
  ]),
  not: new Map([
    ["matched", "notMatched"],
    ["notMatched", "matched"],
    ["indeterminate", "indeterminate"],
    ["error", "error"],
  ]),
};
const requiredExampleIds = new Set([
  "EX-LITERAL-001",
  "EX-FACT-001",
  "EX-MISSING-FACT-001",
  "EX-MISSING-PATH-001",
  "EX-NULL-001",
  "EX-PARAMETER-001",
  "EX-ALL-001",
  "EX-EMPTY-ALL-001",
  "EX-SHORT-CIRCUIT-ALL-001",
  "EX-ANY-001",
  "EX-EMPTY-ANY-001",
  "EX-SHORT-CIRCUIT-ANY-001",
  "EX-NOT-001",
  "EX-EQ-001",
  "EX-EQ-TYPE-001",
  "EX-NUMERIC-001",
  "EX-NUMERIC-TYPE-001",
  "EX-IN-001",
  "EX-IN-TYPE-001",
  "EX-OBJECT-EQ-001",
  "EX-OPERATOR-ERROR-001",
  "EX-RESOLVER-ERROR-001",
  "EX-ACTION-ORDER-001",
  "EX-RULE-ORDER-001",
  "EX-UNKNOWN-REQUIRED-EXTENSION-001",
  "EX-UNKNOWN-OPTIONAL-EXTENSION-001",
]);
const failures = [];

function requireString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    failures.push(`${label} must be a non-empty string`);
  }
}

function validateExpected(expected, label) {
  if (!expected || typeof expected !== "object") {
    failures.push(`${label}.expected must be an object`);
    return;
  }

  if (!validOutcomes.has(expected.outcome)) {
    failures.push(`${label}.expected.outcome is invalid: ${expected.outcome}`);
  }
}

function validatePropagationTable(name, rows) {
  if (!Array.isArray(rows)) {
    failures.push(`propagationTables.${name} must be an array`);
    return;
  }

  const expectedCases = requiredPropagationCases[name];
  const seenCases = new Set();

  for (const row of rows) {
    if (!row || typeof row !== "object") {
      failures.push(`propagationTables.${name} entries must be objects`);
      continue;
    }

    if (typeof row.case !== "string") {
      failures.push(`propagationTables.${name} row is missing case`);
      continue;
    }

    seenCases.add(row.case);

    const expectedResult = expectedCases.get(row.case);
    if (expectedResult === undefined) {
      failures.push(
        `propagationTables.${name} has unexpected case: ${row.case}`,
      );
    } else if (row.result !== expectedResult) {
      failures.push(
        `propagationTables.${name}.${row.case} must result in ${expectedResult}`,
      );
    }
  }

  for (const requiredCase of expectedCases.keys()) {
    if (!seenCases.has(requiredCase)) {
      failures.push(`propagationTables.${name} missing case: ${requiredCase}`);
    }
  }
}

function validateExamples(examples, specText) {
  if (!Array.isArray(examples)) {
    failures.push("examples must be an array");
    return;
  }

  const seenIds = new Set();

  for (const example of examples) {
    if (!example || typeof example !== "object") {
      failures.push("examples entries must be objects");
      continue;
    }

    requireString(example.id, "example.id");
    requireString(example.category, `${example.id}.category`);
    validateExpected(example.expected, example.id);

    if (seenIds.has(example.id)) {
      failures.push(`duplicate example id: ${example.id}`);
    }
    seenIds.add(example.id);

    if (!specText.includes(example.id)) {
      failures.push(`spec does not reference fixture example: ${example.id}`);
    }
  }

  for (const requiredId of requiredExampleIds) {
    if (!seenIds.has(requiredId)) {
      failures.push(`missing required example: ${requiredId}`);
    }
  }
}

const [fixtureText, specText] = await Promise.all([
  readFile(fixturePath, "utf8"),
  readFile(specPath, "utf8"),
]);
const fixture = JSON.parse(fixtureText);

if (fixture.schemaVersion !== "1.0") {
  failures.push("schemaVersion must be 1.0");
}

if (fixture.specRef !== specPath) {
  failures.push(`specRef must be ${specPath}`);
}

if (fixture.rfcRef !== "docs/rfcs/RL-010-language-semantics.md") {
  failures.push("rfcRef must reference the RL-010 RFC");
}

for (const name of Object.keys(requiredPropagationCases)) {
  validatePropagationTable(name, fixture.propagationTables?.[name]);
}

validateExamples(fixture.examples, specText);

if (
  /MUST\s+(?:use|depend on|derive[^.]+from)\s+JavaScript\s+(?:truthiness|coercion|object identity)/iu.test(
    specText,
  )
) {
  failures.push(
    "spec must not depend on JavaScript truthiness, coercion, or object identity",
  );
}

if (failures.length > 0) {
  console.error("Language semantics validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Validated ${fixture.examples.length} language semantics examples`);
