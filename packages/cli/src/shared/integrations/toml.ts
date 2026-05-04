import { parse as smolParse, stringify as smolStringify } from "smol-toml";
import { toCamelCase, toSnakeCase } from "../services/helpers.ts";
import type { Toml } from "../services/ports.ts";

/**
 * Recursively converts all object keys using the provided key converter.
 * Values are not modified — only keys are translated.
 * Arrays of objects have their elements' keys converted too.
 */
function convertKeys(value: unknown, convertKey: (k: string) => string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => convertKeys(item, convertKey));
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[convertKey(k)] = convertKeys(v, convertKey);
    }
    return result;
  }
  return value;
}

/**
 * smol-toml's stringify signature uses `any` at its integration boundary.
 * This thin wrapper isolates the unsafe cast to one place.
 */
function smolStringifyUnknown(value: unknown): string {
  // smol-toml accepts `any` — cast required at external lib boundary
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return smolStringify(value as any);
}

/**
 * TOML adapter backed by smol-toml.
 * parse() returns camelCase keys.
 * stringify() accepts camelCase keys and produces snake_case TOML.
 */
export function createTomlAdapter(): Toml {
  return {
    parse(input: string): unknown {
      const raw: unknown = smolParse(input);
      return convertKeys(raw, toCamelCase);
    },

    stringify(value: unknown): string {
      const snaked = convertKeys(value, toSnakeCase);
      return smolStringifyUnknown(snaked);
    },
  };
}
