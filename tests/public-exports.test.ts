import { describe, expect, it } from "vitest";
import {
  compilerCoreDependency,
  compilerPackageName,
  compilerSchemaDependency,
  parseRuleSetDocument,
  validateRuleSetDocumentInput,
} from "@ruleloom/compiler";
import { corePackageName } from "@ruleloom/core";
import { runtimeCoreDependency, runtimePackageName } from "@ruleloom/runtime";
import { schemaCoreDependency, schemaPackageName } from "@ruleloom/schema";

describe("public package entries", () => {
  it("loads each workspace package through its exported root entry", () => {
    expect(corePackageName).toBe("@ruleloom/core");
    expect(schemaPackageName).toBe("@ruleloom/schema");
    expect(compilerPackageName).toBe("@ruleloom/compiler");
    expect(runtimePackageName).toBe("@ruleloom/runtime");
    expect(parseRuleSetDocument).toBeTypeOf("function");
    expect(validateRuleSetDocumentInput).toBeTypeOf("function");
  });

  it("preserves the approved package dependency direction", () => {
    expect(schemaCoreDependency).toBe(corePackageName);
    expect(compilerCoreDependency).toBe(corePackageName);
    expect(compilerSchemaDependency).toBe(schemaPackageName);
    expect(runtimeCoreDependency).toBe(corePackageName);
  });
});
