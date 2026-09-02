import { corePackageName } from "@ruleloom/core";
import { schemaPackageName } from "@ruleloom/schema";

export const compilerPackageName = "@ruleloom/compiler" as const;
export const compilerCoreDependency = corePackageName;
export const compilerSchemaDependency = schemaPackageName;
