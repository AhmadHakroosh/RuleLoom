import { corePackageName } from "@ruleloom/core";

export const schemaPackageName = "@ruleloom/schema" as const;
export const schemaCoreDependency = corePackageName;

export const ruleLoomV1SchemaId =
  "https://ruleloom.dev/schemas/ruleloom-v1.schema.json" as const;
export const ruleLoomLanguageVersion = "1.0" as const;

export type Brand<Value, Name extends string> = Value & {
  readonly __brand: Name;
};

export type RuleSetId = Brand<string, "RuleSetId">;
export type RuleId = Brand<string, "RuleId">;
export type FactId = Brand<string, "FactId">;
export type ParameterId = Brand<string, "ParameterId">;
export type LocalId = Brand<string, "LocalId">;
export type ActionType = Brand<string, "ActionType">;
export type JsonPointer = Brand<string, "JsonPointer">;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export interface RuleSetDocument {
  readonly schemaVersion: typeof ruleLoomLanguageVersion;
  readonly id: RuleSetId;
  readonly metadata?: Metadata;
  readonly parameters?: Parameters;
  readonly rules: readonly Rule[];
}

export type Metadata = { readonly [key: string]: JsonValue };
export type Parameters = { readonly [key: string]: JsonValue };

export interface Rule {
  readonly id: RuleId;
  readonly when: Expression;
  readonly actions?: readonly Action[];
  readonly metadata?: Metadata;
}

export interface Action {
  readonly type: ActionType;
  readonly payload?: JsonValue;
  readonly metadata?: Metadata;
}

export type Expression =
  | LiteralExpression
  | FactReferenceExpression
  | ParameterReferenceExpression
  | LocalReferenceExpression
  | OperatorCallExpression
  | ExtensionExpression;

export interface LiteralExpression {
  readonly literal: JsonValue;
}

export interface FactReferenceExpression {
  readonly fact: FactId;
  readonly path?: JsonPointer;
}

export interface ParameterReferenceExpression {
  readonly parameter: ParameterId;
  readonly path?: JsonPointer;
}

export interface LocalReferenceExpression {
  readonly local: LocalId;
}

export type OperatorName =
  "all" | "any" | "not" | "eq" | "lt" | "lte" | "gt" | "gte" | "in";

export type OperatorCallExpression =
  | AllExpression
  | AnyExpression
  | NotExpression
  | EqExpression
  | LtExpression
  | LteExpression
  | GtExpression
  | GteExpression
  | InExpression;

export interface AllExpression {
  readonly all: readonly Expression[];
}

export interface AnyExpression {
  readonly any: readonly Expression[];
}

export interface NotExpression {
  readonly not: Expression | readonly [Expression];
}

export interface EqExpression {
  readonly eq: readonly [Expression, Expression];
}

export interface LtExpression {
  readonly lt: readonly [Expression, Expression];
}

export interface LteExpression {
  readonly lte: readonly [Expression, Expression];
}

export interface GtExpression {
  readonly gt: readonly [Expression, Expression];
}

export interface GteExpression {
  readonly gte: readonly [Expression, Expression];
}

export interface InExpression {
  readonly in: readonly [Expression, Expression];
}

export interface ExtensionExpression {
  readonly extension: string;
  readonly required: boolean;
  readonly args?: readonly Expression[];
}

export type SchemaDiagnosticCode =
  | "RL_SCHEMA_REQUIRED"
  | "RL_SCHEMA_TYPE"
  | "RL_SCHEMA_UNKNOWN_FIELD"
  | "RL_SCHEMA_INVALID_IDENTIFIER"
  | "RL_SCHEMA_INVALID_POINTER"
  | "RL_SCHEMA_INVALID_VERSION"
  | "RL_SCHEMA_INVALID_OPERATOR"
  | "RL_SCHEMA_PROTOTYPE_KEY";

export interface SchemaDiagnostic {
  readonly code: SchemaDiagnosticCode;
  readonly path: string;
  readonly expected: string;
  readonly message: string;
}

export type RuleSetValidationResult =
  | {
      readonly valid: true;
      readonly value: RuleSetDocument;
      readonly diagnostics: readonly [];
    }
  | {
      readonly valid: false;
      readonly diagnostics: readonly SchemaDiagnostic[];
    };

