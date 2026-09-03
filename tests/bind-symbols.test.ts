import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  bindRuleSetDocument,
  validateRuleSetDocumentInput,
  type RegistryDescriptor,
} from "@ruleloom/compiler";

const fact: RegistryDescriptor = {
  id: "account",
  version: "1",
  inputTypes: [],
  outputType: "object",
  arity: 0,
  pure: true,
  costClass: "io",
  async: false,
};
const eq: RegistryDescriptor = {
  id: "eq",
  version: "1",
  inputTypes: ["unknown", "unknown"],
  outputType: "boolean",
  arity: 2,
  pure: true,
  costClass: "constant",
  async: false,
};

function document() {
  const result = validateRuleSetDocumentInput({
    schemaVersion: "1.0",
    id: "example",
    parameters: { expected: 3 },
    metadata: { owner: "billing" },
    rules: [
      {
        id: "rule",
        when: {
          eq: [{ fact: "account", path: "/age" }, { parameter: "expected" }],
        },
        metadata: { priority: 1 },
        actions: [
          {
            type: "notify",
            payload: { channel: "audit" },
            metadata: { retry: true },
          },
        ],
      },
    ],
  });
  if (!result.ok) throw new Error("test document must validate");
  return result.document;
}

describe("RuleLoom symbol binding", () => {
  it("binds the exact requested fact and operator versions", () => {
    const result = bindRuleSetDocument(document(), {
      facts: [{ ...fact, version: "2", outputType: "string" }],
      operators: [{ ...eq, version: "2" }],
      requiredFactVersions: { account: "2" },
      requiredOperatorVersions: { eq: "2" },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const when = result.document.rules[0]!.when;
      expect(when).toMatchObject({
        operator: { id: "operator:eq@2", descriptor: { version: "2" } },
      });
      if ("operator" in when)
        expect(when.args[0]).toMatchObject({
          reference: {
            id: "fact:account@2",
            descriptor: { version: "2" },
          },
        });
    }
  });

  it("rejects multiple versions for one canonical ID", () => {
    const result = bindRuleSetDocument(document(), {
      facts: [fact, { ...fact, version: "2" }],
      operators: [eq, { ...eq, version: "2" }],
    });

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        { code: "RL_BIND_DUPLICATE_SYMBOL", sourcePointer: "/facts/1" },
        { code: "RL_BIND_DUPLICATE_SYMBOL", sourcePointer: "/operators/1" },
      ],
    });
  });

  it("reports requested-version locations", () => {
    const result = bindRuleSetDocument(document(), {
      facts: [fact],
      operators: [eq],
      requiredFactVersions: { account: "2" },
      requiredOperatorVersions: { eq: "2" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          code: "RL_BIND_UNSUPPORTED_VERSION",
          sourcePointer: "/rules/0/when",
          relatedLocations: [
            {
              sourcePointer: "/operators/0",
              message: "Canonical registry declaration",
            },
          ],
        }),
        expect.objectContaining({
          code: "RL_BIND_UNSUPPORTED_VERSION",
          sourcePointer: "/rules/0/when/eq/0",
          relatedLocations: [
            {
              sourcePointer: "/facts/0",
              message: "Canonical registry declaration",
            },
          ],
        }),
      ]);
    }
  });

  it("rejects a proxy descriptor without invoking its prototype trap", () => {
    let trapInvoked = false;
    const proxied = new Proxy(fact, {
      getPrototypeOf() {
        trapInvoked = true;
        throw new Error("must not run");
      },
    });

    const result = bindRuleSetDocument(document(), {
      facts: [proxied],
      operators: [eq],
    });

    expect(result).toMatchObject({ ok: false });
    if (!result.ok)
      expect(result.diagnostics[0]).toMatchObject({
        code: "RL_BIND_INVALID_DESCRIPTOR",
        sourcePointer: "/facts/0",
      });
    expect(trapInvoked).toBe(false);
  });

  it("consumes every binding fixture", () => {
    const fixtureDirectory = join(process.cwd(), "tests/fixtures/binding");
    const fixtureNames = readdirSync(fixtureDirectory)
      .filter((name) => name.endsWith(".json"))
      .toSorted();

    for (const fixtureName of fixtureNames) {
      const fixture = JSON.parse(
        readFileSync(join(fixtureDirectory, fixtureName), "utf8"),
      ) as {
        document: unknown;
        facts: RegistryDescriptor[];
        operators: RegistryDescriptor[];
        expected: "bound" | undefined;
        expectedDiagnostics: string[] | undefined;
      };
      const input = validateRuleSetDocumentInput(fixture.document);
      expect(input.ok, fixtureName).toBe(true);
      if (!input.ok) continue;
      const result = bindRuleSetDocument(input.document, {
        facts: fixture.facts,
        operators: fixture.operators,
      });
      if (fixture.expected === "bound") {
        expect(result.ok, fixtureName).toBe(true);
      } else {
        expect(result.ok, fixtureName).toBe(false);
        if (!result.ok) {
          expect(
            result.diagnostics.map(({ code }) => code),
            fixtureName,
          ).toEqual(fixture.expectedDiagnostics);
        }
      }
    }
  });

  it("binds supported references to deterministic frozen symbols", () => {
    const result = bindRuleSetDocument(document(), {
      facts: [fact],
      operators: [eq],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.document.rules[0]!.when).toMatchObject({
        operator: { id: "operator:eq@1" },
        args: [
          { reference: { id: "fact:account@1" }, path: "/age" },
          { reference: { id: "parameter:expected" } },
        ],
      });
      expect(Object.isFrozen(result.document)).toBe(true);
      expect(Object.isFrozen(result.document.rules[0]!.when)).toBe(true);
      expect(result.document).toMatchObject({
        metadata: { owner: "billing" },
        parameters: { expected: 3 },
        rules: [
          {
            metadata: { priority: 1 },
            actions: [
              {
                type: "notify",
                payload: { channel: "audit" },
                metadata: { retry: true },
              },
            ],
          },
        ],
      });
      expect(JSON.stringify(result.document)).not.toContain("function");
    }
  });

  it("keeps IDs and diagnostics independent of registry insertion order", () => {
    const alternateFact = { ...fact, id: "unused-fact" };
    const alternateOperator = { ...eq, id: "unused-operator" };
    const left = bindRuleSetDocument(document(), {
      facts: [fact, alternateFact],
      operators: [eq, alternateOperator],
    });
    const right = bindRuleSetDocument(document(), {
      facts: [alternateFact, fact],
      operators: [alternateOperator, eq],
    });
    expect(left).toEqual(right);
  });

  it("preserves original registry pointers for shadowing diagnostics", () => {
    const result = bindRuleSetDocument(document(), {
      facts: [
        { ...fact, id: "unused-fact" },
        fact,
        { ...fact, id: "expected" },
      ],
      operators: [eq],
    });

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: "RL_BIND_SHADOWED_SYMBOL",
          relatedLocations: [
            {
              sourcePointer: "/facts/2",
              message: "Shadowed registry declaration",
            },
          ],
        },
      ],
    });
  });

  it("rejects unknown names, unsupported versions, and wrong arity", () => {
    const result = bindRuleSetDocument(document(), {
      facts: [],
      operators: [{ ...eq, arity: 1 }],
      requiredFactVersions: { account: "2" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics.map(({ code }) => code)).toEqual([
        "RL_BIND_ARITY",
        "RL_BIND_UNKNOWN_SYMBOL",
      ]);
    }
  });

  it("limits suggestions to explicitly visible capabilities", () => {
    const result = bindRuleSetDocument(document(), {
      facts: [{ ...fact, id: "accounts" }],
      operators: [eq],
      visibleSymbolIds: ["operator:eq@1"],
      maxSuggestions: 1,
    });

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [{ code: "RL_BIND_UNKNOWN_SYMBOL" }],
    });
    if (!result.ok)
      expect(result.diagnostics[0]!.message).not.toContain("accounts");
  });

  it("isolates the bound snapshot from later registry mutation", () => {
    const mutable = { ...fact, inputTypes: ["object"] };
    const result = bindRuleSetDocument(document(), {
      facts: [mutable],
      operators: [eq],
    });
    mutable.inputTypes[0] = "changed";

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.document.rules[0]!.when).toMatchObject({
        args: [
          { reference: { descriptor: { inputTypes: ["object"] } } },
          { reference: { id: "parameter:expected" } },
        ],
      });
    }
  });

  it("rejects accessor descriptors without invoking the accessor", () => {
    let invoked = false;
    const unsafe = {} as RegistryDescriptor;
    Object.defineProperty(unsafe, "id", {
      get() {
        invoked = true;
        throw new Error("must not run");
      },
    });

    const result = bindRuleSetDocument(document(), {
      facts: [unsafe],
      operators: [eq],
    });

    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.diagnostics[0]).toMatchObject({
        code: "RL_BIND_INVALID_DESCRIPTOR",
        sourcePointer: "/facts/0",
      });
    expect(invoked).toBe(false);
  });

  it("rejects sparse input type arrays", () => {
    const sparse = { ...fact, inputTypes: [] as string[] };
    sparse.inputTypes.length = 1;

    const result = bindRuleSetDocument(document(), {
      facts: [sparse],
      operators: [eq],
    });

    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.diagnostics[0]).toMatchObject({
        code: "RL_BIND_INVALID_DESCRIPTOR",
        sourcePointer: "/facts/0",
      });
  });

  it("rejects symbol-keyed executable descriptor properties", () => {
    const symbol = Symbol("executable");
    const unsafe = { ...fact } as RegistryDescriptor & {
      [symbol]: () => void;
    };
    unsafe[symbol] = () => undefined;

    const nested = { ...fact, arity: { min: 0 } } as RegistryDescriptor & {
      arity: { min: number; [symbol]: () => void };
    };
    nested.arity[symbol] = () => undefined;

    for (const descriptor of [unsafe, nested]) {
      const result = bindRuleSetDocument(document(), {
        facts: [descriptor],
        operators: [eq],
      });

      expect(result.ok).toBe(false);
      if (!result.ok)
        expect(result.diagnostics[0]).toMatchObject({
          code: "RL_BIND_INVALID_DESCRIPTOR",
          sourcePointer: "/facts/0",
        });
    }
  });

  it("keeps missing symbols unknown even when a version is required", () => {
    const result = bindRuleSetDocument(document(), {
      facts: [],
      operators: [eq],
      requiredFactVersions: { missing: "1" },
    });

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [{ code: "RL_BIND_UNKNOWN_SYMBOL" }],
    });
  });

  it("does not suggest descriptors marked non-suggestible", () => {
    const result = bindRuleSetDocument(document(), {
      facts: [{ ...fact, id: "accounts", suggestible: false }],
      operators: [eq],
      visibleSymbolIds: ["fact:accounts@1", "operator:eq@1"],
    });

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [{ code: "RL_BIND_UNKNOWN_SYMBOL" }],
    });
    if (!result.ok)
      expect(result.diagnostics[0]!.message).not.toContain("accounts");
  });
});
