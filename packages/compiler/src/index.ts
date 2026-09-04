import { corePackageName } from "@ruleloom/core";
import {
  ruleLoomLanguageVersion,
  schemaPackageName,
  validateRuleSetDocument,
  type RuleSetDocument,
  type Rule,
  type SchemaDiagnostic,
  type JsonValue,
} from "@ruleloom/schema";

export const compilerPackageName = "@ruleloom/compiler" as const;
export const compilerCoreDependency = corePackageName;
export const compilerSchemaDependency = schemaPackageName;

export type RuleLoomDiagnosticCode =
  | SchemaDiagnostic["code"]
  | "RL_PARSE_JSON_SYNTAX"
  | "RL_PARSE_INVALID_UNICODE"
  | "RL_PARSE_UNSUPPORTED_SCHEMA_VERSION"
  | "RL_PARSE_DOCUMENT_TOO_LARGE"
  | "RL_PARSE_NESTING_TOO_DEEP"
  | "RL_PARSE_DIAGNOSTIC_LIMIT_REACHED"
  | "RL_BIND_DUPLICATE_SYMBOL"
  | "RL_BIND_SHADOWED_SYMBOL"
  | "RL_BIND_UNKNOWN_SYMBOL"
  | "RL_BIND_UNSUPPORTED_VERSION"
  | "RL_BIND_ARITY"
  | "RL_BIND_CYCLE"
  | "RL_BIND_INVALID_DESCRIPTOR"
  | "RL_TYPE_ARITY_MISMATCH"
  | "RL_TYPE_INCOMPATIBLE_ARGUMENT"
  | "RL_TYPE_AMBIGUOUS_OVERLOAD"
  | "RL_TYPE_NO_MATCHING_OVERLOAD"
  | "RL_TYPE_UNSAFE_NARROWING"
  | "RL_TYPE_INVALID_RESULT_CONTEXT";

export interface RelatedLocation {
  readonly sourcePointer: string;
  readonly message?: string;
}

export interface RuleLoomDiagnostic {
  readonly code: RuleLoomDiagnosticCode;
  readonly severity: "error";
  readonly message: string;
  readonly sourcePointer: string;
  readonly relatedLocations?: readonly RelatedLocation[];
}

export interface ParseRuleSetDocumentOptions {
  readonly maxDocumentBytes?: number;
  readonly maxNestingDepth?: number;
  readonly maxDiagnostics?: number;
}

export type ParseRuleSetDocumentResult =
  | { readonly ok: true; readonly document: RuleSetDocument }
  | { readonly ok: false; readonly diagnostics: readonly RuleLoomDiagnostic[] };

export interface RegistryDescriptor {
  readonly id: string;
  readonly version: string;
  readonly inputTypes: readonly string[];
  readonly outputType: string;
  readonly arity: number | { readonly min: number; readonly max?: number };
  readonly pure: boolean;
  readonly costClass: string;
  readonly async: boolean;
  readonly suggestible?: boolean;
}

export type FactRegistryDescriptor = RegistryDescriptor;
export type OperatorRegistryDescriptor = RegistryDescriptor;

export interface BindRuleSetDocumentOptions {
  readonly facts: readonly FactRegistryDescriptor[];
  readonly operators: readonly OperatorRegistryDescriptor[];
  readonly requiredFactVersions?: Readonly<Record<string, string>>;
  readonly requiredOperatorVersions?: Readonly<Record<string, string>>;
  readonly visibleSymbolIds?: readonly string[];
  readonly maxSuggestions?: number;
}

export interface BoundSymbol {
  readonly id: string;
  readonly kind: "fact" | "parameter" | "operator";
  readonly name: string;
  readonly version?: string;
  readonly descriptor?: RegistryDescriptor;
}

export type BoundExpression =
  | { readonly literal: JsonValue }
  | { readonly reference: BoundSymbol; readonly path?: string }
  | {
      readonly operator: BoundSymbol;
      readonly args: readonly BoundExpression[];
    };

export type BoundRule = Omit<Rule, "when"> & {
  readonly when: BoundExpression;
};

export type BoundRuleSetDocument = Omit<RuleSetDocument, "rules"> & {
  readonly rules: readonly BoundRule[];
};

export type BindRuleSetDocumentResult =
  | { readonly ok: true; readonly document: BoundRuleSetDocument }
  | { readonly ok: false; readonly diagnostics: readonly RuleLoomDiagnostic[] };

export function bindRuleSetDocument(
  document: RuleSetDocument,
  options: BindRuleSetDocumentOptions,
): BindRuleSetDocumentResult {
  const diagnostics: RuleLoomDiagnostic[] = [];
  const factLocations = new Map<string, string>();
  const operatorLocations = new Map<string, string>();
  const facts = snapshotRegistry(
    options.facts,
    "fact",
    diagnostics,
    factLocations,
  );
  const operators = snapshotRegistry(
    options.operators,
    "operator",
    diagnostics,
    operatorLocations,
  );
  const parameters = Object.keys(document.parameters ?? {}).toSorted();
  const symbols = new Map<string, BoundSymbol>();
  const symbolLocations = new Map<string, string>();

  for (const fact of facts) {
    registerSymbol(
      symbols,
      {
        id: symbolId("fact", fact.descriptor.id, fact.descriptor.version),
        kind: "fact",
        name: fact.descriptor.id,
        version: fact.descriptor.version,
        descriptor: fact.descriptor,
      },
      fact.sourcePointer,
      symbolLocations,
    );
  }
  for (const operator of operators) {
    registerSymbol(
      symbols,
      {
        id: symbolId(
          "operator",
          operator.descriptor.id,
          operator.descriptor.version,
        ),
        kind: "operator",
        name: operator.descriptor.id,
        version: operator.descriptor.version,
        descriptor: operator.descriptor,
      },
      operator.sourcePointer,
      symbolLocations,
    );
  }
  for (const parameter of parameters) {
    const symbol: BoundSymbol = {
      id: symbolId("parameter", parameter),
      kind: "parameter",
      name: parameter,
    };
    if (
      symbols.has(`fact:${parameter}`) ||
      symbols.has(`operator:${parameter}`)
    ) {
      diagnostics.push(
        bindingDiagnostic(
          "RL_BIND_SHADOWED_SYMBOL",
          `/parameters/${escapePointerSegment(parameter)}`,
          `Parameter '${parameter}' shadows a registry symbol`,
          undefined,
          [
            {
              sourcePointer:
                symbolLocations.get(`fact:${parameter}`) ??
                symbolLocations.get(`operator:${parameter}`) ??
                "/",
              message: "Shadowed registry declaration",
            },
          ],
        ),
      );
    }
    symbols.set(`parameter:${parameter}`, symbol);
  }

  const boundRules: BoundRule[] = [];
  for (let ruleIndex = 0; ruleIndex < document.rules.length; ruleIndex += 1) {
    const rule = document.rules[ruleIndex]!;
    const when = bindExpression(
      rule.when,
      `/rules/${ruleIndex}/when`,
      symbols,
      facts,
      operators,
      options,
      diagnostics,
      factLocations,
      operatorLocations,
    );
    if (when !== undefined) {
      boundRules.push({ id: rule.id, when });
    }
  }
  if (diagnostics.length > 0) {
    return { ok: false, diagnostics: sortBindingDiagnostics(diagnostics) };
  }
  return {
    ok: true,
    document: deepFreeze({
      ...document,
      rules: document.rules.map((rule, index) => ({
        ...rule,
        when: boundRules[index]!.when,
      })),
    }),
  };
}