export const ruleLoomV1SchemaFeatures = {
  schemaVersion: ruleLoomLanguageVersion,
  expressionForms: ["literal", "fact", "parameter", "local", "extension"],
  operators: ["all", "any", "not", "eq", "lt", "lte", "gt", "gte", "in"],
  diagnosticCodes: [
    "RL_SCHEMA_REQUIRED",
    "RL_SCHEMA_TYPE",
    "RL_SCHEMA_UNKNOWN_FIELD",
    "RL_SCHEMA_INVALID_IDENTIFIER",
    "RL_SCHEMA_INVALID_POINTER",
    "RL_SCHEMA_INVALID_VERSION",
    "RL_SCHEMA_INVALID_OPERATOR",
    "RL_SCHEMA_PROTOTYPE_KEY",
  ],
} as const;

export const ruleLoomV1Schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: ruleLoomV1SchemaId,
  title: "RuleLoom v1 Rule Set",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "id", "rules"],
  properties: {
    schemaVersion: { const: ruleLoomLanguageVersion },
    id: { $ref: "#/$defs/identifier" },
    metadata: { $ref: "#/$defs/metadata" },
    parameters: { $ref: "#/$defs/parameters" },
    rules: {
      type: "array",
      items: { $ref: "#/$defs/rule" },
    },
  },
  $defs: {
    identifier: {
      type: "string",
      pattern: "^[A-Za-z][A-Za-z0-9_-]{0,127}$",
    },
    jsonPointer: {
      type: "string",
      pattern: "^(?:$|/(?:[^/~]|~0|~1)*)*$",
    },
    safeObject: {
      type: "object",
      propertyNames: {
        not: { enum: ["__proto__", "constructor", "prototype"] },
      },
    },
    metadata: {
      allOf: [{ $ref: "#/$defs/safeObject" }],
      additionalProperties: { $ref: "#/$defs/jsonValue" },
    },
    parameters: {
      allOf: [{ $ref: "#/$defs/safeObject" }],
      additionalProperties: { $ref: "#/$defs/jsonValue" },
    },
    jsonValue: {
      oneOf: [
        { type: "string" },
        { type: "number" },
        { type: "boolean" },
        { type: "null" },
        { type: "array", items: { $ref: "#/$defs/jsonValue" } },
        {
          allOf: [{ $ref: "#/$defs/safeObject" }],
          additionalProperties: { $ref: "#/$defs/jsonValue" },
        },
      ],
    },
    rule: {
      type: "object",
      additionalProperties: false,
      required: ["id", "when"],
      properties: {
        id: { $ref: "#/$defs/identifier" },
        when: { $ref: "#/$defs/expression" },
        actions: { type: "array", items: { $ref: "#/$defs/action" } },
        metadata: { $ref: "#/$defs/metadata" },
      },
    },
    action: {
      type: "object",
      additionalProperties: false,
      required: ["type"],
      properties: {
        type: { $ref: "#/$defs/identifier" },
        payload: { $ref: "#/$defs/jsonValue" },
        metadata: { $ref: "#/$defs/metadata" },
      },
    },
    expression: {
      oneOf: [
        { $ref: "#/$defs/literalExpression" },
        { $ref: "#/$defs/factReferenceExpression" },
        { $ref: "#/$defs/parameterReferenceExpression" },
        { $ref: "#/$defs/localReferenceExpression" },
        { $ref: "#/$defs/operatorCallExpression" },
        { $ref: "#/$defs/extensionExpression" },
      ],
    },
    literalExpression: {
      type: "object",
      additionalProperties: false,
      required: ["literal"],
      properties: { literal: { $ref: "#/$defs/jsonValue" } },
    },
    factReferenceExpression: {
      type: "object",
      additionalProperties: false,
      required: ["fact"],
      properties: {
        fact: { $ref: "#/$defs/identifier" },
        path: { $ref: "#/$defs/jsonPointer" },
      },
    },
    parameterReferenceExpression: {
      type: "object",
      additionalProperties: false,
      required: ["parameter"],
      properties: {
        parameter: { $ref: "#/$defs/identifier" },
        path: { $ref: "#/$defs/jsonPointer" },
      },
    },
    localReferenceExpression: {
      type: "object",
      additionalProperties: false,
      required: ["local"],
      properties: { local: { $ref: "#/$defs/identifier" } },
    },
    operatorCallExpression: {
      type: "object",
      additionalProperties: false,
      minProperties: 1,
      maxProperties: 1,
      properties: {
        all: { type: "array", items: { $ref: "#/$defs/expression" } },
        any: { type: "array", items: { $ref: "#/$defs/expression" } },
        not: {
          oneOf: [
            { $ref: "#/$defs/expression" },
            {
              type: "array",
              minItems: 1,
              maxItems: 1,
              items: { $ref: "#/$defs/expression" },
            },
          ],
        },
        eq: { $ref: "#/$defs/binaryExpressionArray" },
        lt: { $ref: "#/$defs/binaryExpressionArray" },
        lte: { $ref: "#/$defs/binaryExpressionArray" },
        gt: { $ref: "#/$defs/binaryExpressionArray" },
        gte: { $ref: "#/$defs/binaryExpressionArray" },
        in: { $ref: "#/$defs/binaryExpressionArray" },
      },
    },
    binaryExpressionArray: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: { $ref: "#/$defs/expression" },
    },
    extensionExpression: {
      type: "object",
      additionalProperties: false,
      required: ["extension", "required"],
      properties: {
        extension: { type: "string", minLength: 1 },
        required: { type: "boolean" },
        args: { type: "array", items: { $ref: "#/$defs/expression" } },
      },
    },
  },
} as const;

