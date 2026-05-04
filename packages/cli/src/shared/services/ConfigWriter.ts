import { join } from "node:path";
import { coreConfigSchema, ConfigError } from "@jbird/core";
import type { CoreConfig } from "@jbird/core";
import { setAtPath } from "./helpers.ts";
import type { ConfigLoader } from "./ConfigLoader.ts";
import type { StateDir } from "./StateDir.ts";
import type { Fs, Toml } from "./ports.ts";

const FILE_MODE = 0o600;

/**
 * Writes jbird configuration to global (~/.jbird/config.toml)
 * or project (<cwd>/.jbird/config.toml) files.
 *
 * TOML comment preservation: v1 does not preserve comments.
 * setGlobal/setProject re-serialize from validated AST.
 *
 * Schema is always validated before writing — invalid config is never persisted.
 */
export class ConfigWriter {
  constructor(
    private readonly fs: Fs,
    private readonly toml: Toml,
    private readonly stateDir: StateDir,
    private readonly loader: ConfigLoader,
  ) {}

  async setGlobal(key: string, value: unknown): Promise<CoreConfig> {
    const configPath = join(this.stateDir.globalRoot(), "config.toml");
    return this.writeAt(configPath, key, value, () => this.loader.loadGlobal());
  }

  async setProject(cwd: string, key: string, value: unknown): Promise<CoreConfig> {
    const configPath = join(this.stateDir.projectRoot(cwd), "config.toml");
    return this.writeAt(configPath, key, value, () => this.loader.loadGlobal());
  }

  private async writeAt(
    configPath: string,
    key: string,
    value: unknown,
    loadBase: () => Promise<CoreConfig>,
  ): Promise<CoreConfig> {
    const base = await loadBase();
    const updated = setAtPath(base, key, value);

    const validated = this.validate(updated, configPath);

    const tomlContent = this.toml.stringify(validated);
    await this.fs.writeFile(configPath, tomlContent, FILE_MODE);

    return validated;
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
}