function bindExpression(
  expression: RuleSetDocument["rules"][number]["when"],
  sourcePointer: string,
  symbols: ReadonlyMap<string, BoundSymbol>,
  facts: readonly RegistrySnapshotEntry[],
  operators: readonly RegistrySnapshotEntry[],
  options: BindRuleSetDocumentOptions,
  diagnostics: RuleLoomDiagnostic[],
  factLocations: ReadonlyMap<string, string>,
  operatorLocations: ReadonlyMap<string, string>,
): BoundExpression | undefined {
  if ("literal" in expression) {
    return { literal: expression.literal };
  }
  if (
    "fact" in expression ||
    "parameter" in expression ||
    "local" in expression
  ) {
    const kind =
      "fact" in expression
        ? "fact"
        : "parameter" in expression
          ? "parameter"
          : "local";
    const name =
      "fact" in expression
        ? expression.fact
        : "parameter" in expression
          ? expression.parameter
          : expression.local;
    const requiredVersion =
      kind === "fact" ? options.requiredFactVersions?.[name] : undefined;
    const selectedDescriptor =
      kind === "fact" && requiredVersion !== undefined
        ? facts.find(
            (candidate) =>
              candidate.descriptor.id === name &&
              candidate.descriptor.version === requiredVersion,
          )?.descriptor
        : undefined;
    const symbol =
      kind === "fact" && requiredVersion !== undefined
        ? selectedDescriptor === undefined
          ? undefined
          : {
              id: symbolId(kind, name, selectedDescriptor.version),
              kind: "fact" as const,
              name,
              version: selectedDescriptor.version,
              descriptor: selectedDescriptor,
            }
        : symbols.get(`${kind}:${name}`);
    const hasName =
      kind === "fact" &&
      facts.some((candidate) => candidate.descriptor.id === name)
        ? true
        : symbol !== undefined;
    const hasSymbol = symbol !== undefined;
    if (
      !hasSymbol ||
      (kind === "fact" &&
        !versionMatches(name, options.requiredFactVersions, facts))
    ) {
      const code = hasName
        ? "RL_BIND_UNSUPPORTED_VERSION"
        : "RL_BIND_UNKNOWN_SYMBOL";
      diagnostics.push(
        bindingDiagnostic(
          code,
          sourcePointer,
          `Unknown or unsupported ${kind} '${name}'`,
          suggestions(name, symbols, options),
          hasName && kind === "fact"
            ? relatedRegistryDeclaration(factLocations, name)
            : undefined,
        ),
      );
      return undefined;
    }
    const path = "path" in expression ? expression.path : undefined;
    return { reference: symbol, ...(path === undefined ? {} : { path }) };
  }
  if ("extension" in expression) {
    diagnostics.push(
      bindingDiagnostic(
        "RL_BIND_UNKNOWN_SYMBOL",
        sourcePointer,
        `Unknown extension '${expression.extension}'`,
        suggestions(expression.extension, symbols, options),
      ),
    );
    return undefined;
  }
  const operatorName = Object.keys(expression)[0]!;
  const requiredOperatorVersion =
    options.requiredOperatorVersions?.[operatorName];
  const registeredOperator = operators.find(
    (candidate) => candidate.descriptor.id === operatorName,
  );
  const operator = operators.find(
    (candidate) =>
      candidate.descriptor.id === operatorName &&
      (requiredOperatorVersion === undefined ||
        candidate.descriptor.version === requiredOperatorVersion),
  )?.descriptor;
  const operatorSymbol =
    operator === undefined
      ? undefined
      : {
          id: symbolId("operator", operatorName, operator.version),
          kind: "operator" as const,
          name: operatorName,
          version: operator.version,
          descriptor: operator,
        };
  const argsValue = expression[operatorName as keyof typeof expression];
  const args = Array.isArray(argsValue) ? argsValue : [argsValue];
  if (registeredOperator === undefined) {
    diagnostics.push(
      bindingDiagnostic(
        "RL_BIND_UNKNOWN_SYMBOL",
        sourcePointer,
        `Unknown operator '${operatorName}'`,
        suggestions(operatorName, symbols, options),
      ),
    );
    return undefined;
  }
  const selectedOperator = operator ?? registeredOperator?.descriptor;
  if (operator === undefined) {
    diagnostics.push(
      bindingDiagnostic(
        "RL_BIND_UNSUPPORTED_VERSION",
        sourcePointer,
        `Unsupported version for operator '${operatorName}'`,
        undefined,
        relatedRegistryDeclaration(operatorLocations, operatorName),
      ),
    );
  }
  if (!arityMatches(selectedOperator.arity, args.length)) {
    diagnostics.push(
      bindingDiagnostic(
        "RL_BIND_ARITY",
        sourcePointer,
        `Operator '${operatorName}' received ${args.length} arguments`,
      ),
    );
  }
  const boundArgs: BoundExpression[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const bound = bindExpression(
      args[index]!,
      `${sourcePointer}/${escapePointerSegment(operatorName)}/${index}`,
      symbols,
      facts,
      operators,
      options,
      diagnostics,
      factLocations,
      operatorLocations,
    );
    if (bound !== undefined) boundArgs.push(bound);
  }
  if (operatorSymbol === undefined) return undefined;
  return { operator: operatorSymbol, args: boundArgs };
}

function snapshotRegistry(
  descriptors: readonly RegistryDescriptor[],
  kind: "fact" | "operator",
  diagnostics: RuleLoomDiagnostic[],
  locations: Map<string, string>,
): readonly RegistrySnapshotEntry[] {
  const seen = new Set<string>();
  const firstPointers = new Map<string, string>();
  const snapshot: RegistrySnapshotEntry[] = [];
  for (let index = 0; index < descriptors.length; index += 1) {
    const descriptor = descriptors[index];
    const sourcePointer = `/${kind === "fact" ? "facts" : "operators"}/${index}`;
    if (descriptor === undefined) continue;
    const copy = snapshotDescriptor(descriptor, sourcePointer, diagnostics);
    if (copy === undefined) continue;
    const key = `${kind}:${copy.id}`;
    if (!locations.has(copy.id)) locations.set(copy.id, sourcePointer);
    if (seen.has(key))
      diagnostics.push(
        bindingDiagnostic(
          "RL_BIND_DUPLICATE_SYMBOL",
          sourcePointer,
          `Duplicate ${kind} '${copy.id}'`,
          undefined,
          [
            {
              sourcePointer: firstPointers.get(key) ?? "/",
              message: "First declaration",
            },
          ],
        ),
      );
    if (!seen.has(key)) firstPointers.set(key, sourcePointer);
    seen.add(key);
    snapshot.push({ descriptor: copy, sourcePointer });
  }
  return snapshot.toSorted((left, right) =>
    compareStrings(
      `${left.descriptor.id}@${left.descriptor.version}`,
      `${right.descriptor.id}@${right.descriptor.version}`,
    ),
  );
}