const identifierPattern = /^[A-Za-z][A-Za-z0-9_-]{0,127}$/u;
const jsonPointerPattern = /^(?:$|\/(?:[^/~]|~0|~1)*)*$/u;
const prototypeKeys = new Set(["__proto__", "constructor", "prototype"]);
const expressionPrimaryKeys = new Set([
  "literal",
  "fact",
  "parameter",
  "local",
  "extension",
  "all",
  "any",
  "not",
  "eq",
  "lt",
  "lte",
  "gt",
  "gte",
  "in",
]);
const binaryOperators = new Set(["eq", "lt", "lte", "gt", "gte", "in"]);

export function validateRuleSetDocument(
  value: unknown,
  maxDiagnostics = Number.POSITIVE_INFINITY,
): RuleSetValidationResult {
  const diagnostics = [] as SchemaDiagnostic[];
  Object.defineProperty(diagnostics, "maxDiagnostics", {
    value: maxDiagnostics,
  });
  validateRuleSet(value, "", diagnostics);

  if (diagnostics.length > 0) {
    return { valid: false, diagnostics };
  }

  return {
    valid: true,
    value: value as RuleSetDocument,
    diagnostics: [],
  };
}

function pushDiagnostic(
  diagnostics: SchemaDiagnostic[],
  code: SchemaDiagnosticCode,
  path: string,
  expected: string,
  message: string,
) {
  if (
    diagnostics.length >=
    (diagnostics as SchemaDiagnostic[] & { maxDiagnostics?: number })
      .maxDiagnostics!
  ) {
    return;
  }
  diagnostics.push({ code, path, expected, message });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validateSafeObjectKeys(
  value: Record<string, unknown>,
  path: string,
  diagnostics: SchemaDiagnostic[],
) {
  for (const key of Object.keys(value)) {
    if (prototypeKeys.has(key)) {
      pushDiagnostic(
        diagnostics,
        "RL_SCHEMA_PROTOTYPE_KEY",
        appendPath(path, key),
        "object key that cannot mutate prototypes",
        `Property ${key} is not allowed`,
      );
    }
  }
}

function validateAllowedKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  path: string,
  diagnostics: SchemaDiagnostic[],
) {
  validateSafeObjectKeys(value, path, diagnostics);
  const allowed = new Set(allowedKeys);

  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      pushDiagnostic(
        diagnostics,
        "RL_SCHEMA_UNKNOWN_FIELD",
        appendPath(path, key),
        `one of: ${allowedKeys.join(", ")}`,
        `Unknown field ${key}`,
      );
    }
  }
}

