import {
  ruleLoomLanguageVersion,
  ruleLoomV1Schema,
  ruleLoomV1SchemaFeatures,
  ruleLoomV1SchemaId,
  validateRuleSetDocument,
} from "../packages/schema/dist/index.js";

const failures = [];
const requiredDefinitions = [
  "rule",
  "action",
  "expression",
  "literalExpression",
  "factReferenceExpression",
  "parameterReferenceExpression",
  "localReferenceExpression",
  "operatorCallExpression",
  "extensionExpression",
];
const requiredOperators = [
  "all",
  "any",
  "not",
  "eq",
  "lt",
  "lte",
  "gt",
  "gte",
  "in",
];
const requiredForms = ["literal", "fact", "parameter", "local", "extension"];

function fail(message) {
  failures.push(message);
}

if (
  ruleLoomV1Schema.$schema !== "https://json-schema.org/draft/2020-12/schema"
) {
  fail("ruleLoomV1Schema must declare JSON Schema Draft 2020-12");
}

if (ruleLoomV1Schema.$id !== ruleLoomV1SchemaId) {
  fail("ruleLoomV1Schema.$id must match ruleLoomV1SchemaId");
}

if (
  ruleLoomV1Schema.properties.schemaVersion.const !== ruleLoomLanguageVersion
) {
  fail("schemaVersion const must match ruleLoomLanguageVersion");
}

for (const definition of requiredDefinitions) {
  if (!(definition in ruleLoomV1Schema.$defs)) {
    fail(`missing schema definition: ${definition}`);
  }
}

for (const form of requiredForms) {
  if (!ruleLoomV1SchemaFeatures.expressionForms.includes(form)) {
    fail(`missing expression form feature: ${form}`);
  }
}

for (const operator of requiredOperators) {
  if (!ruleLoomV1SchemaFeatures.operators.includes(operator)) {
    fail(`missing operator feature: ${operator}`);
  }
  if (!(operator in ruleLoomV1Schema.$defs.operatorCallExpression.properties)) {
    fail(`missing operator schema property: ${operator}`);
  }
}

const smokeInvalid = validateRuleSetDocument({
  schemaVersion: "1.0",
  id: "driftSmoke",
  rules: [{ id: "bad", when: { eq: [{ literal: 1 }] } }],
});

if (smokeInvalid.valid) {
  fail("validator must reject invalid binary operator arity");
}

if (failures.length > 0) {
  console.error("Schema drift validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Validated RuleLoom schema/type drift anchors");