interface RegistrySnapshotEntry {
  readonly descriptor: RegistryDescriptor;
  readonly sourcePointer: string;
}

function relatedRegistryDeclaration(
  locations: ReadonlyMap<string, string>,
  name: string,
): readonly RelatedLocation[] | undefined {
  const sourcePointer = locations.get(name);
  return sourcePointer === undefined
    ? undefined
    : [{ sourcePointer, message: "Canonical registry declaration" }];
}

function snapshotDescriptor(
  descriptor: RegistryDescriptor,
  sourcePointer: string,
  diagnostics: RuleLoomDiagnostic[],
): RegistryDescriptor | undefined {
  try {
    const clone = (
      globalThis as unknown as {
        structuredClone?: (value: unknown) => unknown;
      }
    ).structuredClone;
    if (clone !== undefined) clone(descriptor);
    if (
      descriptor === null ||
      typeof descriptor !== "object" ||
      Object.getPrototypeOf(descriptor) !== Object.prototype
    ) {
      throw new Error("descriptor must be a plain object");
    }
    const properties = Object.getOwnPropertyDescriptors(descriptor);
    const allowed = new Set([
      "id",
      "version",
      "inputTypes",
      "outputType",
      "arity",
      "pure",
      "costClass",
      "async",
      "suggestible",
    ]);
    if (Object.getOwnPropertySymbols(descriptor).length > 0) {
      throw new Error("descriptor contains symbol-keyed data");
    }
    for (const [name, property] of Object.entries(properties)) {
      if (!allowed.has(name) || !("value" in property))
        throw new Error("descriptor contains executable or unknown data");
    }
    const value = (name: string) => {
      const property = properties[name];
      if (property === undefined || !("value" in property))
        throw new Error(`missing ${name}`);
      return property.value;
    };
    const id = value("id");
    const version = value("version");
    const inputTypes = value("inputTypes");
    const outputType = value("outputType");
    const arity = value("arity");
    const pure = value("pure");
    const costClass = value("costClass");
    const asyncCapability = value("async");
    const suggestible =
      properties.suggestible === undefined ? true : value("suggestible");
    if (
      typeof id !== "string" ||
      id.length === 0 ||
      typeof version !== "string" ||
      version.length === 0 ||
      !isTypeRefArray(inputTypes) ||
      typeof outputType !== "string" ||
      outputType.length === 0 ||
      (typeof arity !== "number" && !isArityRange(arity)) ||
      (typeof arity === "number" && (!Number.isInteger(arity) || arity < 0)) ||
      typeof pure !== "boolean" ||
      typeof costClass !== "string" ||
      costClass.length === 0 ||
      typeof asyncCapability !== "boolean" ||
      typeof suggestible !== "boolean"
    ) {
      throw new Error("descriptor has invalid field data");
    }
    const copiedArity =
      typeof arity === "number"
        ? arity
        : {
            min: arity.min,
            ...(arity.max === undefined ? {} : { max: arity.max }),
          };
    return deepFreeze({
      id,
      version,
      inputTypes: [...inputTypes],
      outputType,
      arity: copiedArity,
      pure,
      costClass,
      async: asyncCapability,
      suggestible,
    });
  } catch {
    diagnostics.push(
      bindingDiagnostic(
        "RL_BIND_INVALID_DESCRIPTOR",
        sourcePointer,
        "Registry descriptor must be inert, plain, and valid",
      ),
    );
    return undefined;
  }
}

function isTypeRefArray(value: unknown): value is readonly string[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype)
    return false;
  if (Object.getOwnPropertySymbols(value).length > 0) return false;
  const properties = Object.getOwnPropertyDescriptors(value);
  const length = Object.getOwnPropertyDescriptor(value, "length");
  const lengthValue =
    length !== undefined && "value" in length ? length.value : undefined;
  if (
    typeof lengthValue !== "number" ||
    !Number.isInteger(lengthValue) ||
    lengthValue < 0
  )
    return false;
  if (Object.keys(properties).length !== lengthValue + 1) return false;
  for (let index = 0; index < lengthValue; index += 1) {
    const property = properties[index];
    if (
      property === undefined ||
      !("value" in property) ||
      typeof property.value !== "string" ||
      property.value.length === 0
    )
      return false;
  }
  return true;
}