function requireProperty(
  value: Record<string, unknown>,
  key: string,
  path: string,
  diagnostics: SchemaDiagnostic[],
) {
  if (!(key in value)) {
    pushDiagnostic(
      diagnostics,
      "RL_SCHEMA_REQUIRED",
      appendPath(path, key),
      "required property",
      `Missing required property ${key}`,
    );
  }
}

function validateRuleSet(
  value: unknown,
  path: string,
  diagnostics: SchemaDiagnostic[],
) {
  if (!isRecord(value)) {
    pushDiagnostic(
      diagnostics,
      "RL_SCHEMA_TYPE",
      path,
      "rule set object",
      "Rule set must be an object",
    );
    return;
  }

  validateAllowedKeys(
    value,
    ["schemaVersion", "id", "metadata", "parameters", "rules"],
    path,
    diagnostics,
  );
  requireProperty(value, "schemaVersion", path, diagnostics);
  requireProperty(value, "id", path, diagnostics);
  requireProperty(value, "rules", path, diagnostics);

  if (value.schemaVersion !== ruleLoomLanguageVersion) {
    pushDiagnostic(
      diagnostics,
      "RL_SCHEMA_INVALID_VERSION",
      appendPath(path, "schemaVersion"),
      ruleLoomLanguageVersion,
      "Unsupported schemaVersion",
    );
  }

  validateIdentifier(
    value.id,
    appendPath(path, "id"),
    "rule set identifier",
    diagnostics,
  );

  if ("metadata" in value) {
    validateJsonObject(
      value.metadata,
      appendPath(path, "metadata"),
      diagnostics,
    );
  }
  if ("parameters" in value) {
    validateJsonObject(
      value.parameters,
      appendPath(path, "parameters"),
      diagnostics,
    );
  }

  if (!Array.isArray(value.rules)) {
    pushDiagnostic(
      diagnostics,
      "RL_SCHEMA_TYPE",
      appendPath(path, "rules"),
      "array of rules",
      "rules must be an array",
    );
    return;
  }

  value.rules.forEach((rule, index) => {
    validateRule(rule, `${appendPath(path, "rules")}/${index}`, diagnostics);
  });
}

function validateRule(
  value: unknown,
  path: string,
  diagnostics: SchemaDiagnostic[],
) {
  if (!isRecord(value)) {
    pushDiagnostic(
      diagnostics,
      "RL_SCHEMA_TYPE",
      path,
      "rule object",
      "Rule must be an object",
    );
    return;
  }

  validateAllowedKeys(
    value,
    ["id", "when", "actions", "metadata"],
    path,
    diagnostics,
  );
  requireProperty(value, "id", path, diagnostics);
  requireProperty(value, "when", path, diagnostics);
  validateIdentifier(
    value.id,
    appendPath(path, "id"),
    "rule identifier",
    diagnostics,
  );

  if ("when" in value) {
    validateExpression(value.when, appendPath(path, "when"), diagnostics);
  }
  if ("metadata" in value) {
    validateJsonObject(
      value.metadata,
      appendPath(path, "metadata"),
      diagnostics,
    );
  }
  if ("actions" in value) {
    validateActionArray(
      value.actions,
      appendPath(path, "actions"),
      diagnostics,
    );
  }
}

function validateActionArray(
  value: unknown,
  path: string,
  diagnostics: SchemaDiagnostic[],
) {
  if (!Array.isArray(value)) {
    pushDiagnostic(
      diagnostics,
      "RL_SCHEMA_TYPE",
      path,
      "array of actions",
      "actions must be an array",
    );
    return;
  }

  value.forEach((action, index) =>
    validateAction(action, `${path}/${index}`, diagnostics),
  );
}

