import { readFile } from "node:fs/promises";

const manifestPath =
  process.argv[2] ?? "tests/fixtures/conformance/language-semantics-v1.json";
const schemaPath = "contracts/schemas/conformance-manifest-v1.schema.json";
const specPath = "docs/specification/language-semantics-v1.md";
const failures = [];
const fixtureKeys = new Set([
  "id",
  "category",
  "support",
  "sourceDocument",
  "input",
  "expected",
  "traceAssertions",
  "normativeRefs",
]);
const manifestKeys = new Set([
  "manifestVersion",
  "languageVersion",
  "normativeRefs",
  "registryContract",
  "fixtures",
]);
const requiredIds = new Set([
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
const outcomes = new Set(["matched", "notMatched", "indeterminate", "error"]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function keys(value, allowed, path) {
  if (!isObject(value)) {
    failures.push(`${path} must be an object`);
    return;
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) failures.push(`${path} has unknown field: ${key}`);
  }
}

function validateFixture(fixture, index, refs) {
  const path = `fixtures[${index}]`;
  keys(fixture, fixtureKeys, path);
  if (
    typeof fixture.id !== "string" ||
    !/^[A-Z][A-Z0-9-]{2,127}$/u.test(fixture.id)
  ) {
    failures.push(`${path}.id must be a valid fixture identifier`);
  }
  if (
    !Array.isArray(fixture.support) ||
    fixture.support.some(
      (stage) => !["schema", "compile", "evaluate"].includes(stage),
    )
  ) {
    failures.push(
      `${path}.support must contain only schema, compile, or evaluate`,
    );
  }
  if (
    !isObject(fixture.input) ||
    !Object.hasOwn(fixture.input, "facts") ||
    !Object.hasOwn(fixture.input, "parameters")
  ) {
    failures.push(`${fixture.id}.input must contain facts and parameters`);
  } else {
    keys(fixture.input, new Set(["facts", "parameters"]), `${path}.input`);
  }
  keys(
    fixture.expected,
    new Set(["actions", "diagnostics", "outcome", "results", "state", "value"]),
    `${path}.expected`,
  );
  if (!isObject(fixture.expected) || !outcomes.has(fixture.expected.outcome)) {
    failures.push(`${fixture.id}.expected.outcome is invalid`);
  }
  for (const ref of fixture.normativeRefs ?? []) {
    if (!refs.has(ref))
      failures.push(`${fixture.id} references unknown normative ref: ${ref}`);
  }
  if (
    fixture.normativeRefs !== undefined &&
    !Array.isArray(fixture.normativeRefs)
  )
    failures.push(`${fixture.id}.normativeRefs must be an array`);
}

function validatePortable(value, path = "manifest") {
  if (typeof value === "string") {
    if (
      /\b(?:wall[- ]?clock|random|network|locale|machine[- ]specific|async completion|promise|process\.cwd|[A-Za-z]:\\|^\/Users\/|^\/home\/|^\/tmp\/)/iu.test(
        value,
      )
    ) {
      failures.push(`${path} contains a non-portable dependency`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      validatePortable(entry, `${path}[${index}]`),
    );
  } else if (isObject(value)) {
    Object.entries(value).forEach(([key, entry]) =>
      validatePortable(entry, `${path}.${key}`),
    );
  }
}

function checkCanonicalKeys(value, path = "manifest") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      checkCanonicalKeys(entry, `${path}[${index}]`),
    );
  } else if (isObject(value)) {
    const actual = Object.keys(value);
    const expected = actual.toSorted();
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      failures.push(`${path} must use canonical key ordering`);
    Object.entries(value).forEach(([key, entry]) =>
      checkCanonicalKeys(entry, `${path}.${key}`),
    );
  }
}

const [manifestText, schemaText, specText] = await Promise.all([
  readFile(manifestPath, "utf8"),
  readFile(schemaPath, "utf8"),
  readFile(specPath, "utf8"),
]);
let manifest;
let schema;
try {
  manifest = JSON.parse(manifestText);
} catch (error) {
  failures.push(`manifest is not valid JSON: ${error.message}`);
}
try {
  schema = JSON.parse(schemaText);
  if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema")
    failures.push("schema must declare Draft 2020-12");
} catch (error) {
  failures.push(`conformance schema is not valid JSON: ${error.message}`);
}

if (manifest) {
  keys(manifest, manifestKeys, "manifest");
  if (manifest.manifestVersion !== "1.0.0")
    failures.push("manifestVersion must be 1.0.0");
  if (manifest.languageVersion !== "1.0")
    failures.push("languageVersion must be 1.0");
  const fixtures = Array.isArray(manifest.fixtures) ? manifest.fixtures : [];
  const seen = new Set();
  for (const fixture of fixtures) {
    if (isObject(fixture) && seen.has(fixture.id))
      failures.push(`duplicate fixture id: ${fixture.id}`);
    if (isObject(fixture)) seen.add(fixture.id);
  }
  const refs = new Set();
  for (const ref of Array.isArray(manifest.normativeRefs)
    ? manifest.normativeRefs
    : []) {
    keys(ref, new Set(["clause", "fixtureIds", "id"]), "normativeRefs entry");
    if (!isObject(ref) || typeof ref.id !== "string")
      failures.push("normativeRefs entries must have an id");
    else {
      if (refs.has(ref.id)) failures.push(`duplicate normative ref: ${ref.id}`);
      refs.add(ref.id);
      if (!Array.isArray(ref.fixtureIds) || ref.fixtureIds.length === 0)
        failures.push(`${ref.id} must map to fixture IDs`);
      if (!specText.includes(ref.fixtureIds?.[0] ?? ""))
        failures.push(
          `${ref.id} must map to an RL-010 example referenced by the spec`,
        );
    }
  }
  keys(
    manifest.registryContract,
    new Set(["extensions", "operators"]),
    "registryContract",
  );
  const fixtureIds = new Set(fixtures.map((fixture) => fixture?.id));
  for (const ref of Array.isArray(manifest.normativeRefs)
    ? manifest.normativeRefs
    : []) {
    for (const fixtureId of ref.fixtureIds ?? [])
      if (!fixtureIds.has(fixtureId))
        failures.push(`${ref.id} references missing fixture: ${fixtureId}`);
  }
  for (const fixture of fixtures)
    validateFixture(fixture, fixtures.indexOf(fixture), refs);
  for (const id of requiredIds)
    if (!fixtureIds.has(id))
      failures.push(`missing required RL-010 fixture: ${id}`);
  for (const id of requiredIds)
    if (!manifest.normativeRefs?.some((ref) => ref.fixtureIds.includes(id)))
      failures.push(`RL-010 fixture is not traceable: ${id}`);
  validatePortable(manifest);
  checkCanonicalKeys(manifest);
}

if (failures.length) {
  console.error("Conformance manifest validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(
  `Validated ${manifest.fixtures.length} conformance fixtures and ${manifest.normativeRefs.length} normative references`,
);