function isArityRange(
  value: unknown,
): value is { readonly min: number; readonly max?: number } {
  if (
    value === null ||
    typeof value !== "object" ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    return false;
  if (Object.getOwnPropertySymbols(value).length > 0) return false;
  const properties = Object.getOwnPropertyDescriptors(value);
  if (
    Object.keys(properties).some(
      (name) =>
        (name !== "min" && name !== "max") || !("value" in properties[name]!),
    )
  )
    return false;
  const min = properties.min;
  const max = properties.max;
  return (
    min !== undefined &&
    "value" in min &&
    Number.isInteger(min.value) &&
    min.value >= 0 &&
    (max === undefined ||
      ("value" in max && Number.isInteger(max.value) && max.value >= min.value))
  );
}

function registerSymbol(
  symbols: Map<string, BoundSymbol>,
  symbol: BoundSymbol,
  sourcePointer: string,
  symbolLocations: Map<string, string>,
) {
  const key = `${symbol.kind}:${symbol.name}`;
  if (!symbolLocations.has(key)) symbolLocations.set(key, sourcePointer);
  symbols.set(key, symbol);
}

function versionMatches(
  name: string,
  required: Readonly<Record<string, string>> | undefined,
  descriptors: readonly RegistrySnapshotEntry[],
) {
  const expected = required?.[name];
  return (
    expected === undefined ||
    descriptors.some(
      (descriptor) =>
        descriptor.descriptor.id === name &&
        descriptor.descriptor.version === expected,
    )
  );
}

function arityMatches(arity: RegistryDescriptor["arity"], count: number) {
  return typeof arity === "number"
    ? arity === count
    : count >= arity.min && (arity.max === undefined || count <= arity.max);
}

function suggestions(
  name: string,
  symbols: ReadonlyMap<string, BoundSymbol>,
  options: BindRuleSetDocumentOptions,
) {
  if (options.visibleSymbolIds === undefined) return undefined;
  const visible = new Set(options.visibleSymbolIds);
  const limit = Math.min(Math.max(options.maxSuggestions ?? 3, 0), 20);
  return (
    [...symbols.values()]
      .filter((symbol) => visible.has(symbol.id) && symbol.name !== name)
      .filter((symbol) => symbol.descriptor?.suggestible !== false)
      .map((symbol) => symbol.name)
      .toSorted((left, right) => compareStrings(left, right))
      .slice(0, limit)
      .join(", ") || undefined
  );
}

function bindingDiagnostic(
  code: Extract<RuleLoomDiagnosticCode, `RL_BIND_${string}`>,
  sourcePointer: string,
  message: string,
  suggestion?: string,
  relatedLocations?: readonly RelatedLocation[],
): RuleLoomDiagnostic {
  return {
    code,
    severity: "error",
    message:
      suggestion === undefined
        ? message
        : `${message}; suggestions: ${suggestion}`,
    sourcePointer: sourcePointer || "/",
    ...(relatedLocations === undefined ? {} : { relatedLocations }),
  };
}

function sortBindingDiagnostics(diagnostics: readonly RuleLoomDiagnostic[]) {
  return diagnostics.toSorted(
    (left, right) =>
      compareStrings(left.sourcePointer, right.sourcePointer) ||
      compareNumbers(
        bindingCodeRanks[left.code] ?? 99,
        bindingCodeRanks[right.code] ?? 99,
      ) ||
      compareStrings(left.message, right.message),
  );
}

const bindingCodeRanks: Record<string, number> = {
  RL_BIND_DUPLICATE_SYMBOL: 0,
  RL_BIND_SHADOWED_SYMBOL: 1,
  RL_BIND_UNKNOWN_SYMBOL: 2,
  RL_BIND_UNSUPPORTED_VERSION: 3,
  RL_BIND_ARITY: 4,
  RL_BIND_CYCLE: 5,
  RL_BIND_INVALID_DESCRIPTOR: 6,
};

function compareNumbers(left: number, right: number) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareStrings(left: string, right: string) {
  const leftCodePoints = [...left];
  const rightCodePoints = [...right];
  const length = Math.min(leftCodePoints.length, rightCodePoints.length);
  for (let index = 0; index < length; index += 1) {
    const comparison = compareNumbers(
      leftCodePoints[index]!.codePointAt(0)!,
      rightCodePoints[index]!.codePointAt(0)!,
    );
    if (comparison !== 0) return comparison;
  }
  return compareNumbers(leftCodePoints.length, rightCodePoints.length);
}

function symbolId(kind: string, name: string, version?: string) {
  return version === undefined
    ? `${kind}:${name}`
    : `${kind}:${name}@${version}`;
}

function escapePointerSegment(value: string) {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as object)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Static expression type checker (RL-022)
// ---------------------------------------------------------------------------

export type TypeRef =
  | "null"
  | "boolean"
  | "number"
  | "string"
  | { readonly kind: "array"; readonly element: TypeRef }
  | { readonly kind: "object" }
  | { readonly kind: "union"; readonly members: readonly TypeRef[] }
  | "missing"
  | "unknown"
  | "error";

export type TypedExpression =
  | { readonly literal: JsonValue; readonly type: TypeRef }
  | {
      readonly reference: BoundSymbol;
      readonly path?: string;
      readonly type: TypeRef;
    }
  | {
      readonly operator: BoundSymbol;
      readonly args: readonly TypedExpression[];
      readonly type: TypeRef;
      readonly operatorId: string;
      readonly operatorVersion: string;
    };

export type TypedRule = Omit<BoundRule, "when"> & {
  readonly when: TypedExpression;
};

export type TypedRuleSetDocument = Omit<BoundRuleSetDocument, "rules"> & {
  readonly rules: readonly TypedRule[];
};

export interface TypeCheckOptions {
  readonly operators?: readonly RegistryDescriptor[];
  readonly maxNestingDepth?: number;
}

export type TypeCheckResult =
  | { readonly ok: true; readonly document: TypedRuleSetDocument }
  | { readonly ok: false; readonly diagnostics: readonly RuleLoomDiagnostic[] };

/**
 * Runs after {@link bindRuleSetDocument} succeeds. Infers types for literal,
 * parameter, fact, and operator-result expressions, resolves operator
 * overloads deterministically, and validates boolean/action-payload/
 * parameter-default contexts without mutating the bound document.
 */
export function typeCheckRuleSetDocument(
  document: BoundRuleSetDocument,
  options?: TypeCheckOptions,
): TypeCheckResult {
  const maxDepth = resolveTypeNestingDepth(options?.maxNestingDepth);
  const diagnostics: RuleLoomDiagnostic[] = [];
  const parameterTypes = new Map<string, TypeRef>();
  for (const [name, value] of Object.entries(document.parameters ?? {})) {
    parameterTypes.set(
      name,
      inferLiteralType(
        value,
        `/parameters/${escapePointerSegment(name)}`,
        0,
        maxDepth,
        diagnostics,
      ),
    );
  }

  const context: TypeInferenceContext = {
    parameterTypes,
    operators: options?.operators,
    maxDepth,
    diagnostics,
  };

  const typedRules: TypedRule[] = document.rules.map((rule, ruleIndex) => {
    const pointer = `/rules/${ruleIndex}/when`;
    const when = inferExpressionType(rule.when, pointer, 0, context);
    if (!isBooleanContextCompatible(when.type)) {
      diagnostics.push(
        typeDiagnostic(
          "RL_TYPE_INVALID_RESULT_CONTEXT",
          pointer,
          `Rule condition must be boolean-compatible, found '${describeTypeRef(when.type)}'`,
        ),
      );
    }
    for (
      let actionIndex = 0;
      actionIndex < (rule.actions?.length ?? 0);
      actionIndex += 1
    ) {
      const action = rule.actions![actionIndex]!;
      if (action.payload !== undefined) {
        inferLiteralType(
          action.payload,
          `/rules/${ruleIndex}/actions/${actionIndex}/payload`,
          0,
          maxDepth,
          diagnostics,
        );
      }
    }
    return { ...rule, when };
  });

  if (diagnostics.length > 0) {
    return { ok: false, diagnostics: sortTypeDiagnostics(diagnostics) };
  }
  return {
    ok: true,
    document: deepFreeze({ ...document, rules: typedRules }),
  };
}

interface TypeInferenceContext {
  readonly parameterTypes: ReadonlyMap<string, TypeRef>;
  readonly operators: readonly RegistryDescriptor[] | undefined;
  readonly maxDepth: number;
  readonly diagnostics: RuleLoomDiagnostic[];
}

function inferExpressionType(
  expression: BoundExpression,
  sourcePointer: string,
  depth: number,
  context: TypeInferenceContext,
): TypedExpression {
  if (depth > context.maxDepth) {
    context.diagnostics.push(
      typeDiagnostic(
        "RL_PARSE_NESTING_TOO_DEEP",
        sourcePointer,
        "Expression nesting exceeds the configured limit",
      ),
    );
    return { literal: null, type: "error" };
  }
  if ("literal" in expression) {
    return {
      literal: expression.literal,
      type: inferLiteralType(
        expression.literal,
        sourcePointer,
        depth + 1,
        context.maxDepth,
        context.diagnostics,
      ),
    };
  }
  if ("reference" in expression) {
    const symbol = expression.reference;
    const baseType =
      symbol.kind === "parameter"
        ? (context.parameterTypes.get(symbol.name) ?? "unknown")
        : unionOf(
            parseDescriptorTypeRef(symbol.descriptor?.outputType ?? "unknown"),
            "missing",
          );
    const type = resolvePathedType(
      baseType,
      expression.path,
      sourcePointer,
      context.diagnostics,
    );
    return {
      reference: symbol,
      ...(expression.path === undefined ? {} : { path: expression.path }),
      type,
    };
  }
  const symbol = expression.operator;
  const args = expression.args.map((arg, index) =>
    inferExpressionType(
      arg,
      `${sourcePointer}/${escapePointerSegment(symbol.name)}/${index}`,
      depth + 1,
      context,
    ),
  );
  if (symbol.descriptor === undefined) {
    return {
      operator: symbol,
      args,
      type: "error",
      operatorId: symbol.name,
      operatorVersion: symbol.version ?? "",
    };
  }
  const resolved = resolveOperatorCall(
    symbol.descriptor,
    args.map((arg) => arg.type),
    args.map(
      (_, index) =>
        `${sourcePointer}/${escapePointerSegment(symbol.name)}/${index}`,
    ),
    sourcePointer,
    context.operators,
    context.diagnostics,
  );
  return {
    operator: symbol,
    args,
    type: resolved.type,
    operatorId: resolved.operatorId,
    operatorVersion: resolved.operatorVersion,
  };
}

function resolvePathedType(
  baseType: TypeRef,
  path: string | undefined,
  sourcePointer: string,
  diagnostics: RuleLoomDiagnostic[],
): TypeRef {
  if (path === undefined) return baseType;
  const members = isUnionType(baseType) ? baseType.members : [baseType];
  const allowsTraversal = members.some(
    (member) =>
      member === "unknown" ||
      member === "error" ||
      isArrayType(member) ||
      isObjectType(member),
  );
  if (!allowsTraversal) {
    diagnostics.push(
      typeDiagnostic(
        "RL_TYPE_UNSAFE_NARROWING",
        sourcePointer,
        `Path access is not valid on type '${describeTypeRef(baseType)}'`,
      ),
    );
    return "error";
  }
  return unionOf("unknown", "missing");
}

function inferLiteralType(
  value: JsonValue,
  sourcePointer: string,
  depth: number,
  maxDepth: number,
  diagnostics: RuleLoomDiagnostic[],
): TypeRef {
  if (depth > maxDepth) {
    diagnostics.push(
      typeDiagnostic(
        "RL_PARSE_NESTING_TOO_DEEP",
        sourcePointer,
        "Literal nesting exceeds the configured limit",
      ),
    );
    return "error";
  }
  if (value === null) return "null";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "string") return "string";
  if (Array.isArray(value)) {
    const elementType: TypeRef =
      value.length === 0
        ? "unknown"
        : unionOf(
            ...value.map((element, index) =>
              inferLiteralType(
                element,
                `${sourcePointer}/${index}`,
                depth + 1,
                maxDepth,
                diagnostics,
              ),
            ),
          );
    return { kind: "array", element: elementType };
  }
  return { kind: "object" };
}

