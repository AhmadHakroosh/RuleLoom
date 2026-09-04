import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  bindRuleSetDocument,
  typeCheckRuleSetDocument,
  validateRuleSetDocumentInput,
  type RegistryDescriptor,
  type RuleLoomDiagnostic,
} from "@ruleloom/compiler";

interface TypeSystemFixture {
  readonly id: string;
  readonly operator: string;
  readonly facts: readonly RegistryDescriptor[];
  readonly operators: readonly RegistryDescriptor[];
  readonly when: unknown;
  readonly expected:
    | { readonly ok: true; readonly type: string }
    | {
        readonly ok: false;
        readonly diagnostics: readonly {
          readonly code: string;
          readonly sourcePointer: string;
        }[];
      };
}

function buildDocument(when: unknown) {
  const input = validateRuleSetDocumentInput({
    schemaVersion: "1.0",
    id: "fixture",
    rules: [{ id: "rule", when }],
  });
  if (!input.ok) throw new Error("fixture document must validate");
  return input.document;
}

function typeCheckWhen(
  when: unknown,
  facts: readonly RegistryDescriptor[],
  operators: readonly RegistryDescriptor[],
) {
  const bound = bindRuleSetDocument(buildDocument(when), { facts, operators });
  if (!bound.ok) throw new Error("fixture document must bind");
  return typeCheckRuleSetDocument(bound.document);
}

function loadFixtures(): readonly TypeSystemFixture[] {
  const raw = readFileSync(
    join(process.cwd(), "tests/fixtures/conformance/type-system-v1.json"),
    "utf8",
  );
  return (JSON.parse(raw) as { fixtures: readonly TypeSystemFixture[] })
    .fixtures;
}

const builtinOperators = [
  "all",
  "any",
  "not",
  "eq",
  "lt",
  "lte",
  "gt",
  "gte",
  "in",
] as const;

describe("static expression type checker conformance fixtures", () => {
  const fixtures = loadFixtures();

  it("covers every built-in operator with a positive and negative fixture", () => {
    for (const operator of builtinOperators) {
      const matching = fixtures.filter(
        (fixture) => fixture.operator === operator,
      );
      expect(matching.some((fixture) => fixture.expected.ok === true)).toBe(
        true,
      );
      expect(matching.some((fixture) => fixture.expected.ok === false)).toBe(
        true,
      );
    }
  });

  for (const fixture of loadFixtures()) {
    it(`resolves ${fixture.id} as specified`, () => {
      const result = typeCheckWhen(
        fixture.when,
        fixture.facts,
        fixture.operators,
      );
      if (fixture.expected.ok) {
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.document.rules[0]!.when.type).toBe(
            fixture.expected.type,
          );
        }
      } else {
        expect(result.ok).toBe(false);
        if (!result.ok) {
          for (const expectedDiagnostic of fixture.expected.diagnostics) {
            expect(
              result.diagnostics.some(
                (diagnostic) =>
                  diagnostic.code === expectedDiagnostic.code &&
                  diagnostic.sourcePointer === expectedDiagnostic.sourcePointer,
              ),
            ).toBe(true);
          }
        }
      }
    });
  }
});

