import { join } from "node:path";
import { coreConfigSchema, ConfigError, JBIRD_VERSION } from "@jbird/core";
import type { CoreConfig } from "@jbird/core";
import { deepMerge } from "./helpers.ts";
import type { StateDir } from "./StateDir.ts";
import type { Fs, Toml } from "./ports.ts";
import type { Logger } from "@jbird/core";

/**
 * After Zod parses with defaults, keep only the keys that were actually present
 * in the original raw object. This prevents schema-injected defaults from
 * masquerading as explicit project overrides during merge.
 */
function keepOnlyPresentKeys(parsed: unknown, raw: unknown): unknown {
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

/**
 * Loads and merges jbird configuration from global (~/.jbird/config.toml)
 * and project (<cwd>/.jbird/config.toml) sources.
 *
 * Merge semantics:
 *   - Plain objects are merged key-by-key (project key wins on conflict).
 *   - Arrays are replaced entirely (project array replaces global).
 *   - When project file is absent, only global config is used.
 */
export class ConfigLoader {
  constructor(
    private readonly fs: Fs,
    private readonly toml: Toml,
    private readonly stateDir: StateDir,
    private readonly logger: Logger,
  ) {}

  async loadGlobal(): Promise<CoreConfig> {
    const configPath = join(this.stateDir.globalRoot(), "config.toml");
    return this.loadGlobalFromPath(configPath);
  }

  async loadProject(cwd: string): Promise<Partial<CoreConfig> | null> {
    const configPath = join(this.stateDir.projectRoot(cwd), "config.toml");
    const rawText = await this.fs.readFile(configPath);
    if (rawText === null) return null;

    let rawParsed: unknown;
    try {
      rawParsed = this.toml.parse(rawText);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ConfigError(`TOML parse failed: ${message}`, { kind: "parse-failed", path: configPath });
    }

    // Validate what's present (partial schema — top-level keys optional).
    const result = coreConfigSchema.partial().safeParse(rawParsed);
    if (!result.success) {
      throw new ConfigError("Config validation failed", {
        kind: "validation-failed",
        path: configPath,
        issues: result.error.issues,
      });
    }

    // Strip schema-injected defaults: only keep keys that existed in the raw TOML.
    // This ensures absent keys (e.g. routing.rules) don't override global values.
    const stripped = keepOnlyPresentKeys(result.data, rawParsed);
    return stripped as Partial<CoreConfig>;
  }

  async load(cwd: string): Promise<CoreConfig> {
    const [global, project] = await Promise.all([
      this.loadGlobal(),
      this.loadProject(cwd),
    ]);

    if (project === null) return global;

    const merged = deepMerge(
      global as Record<string, unknown>,
      project as Partial<Record<string, unknown>>,
    );

    return this.validate(merged, "merged");
  }

  private async loadGlobalFromPath(configPath: string): Promise<CoreConfig> {
    const rawText = await this.fs.readFile(configPath);

    if (rawText === null) {
      this.logger.debug("Global config absent, using defaults", { path: configPath });
      return this.defaults();
    }

    let parsed: unknown;
    try {
      parsed = this.toml.parse(rawText);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ConfigError(`TOML parse failed: ${message}`, { kind: "parse-failed", path: configPath });
    }

    return this.validate(parsed, configPath);
  }

  private validate(data: unknown, path: string): CoreConfig {
    const result = coreConfigSchema.safeParse(data);
    if (!result.success) {
      throw new ConfigError("Config validation failed", {
        kind: "validation-failed",
        path,
        issues: result.error.issues,
      });
    }
    return result.data;
  }

  private defaults(): CoreConfig {
    return coreConfigSchema.parse({ bundle: { version: JBIRD_VERSION } });
  }
}