function validateAction(
  value: unknown,
  path: string,
  diagnostics: SchemaDiagnostic[],
) {
  if (!isRecord(value)) {
    pushDiagnostic(
      diagnostics,
      "RL_SCHEMA_TYPE",
      path,
      "action object",
      "Action must be an object",
    );
    return;
  }

  validateAllowedKeys(
    value,
    ["type", "payload", "metadata"],
    path,
    diagnostics,
  );
  requireProperty(value, "type", path, diagnostics);
  validateIdentifier(
    value.type,
    appendPath(path, "type"),
    "action type",
    diagnostics,
  );

  if ("payload" in value) {
    validateJsonValue(value.payload, appendPath(path, "payload"), diagnostics);
  }
  if ("metadata" in value) {
    validateJsonObject(
      value.metadata,
      appendPath(path, "metadata"),
      diagnostics,
    );
  }
}

function validateExpression(
  value: unknown,
  path: string,
  diagnostics: SchemaDiagnostic[],
) {
  if (!isRecord(value)) {
    pushDiagnostic(
      diagnostics,
      "RL_SCHEMA_TYPE",
      path,
      "expression object",
      "Expression must be an object",
    );
    return;
  }

  validateSafeObjectKeys(value, path, diagnostics);
  const primaryKeys = Object.keys(value).filter((key) =>
    expressionPrimaryKeys.has(key),
  );
  if (primaryKeys.length !== 1) {
    pushDiagnostic(
      diagnostics,
      "RL_SCHEMA_INVALID_OPERATOR",
      path,
      "exactly one canonical expression form",
      "Expression must contain exactly one primary expression key",
    );
    return;
  }

  const primaryKey = primaryKeys[0]!;
  switch (primaryKey) {
    case "literal":
      validateAllowedKeys(value, ["literal"], path, diagnostics);
      validateJsonValue(
        value.literal,
        appendPath(path, "literal"),
        diagnostics,
      );
      return;
    case "fact":
      validateAllowedKeys(value, ["fact", "path"], path, diagnostics);
      validateIdentifier(
        value.fact,
        appendPath(path, "fact"),
        "fact identifier",
        diagnostics,
      );
      validateOptionalJsonPointer(
        value.path,
        appendPath(path, "path"),
        diagnostics,
      );
      return;
    case "parameter":
      validateAllowedKeys(value, ["parameter", "path"], path, diagnostics);
      validateIdentifier(
        value.parameter,
        appendPath(path, "parameter"),
        "parameter identifier",
        diagnostics,
      );
      validateOptionalJsonPointer(
        value.path,
        appendPath(path, "path"),
        diagnostics,
      );
      return;
    case "local":
      validateAllowedKeys(value, ["local"], path, diagnostics);
      validateIdentifier(
        value.local,
        appendPath(path, "local"),
        "local identifier",
        diagnostics,
      );
      return;
    case "extension":
      validateExtensionExpression(value, path, diagnostics);
      return;
    case "all":
    case "any":
      validateAllowedKeys(value, [primaryKey], path, diagnostics);
      validateExpressionArray(
        value[primaryKey],
        appendPath(path, primaryKey),
        diagnostics,
      );
      return;
    case "not":
      validateAllowedKeys(value, ["not"], path, diagnostics);
      validateNotOperand(value.not, appendPath(path, "not"), diagnostics);
      return;
    default:
      validateAllowedKeys(value, [primaryKey], path, diagnostics);
      validateBinaryOperator(
        primaryKey,
        value[primaryKey],
        appendPath(path, primaryKey),
        diagnostics,
      );
  }
}

function validateExtensionExpression(
  value: Record<string, unknown>,
  path: string,
  diagnostics: SchemaDiagnostic[],
) {
  validateAllowedKeys(
    value,
    ["extension", "required", "args"],
    path,
    diagnostics,
  );
  requireProperty(value, "extension", path, diagnostics);
  requireProperty(value, "required", path, diagnostics);

  if (
    typeof value.extension !== "string" ||
    value.extension.trim().length === 0
  ) {
    pushDiagnostic(
      diagnostics,
      "RL_SCHEMA_TYPE",
      appendPath(path, "extension"),
      "non-empty string",
      "extension must be a non-empty string",
    );
  }
  if (typeof value.required !== "boolean") {
    pushDiagnostic(
      diagnostics,
      "RL_SCHEMA_TYPE",
      appendPath(path, "required"),
      "boolean",
      "required must be a boolean",
    );
  }
  if ("args" in value) {
    validateExpressionArray(value.args, appendPath(path, "args"), diagnostics);
  }
}

