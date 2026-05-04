import { describe, expect, it } from "bun:test";
import {
  deepMerge,
  getAtPath,
  setAtPath,
  toCamelCase,
  toSnakeCase,
} from "./helpers.ts";

// ─── deepMerge ───────────────────────────────────────────────────────────────

describe("deepMerge", () => {
  it("returns global when project is empty", () => {
    const global = { a: 1, b: { c: 2 } };
    const result = deepMerge(global, {});
    expect(result).toEqual({ a: 1, b: { c: 2 } });
  });

  it("returns project values when global is empty-ish", () => {
    const global = { a: 1 };
    const result = deepMerge(global, { a: 99 });
    expect(result).toEqual({ a: 99 });
  });

  it("overrides key-by-key (does not replace whole object)", () => {
    const global = { services: { proxy: { autostart: true, port: 7878 } } };
    const project = { services: { proxy: { port: 9999 } } };
    const result = deepMerge(global, project);
    expect(result).toEqual({ services: { proxy: { autostart: true, port: 9999 } } });
  });

  it("replaces arrays entirely (not concatenates)", () => {
    const global = { routing: { rules: ["a", "b"] } };
    const project = { routing: { rules: ["c"] } };
    const result = deepMerge(global, project);
    expect(result).toEqual({ routing: { rules: ["c"] } });
  });

  it("merges 3 levels of nesting", () => {
    const global = { a: { b: { c: 1, d: 2 } } };
    const project = { a: { b: { c: 99 } } };
    const result = deepMerge(global, project);
    expect(result).toEqual({ a: { b: { c: 99, d: 2 } } });
  });

  it("undefined in project preserves global value", () => {
    const global = { a: 1, b: 2 };
    const project: Record<string, unknown> = { b: undefined };
    const result = deepMerge(global, project);
    expect(result.a).toBe(1);
    // b is explicitly set to undefined in partial — global wins
    expect(result.b).toBe(2);
  });
});

// ─── setAtPath ────────────────────────────────────────────────────────────────

describe("setAtPath", () => {
  it("sets a top-level key", () => {
    const obj = { a: 1 };
    const result = setAtPath(obj, "a", 99);
    expect(result).toEqual({ a: 99 });
  });

  it("sets a nested key", () => {
    const obj = { services: { proxy: { port: 7878 } } };
    const result = setAtPath(obj, "services.proxy.port", 9999);
    expect(result).toEqual({ services: { proxy: { port: 9999 } } });
  });

  it("creates intermediate objects when path is absent", () => {
    const result = setAtPath({}, "a.b.c", 42);
    expect(result).toEqual({ a: { b: { c: 42 } } });
  });

  it("coerces numeric string to number when existing value is number", () => {
    const obj = { port: 7878 };
    const result = setAtPath(obj, "port", "9999");
    expect(result.port).toBe(9999);
    expect(typeof result.port).toBe("number");
  });

  it("coerces 'true' string to boolean when existing value is boolean", () => {
    const obj = { autostart: false };
    const result = setAtPath(obj, "autostart", "true");
    expect(result.autostart).toBe(true);
  });

  it("coerces 'false' string to boolean when existing value is boolean", () => {
    const obj = { autostart: true };
    const result = setAtPath(obj, "autostart", "false");
    expect(result.autostart).toBe(false);
  });

  it("preserves string value when existing value is string", () => {
    const obj = { model: "sonnet" };
    const result = setAtPath(obj, "model", "haiku");
    expect(result.model).toBe("haiku");
  });

  it("does not mutate the original object", () => {
    const obj = { a: 1 };
    setAtPath(obj, "a", 99);
    expect(obj.a).toBe(1);
  });
});

// ─── getAtPath ────────────────────────────────────────────────────────────────

describe("getAtPath", () => {
  it("returns value at top-level path", () => {
    expect(getAtPath({ port: 7878 }, "port")).toBe(7878);
  });

  it("returns value at nested path", () => {
    const obj = { services: { proxy: { port: 7878 } } };
    expect(getAtPath(obj, "services.proxy.port")).toBe(7878);
  });

  it("returns undefined for absent path", () => {
    expect(getAtPath({ a: 1 }, "b.c")).toBeUndefined();
  });

  it("returns whole object when path points to object", () => {
    const proxy = { autostart: true, port: 7878 };
    const obj = { services: { proxy } };
    expect(getAtPath(obj, "services.proxy")).toEqual(proxy);
  });

  it("returns array when path points to array", () => {
    const obj = { routing: { rules: [1, 2, 3] } };
    expect(getAtPath(obj, "routing.rules")).toEqual([1, 2, 3]);
  });
});

// ─── case conversion helpers ──────────────────────────────────────────────────

describe("toCamelCase", () => {
  it("converts snake_case to camelCase", () => {
    expect(toCamelCase("default_model")).toBe("defaultModel");
  });

  it("leaves camelCase unchanged (idempotent)", () => {
    expect(toCamelCase("defaultModel")).toBe("defaultModel");
  });

  it("handles multiple underscores", () => {
    expect(toCamelCase("token_estimate_lt")).toBe("tokenEstimateLt");
  });

  it("does not touch string values — only key strings", () => {
    expect(toCamelCase("anthropic")).toBe("anthropic");
  });
});

describe("toSnakeCase", () => {
  it("converts camelCase to snake_case", () => {
    expect(toSnakeCase("defaultModel")).toBe("default_model");
  });

  it("leaves snake_case unchanged (idempotent)", () => {
    expect(toSnakeCase("default_model")).toBe("default_model");
  });

  it("handles multiple uppercase letters", () => {
    expect(toSnakeCase("tokenEstimateLt")).toBe("token_estimate_lt");
  });
});
