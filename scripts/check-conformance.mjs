import { readFile } from "node:fs/promises";
import {
  isCompilerStructuralFixture,
  runCompilerStructuralFixture,
} from "./compiler-conformance-adapter.ts";

const manifestPath =
  process.argv[2] ?? "tests/fixtures/conformance/language-semantics-v1.json";
const schemaPath = "contracts/schemas/conformance-manifest-v1.schema.json";
const specPath = "docs/specification/language-semantics-v1.md";
const failures = [];
const manifestKeys = new Set([
  "manifestVersion",
  "languageVersion",
  "normativeRefs",
  "registryContract",
  "fixtures",
]);
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
const identifierPattern = /^[A-Z][A-Z0-9-]{2,127}$/u;
const normativeIdPattern = /^RL-010-[A-Z0-9-]+$/u;
const diagnosticCodePattern = /^RL_[A-Z0-9_]+$/u;
const pointerPattern = /^(?:$|\/(?:[^/~]|~0|~1)*)*$/u;
const supportStages = new Set(["schema", "compile", "evaluate"]);
const outcomes = new Set(["matched", "notMatched", "indeterminate", "error"]);
const pollutionKeys = new Set(["__proto__", "constructor", "prototype"]);

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

function validateJsonValue(value, path) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) failures.push(`${path} must be a JSON number`);
    return;
  }
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      validateJsonValue(entry, `${path}[${index}]`),
    );
    return;
  }
  if (isObject(value)) {
    for (const [key, entry] of Object.entries(value)) {
      if (pollutionKeys.has(key))
        failures.push(`${path} contains forbidden key: ${key}`);
      validateJsonValue(entry, `${path}.${key}`);
    }
    return;
  }
  failures.push(`${path} must be a JSON value`);
}

function validateString(value, path, { minLength = 0, pattern } = {}) {
  if (typeof value !== "string") failures.push(`${path} must be a string`);
  else {
    if (value.length < minLength) failures.push(`${path} must not be empty`);
    if (pattern && !pattern.test(value))
      failures.push(`${path} has an invalid format`);
  }
}

function validateArray(
  value,
  path,
  validator,
  { unique = false, minItems = 0 } = {},
) {
  if (!Array.isArray(value)) {
    failures.push(`${path} must be an array`);
    return;
  }
  if (value.length < minItems) failures.push(`${path} must not be empty`);
  const serialized = new Set();
  value.forEach((entry, index) => {
    if (unique) {
      const key = JSON.stringify(entry);
      if (serialized.has(key))
        failures.push(`${path} must not contain duplicates`);
      serialized.add(key);
    }
    validator(entry, `${path}[${index}]`);
  });
}

function validateDiagnostic(value, path) {
  keys(value, new Set(["code", "path", "severity", "message"]), path);
  if (!isObject(value)) return;
  validateString(value.code, `${path}.code`, {
    pattern: diagnosticCodePattern,
  });
  if (value.path !== undefined)
    validateString(value.path, `${path}.path`, { pattern: pointerPattern });
  if (
    value.severity !== undefined &&
    !["info", "warning", "error"].includes(value.severity)
  )
    failures.push(`${path}.severity has an invalid value`);
  if (value.message !== undefined)
    validateString(value.message, `${path}.message`);
}

function validateExpected(value, path) {
  keys(
    value,
    new Set(["outcome", "state", "value", "results", "actions", "diagnostics"]),
    path,
  );
  if (!isObject(value)) return;
  if (!outcomes.has(value.outcome))
    failures.push(`${path}.outcome has an invalid value`);
  if (value.state !== undefined)
    validateString(value.state, `${path}.state`, { minLength: 1 });
  if (Object.hasOwn(value, "value"))
    validateJsonValue(value.value, `${path}.value`);
  for (const key of ["results", "actions"])
    if (value[key] !== undefined)
      validateArray(value[key], `${path}.${key}`, validateJsonValue);
  if (value.diagnostics !== undefined)
    validateArray(value.diagnostics, `${path}.diagnostics`, validateDiagnostic);
}

function validateFixture(fixture, index, refs) {
  const path = `fixtures[${index}]`;
  keys(fixture, fixtureKeys, path);
  if (!isObject(fixture)) return;
  validateString(fixture.id, `${path}.id`, { pattern: identifierPattern });
  validateString(fixture.category, `${path}.category`, { minLength: 1 });
  validateArray(
    fixture.support,
    `${path}.support`,
    (stage, stagePath) => {
      if (!supportStages.has(stage))
        failures.push(`${stagePath} has an invalid value`);
    },
    { unique: true },
  );
  if (!Object.hasOwn(fixture, "sourceDocument"))
    failures.push(`${path} is missing required field: sourceDocument`);
  else validateJsonValue(fixture.sourceDocument, `${path}.sourceDocument`);
  if (!isObject(fixture.input))
    failures.push(`${path}.input must be an object`);
  else {
    keys(fixture.input, new Set(["facts", "parameters"]), `${path}.input`);
    for (const key of ["facts", "parameters"]) {
      if (!Object.hasOwn(fixture.input, key))
        failures.push(`${path}.input is missing required field: ${key}`);
      else validateJsonValue(fixture.input[key], `${path}.input.${key}`);
    }
  }
  validateExpected(fixture.expected, `${path}.expected`);
  if (fixture.traceAssertions !== undefined)
    validateArray(
      fixture.traceAssertions,
      `${path}.traceAssertions`,
      validateJsonValue,
    );
  if (fixture.normativeRefs !== undefined)
    validateArray(
      fixture.normativeRefs,
      `${path}.normativeRefs`,
      (ref, refPath) =>
        validateString(ref, refPath, { pattern: normativeIdPattern }),
      { unique: true },
    );
  if (Array.isArray(fixture.normativeRefs))
    for (const ref of fixture.normativeRefs)
      if (refs && !refs.has(ref))
        failures.push(`${path} references unknown normative ref: ${ref}`);
}

