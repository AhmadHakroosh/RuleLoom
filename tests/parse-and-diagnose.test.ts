import { describe, expect, it } from "vitest";
import {
  parseRuleSetDocument,
  validateRuleSetDocumentInput,
} from "@ruleloom/compiler";
import {
  isCompilerStructuralFixture,
  runCompilerStructuralFixture,
} from "../scripts/compiler-conformance-adapter";

function validDocument() {
  return {
    schemaVersion: "1.0",
    id: "example",
    rules: [{ id: "rule", when: { literal: { value: true } } }],
  };
}

describe("RuleLoom document parsing", () => {
  it("parses valid JSON text into a deeply immutable source model", () => {
    const result = parseRuleSetDocument(JSON.stringify(validDocument()));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.document).toEqual(validDocument());
      expect(Object.isFrozen(result.document)).toBe(true);
      expect(Object.isFrozen(result.document.rules[0]!.when)).toBe(true);
    }
  });

  it("clones unknown input without invoking accessors or freezing caller data", () => {
    const input = validDocument();
    const result = validateRuleSetDocumentInput(input);
    const accessorInput = Object.defineProperty({}, "value", {
      enumerable: true,
      get() {
        throw new Error("accessor must not run");
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      input.rules[0]!.when = { literal: false };
      expect(result.document.rules[0]!.when).toEqual({
        literal: { value: true },
      });
      expect(Object.isFrozen(input)).toBe(false);
    }
    expect(validateRuleSetDocumentInput(accessorInput)).toMatchObject({
      ok: false,
      diagnostics: [{ code: "RL_SCHEMA_TYPE", sourcePointer: "" }],
    });
  });

  it("reports parser and version errors without native parser details", () => {
    expect(parseRuleSetDocument("{")).toEqual({
      ok: false,
      diagnostics: [
        {
          code: "RL_PARSE_JSON_SYNTAX",
          severity: "error",
          message: "Invalid JSON document",
          sourcePointer: "",
        },
      ],
    });
    expect(
      parseRuleSetDocument(
        JSON.stringify({ ...validDocument(), schemaVersion: "2.0" }),
      ),
    ).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: "RL_PARSE_UNSUPPORTED_SCHEMA_VERSION",
          sourcePointer: "/schemaVersion",
        },
      ],
    });
  });

  it("normalizes schema diagnostics in a deterministic pointer order", () => {
    const result = validateRuleSetDocumentInput({
      rules: "invalid",
      extra: true,
    });

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        { code: "RL_SCHEMA_UNKNOWN_FIELD", sourcePointer: "/extra" },
        { code: "RL_SCHEMA_REQUIRED", sourcePointer: "/id" },
        { code: "RL_SCHEMA_INVALID_IDENTIFIER", sourcePointer: "/id" },
        { code: "RL_SCHEMA_TYPE", sourcePointer: "/rules" },
        { code: "RL_SCHEMA_REQUIRED", sourcePointer: "/schemaVersion" },
        { code: "RL_SCHEMA_INVALID_VERSION", sourcePointer: "/schemaVersion" },
      ],
    });
  });

  it("enforces approved limits and rejects invalid option values", () => {
    expect(parseRuleSetDocument("{}", { maxDocumentBytes: 1 })).toMatchObject({
      ok: false,
      diagnostics: [{ code: "RL_PARSE_DOCUMENT_TOO_LARGE" }],
    });
    expect(
      validateRuleSetDocumentInput(validDocument(), { maxNestingDepth: 1 }),
    ).toMatchObject({
      ok: false,
      diagnostics: [{ code: "RL_PARSE_NESTING_TOO_DEEP" }],
    });
    expect(
      validateRuleSetDocumentInput(
        { id: 1, rules: "invalid", extra: true },
        { maxDiagnostics: 1 },
      ),
    ).toEqual({
      ok: false,
      diagnostics: [
        {
          code: "RL_PARSE_DIAGNOSTIC_LIMIT_REACHED",
          severity: "error",
          message: "Diagnostic limit reached",
          sourcePointer: "",
        },
      ],
    });
    expect(() => parseRuleSetDocument("{}", { maxDiagnostics: 0 })).toThrow(
      RangeError,
    );
    expect(() => parseRuleSetDocument("{}", { maxNestingDepth: 257 })).toThrow(
      RangeError,
    );
  });

  it("bounds wide unknown values and structural diagnostic collection", () => {
    const wideValue = Object.fromEntries(
      Array.from({ length: 10_000 }, (_, index) => [`field${index}`, true]),
    );
    const manyInvalidRules = Array.from({ length: 20 }, () => ({}));

    expect(validateRuleSetDocumentInput(wideValue)).toMatchObject({
      ok: false,
      diagnostics: [{ code: "RL_PARSE_NESTING_TOO_DEEP" }],
    });
    const result = validateRuleSetDocumentInput(
      {
        schemaVersion: "1.0",
        id: "example",
        rules: manyInvalidRules,
      },
      { maxDiagnostics: 3 },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics).toHaveLength(3);
      expect(result.diagnostics.at(-1)).toMatchObject({
        code: "RL_PARSE_DIAGNOSTIC_LIMIT_REACHED",
      });
    }
  });

  it("stops proxy property processing at the clone safety budget", () => {
    const keyCount = 100_000;
    const descriptorFailureThreshold = 25_000;
    let descriptorCalls = 0;
    const input = new Proxy(
      {},
      {
        ownKeys() {
          // Proxy [[OwnPropertyKeys]] requires this array; the clone must not retain it.
          return Array.from(
            { length: keyCount },
            (_, index) => `field${index}`,
          );
        },
        getOwnPropertyDescriptor(_target, key) {
          descriptorCalls += 1;
          if (descriptorCalls > descriptorFailureThreshold) {
            throw new Error("descriptor processing exceeded the safety budget");
          }
          return typeof key === "string"
            ? { configurable: true, enumerable: true, value: true }
            : undefined;
        },
      },
    );

    expect(validateRuleSetDocumentInput(input)).toMatchObject({
      ok: false,
      diagnostics: [{ code: "RL_PARSE_NESTING_TOO_DEEP", sourcePointer: "" }],
    });
    expect(descriptorCalls).toBeLessThan(descriptorFailureThreshold);
  });

  it("rejects lone UTF-16 surrogates from text and unknown input", () => {
    expect(
      parseRuleSetDocument(
        String.raw`{"schemaVersion":"1.0","id":"example","rules":[{"id":"rule","when":{"literal":"\ud800"}}]}`,
      ),
    ).toMatchObject({
      ok: false,
      diagnostics: [{ code: "RL_PARSE_INVALID_UNICODE" }],
    });
    expect(validateRuleSetDocumentInput({ "\ud800": true })).toMatchObject({
      ok: false,
      diagnostics: [{ code: "RL_PARSE_INVALID_UNICODE" }],
    });
  });

  it("rejects descriptor-trapping proxies without throwing", () => {
    const input = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error("descriptor trap must not escape");
        },
      },
    );

    expect(() => validateRuleSetDocumentInput(input)).not.toThrow();
    expect(validateRuleSetDocumentInput(input)).toMatchObject({
      ok: false,
      diagnostics: [{ code: "RL_SCHEMA_TYPE", sourcePointer: "" }],
    });
  });

  it("runs only the approved RL-012 structural subset", () => {
    const invalidShape = {
      id: "EX-INVALID-SHAPE-001",
      support: ["schema"] as const,
      sourceDocument: { expression: { eq: [] } },
      expected: { diagnostics: [{ code: "RL_INVALID_SHAPE" }] },
    };
    const unsafePath = {
      id: "EX-UNSAFE-PATH-001",
      support: ["schema"] as const,
      sourceDocument: { expression: { fact: "order", path: "/__proto__" } },
      expected: { diagnostics: [{ code: "RL_UNSAFE_PATH" }] },
    };

    expect(isCompilerStructuralFixture(invalidShape)).toBe(true);
    expect(runCompilerStructuralFixture(invalidShape)).toEqual({
      status: "passed",
      diagnostics: [{ code: "RL_SCHEMA_TYPE" }],
    });
    expect(isCompilerStructuralFixture(unsafePath)).toBe(false);
    expect(runCompilerStructuralFixture(unsafePath)).toBeUndefined();
  });
});