function resolveOperatorCall(
  boundDescriptor: RegistryDescriptor,
  argTypes: readonly TypeRef[],
  argPointers: readonly string[],
  sourcePointer: string,
  registryOperators: readonly RegistryDescriptor[] | undefined,
  diagnostics: RuleLoomDiagnostic[],
): {
  readonly type: TypeRef;
  readonly operatorId: string;
  readonly operatorVersion: string;
} {
  if (!arityMatches(boundDescriptor.arity, argTypes.length)) {
    diagnostics.push(
      typeDiagnostic(
        "RL_TYPE_ARITY_MISMATCH",
        sourcePointer,
        `Operator '${boundDescriptor.id}' received ${argTypes.length} argument(s)`,
      ),
    );
    return operatorErrorResult(boundDescriptor);
  }

  const mismatchIndex = argTypes.findIndex(
    (argType, index) =>
      !isArgumentAccepted(argType, declaredInputType(boundDescriptor, index)),
  );
  if (mismatchIndex !== -1) {
    diagnostics.push(
      typeDiagnostic(
        "RL_TYPE_INCOMPATIBLE_ARGUMENT",
        argPointers[mismatchIndex] ?? sourcePointer,
        `Operator '${boundDescriptor.id}' argument ${mismatchIndex} expects '${describeTypeRef(
          declaredInputType(boundDescriptor, mismatchIndex),
        )}', received '${describeTypeRef(argTypes[mismatchIndex]!)}'`,
      ),
    );
    return operatorErrorResult(boundDescriptor);
  }

  if (registryOperators === undefined) {
    return {
      type: parseDescriptorTypeRef(boundDescriptor.outputType),
      operatorId: boundDescriptor.id,
      operatorVersion: boundDescriptor.version,
    };
  }

  const sameName = registryOperators.filter(
    (candidate) =>
      candidate.id === boundDescriptor.id &&
      arityMatches(candidate.arity, argTypes.length),
  );
  const accepting = sameName.filter((candidate) =>
    argTypes.every((argType, index) =>
      isArgumentAccepted(argType, declaredInputType(candidate, index)),
    ),
  );
  if (accepting.length === 0) {
    diagnostics.push(
      typeDiagnostic(
        "RL_TYPE_NO_MATCHING_OVERLOAD",
        sourcePointer,
        `No registered '${boundDescriptor.id}' signature accepts the supplied argument types`,
      ),
    );
    return operatorErrorResult(boundDescriptor);
  }

  const maximal = mostSpecificDescriptors(accepting);
  const sorted = maximal.toSorted(
    (left, right) =>
      compareStrings(left.id, right.id) ||
      compareStrings(left.version, right.version),
  );
  if (sorted.length > 1) {
    diagnostics.push(
      typeDiagnostic(
        "RL_TYPE_AMBIGUOUS_OVERLOAD",
        sourcePointer,
        `Multiple '${boundDescriptor.id}' signatures equally match the supplied argument types`,
      ),
    );
    return operatorErrorResult(boundDescriptor);
  }

  const resolved = sorted[0]!;
  return {
    type: parseDescriptorTypeRef(resolved.outputType),
    operatorId: resolved.id,
    operatorVersion: resolved.version,
  };
}

function operatorErrorResult(descriptor: RegistryDescriptor) {
  return {
    type: "error" as const,
    operatorId: descriptor.id,
    operatorVersion: descriptor.version,
  };
}

function declaredInputType(
  descriptor: RegistryDescriptor,
  index: number,
): TypeRef {
  if (descriptor.inputTypes.length === 0) return "unknown";
  const position = Math.min(index, descriptor.inputTypes.length - 1);
  return parseDescriptorTypeRef(descriptor.inputTypes[position]!);
}

function mostSpecificDescriptors(
  candidates: readonly RegistryDescriptor[],
): readonly RegistryDescriptor[] {
  return candidates.filter(
    (candidate) =>
      !candidates.some(
        (other) => other !== candidate && dominatesDescriptor(other, candidate),
      ),
  );
}

function dominatesDescriptor(
  a: RegistryDescriptor,
  b: RegistryDescriptor,
): boolean {
  return isAtLeastAsSpecific(a, b) && !isAtLeastAsSpecific(b, a);
}

function isAtLeastAsSpecific(
  a: RegistryDescriptor,
  b: RegistryDescriptor,
): boolean {
  const length = Math.max(a.inputTypes.length, b.inputTypes.length, 1);
  for (let index = 0; index < length; index += 1) {
    if (
      !isDeclaredSubsetOrEqual(
        declaredInputType(a, index),
        declaredInputType(b, index),
      )
    ) {
      return false;
    }
  }
  return true;
}