function validateExpressionArray(
  value: unknown,
  path: string,
  diagnostics: SchemaDiagnostic[],
) {
  if (!Array.isArray(value)) {
    pushDiagnostic(
      diagnostics,
      "RL_SCHEMA_TYPE",
      path,
      "array of expressions",
      "Operator operands must be an array",
    );
    return;
  }

  value.forEach((expression, index) =>
    validateExpression(expression, `${path}/${index}`, diagnostics),
  );
}

function validateNotOperand(
  value: unknown,
  path: string,
  diagnostics: SchemaDiagnostic[],
) {
  if (Array.isArray(value)) {
    if (value.length !== 1) {
      pushDiagnostic(
        diagnostics,
        "RL_SCHEMA_TYPE",
        path,
        "single expression operand",
        "not array form must contain exactly one operand",
      );
    }
    value.forEach((expression, index) =>
      validateExpression(expression, `${path}/${index}`, diagnostics),
    );
    return;
  }

  validateExpression(value, path, diagnostics);
}

function validateBinaryOperator(
  operator: string,
  value: unknown,
  path: string,
  diagnostics: SchemaDiagnostic[],
) {
  if (!binaryOperators.has(operator)) {
    pushDiagnostic(
      diagnostics,
      "RL_SCHEMA_INVALID_OPERATOR",
      path,
      "known operator",
      "Unknown operator",
    );
    return;
  }

  if (!Array.isArray(value) || value.length !== 2) {
    pushDiagnostic(
      diagnostics,
      "RL_SCHEMA_TYPE",
      path,
      "array with exactly two expression operands",
      `${operator} must have exactly two operands`,
    );
    return;
  }

  value.forEach((expression, index) =>
    validateExpression(expression, `${path}/${index}`, diagnostics),
  );
}

function validateIdentifier(
  value: unknown,
  path: string,
  expected: string,
  diagnostics: SchemaDiagnostic[],
) {
  if (typeof value !== "string" || !identifierPattern.test(value)) {
    pushDiagnostic(
      diagnostics,
      "RL_SCHEMA_INVALID_IDENTIFIER",
      path,
      expected,
      `${expected} must match ${identifierPattern.source}`,
    );
  }
}

function validateOptionalJsonPointer(
  value: unknown,
  path: string,
  diagnostics: SchemaDiagnostic[],
) {
  if (value === undefined) {
    return;
  }

  if (typeof value !== "string" || !jsonPointerPattern.test(value)) {
    pushDiagnostic(
      diagnostics,
      "RL_SCHEMA_INVALID_POINTER",
      path,
      "RFC 6901 JSON Pointer string",
      "path must be an RFC 6901 JSON Pointer",
    );
  }
}

function validateJsonObject(
  value: unknown,
  path: string,
  diagnostics: SchemaDiagnostic[],
) {
  if (!isRecord(value)) {
    pushDiagnostic(
      diagnostics,
      "RL_SCHEMA_TYPE",
      path,
      "JSON object",
      "Value must be an object",
    );
    return;
  }

  validateSafeObjectKeys(value, path, diagnostics);
  for (const [key, nestedValue] of Object.entries(value)) {
    validateJsonValue(nestedValue, appendPath(path, key), diagnostics);
  }
}

function validateJsonValue(
  value: unknown,
  path: string,
  diagnostics: SchemaDiagnostic[],
) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      pushDiagnostic(
        diagnostics,
        "RL_SCHEMA_TYPE",
        path,
        "finite JSON number",
        "Number must be finite",
      );
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateJsonValue(item, `${path}/${index}`, diagnostics),
    );
    return;
  }

  if (isRecord(value)) {
    validateJsonObject(value, path, diagnostics);
    return;
  }

  pushDiagnostic(
    diagnostics,
    "RL_SCHEMA_TYPE",
    path,
    "JSON value",
    "Value must be JSON data",
  );
}

function appendPath(path: string, segment: string) {
  return `${path}/${segment.replaceAll("~", "~0").replaceAll("/", "~1")}`;
}
