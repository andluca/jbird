/**
 * Pure helper functions for config loading, writing, and TOML translation.
 * All functions are side-effect free.
 */

// ─── Case conversion ─────────────────────────────────────────────────────────

/** Converts snake_case key string to camelCase. */
export function toCamelCase(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/** Converts camelCase key string to snake_case. */
export function toSnakeCase(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// ─── Object path helpers ─────────────────────────────────────────────────────

/**
 * Reads a value at a dot-notation path from an object.
 * Returns undefined if any segment of the path is absent.
 */
export function getAtPath(obj: Record<string, unknown>, dotPath: string): unknown {
  const segments = dotPath.split(".");
  let current: unknown = obj;
  for (const segment of segments) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/**
 * Returns a new object with the value set at the given dot-notation path.
 * Creates intermediate objects as needed.
 * Coerces string values to number or boolean when the existing value at that path
 * is already that type (e.g., "9999" → 9999 if existing is a number).
 * Does not mutate the input object.
 */
export function setAtPath(
  obj: Record<string, unknown>,
  dotPath: string,
  value: unknown,
): Record<string, unknown> {
  const segments = dotPath.split(".");
  const firstSegment = segments[0];
  if (firstSegment === undefined) return obj;

  if (segments.length === 1) {
    const existing = obj[firstSegment];
    const coerced = coerceValue(value, existing);
    return { ...obj, [firstSegment]: coerced };
  }

  const nested = obj[firstSegment];
  const nestedObj: Record<string, unknown> =
    nested !== null && typeof nested === "object" && !Array.isArray(nested)
      ? (nested as Record<string, unknown>)
      : {};

  return {
    ...obj,
    [firstSegment]: setAtPath(nestedObj, segments.slice(1).join("."), value),
  };
}

/**
 * Coerces a string value to number or boolean when `existing` provides the type hint.
 * Returns the value unchanged when existing is not a typed primitive or value is not a string.
 */
export function coerceValue(value: unknown, existing: unknown): unknown {
  if (typeof value !== "string") return value;
  if (typeof existing === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  }
  if (typeof existing === "boolean") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return value;
}

// ─── Deep merge ──────────────────────────────────────────────────────────────

/**
 * Deep merges project config into global config.
 * - Plain objects are merged key-by-key (project key wins on conflict).
 * - Arrays are replaced entirely (project array replaces global).
 * - undefined values in project are ignored (global value is preserved).
 * Does not mutate either input.
 */
export function deepMerge<T extends Record<string, unknown>>(
  global: T,
  project: Record<string, unknown>,
): T {
  const result: Record<string, unknown> = { ...global };

  for (const key of Object.keys(project)) {
    const projectVal = project[key];
    const globalVal = global[key as keyof T];

    if (projectVal === undefined) continue;

    if (isPlainObject(projectVal) && isPlainObject(globalVal)) {
      result[key] = deepMerge(globalVal, projectVal);
    } else {
      result[key] = projectVal;
    }
  }

  return result as T;
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === "object" && !Array.isArray(val);
}

// ─── Config loader helpers ───────────────────────────────────────────────────

/**
 * After Zod parses with defaults, keep only the keys that were actually present
 * in the original raw object. Prevents schema-injected defaults from
 * masquerading as explicit project overrides during merge.
 */
export function keepOnlyPresentKeys(parsed: unknown, raw: unknown): unknown {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return parsed;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return parsed;

  const rawObj = raw as Record<string, unknown>;
  const parsedObj = parsed as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(rawObj)) {
    result[key] = keepOnlyPresentKeys(parsedObj[key], rawObj[key]);
  }
  return result;
}
