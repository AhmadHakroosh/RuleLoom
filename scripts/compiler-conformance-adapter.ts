import {
  parseRuleSetDocument,
  type RuleLoomDiagnosticCode,
} from "@ruleloom/compiler";
import { ruleLoomLanguageVersion } from "@ruleloom/schema";
import type { ConformanceFixture } from "./conformance-adapter.js";

export interface CompilerStructuralFixtureResult {
  readonly status: "passed" | "failed";
  readonly diagnostics?: readonly { readonly code: string }[];
}

export function runCompilerStructuralFixture(
  fixture: ConformanceFixture,
): CompilerStructuralFixtureResult | undefined {
  if (!isCompilerStructuralFixture(fixture)) {
    return undefined;
  }
  const result = parseRuleSetDocument(JSON.stringify(projectFixture(fixture)));
  const expectedCode = expectedStructuralCode(fixture);
  if (result.ok) {
    return expectedCode === undefined
      ? { status: "passed" }
      : { status: "failed" };
  }
  const diagnostics = result.diagnostics.map(({ code }) => ({ code }));
  return diagnostics.some((diagnostic) => diagnostic.code === expectedCode)
    ? { status: "passed", diagnostics }
    : { status: "failed", diagnostics };
}

export function isCompilerStructuralFixture(fixture: ConformanceFixture) {
  const expectedDiagnostics = readExpectedDiagnostics(fixture);
  if (expectedDiagnostics.includes("RL_UNSAFE_PATH")) {
    return false;
  }
  return (
    expectedDiagnostics.length > 0 &&
    expectedDiagnostics.every((code) => code === "RL_INVALID_SHAPE")
  );
}

function projectFixture(fixture: ConformanceFixture) {
  const sourceDocument = fixture.sourceDocument as {
    readonly expression?: unknown;
    readonly ruleSet?: { readonly rules?: unknown };
  };
  const rules =
    sourceDocument.ruleSet?.rules ??
    (sourceDocument.expression === undefined
      ? []
      : [{ id: "fixture", when: sourceDocument.expression }]);
  return {
    schemaVersion: ruleLoomLanguageVersion,
    id: `fixture${fixture.id.replaceAll("-", "")}`,
    rules,
  };
}

function expectedStructuralCode(
  fixture: ConformanceFixture,
): RuleLoomDiagnosticCode | undefined {
  return readExpectedDiagnostics(fixture).includes("RL_INVALID_SHAPE")
    ? "RL_SCHEMA_TYPE"
    : undefined;
}

function readExpectedDiagnostics(
  fixture: ConformanceFixture,
): readonly string[] {
  const expected = fixture.expected as
    | { readonly diagnostics?: readonly { readonly code?: unknown }[] }
    | undefined;
  return (
    expected?.diagnostics
      ?.map((diagnostic) => diagnostic.code)
      .filter((code): code is string => typeof code === "string") ?? []
  );
}