function validateNormativeRef(ref, index) {
  const path = `normativeRefs[${index}]`;
  keys(ref, new Set(["id", "clause", "fixtureIds"]), path);
  if (!isObject(ref)) return;
  validateString(ref.id, `${path}.id`, { pattern: normativeIdPattern });
  validateString(ref.clause, `${path}.clause`, { minLength: 1 });
  validateArray(
    ref.fixtureIds,
    `${path}.fixtureIds`,
    (fixtureId, fixturePath) => {
      validateString(fixtureId, fixturePath, { pattern: identifierPattern });
    },
    { minItems: 1, unique: true },
  );
}

function validateRegistryContract(value) {
  keys(value, new Set(["operators", "extensions"]), "registryContract");
  if (!isObject(value)) return;
  for (const key of ["operators", "extensions"])
    validateArray(
      value[key],
      `registryContract.${key}`,
      (entry, path) => validateString(entry, path, { minLength: 1 }),
      { unique: true },
    );
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
  if (
    !isObject(schema) ||
    schema.$schema !== "https://json-schema.org/draft/2020-12/schema"
  )
    failures.push("schema must declare Draft 2020-12");
} catch (error) {
  failures.push(`conformance schema is not valid JSON: ${error.message}`);
}

if (isObject(manifest)) {
  keys(manifest, manifestKeys, "manifest");
  if (manifest.manifestVersion !== "1.0.0")
    failures.push("manifestVersion must be 1.0.0");
  if (manifest.languageVersion !== "1.0")
    failures.push("languageVersion must be 1.0");
  validateArray(manifest.normativeRefs, "normativeRefs", validateNormativeRef, {
    minItems: 1,
  });
  validateRegistryContract(manifest.registryContract);
  const fixtures = Array.isArray(manifest.fixtures) ? manifest.fixtures : [];
  if (!Array.isArray(manifest.fixtures))
    failures.push("fixtures must be an array");
  else if (manifest.fixtures.length === 0)
    failures.push("fixtures must not be empty");
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
    if (isObject(ref) && typeof ref.id === "string") {
      if (refs.has(ref.id)) failures.push(`duplicate normative ref: ${ref.id}`);
      refs.add(ref.id);
    }
  }
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
  const specFixtureIds = new Set(specText.match(/\bEX-[A-Z0-9-]+\b/gu) ?? []);
  const mappedFixtureIds = new Set(
    (Array.isArray(manifest.normativeRefs)
      ? manifest.normativeRefs
      : []
    ).flatMap((ref) => (Array.isArray(ref?.fixtureIds) ? ref.fixtureIds : [])),
  );
  for (const id of specFixtureIds) {
    if (!fixtureIds.has(id))
      failures.push(`missing fixture referenced by spec: ${id}`);
    if (!mappedFixtureIds.has(id))
      failures.push(`spec fixture is not traceable: ${id}`);
  }
  for (const id of mappedFixtureIds) {
    if (!fixtureIds.has(id))
      failures.push(`normative mapping references missing fixture: ${id}`);
    if (!specFixtureIds.has(id))
      failures.push(`normative mapping references unknown spec fixture: ${id}`);
  }
  validatePortable(manifest);
  checkCanonicalKeys(manifest);

  const compilerStructuralFixtures = fixtures.filter(
    isCompilerStructuralFixture,
  );
  const compilerStructuralIds = compilerStructuralFixtures.map(
    (fixture) => fixture.id,
  );
  if (
    JSON.stringify(compilerStructuralIds) !==
    JSON.stringify(["EX-INVALID-SHAPE-001"])
  ) {
    failures.push(
      "compiler structural subset must include only EX-INVALID-SHAPE-001",
    );
  }
  const unsafePathFixture = fixtures.find(
    (fixture) => fixture?.id === "EX-UNSAFE-PATH-001",
  );
  if (
    unsafePathFixture === undefined ||
    isCompilerStructuralFixture(unsafePathFixture)
  ) {
    failures.push("compiler structural subset must exclude EX-UNSAFE-PATH-001");
  }
  for (const fixture of compilerStructuralFixtures) {
    const execution = runCompilerStructuralFixture(fixture);
    if (
      execution?.status !== "passed" ||
      !execution.diagnostics?.some(
        (diagnostic) => diagnostic.code === "RL_SCHEMA_TYPE",
      )
    ) {
      failures.push(`${fixture.id} failed compiler structural mapping`);
    }
  }
}

if (failures.length) {
  console.error("Conformance manifest validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
if (!isObject(manifest)) {
  console.error("manifest must be an object");
  process.exit(1);
}
const fixtureCount = Array.isArray(manifest.fixtures)
  ? manifest.fixtures.length
  : 0;
const normativeRefCount = Array.isArray(manifest.normativeRefs)
  ? manifest.normativeRefs.length
  : 0;
console.log(
  `Validated ${fixtureCount} conformance fixtures and ${normativeRefCount} normative references; compiler structural subset passed`,
);