function resolveTypeNestingDepth(value: number | undefined): number {
  const fallback = 64;
  const hardLimit = 256;
  if (value === undefined) return fallback;
  if (
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value <= 0 ||
    value > hardLimit
  ) {
    throw new RangeError(
      "maxNestingDepth must be a positive integer within its hard limit",
    );
  }
  return value;
}

function sortTypeDiagnostics(
  diagnostics: readonly RuleLoomDiagnostic[],
): readonly RuleLoomDiagnostic[] {
  return diagnostics.toSorted(
    (left, right) =>
      compareStrings(left.sourcePointer, right.sourcePointer) ||
      compareNumbers(
        typeCodeRanks[left.code] ?? 99,
        typeCodeRanks[right.code] ?? 99,
      ) ||
      compareStrings(left.message, right.message),
  );
}

const typeCodeRanks: Record<string, number> = {
  RL_TYPE_ARITY_MISMATCH: 0,
  RL_TYPE_INCOMPATIBLE_ARGUMENT: 1,
  RL_TYPE_AMBIGUOUS_OVERLOAD: 2,
  RL_TYPE_NO_MATCHING_OVERLOAD: 3,
  RL_TYPE_UNSAFE_NARROWING: 4,
  RL_TYPE_INVALID_RESULT_CONTEXT: 5,
  RL_PARSE_NESTING_TOO_DEEP: 6,
};

function typeDiagnostic(
  code: RuleLoomDiagnosticCode,
  sourcePointer: string,
  message: string,
): RuleLoomDiagnostic {
  return {
    code,
    severity: "error",
    message,
    sourcePointer: sourcePointer || "/",
  };
}

// --- Type lattice ------------------------------------------------------

function isUnionType(
  type: TypeRef,
): type is { readonly kind: "union"; readonly members: readonly TypeRef[] } {
  return typeof type === "object" && type !== null && type.kind === "union";
}

function isArrayType(
  type: TypeRef,
): type is { readonly kind: "array"; readonly element: TypeRef } {
  return typeof type === "object" && type !== null && type.kind === "array";
}

function isObjectType(type: TypeRef): type is { readonly kind: "object" } {
  return typeof type === "object" && type !== null && type.kind === "object";
}

function typeRefKey(type: TypeRef): string {
  if (typeof type === "string") return type;
  if (type.kind === "array") return `array<${typeRefKey(type.element)}>`;
  if (type.kind === "object") return "object";
  return `union<${type.members.map(typeRefKey).toSorted(compareStrings).join(",")}>`;
}

function describeTypeRef(type: TypeRef): string {
  if (typeof type === "string") return type;
  if (type.kind === "array") return `array<${describeTypeRef(type.element)}>`;
  if (type.kind === "object") return "object";
  return type.members.map(describeTypeRef).join(" | ");
}

function unionOf(...types: readonly TypeRef[]): TypeRef {
  const flattened: TypeRef[] = [];
  const flattenInto = (type: TypeRef) => {
    if (isUnionType(type)) {
      for (const member of type.members) flattenInto(member);
    } else {
      flattened.push(type);
    }
  };
  for (const type of types) flattenInto(type);
  if (flattened.length === 0) return "unknown";
  if (flattened.some((type) => type === "error")) return "error";
  const byKey = new Map<string, TypeRef>();
  for (const type of flattened) {
    const key = typeRefKey(type);
    if (!byKey.has(key)) byKey.set(key, type);
  }
  const deduped = [...byKey.values()];
  if (deduped.length === 1) return deduped[0]!;
  return {
    kind: "union",
    members: deduped.toSorted((left, right) =>
      compareStrings(typeRefKey(left), typeRefKey(right)),
    ),
  };
}

// Permissive check: does an inferred argument type satisfy a declared
// (descriptor) type? `unknown`, `missing`, and `error` members are always
// accepted so nullable/missing/unknown values are never rejected outright.
function isArgumentAccepted(argType: TypeRef, declaredType: TypeRef): boolean {
  if (declaredType === "unknown" || declaredType === "error") return true;
  if (argType === "unknown" || argType === "error" || argType === "missing")
    return true;
  const members = isUnionType(argType) ? argType.members : [argType];
  return members.every((member) => {
    if (member === "unknown" || member === "error" || member === "missing")
      return true;
    return isMemberAccepted(member, declaredType);
  });
}

function isMemberAccepted(member: TypeRef, declaredType: TypeRef): boolean {
  if (declaredType === "unknown" || declaredType === "error") return true;
  if (isUnionType(declaredType)) {
    return declaredType.members.some((candidate) =>
      isMemberAccepted(member, candidate),
    );
  }
  if (isArrayType(member)) return isArrayType(declaredType);
  if (isObjectType(member)) return isObjectType(declaredType);
  return typeRefKey(member) === typeRefKey(declaredType);
}

// Asymmetric declared-vs-declared subset relation used only to rank operator
// overload specificity (unlike isArgumentAccepted, `unknown` only absorbs on
// the right-hand side, so a narrower declared type is preferred deterministically).
function isDeclaredSubsetOrEqual(a: TypeRef, b: TypeRef): boolean {
  if (b === "unknown") return true;
  if (typeRefKey(a) === typeRefKey(b)) return true;
  if (a === "unknown") return false;
  if (isUnionType(b)) {
    const aMembers = isUnionType(a) ? a.members : [a];
    return aMembers.every((member) =>
      b.members.some((candidate) => isDeclaredSubsetOrEqual(member, candidate)),
    );
  }
  if (isUnionType(a)) return false;
  if (isArrayType(a) && isArrayType(b))
    return isDeclaredSubsetOrEqual(a.element, b.element);
  return false;
}

function isBooleanContextCompatible(type: TypeRef): boolean {
  if (type === "error") return true;
  const members = isUnionType(type) ? type.members : [type];
  return members.every(
    (member) =>
      member === "boolean" ||
      member === "missing" ||
      member === "unknown" ||
      member === "error",
  );
}

const descriptorTypeKeywords: Record<string, TypeRef> = {
  null: "null",
  boolean: "boolean",
  number: "number",
  string: "string",
  array: { kind: "array", element: "unknown" },
  object: { kind: "object" },
  missing: "missing",
  unknown: "unknown",
  error: "error",
};

function parseDescriptorTypeRef(raw: string): TypeRef {
  const segments = raw
    .split("|")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  if (segments.length === 0) return "unknown";
  return unionOf(
    ...segments.map((segment) => descriptorTypeKeywords[segment] ?? "unknown"),
  );
}

