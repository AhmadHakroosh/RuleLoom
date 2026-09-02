export const POINTER_DIAGNOSTIC_CODES = [
  "POINTER_INVALID_SYNTAX",
  "POINTER_INVALID_ESCAPE",
  "POINTER_DEPTH_EXCEEDED",
  "POINTER_TOKEN_TOO_LONG",
  "POINTER_UNSAFE_TOKEN",
  "POINTER_INVALID_ARRAY_INDEX",
  "POINTER_MISSING_SEGMENT",
  "POINTER_SCALAR_TRAVERSAL",
  "POINTER_ACCESSOR_PROPERTY",
  "POINTER_ACCESS_FAILURE",
] as const;

export type PointerDiagnosticCode = (typeof POINTER_DIAGNOSTIC_CODES)[number];

export type JsonPointerOptions = Readonly<{
  maxDepth?: number;
  maxTokenLength?: number;
}>;

type EffectiveJsonPointerOptions = Readonly<{
  maxDepth: number;
  maxTokenLength: number;
}>;

export type PointerFailure = Readonly<{
  ok: false;
  code: PointerDiagnosticCode;
}>;

export type CompiledJsonPointer = Readonly<{
  tokens: readonly string[];
  options: EffectiveJsonPointerOptions;
}>;

export type CompileJsonPointerResult =
  Readonly<{ ok: true; pointer: CompiledJsonPointer }> | PointerFailure;

export type ResolveJsonPointerResult =
  Readonly<{ ok: true; present: true; value: unknown }> | PointerFailure;

export const DEFAULT_JSON_POINTER_OPTIONS: EffectiveJsonPointerOptions =
  Object.freeze({ maxDepth: 64, maxTokenLength: 1024 });

const HARD_MAX_DEPTH = 1024;
const HARD_MAX_TOKEN_LENGTH = 65536;
const MAX_ARRAY_INDEX = "4294967294";
const UNSAFE_TOKENS = new Set(["__proto__", "prototype", "constructor"]);

function effectiveOptions(options: JsonPointerOptions = {}) {
  const maxDepth = options.maxDepth ?? DEFAULT_JSON_POINTER_OPTIONS.maxDepth;
  const maxTokenLength =
    options.maxTokenLength ?? DEFAULT_JSON_POINTER_OPTIONS.maxTokenLength;

  if (
    !Number.isSafeInteger(maxDepth) ||
    maxDepth < 1 ||
    maxDepth > HARD_MAX_DEPTH
  ) {
    throw new RangeError("maxDepth must be a positive integer at most 1024");
  }
  if (
    !Number.isSafeInteger(maxTokenLength) ||
    maxTokenLength < 1 ||
    maxTokenLength > HARD_MAX_TOKEN_LENGTH
  ) {
    throw new RangeError(
      "maxTokenLength must be a positive integer at most 65536",
    );
  }

  return Object.freeze({ maxDepth, maxTokenLength });
}

function failure(code: PointerDiagnosticCode): PointerFailure {
  return { ok: false, code };
}

function countTokens(pointer: string, maxDepth: number) {
  let depth = 0;
  for (const character of pointer) {
    if (character === "/") {
      depth += 1;
      if (depth > maxDepth) {
        return false;
      }
    }
  }
  return true;
}

function decodeToken(
  pointer: string,
  start: number,
  end: number,
  maxTokenLength: number,
): string | PointerFailure {
  let decoded = "";
  for (let index = start; index < end; index += 1) {
    const character = pointer[index];
    if (character !== "~") {
      decoded += character;
    } else {
      const escape = pointer[index + 1];
      if (escape !== "0" && escape !== "1") {
        return failure("POINTER_INVALID_ESCAPE");
      }
      decoded += escape === "0" ? "~" : "/";
      index += 1;
    }
    if (decoded.length > maxTokenLength) {
      return failure("POINTER_TOKEN_TOO_LONG");
    }
  }
  return decoded;
}

export function compileJsonPointer(
  pointer: string,
  options?: JsonPointerOptions,
): CompileJsonPointerResult {
  const limits = effectiveOptions(options);
  if (pointer.length === 0) {
    return {
      ok: true,
      pointer: Object.freeze({
        tokens: Object.freeze([]),
        options: limits,
      }),
    };
  }
  if (!pointer.startsWith("/")) {
    return failure("POINTER_INVALID_SYNTAX");
  }
  if (!countTokens(pointer, limits.maxDepth)) {
    return failure("POINTER_DEPTH_EXCEEDED");
  }

  const tokens: string[] = [];
  let tokenStart = 1;
  for (let index = 1; index <= pointer.length; index += 1) {
    if (index !== pointer.length && pointer[index] !== "/") {
      continue;
    }
    const token = decodeToken(
      pointer,
      tokenStart,
      index,
      limits.maxTokenLength,
    );
    if (typeof token !== "string") {
      return token;
    }
    if (UNSAFE_TOKENS.has(token)) {
      return failure("POINTER_UNSAFE_TOKEN");
    }
    tokens.push(token);
    tokenStart = index + 1;
  }

  return {
    ok: true,
    pointer: Object.freeze({
      tokens: Object.freeze(tokens),
      options: limits,
    }),
  };
}

function isCanonicalArrayIndex(token: string) {
  if (token === "0") {
    return true;
  }
  if (!/^[1-9][0-9]*$/.test(token)) {
    return false;
  }
  return (
    token.length < MAX_ARRAY_INDEX.length ||
    (token.length === MAX_ARRAY_INDEX.length && token <= MAX_ARRAY_INDEX)
  );
}

export function resolveJsonPointer(
  pointer: CompiledJsonPointer,
  root: unknown,
): ResolveJsonPointerResult {
  let current = root;
  for (const token of pointer.tokens) {
    if (current === null || typeof current !== "object") {
      return failure("POINTER_SCALAR_TRAVERSAL");
    }
    if (Array.isArray(current) && !isCanonicalArrayIndex(token)) {
      return failure("POINTER_INVALID_ARRAY_INDEX");
    }
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(current, token);
    } catch {
      return failure("POINTER_ACCESS_FAILURE");
    }
    if (descriptor === undefined) {
      return failure("POINTER_MISSING_SEGMENT");
    }
    if (!("value" in descriptor)) {
      return failure("POINTER_ACCESSOR_PROPERTY");
    }
    current = descriptor.value;
  }
  return { ok: true, present: true, value: current };
}
