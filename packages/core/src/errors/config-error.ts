import { JbirdError } from "./jbird-error.ts";

/**
 * Thrown when jbird config (config.toml) cannot be loaded or is invalid.
 *
 * details.kind subcategories:
 *   'parse-failed'        — TOML syntax error
 *   'validation-failed'   — schema validation failed (Zod)
 *   'not-found'           — config file not found at expected path
 *   'override-conflict'   — project override conflicts with global config
 */
export class ConfigError extends JbirdError {
  override readonly code = "config";
}
