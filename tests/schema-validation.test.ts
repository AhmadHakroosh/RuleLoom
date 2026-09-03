import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ruleLoomLanguageVersion,
  ruleLoomV1Schema,
  ruleLoomV1SchemaFeatures,
  ruleLoomV1SchemaId,
  validateRuleSetDocument,
} from "@ruleloom/schema";

const repoRoot = process.cwd();

async function readJson(path: string) {
  return JSON.parse(await readFile(join(repoRoot, path), "utf8"));
}

function wrapExpression(id: string, expression: unknown) {
  return {
    schemaVersion: ruleLoomLanguageVersion,
    id: `wrapped${id.replaceAll("-", "")}`,
    rules: [{ id: "example", when: expression }],
  };
}

function wrapRuleSetExample(id: string, ruleSet: { rules?: unknown }) {
  return {
    schemaVersion: ruleLoomLanguageVersion,
    id: `wrapped${id.replaceAll("-", "")}`,
    rules: ruleSet.rules ?? [],
  };
}

describe("RuleLoom schema validation", () => {
  it("keeps legacy diagnostics arrays free of enumerable metadata", () => {
    const result = validateRuleSetDocument({});
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(Object.keys(result.diagnostics)).toEqual([
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
      ]);
    }
  });

  it("exports a stable Draft 2020-12 schema", () => {
    expect(ruleLoomV1Schema.$schema).toBe(
      "https://json-schema.org/draft/2020-12/schema",
    );
    expect(ruleLoomV1Schema.$id).toBe(ruleLoomV1SchemaId);
    expect(ruleLoomV1Schema.properties.schemaVersion.const).toBe(
      ruleLoomLanguageVersion,
    );
    expect(ruleLoomV1SchemaFeatures.operators).toContain("eq");
  });

  it("accepts a valid rule set covering canonical schema variants", async () => {
    const ruleSet = await readJson("tests/fixtures/schema/valid-rule-set.json");
    const result = validateRuleSetDocument(ruleSet);

    expect(result).toEqual({ valid: true, value: ruleSet, diagnostics: [] });
  });

  it("rejects unknown fields with stable diagnostics", async () => {
    const ruleSet = await readJson(
      "tests/fixtures/schema/invalid-unknown-field.json",
    );
    const result = validateRuleSetDocument(ruleSet);

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "RL_SCHEMA_UNKNOWN_FIELD",
        path: "/rules/0/unexpected",
        expected: expect.stringContaining("id"),
      }),
    );
  });

  it("rejects invalid operator boundaries", async () => {
    const ruleSet = await readJson(
      "tests/fixtures/schema/invalid-operator-arity.json",
    );
    const result = validateRuleSetDocument(ruleSet);

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "RL_SCHEMA_TYPE",
        path: "/rules/0/when/eq",
      }),
    );
  });

  it("rejects prototype-pollution keys", async () => {
    const ruleSet = await readJson(
      "tests/fixtures/schema/invalid-prototype-key.json",
    );
    const result = validateRuleSetDocument(ruleSet);

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "RL_SCHEMA_PROTOTYPE_KEY",
        path: "/metadata/constructor",
      }),
    );
  });

  it("rejects missing required properties", async () => {
    const ruleSet = await readJson(
      "tests/fixtures/schema/invalid-missing-required.json",
    );
    const result = validateRuleSetDocument(ruleSet);

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "RL_SCHEMA_REQUIRED",
        path: "/rules",
      }),
    );
  });

  it("rejects unsupported schema versions", async () => {
    const ruleSet = await readJson(
      "tests/fixtures/schema/invalid-version.json",
    );
    const result = validateRuleSetDocument(ruleSet);

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "RL_SCHEMA_INVALID_VERSION",
        path: "/schemaVersion",
      }),
    );
  });

  it("rejects invalid JSON Pointer paths", async () => {
    const ruleSet = await readJson(
      "tests/fixtures/schema/invalid-pointer.json",
    );
    const result = validateRuleSetDocument(ruleSet);

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "RL_SCHEMA_INVALID_POINTER",
        path: "/rules/0/when/path",
      }),
    );
  });

  it("validates every expression-shaped RL-010 normative example", async () => {
    const conformance = await readJson(
      "tests/fixtures/conformance/language-semantics-v1.json",
    );
    const expressionExamples = conformance.fixtures.filter(
      (example: {
        normativeRefs?: unknown[];
        sourceDocument?: { expression?: unknown };
      }) =>
        example.normativeRefs?.length &&
        example.sourceDocument?.expression !== undefined,
    );

    for (const example of expressionExamples) {
      const result = validateRuleSetDocument(
        wrapExpression(example.id, example.sourceDocument.expression),
      );
      expect(result.diagnostics, example.id).toEqual([]);
      expect(result.valid, example.id).toBe(true);
    }
  });

  it("validates every rule-set-shaped RL-010 normative example when wrapped as a document", async () => {
    const conformance = await readJson(
      "tests/fixtures/conformance/language-semantics-v1.json",
    );
    const ruleSetExamples = conformance.fixtures.filter(
      (example: {
        normativeRefs?: unknown[];
        sourceDocument?: { ruleSet?: unknown };
      }) =>
        example.normativeRefs?.length &&
        example.sourceDocument?.ruleSet !== undefined,
    );

    for (const example of ruleSetExamples) {
      const result = validateRuleSetDocument(
        wrapRuleSetExample(example.id, example.sourceDocument.ruleSet),
      );
      expect(result.diagnostics, example.id).toEqual([]);
      expect(result.valid, example.id).toBe(true);
    }
  });
});
