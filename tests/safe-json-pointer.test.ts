import { describe, expect, it, vi } from "vitest";
import {
  compileJsonPointer,
  resolveJsonPointer,
} from "../packages/core/src/safe-json-pointer.js";

function compile(
  pointer: string,
  options?: Parameters<typeof compileJsonPointer>[1],
) {
  const result = compileJsonPointer(pointer, options);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.code);
  return result.pointer;
}

function resolve(
  pointer: string,
  root: unknown,
  options?: Parameters<typeof compileJsonPointer>[1],
) {
  return resolveJsonPointer(compile(pointer, options), root);
}

describe("internal safe JSON Pointer", () => {
  it("resolves the root, including undefined", () => {
    expect(resolve("", undefined)).toEqual({
      ok: true,
      present: true,
      value: undefined,
    });
    expect(resolve("", 3)).toEqual({ ok: true, present: true, value: 3 });
  });

  it("decodes RFC 6901 vectors and escapes", () => {
    const document = {
      "": "empty",
      "a/b": "slash",
      "m~n": "tilde",
      "e^f": "caret",
      "g\\h": "backslash",
      "i|j": "pipe",
      'k"l': "quote",
      " ": "space",
    };
    expect(resolve("/", document)).toEqual({
      ok: true,
      present: true,
      value: "empty",
    });
    expect(resolve("/a~1b", document)).toEqual({
      ok: true,
      present: true,
      value: "slash",
    });
    expect(resolve("/m~0n", document)).toEqual({
      ok: true,
      present: true,
      value: "tilde",
    });
    expect(resolve("/e^f", document)).toEqual({
      ok: true,
      present: true,
      value: "caret",
    });
    expect(resolve("/i|j", document)).toEqual({
      ok: true,
      present: true,
      value: "pipe",
    });
    expect(resolve('/k"l', document)).toEqual({
      ok: true,
      present: true,
      value: "quote",
    });
    expect(resolve("/ ", document)).toEqual({
      ok: true,
      present: true,
      value: "space",
    });
  });

  it("rejects syntax, escapes, unsafe tokens, and sensitive diagnostics", () => {
    for (const [pointer, code] of [
      ["a", "POINTER_INVALID_SYNTAX"],
      ["/~", "POINTER_INVALID_ESCAPE"],
      ["/~2", "POINTER_INVALID_ESCAPE"],
      ["/__proto__", "POINTER_UNSAFE_TOKEN"],
      ["/prototype", "POINTER_UNSAFE_TOKEN"],
      ["/constructor", "POINTER_UNSAFE_TOKEN"],
    ] as const) {
      const result = compileJsonPointer(pointer);
      expect(result).toEqual({ ok: false, code });
      expect(result).not.toHaveProperty("pointer");
      expect(result).not.toHaveProperty("value");
    }
    expect(resolve("/~1__proto__", { "/__proto__": "safe" })).toEqual({
      ok: true,
      present: true,
      value: "safe",
    });
  });

  it("distinguishes own undefined, missing, inherited, and accessor properties", () => {
    const inherited = Object.create({ inherited: "no" }) as {
      own?: undefined;
    } & Record<string, unknown>;
    Object.defineProperty(inherited, "own", {
      value: undefined,
      enumerable: true,
    });
    let invoked = false;
    Object.defineProperty(inherited, "getter", {
      get() {
        invoked = true;
        return "secret";
      },
    });
    Object.defineProperty(inherited, "setter", {
      set: () => {
        invoked = true;
      },
    });
    expect(resolve("/own", inherited)).toEqual({
      ok: true,
      present: true,
      value: undefined,
    });
    expect(resolve("/missing", inherited)).toEqual({
      ok: false,
      code: "POINTER_MISSING_SEGMENT",
    });
    expect(resolve("/inherited", inherited)).toEqual({
      ok: false,
      code: "POINTER_MISSING_SEGMENT",
    });
    expect(resolve("/getter", inherited)).toEqual({
      ok: false,
      code: "POINTER_ACCESSOR_PROPERTY",
    });
    expect(resolve("/setter", inherited)).toEqual({
      ok: false,
      code: "POINTER_ACCESSOR_PROPERTY",
    });
    expect(invoked).toBe(false);
  });

  it("uses canonical bounded array indexes and descriptor presence", () => {
    const values: unknown[] = [];
    values[0] = "zero";
    values[2] = undefined;
    Object.defineProperty(values, "4294967294", { value: "max" });
    Object.setPrototypeOf(values, { 1: "inherited" });
    expect(resolve("/0", values)).toEqual({
      ok: true,
      present: true,
      value: "zero",
    });
    expect(resolve("/2", values)).toEqual({
      ok: true,
      present: true,
      value: undefined,
    });
    expect(resolve("/1", values)).toEqual({
      ok: false,
      code: "POINTER_MISSING_SEGMENT",
    });
    expect(resolve("/4294967294", values)).toEqual({
      ok: true,
      present: true,
      value: "max",
    });
    for (const token of [
      "00",
      "01",
      "-",
      "+1",
      "1.0",
      "1e0",
      "4294967295",
      "999999999999999999999999",
    ]) {
      expect(resolve(`/${token}`, values)).toEqual({
        ok: false,
        code: "POINTER_INVALID_ARRAY_INDEX",
      });
    }
  });

  it("does not treat strings or scalars as containers", () => {
    for (const value of [
      null,
      undefined,
      "text",
      1,
      false,
      1n,
      Symbol("value"),
    ]) {
      expect(resolve("/x", value)).toEqual({
        ok: false,
        code: "POINTER_SCALAR_TRAVERSAL",
      });
    }
  });

  it("enforces default, custom, and hard limits during compilation", () => {
    expect(compileJsonPointer(`${"/x".repeat(64)}`)).toBeTruthy();
    expect(compileJsonPointer(`${"/x".repeat(65)}`)).toEqual({
      ok: false,
      code: "POINTER_DEPTH_EXCEEDED",
    });
    expect(compileJsonPointer(`/x${"a".repeat(1024)}`)).toEqual({
      ok: false,
      code: "POINTER_TOKEN_TOO_LONG",
    });
    expect(compileJsonPointer("/abc", { maxDepth: 1 })).toEqual({
      ok: false,
      code: "POINTER_DEPTH_EXCEEDED",
    });
    expect(compileJsonPointer("/abcd", { maxTokenLength: 3 })).toEqual({
      ok: false,
      code: "POINTER_TOKEN_TOO_LONG",
    });
    expect(compileJsonPointer("/x", { maxDepth: 1024 })).toBeTruthy();
    expect(
      compileJsonPointer(`/x${"a".repeat(65535)}`, { maxTokenLength: 65536 }),
    ).toBeTruthy();
    expect(() => compileJsonPointer("/x", { maxDepth: 1025 })).toThrow(
      RangeError,
    );
    expect(() => compileJsonPointer("/x", { maxDepth: 0 })).toThrow(RangeError);
    expect(() => compileJsonPointer("/x", { maxTokenLength: 65537 })).toThrow(
      RangeError,
    );
  });

  it("freezes compiled tokens, avoids mutation, and supports concurrent reuse", async () => {
    const pointer = compile("/user/name");
    expect(Object.isFrozen(pointer)).toBe(true);
    expect(Object.isFrozen(pointer.tokens)).toBe(true);
    const first = { user: { name: "Ada" } };
    const second = { user: { name: "Grace" } };
    const results = await Promise.all([
      Promise.resolve(resolveJsonPointer(pointer, first)),
      Promise.resolve(resolveJsonPointer(pointer, second)),
      Promise.resolve(resolveJsonPointer(pointer, {})),
    ]);
    expect(results).toEqual([
      { ok: true, present: true, value: "Ada" },
      { ok: true, present: true, value: "Grace" },
      { ok: false, code: "POINTER_MISSING_SEGMENT" },
    ]);
    expect(pointer.tokens).toEqual(["user", "name"]);
    expect(first).toEqual({ user: { name: "Ada" } });
  });

  it("does not call input-provided property methods", () => {
    const root = { hasOwnProperty: vi.fn(), value: 1 };
    expect(resolve("/value", root)).toEqual({
      ok: true,
      present: true,
      value: 1,
    });
    expect(root.hasOwnProperty).not.toHaveBeenCalled();
  });
});
