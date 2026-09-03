import { corePackageName } from "@ruleloom/core";
import {
  ruleLoomLanguageVersion,
  schemaPackageName,
  validateRuleSetDocument,
  type RuleSetDocument,
  type SchemaDiagnostic,
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
  | "RL_PARSE_DIAGNOSTIC_LIMIT_REACHED";

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