describe("static expression type checker", () => {
  const amountFact: RegistryDescriptor = {
    id: "amount",
    version: "1",
    inputTypes: [],
    outputType: "number",
    arity: 0,
    pure: true,
    costClass: "io",
    async: false,
  };
  const eqOperator: RegistryDescriptor = {
    id: "eq",
    version: "1",
    inputTypes: ["unknown", "unknown"],
    outputType: "boolean",
    arity: 2,
    pure: true,
    costClass: "constant",
    async: false,
  };
  const notOperator: RegistryDescriptor = {
    id: "not",
    version: "1",
    inputTypes: ["boolean"],
    outputType: "boolean",
    arity: 1,
    pure: true,
    costClass: "constant",
    async: false,
  };

  it("rejects ill-typed expressions with diagnostics before any typed document is produced (AC-1)", () => {
    const result = typeCheckWhen({ literal: "not-a-boolean" }, [], []);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          code: "RL_TYPE_INVALID_RESULT_CONTEXT",
          sourcePointer: "/rules/0/when",
        }),
      ]);
    }
  });

  it("retains missing/unknown possibilities for facts instead of collapsing to boolean (AC-2)", () => {
    const result = typeCheckWhen(
      { eq: [{ fact: "amount" }, { literal: 10 }] },
      [amountFact],
      [eqOperator],
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const when = result.document.rules[0]!.when;
      expect(when.type).toBe("boolean");
      if ("operator" in when) {
        expect(when.args[0]!.type).toEqual({
          kind: "union",
          members: ["missing", "number"],
        });
      }
    }
  });

  it("keeps overload resolution stable across permuted registry order and repeated runs (AC-3)", () => {
    const narrow: RegistryDescriptor = {
      id: "eq",
      version: "1",
      inputTypes: ["number", "number"],
      outputType: "boolean",
      arity: 2,
      pure: true,
      costClass: "constant",
      async: false,
    };
    const broad: RegistryDescriptor = {
      id: "eq",
      version: "2",
      inputTypes: ["unknown", "unknown"],
      outputType: "string",
      arity: 2,
      pure: true,
      costClass: "constant",
      async: false,
    };
    const boundDescriptor = narrow;
    const orderings = [
      [narrow, broad],
      [broad, narrow],
    ];

    const results = orderings.map((operators) => {
      const bound = bindRuleSetDocument(
        buildDocument({ eq: [{ literal: 1 }, { literal: 2 }] }),
        { facts: [], operators: [boundDescriptor] },
      );
      if (!bound.ok) throw new Error("must bind");
      return typeCheckRuleSetDocument(bound.document, { operators });
    });

    for (const result of results) {
      expect(result.ok).toBe(true);
      if (result.ok) {
        const when = result.document.rules[0]!.when;
        expect(when).toMatchObject({
          type: "boolean",
          operatorId: "eq",
          operatorVersion: "1",
        });
      }
    }
    expect(results[0]).toEqual(results[1]);

    const repeated = orderings.map((operators) => {
      const bound = bindRuleSetDocument(
        buildDocument({ eq: [{ literal: 1 }, { literal: 2 }] }),
        { facts: [], operators: [boundDescriptor] },
      );
      if (!bound.ok) throw new Error("must bind");
      return typeCheckRuleSetDocument(bound.document, { operators });
    });
    expect(repeated).toEqual(results);
  });

  it("reports RL_TYPE_AMBIGUOUS_OVERLOAD for equally specific competing signatures", () => {
    const left: RegistryDescriptor = {
      id: "eq",
      version: "1",
      inputTypes: ["string", "string"],
      outputType: "boolean",
      arity: 2,
      pure: true,
      costClass: "constant",
      async: false,
    };
    const right: RegistryDescriptor = {
      id: "eq",
      version: "2",
      inputTypes: ["string", "string"],
      outputType: "number",
      arity: 2,
      pure: true,
      costClass: "constant",
      async: false,
    };
    const bound = bindRuleSetDocument(
      buildDocument({ eq: [{ literal: "a" }, { literal: "b" }] }),
      { facts: [], operators: [left] },
    );
    if (!bound.ok) throw new Error("must bind");

    const result = typeCheckRuleSetDocument(bound.document, {
      operators: [left, right],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          code: "RL_TYPE_AMBIGUOUS_OVERLOAD",
          sourcePointer: "/rules/0/when",
        }),
      ]);
    }
  });

  it("reports RL_TYPE_NO_MATCHING_OVERLOAD when the registry snapshot accepts nothing", () => {
    const bound = bindRuleSetDocument(
      buildDocument({ eq: [{ literal: 1 }, { literal: 2 }] }),
      {
        facts: [],
        operators: [
          {
            id: "eq",
            version: "1",
            inputTypes: ["unknown", "unknown"],
            outputType: "boolean",
            arity: 2,
            pure: true,
            costClass: "constant",
            async: false,
          },
        ],
      },
    );
    if (!bound.ok) throw new Error("must bind");

    const result = typeCheckRuleSetDocument(bound.document, {
      operators: [
        {
          id: "eq",
          version: "1",
          inputTypes: ["string", "string"],
          outputType: "boolean",
          arity: 2,
          pure: true,
          costClass: "constant",
          async: false,
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics).toEqual([
        expect.objectContaining({ code: "RL_TYPE_NO_MATCHING_OVERLOAD" }),
      ]);
    }
  });

  it("raises a diagnostic instead of exhausting the call stack on deep nesting (REQ-12)", () => {
    let when: unknown = { fact: "flag" };
    for (let depth = 0; depth < 10; depth += 1) {
      when = { not: [when] };
    }
    const flagFact: RegistryDescriptor = {
      id: "flag",
      version: "1",
      inputTypes: [],
      outputType: "boolean",
      arity: 0,
      pure: true,
      costClass: "io",
      async: false,
    };
    const bound = bindRuleSetDocument(buildDocument(when), {
      facts: [flagFact],
      operators: [notOperator],
    });
    if (!bound.ok) throw new Error("must bind");

    expect(() =>
      typeCheckRuleSetDocument(bound.document, { maxNestingDepth: 5 }),
    ).not.toThrow();

    const result = typeCheckRuleSetDocument(bound.document, {
      maxNestingDepth: 5,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.diagnostics.some(
          (diagnostic: RuleLoomDiagnostic) =>
            diagnostic.code === "RL_PARSE_NESTING_TOO_DEEP",
        ),
      ).toBe(true);
    }
  });

  it("proves generic descriptor-consuming call sites reject invalid signatures at compile time (REQ-11)", () => {
    const tscPath = join(
      process.cwd(),
      "node_modules",
      "typescript",
      "bin",
      "tsc",
    );
    let compilerOutput = "";
    let exitCode = 0;

    try {
      execFileSync(
        process.execPath,
        [
          tscPath,
          "--pretty",
          "false",
          "-p",
          "tests/fixtures/type-check-descriptors/tsconfig.json",
        ],
        { encoding: "utf8", stdio: "pipe" },
      );
    } catch (error) {
      const failedProcess = error as {
        status?: number;
        stdout?: string;
        stderr?: string;
      };
      exitCode = failedProcess.status ?? 1;
      compilerOutput = `${failedProcess.stdout ?? ""}${failedProcess.stderr ?? ""}`;
    }

    expect(compilerOutput, compilerOutput).toBe("");
    expect(exitCode).toBe(0);
  });
});
