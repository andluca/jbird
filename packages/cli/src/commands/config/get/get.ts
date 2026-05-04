import { ConfigError } from "@jbird/core";
import { getAtPath } from "../../../shared/services/helpers.ts";
import type { Stdout } from "../../../shared/services/ports.ts";
import type { ConfigLoader } from "../../../shared/services/ConfigLoader.ts";
import type { StateDir } from "../../../shared/services/StateDir.ts";
import type { CoreConfig } from "@jbird/core";

export interface ConfigGetOptions {
  readonly key: string;
  readonly cwd: string;
}

export interface ConfigGetDeps {
  readonly stdout: Stdout;
  readonly configLoader: ConfigLoader;
  readonly stateDir: StateDir;
}

function valueToString(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return JSON.stringify(value, null, 2);
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string" || typeof value === "bigint") {
    return String(value);
  }
  return JSON.stringify(value, null, 2);
}

export async function runConfigGet(opts: ConfigGetOptions, deps: ConfigGetDeps): Promise<void> {
  let config: CoreConfig;
  try {
    await deps.stateDir.ensureGlobal();
    config = await deps.configLoader.load(opts.cwd);
  } catch (err) {
    const message = err instanceof ConfigError ? err.message : "Failed to load config";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
    return;
  }

  const value = getAtPath(config, opts.key);

  if (value === undefined) {
    process.stderr.write(`key not found: ${opts.key}\n`);
    process.exitCode = 1;
    return;
  }

  deps.stdout.write(valueToString(value));
}