const defaultLimits = {
  maxDocumentBytes: 1024 * 1024,
  maxNestingDepth: 64,
  maxDiagnostics: 100,
} as const;
const hardLimits = {
  maxDocumentBytes: 16 * 1024 * 1024,
  maxNestingDepth: 256,
  maxDiagnostics: 1000,
} as const;
const maxVisitedNodes = 10_000;
const schemaCodeRanks: Record<SchemaDiagnostic["code"], number> = {
  RL_SCHEMA_REQUIRED: 0,
  RL_SCHEMA_TYPE: 1,
  RL_SCHEMA_UNKNOWN_FIELD: 2,
  RL_SCHEMA_INVALID_IDENTIFIER: 3,
  RL_SCHEMA_INVALID_POINTER: 4,
  RL_SCHEMA_INVALID_VERSION: 5,
  RL_SCHEMA_INVALID_OPERATOR: 6,
  RL_SCHEMA_PROTOTYPE_KEY: 7,
};

interface ParserLimits {
  readonly maxDocumentBytes: number;
  readonly maxNestingDepth: number;
  readonly maxDiagnostics: number;
}

interface CloneFrame {
  readonly value: unknown;
  readonly sourcePointer: string;
  readonly depth: number;
  readonly assign: (value: unknown) => void;
  readonly container?: JsonContainer;
  readonly countsTowardBudget?: boolean;
}

interface CloneResult {
  readonly value?: unknown;
  readonly diagnostic?: RuleLoomDiagnostic;
}

export function parseRuleSetDocument(
  text: string,
  options?: ParseRuleSetDocumentOptions,
): ParseRuleSetDocumentResult {
  const limits = resolveLimits(options);
  if (utf8ByteLength(text) > limits.maxDocumentBytes) {
    return failure(documentTooLargeDiagnostic());
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return failure(
      diagnostic("RL_PARSE_JSON_SYNTAX", "", "Invalid JSON document"),
    );
  }

  return validateParsedValue(parsed, limits);
}

export function validateRuleSetDocumentInput(
  value: unknown,
  options?: ParseRuleSetDocumentOptions,
): ParseRuleSetDocumentResult {
  return validateParsedValue(value, resolveLimits(options));
}

function validateParsedValue(
  value: unknown,
  limits: ParserLimits,
): ParseRuleSetDocumentResult {
  const cloneResult = cloneJsonValue(value, limits);
  if (cloneResult.diagnostic !== undefined) {
    return failure(cloneResult.diagnostic);
  }

  const clonedValue = cloneResult.value;
  if (
    isRecord(clonedValue) &&
    typeof clonedValue.schemaVersion === "string" &&
    clonedValue.schemaVersion !== ruleLoomLanguageVersion
  ) {
    return failure(
      diagnostic(
        "RL_PARSE_UNSUPPORTED_SCHEMA_VERSION",
        "/schemaVersion",
        "Unsupported schemaVersion",
      ),
    );
  }

  const validation = validateRuleSetDocument(
    clonedValue,
    limits.maxDiagnostics + 1,
  );
  if (!validation.valid) {
    return failure(normalizeSchemaDiagnostics(validation.diagnostics, limits));
  }

  freezeJsonValue(validation.value);
  return { ok: true, document: validation.value };
}

function resolveLimits(
  options: ParseRuleSetDocumentOptions | undefined,
): ParserLimits {
  return {
    maxDocumentBytes: resolveLimit(
      options?.maxDocumentBytes,
      "maxDocumentBytes",
    ),
    maxNestingDepth: resolveLimit(options?.maxNestingDepth, "maxNestingDepth"),
    maxDiagnostics: resolveLimit(options?.maxDiagnostics, "maxDiagnostics"),
  };
}

function resolveLimit(
  value: number | undefined,
  name: keyof ParserLimits,
): number {
  const fallback = defaultLimits[name];
  if (value === undefined) {
    return fallback;
  }
  if (
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value <= 0 ||
    value > hardLimits[name]
  ) {
    throw new RangeError(
      `${name} must be a positive integer within its hard limit`,
    );
  }
  return value;
}

function cloneJsonValue(value: unknown, limits: ParserLimits): CloneResult {
  let clonedRoot: unknown;
  let visitedNodes = 0;
  const visited = new WeakSet<object>();
  const frames: CloneFrame[] = [
    {
      value,
      sourcePointer: "",
      depth: 0,
      assign: (clonedValue) => {
        clonedRoot = clonedValue;
      },
    },
  ];

  while (frames.length > 0) {
    const frame = frames.pop()!;
    if (frame.container !== undefined) {
      if (visitedNodes >= maxVisitedNodes) {
        return {
          diagnostic: diagnostic(
            "RL_PARSE_NESTING_TOO_DEEP",
            frame.sourcePointer,
            "Document nesting exceeds the configured limit",
          ),
        };
      }
      const child = cloneContainerChild(frame);
      if (child !== undefined && "diagnostic" in child) {
        return { diagnostic: child.diagnostic };
      }
      if (child !== undefined) {
        visitedNodes += 1;
        frames.push(frame);
        frames.push(child);
      }
      continue;
    }
    const primitiveDiagnostic = clonePrimitive(
      frame.value,
      frame.sourcePointer,
      frame.assign,
    );
    if (primitiveDiagnostic !== undefined) {
      return { diagnostic: primitiveDiagnostic };
    }
    if (frame.value === null || typeof frame.value !== "object") {
      continue;
    }
    if (
      frame.depth > limits.maxNestingDepth ||
      (!frame.countsTowardBudget && ++visitedNodes > maxVisitedNodes)
    ) {
      return {
        diagnostic: diagnostic(
          "RL_PARSE_NESTING_TOO_DEEP",
          frame.sourcePointer,
          "Document nesting exceeds the configured limit",
        ),
      };
    }
    if (visited.has(frame.value)) {
      return {
        diagnostic: diagnostic(
          "RL_SCHEMA_TYPE",
          frame.sourcePointer,
          "Value must be JSON data",
        ),
      };
    }
    visited.add(frame.value);

    let container: ReturnType<typeof createJsonContainer>;
    try {
      container = createJsonContainer(frame.value, frame.sourcePointer);
    } catch {
      return {
        diagnostic: diagnostic(
          "RL_SCHEMA_TYPE",
          frame.sourcePointer,
          "Value must be JSON data",
        ),
      };
    }
    if ("diagnostic" in container) {
      return { diagnostic: container.diagnostic };
    }
    frame.assign(container.value);
    frames.push({
      value: frame.value,
      sourcePointer: frame.sourcePointer,
      depth: frame.depth,
      assign: frame.assign,
      container,
    });
  }

  return { value: clonedRoot };
}

interface JsonContainer {
  readonly value: object;
  readonly source: object;
  readonly keys: Generator<string>;
  readonly arrayLength?: number;
  keyCount: number;
}

