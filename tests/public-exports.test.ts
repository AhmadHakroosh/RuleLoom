import { describe, expect, it } from "vitest";
import { compilerCoreDependency, compilerPackageName, compilerSchemaDependency } from "@ruleloom/compiler";
import { corePackageName } from "@ruleloom/core";
import { runtimeCoreDependency, runtimePackageName } from "@ruleloom/runtime";
import { schemaCoreDependency, schemaPackageName } from "@ruleloom/schema";

describe("public package entries", () => {
  it("loads each workspace package through its exported root entry", () => {
    expect(corePackageName).toBe("@ruleloom/core");
    expect(schemaPackageName).toBe("@ruleloom/schema");
    expect(compilerPackageName).toBe("@ruleloom/compiler");
    expect(runtimePackageName).toBe("@ruleloom/runtime");
  });

  it("preserves the approved package dependency direction", () => {
    expect(schemaCoreDependency).toBe(corePackageName);
    expect(compilerCoreDependency).toBe(corePackageName);
    expect(compilerSchemaDependency).toBe(schemaPackageName);
    expect(runtimeCoreDependency).toBe(corePackageName);
  });
});