function cloneContainerChild(
  frame: CloneFrame,
): CloneFrame | { readonly diagnostic: RuleLoomDiagnostic } | undefined {
  if (frame.container === undefined) {
    return undefined;
  }
  let nextKey: IteratorResult<string>;
  try {
    nextKey = frame.container.keys.next();
  } catch {
    return {
      diagnostic: diagnostic(
        "RL_SCHEMA_TYPE",
        frame.sourcePointer,
        "Value must be JSON data",
      ),
    };
  }
  if (nextKey.done) {
    if (
      frame.container.arrayLength !== undefined &&
      frame.container.keyCount !== frame.container.arrayLength
    ) {
      return {
        diagnostic: diagnostic(
          "RL_SCHEMA_TYPE",
          frame.sourcePointer,
          "Value must be JSON data",
        ),
      };
    }
    return undefined;
  }
  const key = nextKey.value;
  frame.container.keyCount += 1;
  if (
    hasLoneSurrogate(key) ||
    (frame.container.arrayLength !== undefined && !isArrayIndex(key))
  ) {
    return {
      diagnostic: diagnostic(
        hasLoneSurrogate(key) ? "RL_PARSE_INVALID_UNICODE" : "RL_SCHEMA_TYPE",
        frame.sourcePointer,
        hasLoneSurrogate(key)
          ? "Object member name contains an unpaired UTF-16 surrogate"
          : "Value must be JSON data",
      ),
    };
  }
  let descriptor: PropertyDescriptor | undefined;
  try {
    descriptor = Object.getOwnPropertyDescriptor(frame.container.source, key);
  } catch {
    return {
      diagnostic: diagnostic(
        "RL_SCHEMA_TYPE",
        frame.sourcePointer,
        "Value must be JSON data",
      ),
    };
  }
  if (descriptor === undefined || "get" in descriptor || "set" in descriptor) {
    return {
      diagnostic: diagnostic(
        "RL_SCHEMA_TYPE",
        frame.sourcePointer,
        "Value must be JSON data",
      ),
    };
  }
  return {
    value: descriptor.value,
    sourcePointer: appendPointer(frame.sourcePointer, key),
    depth: frame.depth + 1,
    countsTowardBudget: true,
    assign: (clonedValue) => {
      (frame.container!.value as Record<string, unknown>)[key] = clonedValue;
    },
  };
}

function clonePrimitive(
  value: unknown,
  sourcePointer: string,
  assign: (value: unknown) => void,
): RuleLoomDiagnostic | undefined {
  if (typeof value === "string") {
    if (hasLoneSurrogate(value)) {
      return diagnostic(
        "RL_PARSE_INVALID_UNICODE",
        sourcePointer,
        "String contains an unpaired UTF-16 surrogate",
      );
    }
    assign(value);
    return undefined;
  }
  if (
    value === null ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    assign(value);
    return undefined;
  }
  if (typeof value !== "object") {
    return diagnostic(
      "RL_SCHEMA_TYPE",
      sourcePointer,
      "Value must be JSON data",
    );
  }
  return undefined;
}

function createJsonContainer(
  value: object,
  sourcePointer: string,
): JsonContainer | { readonly diagnostic: RuleLoomDiagnostic } {
  const isArray = Array.isArray(value);
  if (!isArray) {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return {
        diagnostic: diagnostic(
          "RL_SCHEMA_TYPE",
          sourcePointer,
          "Value must be JSON data",
        ),
      };
    }
  }

  let arrayLength: number | undefined;
  if (isArray) {
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (
      lengthDescriptor === undefined ||
      "get" in lengthDescriptor ||
      "set" in lengthDescriptor ||
      typeof lengthDescriptor.value !== "number"
    ) {
      return {
        diagnostic: diagnostic(
          "RL_SCHEMA_TYPE",
          sourcePointer,
          "Value must be JSON data",
        ),
      };
    }
    arrayLength = lengthDescriptor.value;
  }

  const target: object = isArray ? [] : Object.create(null);
  return {
    value: target,
    source: value,
    keys: enumerableOwnStringKeys(value),
    keyCount: 0,
    ...(arrayLength === undefined ? {} : { arrayLength }),
  };
}

function* enumerableOwnStringKeys(value: object): Generator<string> {
  for (const key in value) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor?.enumerable === true) {
      yield key;
    }
  }
}

function isArrayIndex(key: string) {
  const numericKey = Number(key);
  return (
    Number.isInteger(numericKey) &&
    numericKey >= 0 &&
    numericKey < 2 ** 32 - 1 &&
    String(numericKey) === key
  );
}

function hasLoneSurrogate(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (!(nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)) {
        return true;
      }
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function utf8ByteLength(value: string) {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit < 0x80) {
      bytes += 1;
    } else if (codeUnit < 0x800) {
      bytes += 2;
    } else if (
      codeUnit >= 0xd800 &&
      codeUnit <= 0xdbff &&
      index + 1 < value.length &&
      value.charCodeAt(index + 1) >= 0xdc00 &&
      value.charCodeAt(index + 1) <= 0xdfff
    ) {
      bytes += 4;
      index += 1;
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

function normalizeSchemaDiagnostics(
  diagnostics: readonly SchemaDiagnostic[],
  limits: ParserLimits,
): readonly RuleLoomDiagnostic[] {
  const normalized = diagnostics
    .map((schemaDiagnostic, index) => ({
      diagnostic: diagnostic(
        schemaDiagnostic.code,
        schemaDiagnostic.path,
        schemaDiagnostic.message,
      ),
      index,
    }))
    .toSorted((left, right) => {
      const pointerOrder = compareSourcePointers(
        left.diagnostic.sourcePointer,
        right.diagnostic.sourcePointer,
      );
      if (pointerOrder !== 0) {
        return pointerOrder;
      }
      const codeOrder =
        schemaCodeRanks[left.diagnostic.code as SchemaDiagnostic["code"]] -
        schemaCodeRanks[right.diagnostic.code as SchemaDiagnostic["code"]];
      return codeOrder !== 0 ? codeOrder : left.index - right.index;
    })
    .map(({ diagnostic: normalizedDiagnostic }) => normalizedDiagnostic);

  if (normalized.length <= limits.maxDiagnostics) {
    return normalized;
  }
  return [
    ...normalized.slice(0, limits.maxDiagnostics - 1),
    diagnostic(
      "RL_PARSE_DIAGNOSTIC_LIMIT_REACHED",
      "",
      "Diagnostic limit reached",
    ),
  ];
}

function compareSourcePointers(left: string, right: string) {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

function freezeJsonValue(value: unknown) {
  const values: object[] = [];
  if (value !== null && typeof value === "object") {
    values.push(value);
  }
  while (values.length > 0) {
    const currentValue = values.pop()!;
    for (const nestedValue of Object.values(currentValue)) {
      if (nestedValue !== null && typeof nestedValue === "object") {
        values.push(nestedValue);
      }
    }
    Object.freeze(currentValue);
  }
}

function diagnostic(
  code: RuleLoomDiagnosticCode,
  sourcePointer: string,
  message: string,
): RuleLoomDiagnostic {
  return { code, severity: "error", message, sourcePointer };
}

function documentTooLargeDiagnostic(): RuleLoomDiagnostic {
  return diagnostic(
    "RL_PARSE_DOCUMENT_TOO_LARGE",
    "",
    "Document exceeds the configured byte limit",
  );
}

function failure(
  diagnostics: RuleLoomDiagnostic | readonly RuleLoomDiagnostic[],
): ParseRuleSetDocumentResult {
  return {
    ok: false,
    diagnostics: Array.isArray(diagnostics) ? diagnostics : [diagnostics],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function appendPointer(path: string, segment: string) {
  return `${path}/${segment.replaceAll("~", "~0").replaceAll("/", "~1")}`;
}
